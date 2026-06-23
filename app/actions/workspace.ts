"use server";

import { prisma } from "@/lib/db";
import { getSession } from "./auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { verifyProjectAccess } from "@/lib/rbac";

/**
 * INTERNAL HELPERS: Verify explicit mutation attributes
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

async function getAbsoluteOriginPrefix(): Promise<string> {
  const headersList = await headers();
  const activeHost = headersList.get("host") || "localhost:3000";
  const protocol = activeHost.includes("localhost") ? "http://" : "https://";
  return `${protocol}${activeHost}`;
}

/**
 * FLOW A: Workspace/Organization Setup
 */
export async function createOrganization(formData: FormData) {
  const name = formData.get("orgName") as string;
  const slug = formData.get("slug") as string;

  const session = await getSession();
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

/**
 * PATHWAY 1: Generate an Absolute URL for Individual Single-User Invites
 */
export async function createIndividualInvitation(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as string || "EMPLOYEE";

  if (!email) return { error: "Target email address is required." };

  const session = await getSession();
  if (!session) redirect("/signin");

  const userMembership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });
  if (!userMembership) return { error: "Isolation Anomaly: Active tenant space not verified." };

  const secureToken = randomBytes(32).toString("hex");
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
        organizationId: userMembership.organizationId, 
      }
    });

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
    return { success: true, fullLink: completeJoinUrl, joinLinkUrl: completeJoinUrl };
  } catch (error) {
    console.error("Bulk Link Engine Failed:", error);
    return { error: "System fault: Failed to create dynamic bulk link." };
  }
}

/**
 * FLOW C: Consume Token & Ingest New Member Account (Individual Link)
 */
export async function acceptIndividualInvitation(token: string, formData: FormData) {
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;
  const typedDepartment = formData.get("department") as string; // 🚀 NEW: Extracted plain string input parameters
  const { encryptSession } = await import("@/lib/auth");
  const { hashSync } = await import("bcrypt-ts");

  if (!name || !password || !typedDepartment || typedDepartment.trim() === "") {
    return { error: "Validation Error: All profile registration fields are required." };
  }

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
          department: typedDepartment.trim(), // 🚀 NEW: Persisted plain string data
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
 * ACTION D: Ingest New Employee via Multi-Use Join Link (Bulk Link)
 */
export async function acceptJoinLinkOnboarding(token: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const typedDepartment = formData.get("department") as string; // 🚀 NEW: Extracted plain string input parameters
  const { encryptSession } = await import("@/lib/auth");
  const { hashSync } = await import("bcrypt-ts");

  if (!name || !email || !password || !typedDepartment || typedDepartment.trim() === "") {
    return { error: "All profile registration fields are required." };
  }

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
          department: typedDepartment.trim(), // 🚀 NEW: Persisted plain string data
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

/**
 * ACTION: Update active authenticated user profile details
 */
export async function updateProfileSettings(formData: FormData, uploadedAvatarUrl?: string) {
  console.log("🔌 [SERVER ACTION] Invoked. Avatar string URL input:", uploadedAvatarUrl || "None");
  try {
    const session = await getSession();
    console.log("🔑 [SERVER ACTION] Session checked. User ID:", session?.userId || "No Session found");
    if (!session) return { error: "Authentication session expired." };

    const fullName = formData.get("fullName") as string;
    const typedDepartment = formData.get("department") as string; 
    console.log("📝 [SERVER ACTION] Fields parsed:", { fullName, typedDepartment });

    if (!fullName || fullName.trim() === "") {
      return { error: "Validation Error: Full Name cannot be left blank." };
    }

    console.log("💾 [SERVER ACTION] Executing Prisma User update query...");
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { 
        name: fullName.trim(),
        ...(uploadedAvatarUrl && { avatarUrl: uploadedAvatarUrl })
      },
    });
    console.log("✅ [SERVER ACTION] Prisma User model written successfully:", updatedUser.id);

    console.log("💾 [SERVER ACTION] Executing Prisma Membership updateMany query...");
    await prisma.membership.updateMany({
      where: { userId: session.userId },
      data: {
        department: typedDepartment && typedDepartment.trim() !== "" ? typedDepartment.trim() : null
      }
    });
    console.log("✅ [SERVER ACTION] Prisma Membership rows written successfully.");

    console.log("⚡ [SERVER ACTION] Revalidating cache segments...");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    
    console.log("🚀 [SERVER ACTION] Complete. Returning success flag true.");
    return { success: true };
  } catch (error) {
    console.error("❌ [SERVER ACTION CRASH] Failure inside transaction block:", error);
    return { error: "Database transaction exception failure." };
  }
}