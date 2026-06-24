// app/api/membership/route.ts
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * API ENDPOINT: Resolves a specific user's operational role within an organization.
 * Accessible via: GET /api/membership?orgId=XYZ&userId=ABC
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