// app/actions/projects.ts
"use server";

import { prisma } from "@/lib/db";
import { getSession } from "./auth";
import { verifyProjectAccess } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { createNotificationAction } from "./notifications";

export interface SearchableUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null; // 🚀 FIXED: Added avatarUrl to type layout signature
}

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
 * FLOW A: Authorized Project Creation
 */
export async function createProject(formData: FormData) {
  const name = formData.get("projectName") as string;
  const description = formData.get("description") as string;
  const dueDateInput = formData.get("dueDate") as string;

  if (!name) return { error: "Project name is required." };

  const guard = await verifyProjectAccess();
  
  if (!guard.authorized || !guard.session) {
    return { error: guard.error || "Security Exception: Insufficient workspace administration clearance." };
  }

  const userMembership = await prisma.membership.findFirst({
    where: { userId: guard.session.userId },
  });
  if (!userMembership) {
    return { error: "Workspace error: No valid membership profile detected." };
  }

  const parsedDueDate = dueDateInput ? new Date(dueDateInput) : null;

  try {
    await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name,
          description,
          organizationId: userMembership.organizationId,
          creatorId: guard.session!.userId,
          dueDate: parsedDueDate,
        },
      });

      await tx.assignment.create({
        data: {
          userId: guard.session!.userId,
          projectId: project.id,
        },
      });
    });
  } catch (error) {
    return { error: "System fault: Failed to finalize database transaction." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * ACTION A: Update project parameters
 */
export async function updateProjectGeneralDetails(
  projectId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string | null }> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Authentication checkpoint breach. Session not verified." };
    }

    const name = formData.get("projectName") as string;
    const description = formData.get("description") as string;
    const visibility = formData.get("visibility") as "PRIVATE" | "PUBLIC";

    if (!name || name.trim() === "") {
      return { error: "Project configuration requires a valid title asset." };
    }

    const auth = await verifyProjectMutationAccess(projectId, session.userId);
    if (!auth.authorized) return { error: auth.error };

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        visibility: visibility || "PRIVATE",
      },
      include: {
        assignments: true
      }
    });

    const userMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });

    if (userMembership) {
      const activeTeammates = project.assignments.filter(a => a.userId !== session.userId);
      for (const teammate of activeTeammates) {
        await createNotificationAction({
          recipientId: teammate.userId,
          senderId: session.userId,
          organizationId: userMembership.organizationId,
          type: "PROJECT_UPDATED",
          title: "Project Parameters Updated",
          description: `${session.name} adjusted metadata configs inside project "${name.trim()}".`
        });
      }
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath("/dashboard/projects");
    
    return { success: true };
  } catch (err) {
    console.error("Project details update transaction failure:", err);
    return { error: "Runtime storage interruption encountered while updating metadata arrays." };
  }
}

/**
 * ACTION B: Move a project workspace into read-only archival data states
 */
export async function archiveProjectWorkspace(
  projectId: string
): Promise<{ success?: boolean; error?: string | null }> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Authentication checkpoint breach. Session not verified." };
    }

    const auth = await verifyProjectMutationAccess(projectId, session.userId);
    if (!auth.authorized) return { error: auth.error };

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { status: "ARCHIVED" },
      include: { assignments: true }
    });

    const userMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });

    if (userMembership) {
      const activeTeammates = project.assignments.filter(a => a.userId !== session.userId);
      for (const teammate of activeTeammates) {
        await createNotificationAction({
          recipientId: teammate.userId,
          senderId: session.userId,
          organizationId: userMembership.organizationId,
          type: "PROJECT_UPDATED",
          title: "Project Archived",
          description: `${session.name} archived the project workspace "${project.name}".`
        });
      }
    }

    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${projectId}`);
    
    return { success: true };
  } catch (err) {
    console.error("Archive transaction runtime error:", err);
    return { error: "Database transaction exception encountered during archival layer modification." };
  }
}

/**
 * ACTION C: Irreversibly delete a project workspace branch
 */
export async function completePurgeProjectWorkspace(
  projectId: string
): Promise<{ success?: boolean; error?: string | null }> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Authentication checkpoint breach. Session not verified." };
    }

    const auth = await verifyProjectMutationAccess(projectId, session.userId);
    if (!auth.authorized) return { error: auth.error };

    await prisma.$transaction([
      prisma.task.deleteMany({ where: { projectId } }),
      prisma.assignment.deleteMany({ where: { projectId } }),
      prisma.joinLink.deleteMany({ where: { projectId } }),
      prisma.project.delete({ where: { id: projectId } }),
    ]);

    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (err) {
    console.error("Project terminal destruction pipeline breakdown:", err);
    return { error: "System isolation failure preventing total relational deletion pass." };
  }
}

/**
 * ACTION: Assign an existing organization user to a specific project team roster.
 */
export async function assignUserToProject(projectId: string, targetEmail: string) {
  const guard = await verifyProjectAccess(projectId);
  if (!guard.authorized || !guard.session) {
    return { error: guard.error || "Security Exception: Insufficient administrative privileges." };
  }

  const cleanEmail = targetEmail.toLowerCase().trim();
  if (!cleanEmail) return { error: "Target email parameter is required." };

  try {
    const targetUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { memberships: true }
    });

    if (!targetUser) {
      return { error: "User not found. To invite someone completely new to the platform, use the organization invite terminal." };
    }

    const existingAssignment = await prisma.assignment.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUser.id
        }
      }
    });

    if (existingAssignment) {
      return { error: "Assignment Conflict: This user is already an active member of this project team roster." };
    }

    await prisma.assignment.create({
      data: {
        projectId,
        userId: targetUser.id
      }
    });

    const projectContext = await prisma.project.findUnique({
      where: { id: projectId }
    });

    const userMembership = await prisma.membership.findFirst({
      where: { userId: guard.session.userId },
    });

    if (userMembership && projectContext) {
      await createNotificationAction({
        recipientId: targetUser.id,
        senderId: guard.session.userId,
        organizationId: userMembership.organizationId,
        type: "MENTION",
        title: "Added to Project Team",
        description: `${guard.session.name} added you to the project team roster for "${projectContext.name}".`
      });
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };

  } catch (error) {
    console.error("Assignment Engine Failure:", error);
    return { error: "System Fault: Failed to process team member assignment criteria." };
  }
}

/**
 * Flights all platform users for the project assignment dropdown search panel.
 */
export async function getSearchableUsers(): Promise<{ users?: SearchableUser[]; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Authentication Exception: Please sign in." };
  }

  try {
    const users = await prisma.user.findMany({
      // 🚀 FIXED: Added avatarUrl to select block fields to provide active image endpoints
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      },
      orderBy: {
        name: "asc",
      },
    });

    return { users };
  } catch (error) {
    console.error("Failed to fetch searchable platform members:", error);
    return { error: "Database error fetching user registry." };
  }
}

interface RemoveMemberPayload {
  projectId: string;
  targetUserId: string;
}

/**
 * ACTION: Evicts a specified team member from a project, purges any tasks 
 * assigned to them within this scope, and dispatches a system notification.
 */
export async function removeMemberFromProjectAction({ projectId, targetUserId }: RemoveMemberPayload) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication required." };

    const callerMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });
    if (!callerMembership) return { error: "Organization profile alignment mismatch." };

    const isGlobalOwner = callerMembership.role === "OWNER";
    const isGlobalAdmin = callerMembership.role === "ADMIN";

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, creatorId: true },
    });
    if (!project) return { error: "Target project does not exist." };

    if (!isGlobalOwner) {
      if (isGlobalAdmin) {
        const adminProjectAssignment = await prisma.assignment.findFirst({
          where: { projectId, userId: session.userId },
        });
        if (!adminProjectAssignment) {
          return { error: "Access Gated: Admins must be assigned project participants to remove team members." };
        }
      } else {
        return { error: "Access Gated: You do not possess the required clearance level to evict participants." };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.deleteMany({
        where: {
          projectId,
          assigneeId: targetUserId,
        },
      });

      await tx.assignment.deleteMany({
        where: {
          projectId,
          userId: targetUserId,
        },
      });
    });

    await createNotificationAction({
      recipientId: targetUserId,
      senderId: session.userId,
      organizationId: callerMembership.organizationId,
      type: "MENTION",
      title: "Removed from Project Workspace",
      description: `${session.name} has removed you from the project workspace "${project.name}". All tasks assigned to you under this scope have been unlinked.`
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to execute member eviction and task clear sequence:", error);
    return { error: "Internal fault: Database connection interrupted during mutation drop." };
  }
}