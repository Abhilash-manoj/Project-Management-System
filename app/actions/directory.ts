// app/actions/directory.ts
"use server"

import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface SearchPayload {
  organizationId: string;
  currentUserId: string;
  searchQuery: string;
}

/**
 * ACTION: Queries users within the tenant organization boundary for the message search interface.
 */
export async function searchCompanyDirectory(payload: SearchPayload) {
  const { organizationId, currentUserId, searchQuery } = payload;
  const cleanSearch = searchQuery.trim().toLowerCase();

  if (!cleanSearch) return [];

  // Verify multi-tenant membership bounds
  const callerMembership = await prisma.membership.findFirst({
    where: { userId: currentUserId, organizationId }
  });
  if (!callerMembership) throw new Error("Multi-tenant boundary lock exception.");

  return await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      memberships: { some: { organizationId } },
      OR: [
        { name: { contains: cleanSearch, mode: "insensitive" } },
        { email: { contains: cleanSearch, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true
    },
    take: 8
  });
}


/**
 * API ENDPOINT: Resolves a specific user's operational role within an organization.
 * Used by client canvases to conditionally toggle high-privilege administrative actions.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("orgId");
    const userId = searchParams.get("userId");

    if (!organizationId || !userId) {
      return NextResponse.json({ error: "Missing identity parameters" }, { status: 400 });
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      },
      select: { role: true }
    });

    if (!membership) {
      return NextResponse.json({ role: "EMPLOYEE" }, { status: 200 });
    }

    return NextResponse.json({ role: membership.role }, { status: 200 });
  } catch (error) {
    console.error("Failed to resolve membership metrics:", error);
    return NextResponse.json({ error: "Internal processing failure" }, { status: 500 });
  }
}

/**
 * ACTION: Securely resolves a user's organizational role.
 * Bypasses network fetch overhead by executing directly against Prisma.
 */
export async function getMembershipRoleAction(userId: string, organizationId: string) {
  try {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      },
      select: { role: true }
    });

    return { role: membership?.role || "EMPLOYEE" };
  } catch (error) {
    console.error("Failed to fetch member role criteria:", error);
    return { role: "EMPLOYEE", error: "Database checkout execution error." };
  }
}