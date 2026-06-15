// app/actions.ts
"use server";

import { prisma } from "@/lib/db";
import { encryptSession, decryptSession } from "@/lib/auth";
import { verifyProjectAccess } from "@/lib/rbac";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hashSync, compareSync } from "bcrypt-ts";
import { randomBytes } from "crypto"; 
import { logProjectActivity } from "@/lib/logger";
import crypto from "crypto";

/* ==========================================================================
   INTERNAL CORE HELPERS
   ========================================================================== */

/**
 * UTILITY: Explicit Session Parameter Loader
 * Pulls, decrypts, and passes the calling teammate's active identity tokens securely.
 */
async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nexus_session")?.value;
  if (!sessionToken) return null;
  return await decryptSession(sessionToken);
}

/**
 * UTILITY: Centralized Context-Aware ABAC Project Guard Interface Adapter
 * Wraps our library guard into a clean, type-safe error builder for project mutations.
 */
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
 * 🌐 PRIVATE HELPER: Pulls active absolute domain parameters directly from network headers
 */
async function getAbsoluteOriginPrefix(): Promise<string> {
  const headersList = await headers();
  const activeHost = headersList.get("host") || "localhost:3000";
  const protocol = activeHost.includes("localhost") ? "http://" : "https://";
  return `${protocol}${activeHost}`;
}

/* ==========================================================================
   DOMAIN 01: IDENTITY & ACCESS MANAGEMENT (AUTHENTICATION)
   ========================================================================== */

/**
 * FLOW A: Global User Sign Up
 * Registers a new physical user identity, hashes credentials, and starts a JWT session.
 */
export async function signUpUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    throw new Error("All fields are required.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const securePasswordHash = hashSync(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: securePasswordHash,
    },
  });

  const token = await encryptSession({
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
  });

  const cookieStore = await cookies();
  cookieStore.set("nexus_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 Day
  });

  redirect("/signup/organization");
}

/**
 * FLOW B: Production-Grade Sign In Traffic Controller
 */
export async function signInUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please fill in all fields." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !compareSync(password, user.password)) {
    return { error: "Invalid email or password structure." };
  }

  const token = await encryptSession({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const cookieStore = await cookies();
  cookieStore.set("nexus_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  const userMembership = await prisma.membership.findFirst({
    where: { userId: user.id },
  });

  if (!userMembership) {
    redirect("/signup/organization");
  }

  redirect("/dashboard");
}

/**
 * FLOW C: Absolute Session Terminate / Sign Out
 */
export async function logOutUser() {
  const cookieStore = await cookies();
  
  cookieStore.set("nexus_session", "", {
    path: "/",
    expires: new Date(0), 
  });

  redirect("/");
}

/* ==========================================================================
   DOMAIN 02: TENANCY & WORKSPACE ONBOARDING
   ========================================================================== */

/**
 * FLOW A: Workspace/Organization Setup
 */
export async function createOrganization(formData: FormData) {
  const name = formData.get("orgName") as string;
  const slug = formData.get("slug") as string;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nexus_session")?.value;
  
  if (!sessionToken) {
    redirect("/signin");
  }

  const session = await decryptSession(sessionToken);
  if (!session || !name || !slug) {
    throw new Error("Unauthorized or invalid form data submitted.");
  }

  const formattedSlug = slug.toLowerCase().replace(/\s+/g, "-");

  const existingOrg = await prisma.organization.findUnique({ where: { slug: formattedSlug } });
  if (existingOrg) {
    throw new Error("This workspace URL is already taken.");
  }

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name,
        slug: formattedSlug,
      },
    });

    await tx.membership.create({
      data: {
        userId: session.userId,
        organizationId: org.id,
        role: "OWNER", 
      },
    });
  });

  redirect("/dashboard");
}

/* ==========================================================================
   DOMAIN 03: CORE MANAGEMENT ENGINE (PROJECTS)
   ========================================================================== */

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
 * FLOW B: Isolated Directory Search Engine
 */
export async function queryUserDirectory(searchQuery: string) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nexus_session")?.value;
  if (!sessionToken) throw new Error("Unauthenticated context.");

  const session = await decryptSession(sessionToken);
  if (!session) throw new Error("Invalid identity context.");

  const callerMembership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });

  if (!callerMembership) throw new Error("No tenant membership found.");

  const cleanQuery = searchQuery.trim().toLowerCase();

  if (callerMembership.role !== "GUEST") {
    return await prisma.user.findMany({
      where: {
        memberships: {
          some: { organizationId: callerMembership.organizationId }
        },
        OR: [
          { name: { contains: cleanQuery, mode: "insensitive" } },
          { email: { contains: cleanQuery, mode: "insensitive" } }
        ]
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });
  }

  const guestProjects = await prisma.assignment.findMany({
    where: { userId: session.userId },
    select: { projectId: true },
  });

  const projectIds = guestProjects.map(p => p.projectId);

  return await prisma.user.findMany({
    where: {
      assignments: {
        some: { projectId: { in: projectIds } }
      },
      OR: [
        { name: { contains: cleanQuery, mode: "insensitive" } },
        { email: { contains: cleanQuery, mode: "insensitive" } }
      ]
    },
    select: { id: true, name: true, email: true },
    take: 10,
  });
}

/**
 * ACTION A: Hierarchical Task & Sub-Task Creator Engine
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
 * ACTION B: Toggle Task Completion Switch
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
  } catch (err) {
    return { error: "Failed to update database status parameter." };
  }

  revalidatePath("/dashboard/tasks");
  revalidatePath(`/dashboard/projects/${targetTask.projectId}/kanban`);
  return { success: true };
}

/**
 * ACTION B: Patch Task Status State (Kanban Board Controller)
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

    revalidatePath("/dashboard/tasks");
    revalidatePath(`/dashboard/projects/${targetTask.projectId}/kanban`);
    return { success: true, task: updatedTask };
  } catch (error) {
    return { error: "Runtime Error: Failed to write status update parameter to cluster state." };
  }
}

/* ==========================================================================
   DOMAIN 05: ENTERPRISE PROVISIONING & INVITATIONS
   ========================================================================== */

/**
 * PATHWAY 1: Generate an Absolute URL for Individual Single-User Invites
 */
export async function createIndividualInvitation(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as string || "EMPLOYEE";

  if (!email) return { error: "Target email address is required." };

  const secureToken = crypto.randomBytes(32).toString("hex");
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7); 

  try {
    const absoluteOrigin = await getAbsoluteOriginPrefix();
    const fullInviteUrl = `${absoluteOrigin}/invite/${secureToken}`;

    await prisma.invitation.create({
      data: {
        token: secureToken,
        email: email.trim().toLowerCase(),
        role: role as any,
        expiresAt: expiryDate,
        organizationId: "current-organization-id", 
      }
    });

    // Unifies all multi-component mapping properties
    return { success: true, fullLink: fullInviteUrl, inviteLink: fullInviteUrl };
  } catch (error) {
    console.error("Individual Link Engine Failed:", error);
    return { error: "System Fault: Failed to initialize single-use invitation URL." };
  }
}

/**
 * PATHWAY 2: Generate Project-Bound Bulk Join Link
 */
export async function generateProjectJoinLink(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const maxUsesInput = formData.get("maxUses") as string;
  const daysToLiveInput = formData.get("daysToLive") as string;

  if (!projectId || !maxUsesInput || !daysToLiveInput) {
    return { error: "Missing required optimization parameters." };
  }

  const session = await getSession();
  if (!session) redirect("/signin");

  const auth = await verifyProjectMutationAccess(projectId, session.userId);
  if (!auth.authorized) return { error: auth.error };

  const callerMembership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });
  if (!callerMembership) return { error: "Workspace validation linkage anomaly." };

  const secureToken = randomBytes(24).toString("hex");
  const maxUses = parseInt(maxUsesInput, 10);
  
  const structuralExpiration = new Date();
  structuralExpiration.setDate(structuralExpiration.getDate() + parseInt(daysToLiveInput, 10));

  try {
    const absoluteOrigin = await getAbsoluteOriginPrefix();
    const completeJoinUrl = `${absoluteOrigin}/join/${secureToken}`;

    await prisma.joinLink.create({
      data: {
        token: secureToken,
        organizationId: callerMembership.organizationId,
        projectId,
        role: "EMPLOYEE",
        maxUses,
        currentUses: 0,
        expiresAt: structuralExpiration,
      },
    });

    revalidatePath("/dashboard/members");
    
    // Unifies all multi-component onboarding form validation state listeners
    return { success: true, fullLink: completeJoinUrl, joinLinkUrl: completeJoinUrl };
  } catch (error) {
    console.error("Bulk Link Engine Failed:", error);
    return { error: "System fault: Failed to create dynamic bulk link." };
  }
}

/**
 * FLOW C: Consume Token & Ingest New Member Account
 */
export async function acceptIndividualInvitation(token: string, formData: FormData) {
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;

  if (!name || !password) return { error: "Name and password fields are required." };

  const invite = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invite || invite.status !== "PENDING") {
    return { error: "This invitation link is invalid, revoked, or has already been consumed." };
  }

  if (new Date() > invite.expiresAt) {
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "REVOKED" },
    });
    return { error: "This invitation link has expired. Please request a new access token." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const securePasswordHash = hashSync(password, 10);
      const newUser = await tx.user.create({
        data: {
          name,
          email: invite.email,
          password: securePasswordHash,
        }
      });

      await tx.membership.create({
        data: {
          userId: newUser.id,
          organizationId: invite.organizationId,
          role: invite.role,
        }
      });

      await tx.invitation.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" }
      });

      const sessionToken = await encryptSession({
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
      });

      const cookieStore = await cookies();
      cookieStore.set("nexus_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    });
  } catch (error) {
    return { error: "System fault: Execution failed during provisioning transaction runtime." };
  }

  redirect("/dashboard");
}

/**
 * ACTION D: Ingest New Employee via Multi-Use Join Link
 */
export async function acceptJoinLinkOnboarding(token: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) return { error: "All profile registration fields are required." };

  const linkContext = await prisma.joinLink.findUnique({
    where: { token },
  });

  if (!linkContext) return { error: "This onboarding link is invalid or has been revoked." };
  if (linkContext.currentUses >= linkContext.maxUses) return { error: "This invite link has hit its maximum usage allocation threshold." };
  if (new Date() > linkContext.expiresAt) return { error: "This invite link has expired." };

  const userExists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (userExists) return { error: "An account with this email address already exists in Nexus." };

  try {
    await prisma.$transaction(async (tx) => {
      const securePasswordHash = hashSync(password, 10);
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          password: securePasswordHash,
        }
      });

      await tx.membership.create({
        data: {
          userId: newUser.id,
          organizationId: linkContext.organizationId,
          role: linkContext.role,
        }
      });

      if (linkContext.projectId) {
        await tx.assignment.create({
          data: {
            userId: newUser.id,
            projectId: linkContext.projectId,
          }
        });
      }

      await tx.joinLink.update({
        where: { id: linkContext.id },
        data: { currentUses: { increment: 1 } },
      });

      const sessionToken = await encryptSession({
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
      });

      const cookieStore = await cookies();
      cookieStore.set("nexus_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    });
  } catch (error) {
    return { error: "Transaction exception encountered during batch onboarding ingestion sequence." };
  }

  redirect("/dashboard");
}

/* ==========================================================================
   DOMAIN 06: PROJECT SETTINGS MODIFICATION PIPELINE
   ========================================================================== */

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

    await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        visibility: visibility || "PRIVATE",
      },
    });

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

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "ARCHIVED" },
    });

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

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };

  } catch (error) {
    console.error("Assignment Engine Failure:", error);
    return { error: "System Fault: Failed to process team member assignment criteria." };
  }
}

export interface SearchableUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Fetches all platform users for the project assignment dropdown search panel.
 */
export async function getSearchableUsers(): Promise<{ users?: SearchableUser[]; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { error: "Authentication Exception: Please sign in." };
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
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

/**
 * ACTION: Main master task record cascading removal pass
 */
export async function deleteMainTask(taskId: string, projectId: string) {
  const session = await getSession();
  if (!session) return { error: "Authentication required." };

  const guard = await verifyProjectAccess(projectId);
  if (!guard.authorized || !guard.role) {
    return { error: guard.error || "Access Denied: You must be a project member." };
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { creatorId: true, parentId: true }
    });

    if (!task) return { error: "Task not found." };
    if (task.parentId !== null) return { error: "Operation Refused: Use subtask terminal for child nodes." };

    const isOwner = guard.role === "OWNER";
    const isAdminCreator = guard.role === "ADMIN" && task.creatorId === session.userId;

    if (!isOwner && !isAdminCreator) {
      return { 
        error: guard.role === "ADMIN" 
          ? "Access Gated: Administrators can only delete tasks they personally created." 
          : "Access Gated: Employees do not hold structural privileges to remove master task cards." 
      };
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    revalidatePath(`/dashboard/projects/${projectId}/kanban`);
    return { success: true };
  } catch (error) {
    console.error("Deletion Error:", error);
    return { error: "System Error: Failed to complete deletion request pass." };
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

interface ProfileState {
  error?: string | null;
  success?: boolean;
}

/**
 * ACTION: Update active authenticated user profile details
 */
export async function updateUserProfile(prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { error: "Authentication required." };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  if (!name.trim()) return { error: "Full Name field cannot be left blank." };
  if (!email.trim()) return { error: "Email address field cannot be left blank." };

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, error: null };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "This email address is already registered to another account." };
    }
    return { error: "System Fault: Failed to preserve profile modifications." };
  }
}

/**
 * ACTION: Simple sign-out termination pipeline redirection gateway
 */
export async function handleSignOutSession() {
  const cookieStore = await cookies();
  cookieStore.set("nexus_session", "", {
    path: "/",
    expires: new Date(0), 
  });
  return { success: true };
}