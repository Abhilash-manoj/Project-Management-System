"use server";

import { prisma } from "@/lib/db";
import { getSession } from "./auth";
import { verifyProjectAccess } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logProjectActivity } from "@/lib/logger";
import { createNotificationAction } from "./notifications"; // 🚀 IMPORT NOTIFICATION LOGIC

async function verifyProjectMutationAccess(projectId: string, userId: string): Promise<{ authorized: boolean; error: string | null }> {
  const guard = await verifyProjectAccess(projectId);
  if (!guard.authorized) {
    return { 
      authorized: false, 
      error: guard.error || "Security Exception: Boundary lock violation. Insufficient project clearance." 
    };
  }
  return { authorized: true, error: null };
}

/**
 * ACTION: Hierarchical Task & Sub-Task Creator Engine
 */
export async function createTask(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const projectId = formData.get("projectId") as string;
  const priority = (formData.get("priority") as any) || "MEDIUM";
  const submittedAssigneeId = formData.get("assigneeId") as string;
  
  const dueDateInput = formData.get("dueDate") as string;
  const parentId = formData.get("parentId") as string || null;

  if (!title || !projectId) {
    return { error: "Missing required task fields." };
  }

  const session = await getSession();
  if (!session) redirect("/signin");

  const auth = await verifyProjectMutationAccess(projectId, session.userId);
  if (!auth.authorized) return { error: auth.error };

  const finalAssigneeId = submittedAssigneeId && submittedAssigneeId.trim() !== "" 
    ? submittedAssigneeId 
    : session.userId;

  const parsedDueDate = dueDateInput ? new Date(dueDateInput) : null;

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
          status: "TODO",
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
          actorName: session.name,
          action: actionMessage,
        },
      });
    });

    // 🚀 NOTIFICATION TRIGGER: Fire real-time alert if assigned to another user
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
  revalidatePath(`/dashboard/projects/${projectId}/kanban`);
  revalidatePath(`/dashboard/projects/${projectId}`);
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

  if (targetTask.parentId) {
    const parent = await prisma.task.findUnique({ where: { id: targetTask.parentId } });
    if (parent?.status === "DONE") {
      return { error: "Locked: Cannot modify checklist parameters of a finalized project card task." };
    }
  }

  const auth = await verifyProjectMutationAccess(targetTask.projectId, session.userId);
  if (!auth.authorized) return { error: auth.error };

  const updatedStatus = currentStatus === "DONE" ? "TODO" : "DONE";

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: updatedStatus }
    });

    const userMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });

    // 🚀 NOTIFICATION TRIGGER: Alert creator if the task was finished by someone else
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
  revalidatePath(`/dashboard/projects/${targetTask.projectId}/kanban`);
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

  const auth = await verifyProjectMutationAccess(targetTask.projectId, session.userId);
  if (!auth.authorized) return { error: auth.error };

  if (targetTask.status === "DONE") {
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
      actorName: session.name,
      action: `changed status of "${targetTask.title}" to ${newStatus.replace("_", " ")}`,
    });

    const userMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });

    // 🚀 NOTIFICATION TRIGGER: Alert creator if status advances to DONE
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
    revalidatePath(`/dashboard/projects/${targetTask.projectId}/kanban`);
    return { success: true, task: updatedTask };
  } catch (error) {
    return { error: "Runtime Error: Failed to write status update parameter to cluster state." };
  }
}
/**
 * ACTION: Safely purges a master task card, logs the action to the activity stream,
 * and alerts all other project-assigned team members.
 */
export async function deleteMainTask(taskId: string, projectId: string) {
  try {
    // 1. Authenticate session context
    const session = await getSession();
    if (!session) return { error: "Authentication signature checkpoint mismatch." };

    // 2. Query workspace user membership parameters
    const membership = await prisma.membership.findFirst({
      where: { userId: session.userId },
      include: { user: { select: { name: true } } },
    });
    if (!membership) return { error: "Clearance blocked: Identity mismatch." };

    // 3. CRITICAL PRE-FETCH: Gather task context details *before* we delete it from the schema
    const taskToDelete = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });
    if (!taskToDelete) return { error: "Target task record was not found or already deleted." };

    // 4. Query all team assignments attached to this specific project for notifications
    const projectAssignments = await prisma.assignment.findMany({
      where: { projectId: projectId },
      select: { userId: true },
    });

    const actorName = membership.user.name;
    const logActivityText = `deleted task "${taskToDelete.title}"`;

    // 5. Execute deletion, append logs, and broadcast notifications in a robust transaction block
    await prisma.$transaction([
      // A. Safely purge the master task (Cascades down to clean subtasks if your schema permits, or explicitly cleans them)
      prisma.task.delete({
        where: { id: taskId },
      }),

      // B. Post a permanent audit record straight to the Project Activity Board
      prisma.activityLog.create({
        data: {
          projectId: projectId,
          actorName: actorName,
          action: logActivityText,
        },
      }),

      // C. Broadcast real-time system notifications to every assigned user (except the actor)
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

    // 6. Force immediate server-side validation tree clear parameters
    revalidatePath(`/dashboard/projects/${projectId}`);
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

  try {
    const subTask = await prisma.task.findUnique({
      where: { id: subTaskId },
      select: { creatorId: true, parentId: true }
    });

    if (!subTask) return { error: "Subtask not found." };
    if (subTask.parentId === null) return { error: "Operation Refused: Target is a master card node." };

    const isOwner = guard.role === "OWNER";
    const isCreator = subTask.creatorId === session.userId;

    if (!isOwner && !isCreator) {
      return { error: "Access Gated: You can only delete subtasks that you personally initialized." };
    }

    await prisma.task.delete({ where: { id: subTaskId } });

    revalidatePath(`/dashboard/projects/${projectId}/kanban`);
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
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: string;
  dueDate?: string | null;
}

export async function updateTaskDetailsAction(payload: UpdateTaskPayload) {
  try {
    // 1. Authenticate session context
    const session = await getSession();
    if (!session) return { error: "Authentication signature checkpoint mismatch." };

    // 2. Query workspace user membership parameters
    const membership = await prisma.membership.findFirst({
      where: { userId: session.userId },
      include: { user: { select: { name: true } } },
    });
    if (!membership) return { error: "Clearance blocked: Identity mismatch." };

    // 3. Gather original task details for log tracking context prior to modification
    const originalTask = await prisma.task.findUnique({
      where: { id: payload.taskId },
      select: { title: true },
    });
    if (!originalTask) return { error: "Target task record was not found." };

    // 4. Query all user assignments attached to this specific project to form the notification roster
    const projectAssignments = await prisma.assignment.findMany({
      where: { projectId: payload.projectId },
      select: { userId: true },
    });

    const actorName = membership.user.name;
    const logActivityText = `edited task "${originalTask.title}"`;

    // 5. Run modifications, activity logs, and notifications simultaneously in a single transaction
    await prisma.$transaction([
      // A. Update the core task row properties
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

      // B. Append a new record straight to the Project Activity Board
      prisma.activityLog.create({
        data: {
          projectId: payload.projectId,
          actorName: actorName,
          action: logActivityText,
        },
      }),

      // C. Dispatch real-time system notification entries to every assigned team member (except the person editing)
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

    // 6. Purge Next.js cache headers live to instantly display notifications and activity logs
    revalidatePath(`/dashboard/projects/${payload.projectId}`);
    revalidatePath(`/dashboard/tasks`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to execute unified task mutation tracking logic:", error);
    return { error: "Database transaction pipeline execution timeout." };
  }
}