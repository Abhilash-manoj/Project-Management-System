// app/actions/organizationMembers.ts
"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * ACTION: Toggles an organization user's status between ACTIVE and INACTIVE.
 * Purely restricted to the organization OWNER.
 */
export async function toggleUserActiveStatusAction(targetUserId: string, currentStatus: string) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication checkpoint breach." };

    // 1. Verify the caller is the absolute root OWNER
    const callerMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });

    if (!callerMembership || callerMembership.role !== "OWNER") {
      return { error: "Access Gated: Only the Organization Owner can deactivate user infrastructure accounts." };
    }

    if (session.userId === targetUserId) {
      return { error: "Security Guard Failure: You cannot deactivate your own root Owner account." };
    }

    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    // 2. Execute target membership update row
    await prisma.membership.updateMany({
      where: { userId: targetUserId, organizationId: callerMembership.organizationId },
      data: { status: nextStatus },
    });

    revalidatePath("/dashboard/members");
    return { success: true };
  } catch (error) {
    console.error("Failed to modify target account status layout:", error);
    return { error: "Relational storage mapping timeout exception." };
  }
}

/**
 * ACTION: Promotes or demotes an account between ADMIN and EMPLOYEE roles.
 * Purely restricted to the organization OWNER.
 */
export async function changeUserTenantRoleAction(targetUserId: string, targetRole: "ADMIN" | "EMPLOYEE") {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication required." };

    const callerMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });

    if (!callerMembership || callerMembership.role !== "OWNER") {
      return { error: "Access Gated: Only the Organization Owner can modify member infrastructure access tokens." };
    }

    if (session.userId === targetUserId) {
      return { error: "Security Guard Failure: You cannot demote your own root Owner position." };
    }

    // Update the tenant tracking token role field row matching conditions
    await prisma.membership.updateMany({
      where: { userId: targetUserId, organizationId: callerMembership.organizationId },
      data: { role: targetRole },
    });

    revalidatePath("/dashboard/members");
    return { success: true };
  } catch (error) {
    console.error("Failed to re-assign target access token role:", error);
    return { error: "Relational storage transactional fault encountered." };
  }
}