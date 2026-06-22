// app/actions/tasks.ts
"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { verifyProjectAccess } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logProjectActivity } from "@/lib/logger";
import { createNotificationAction } from "./notifications"; 

async function verifyProjectMutationAccess(
  projectId: string, 
  userId: string
): Promise<{ authorized: boolean; error: string | null; role: string | null }> {
  const guard = await verifyProjectAccess(projectId);
  
  if (!guard.authorized) {
    return { 
      authorized: false, 
      error: guard.error || "Security Exception: Boundary lock violation. Insufficient project clearance.",
      role: null
    };
  }
  
  return { 
    authorized: true, 
    error: null, 
    role: guard.role 
  };
}

/**
 * ACTION: Hierarchical Task & Sub-Task Creator Engine
 */
export async function createTask(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = (formData.get("priority") as any) || "MEDIUM";
  const submittedAssigneeId = formData.get("assigneeId") as string;
  
  const dueDateInput = formData.get("dueDate") as string;
  const parentId = formData.get("parentId") as string || null;
  
  // 🚀 NEW: Extract custom pipeline status lane selected within the dialog dropdown engine
  const statusInput = formData.get("status") as string;

  if (!title || !projectId) {
    return { error: "Missing required task fields." };
  }

  const session = await getSession();
  if (!session) redirect("/signin");

  // 🛡️ SECURITY GATEWAY: Verify structural project context
  const auth = await verifyProjectMutationAccess(projectId, session.userId);
  if (!auth.authorized) return { error: auth.error };

  // 🔒 GUEST RESTRICTION: Guests cannot create tasks
  if (auth.role === "GUEST") {
    return { error: "Access Gated: Guest profiles possess Commenter/Viewer rights and cannot create tasks." };
  }

  const finalAssigneeId = submittedAssigneeId && submittedAssigneeId.trim() !== "" 
    ? submittedAssigneeId 
    : session.userId;

  const parsedDueDate = dueDateInput ? new Date(dueDateInput) : null;

  // 🚀 Determine lane allocation: Sub-tasks default to TODO, master cards use selection token
  const finalStatus = parentId && parentId.trim() !== "" ? "TODO" : (statusInput || "TODO");

  try {
    const userMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });
    const organizationId = userMembership?.organizationId || "";

    await prisma.$transaction(async (tx) => {
      await tx.task.create({
        data: {
          creatorId: session.userId,
          title,
          description: description?.trim() || null,
          projectId,
          priority,
          status: finalStatus, // 🚀 FIXED: Dynamic status lane parameter committed cleanly
          assigneeId: finalAssigneeId,
          dueDate: parsedDueDate,
          parentId: parentId && parentId.trim() !== "" ? parentId : null,
        }
      });

      const actionMessage = parentId && parentId.trim() !== ""
        ? `created sub-task "${title}"`
        : `created task "${title}"`;

      await tx.activityLog.create({
        data: {
          projectId,
          actorName: session.name || "Unknown User",
          action: actionMessage,
        },
      });
    });

    if (finalAssigneeId !== session.userId && organizationId) {
      await createNotificationAction({
        recipientId: finalAssigneeId,
        senderId: session.userId,
        organizationId,
        type: "TASK_ASSIGNED",
        title: "Task Assigned to You",
        description: `${session.name} assigned the task "${title}" to you.`
      });
    }

  } catch (error) {
    console.error("Task append action fault:", error);
    return { error: "System fault: Failed to commit structural task node." };
  }

  revalidatePath("/dashboard/tasks");
  revalidatePath(`/dashboard/projects/${projectId}`); // 🚀 UPDATED: Revalidates embedded tab metrics instantly
  return { success: true };
}

/**
 * ACTION: Toggle Task Completion Switch
 */
export async function toggleTaskCompletion(taskId: string, currentStatus: string) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const targetTask = await prisma.task.findUnique({
    where: { id: taskId }
  });
  if (!targetTask) return { error: "Target task asset missing from repository." };

  // 🛡️ SECURITY GATEWAY: Enforce project validation check
  const auth = await verifyProjectMutationAccess(targetTask.projectId, session.userId);
  if (!auth.authorized) return { error: auth.error };

  // 🔒 GUEST RESTRICTION: Guests cannot complete tasks
  if (auth.role === "GUEST") {
    return { error: "Access Gated: Guest profiles possess Commenter/Viewer rights and cannot toggle completion." };
  }

  if (targetTask.parentId) {
    const parent = await prisma.task.findUnique({ where: { id: targetTask.parentId } });
    if (parent?.status === "DONE") {
      return { error: "Locked: Cannot modify checklist parameters of a finalized project card task." };
    }
  }

  const updatedStatus = currentStatus === "DONE" ? "TODO" : "DONE";

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: updatedStatus }
    });

    const userMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });

    if (updatedStatus === "DONE" && targetTask.creatorId !== session.userId && userMembership) {
      await createNotificationAction({
        recipientId: targetTask.creatorId,
        senderId: session.userId,
        organizationId: userMembership.organizationId,
        type: "TASK_COMPLETED",
        title: "Task Completed",
        description: `${session.name} completed your task "${targetTask.title}".`
      });
    }
  } catch (err) {
    return { error: "Failed to update database status parameter." };
  }

  revalidatePath("/dashboard/tasks");
  revalidatePath(`/dashboard/projects/${targetTask.projectId}`); // 🚀 UPDATED: Purged obsolete /kanban cache targets
  return { success: true };
}

/**
 * ACTION: Patch Task Status State (Kanban Board Controller)
 */
export async function updateTaskStatus(taskId: string, newStatus: string) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const targetTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: { subTasks: true }
  });
  if (!targetTask) return { error: "Target task record missing from active database branch." };

  // 🛡️ SECURITY GATEWAY: Check configuration clearance blockages
  const auth = await verifyProjectMutationAccess(targetTask.projectId, session.userId);
  if (!auth.authorized) return { error: auth.error };

  // 🔒 GUEST RESTRICTION: Guests cannot move columns or modify states
  if (auth.role === "GUEST") {
    return { error: "Access Gated: Guest profiles possess Commenter/Viewer rights and cannot change workflow columns." };
  }

  // Adjusted to use a strict blueprint lock check against whatever your custom last column item resolves to
  if (targetTask.status === "DONE" && newStatus !== "DONE") {
    return { error: "Workflow Lock: Completed tasks are archived and cannot be dragged backwards." };
  }

  if (newStatus !== "TODO" && targetTask.status !== newStatus) {
    const uncompletedSubTasks = targetTask.subTasks.filter(sub => sub.status !== "DONE");
    if (uncompletedSubTasks.length > 0) {
      return { 
        error: `Quality Gate Blockade: You must check off all child sub-tasks (${uncompletedSubTasks.length} pending checklist items) before this task card can advance stages.` 
      };
    }
  }

  try {
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus },
    });

    await logProjectActivity({
      projectId: targetTask.projectId,
      actorName: session.name || "Unknown User",
      action: `changed status of "${targetTask.title}" to ${newStatus.replace(/_/g, " ")}`,
    });

    const userMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });

    if (newStatus === "DONE" && targetTask.creatorId !== session.userId && userMembership) {
      await createNotificationAction({
        recipientId: targetTask.creatorId,
        senderId: session.userId,
        organizationId: userMembership.organizationId,
        type: "TASK_COMPLETED",
        title: "Task Marked as Done",
        description: `${session.name} moved "${targetTask.title}" to completed status.`
      });
    }

    revalidatePath("/dashboard/tasks");
    revalidatePath(`/dashboard/projects/${targetTask.projectId}`); // 🚀 UPDATED: Re-sync parent layout view state loops
    return { success: true, task: updatedTask };
  } catch (error) {
    return { error: "Runtime Error: Failed to write status update parameter to cluster state." };
  }
}

/**
 * ACTION: Safely purges a master task card
 */
export async function deleteMainTask(taskId: string, projectId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication signature checkpoint mismatch." };

    const auth = await verifyProjectMutationAccess(projectId, session.userId);
    if (!auth.authorized) return { error: auth.error };
    
    // 🔒 GUEST RESTRICTION: Guests cannot drop or purge macro project tasks
    if (auth.role === "GUEST") {
      return { error: "Access Gated: Guest profiles possess Commenter/Viewer rights and cannot delete tasks." };
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: session.userId },
      include: { user: { select: { name: true } } },
    });
    if (!membership) return { error: "Clearance blocked: Identity mismatch." };

    const taskToDelete = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });
    if (!taskToDelete) return { error: "Target task record was not found or already deleted." };

    const projectAssignments = await prisma.assignment.findMany({
      where: { projectId: projectId },
      select: { userId: true },
    });

    const actorName = membership.user.name;
    const logActivityText = `deleted task "${taskToDelete.title}"`;

    await prisma.$transaction([
      prisma.task.delete({
        where: { id: taskId },
      }),

      prisma.activityLog.create({
        data: {
          projectId: projectId,
          actorName: actorName || "Unknown User",
          action: logActivityText,
        },
      }),

      ...projectAssignments
        .filter((assignee) => assignee.userId !== session.userId)
        .map((assignee) =>
          prisma.notification.create({
            data: {
              recipientId: assignee.userId,
              organizationId: membership.organizationId,
              type: "DELETE_TASK",
              title: "Task Deleted Alert",
              description: `${actorName} has permanently deleted the task "${taskToDelete.title}" from a project workspace you belong to.`,
              isRead: false,
            },
          })
        ),
    ]);

    revalidatePath(`/dashboard/projects/${projectId}`); // 🚀 UPDATED: Sweeps unified tab layout parameters cleanly
    revalidatePath(`/dashboard/tasks`);

    return { success: true };
  } catch (error) {
    console.error("Failed to execute unified task purge tracking logic:", error);
    return { error: "Database transaction pipeline deletion execution timed out." };
  }
}

/**
 * ACTION: Securely delete a nested child subtask leaf node
 */
export async function deleteSubTask(subTaskId: string, projectId: string) {
  const session = await getSession();
  if (!session) return { error: "Authentication required." };

  const guard = await verifyProjectAccess(projectId);
  if (!guard.authorized || !guard.role) {
    return { error: guard.error || "Access Denied: Project team membership required." };
  }

  // 🔒 GUEST RESTRICTION: Guests cannot delete subtasks
  if (guard.role === "GUEST") {
    return { error: "Access Gated: Guest profiles possess Commenter/Viewer rights and cannot delete checklist nodes." };
  }

  try {
    const subTask = await prisma.task.findUnique({
      where: { id: subTaskId },
      select: { creatorId: true, parentId: true }
    });

    if (!subTask) return { error: "Subtask not found." };
    if (subTask.parentId === null) return { error: "Operation Refused: Target is a master card node." };

    const isOwnerOrAdmin = guard.role === "OWNER" || guard.role === "ADMIN";
    const isCreator = subTask.creatorId === session.userId;

    if (!isOwnerOrAdmin && !isCreator) {
      return { error: "Access Gated: You can only delete subtasks that you personally initialized." };
    }

    await prisma.task.delete({ where: { id: subTaskId } });

    revalidatePath(`/dashboard/projects/${projectId}`); // 🚀 UPDATED: Triggers refresh layout tree loop
    return { success: true };
  } catch (error) {
    return { error: "System Fault: Failed to purge child checklist node." };
  }
}

interface UpdateTaskPayload {
  taskId: string;
  projectId: string;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; // 🚀 FIXED: Aligned option tokens with container schemas
  status: string;
  dueDate?: string | null;
}

export async function updateTaskDetailsAction(payload: UpdateTaskPayload) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication signature checkpoint mismatch." };

    // 🛡️ SECURITY GATEWAY: Intercept non-clearance operations
    const auth = await verifyProjectMutationAccess(payload.projectId, session.userId);
    if (!auth.authorized) return { error: auth.error };

    // 🔒 GUEST RESTRICTION: Guests cannot modify task fields
    if (auth.role === "GUEST") {
      return { error: "Access Gated: Guest profiles possess Commenter/Viewer rights and cannot alter task description fields or due dates." };
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: session.userId },
      include: { user: { select: { name: true } } },
    });
    if (!membership) return { error: "Clearance blocked: Identity mismatch." };

    const originalTask = await prisma.task.findUnique({
      where: { id: payload.taskId },
      select: { title: true },
    });
    if (!originalTask) return { error: "Target task record was not found." };

    const projectAssignments = await prisma.assignment.findMany({
      where: { projectId: payload.projectId },
      select: { userId: true },
    });

    const actorName = membership.user.name;
    const logActivityText = `edited task "${originalTask.title}"`;

    await prisma.$transaction([
      prisma.task.update({
        where: { id: payload.taskId },
        data: {
          title: payload.title.trim(),
          description: payload.description?.trim() || "",
          priority: payload.priority,
          status: payload.status,
          dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        },
      }),

      prisma.activityLog.create({
        data: {
          projectId: payload.projectId,
          actorName: actorName || "Unknown User",
          action: logActivityText,
        },
      }),

      ...projectAssignments
        .filter((assignee) => assignee.userId !== session.userId)
        .map((assignee) =>
          prisma.notification.create({
            data: {
              recipientId: assignee.userId,
              organizationId: membership.organizationId,
              type: "EDIT_TASK",
              title: "Task Modification Alert",
              description: `${actorName} has edited the task "${payload.title.trim()}" in a project you are assigned to.`,
              isRead: false,
            },
          })
        ),
    ]);

    revalidatePath(`/dashboard/projects/${payload.projectId}`); // 🚀 UPDATED: Re-evaluates client metrics deck
    revalidatePath(`/dashboard/tasks`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to execute unified task mutation tracking logic:", error);
    return { error: "Database transaction pipeline execution timeout." };
  }
}