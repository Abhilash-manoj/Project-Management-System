// app/actions/org.ts
"use server";

import { prisma } from "@/lib/db";

/**
 * UTILITY: Resolves the active operational organization bounds for a specific user.
 * Essential for binding multi-tenant notification feeds properly.
 */
export async function resolveCurrentOrganizationMembership(userId: string) {
  try {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: {
        organizationId: true,
        role: true
      }
    });

    if (!membership) {
      return { organizationId: "", role: "EMPLOYEE", error: "No active workspace membership found." };
    }

    return membership;
  } catch (error) {
    console.error("Critical fault checking structural organization indexes:", error);
    return { organizationId: "", role: "EMPLOYEE", error: "Database checkout execution error." };
  }
}