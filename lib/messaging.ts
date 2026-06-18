// lib/messaging.ts
import { OrgRole } from '@prisma/client';
import { prisma } from "@/lib/db"; // 🔒 FIXED: Import your centralized database pool instance here

/**
 * Validates whether the sender has permission to message the target user
 * based on tenant separation rules and role restrictions.
 */
export async function validateMessagingBoundary(
  senderId: string,
  targetUserId: string,
  organizationId: string
): Promise<boolean> {
  // 1. Confirm target belongs to the same organization boundary
  const targetMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId } }
  });
  if (!targetMembership) return false;

  // 2. Fetch sender's role clearance status
  const senderMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: senderId, organizationId } }
  });
  if (!senderMembership) return false;

  // 3. Guest Scoped Restriction enforcement
  if (senderMembership.role === OrgRole.GUEST) {
    // A Guest can only message users who share at least one active project assignment
    const sharedProjects = await prisma.assignment.findMany({
      where: {
        userId: senderId,
        project: {
          organizationId,
          assignments: { some: { userId: targetUserId } }
        }
      }
    });
    return sharedProjects.length > 0;
  }

  // Owners, Admins, and Employees can message anyone within the tenant
  return true;
}