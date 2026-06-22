// app/actions/announcements.ts
"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createBroadcastAnnouncement(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication expired." };

    // 1. Fetch user workspace multi-tenant membership boundary context
    const membership = await prisma.membership.findFirst({
      where: { userId: session.userId }
    });
    if (!membership) return { error: "Organization profile footprint tracking not found." };

    // 2. Clearances Gate: Restrict broadcast access exclusively to Owners and Admins
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return { error: "Access Gated: Only workspace Owners or Admins can dispatch global announcements." };
    }

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const isPriority = formData.get("isPriority") === "true";

    if (!title || !title.trim() || !content || !content.trim()) {
      return { error: "Validation Fault: Please populate all announcement content fields." };
    }

    // 3. Collect all other active user memberships inside this specific organization tier
    const organizationMembers = await prisma.membership.findMany({
      where: { 
        organizationId: membership.organizationId,
        NOT: { userId: session.userId } // Exclude the authoring sender from receiving their own notification
      },
      select: { userId: true }
    });

    // 4. Execute atomic transactional block to pin the record and batch-dispatch alerts
    await prisma.$transaction(async (tx) => {
      // A. Create the base announcement bulletin record
      const newAnnouncement = await tx.announcement.create({
        data: {
          title: title.trim(),
          content: content.trim(),
          isPriority,
          organizationId: membership.organizationId,
          creatorId: session.userId
        }
      });

      // B. Dynamically compile notification arrays for every member in the organization
     if (organizationMembers.length > 0) {
  await tx.notification.createMany({
    data: organizationMembers.map((member) => ({
      recipientId: member.userId,
      organizationId: membership.organizationId,
      type: (isPriority ? "SYSTEM_ALERT" : "GENERAL_ANNOUNCEMENT") as any, 
      title: isPriority ? "🚨 URGENT: Organization Announcement" : "📢 New Organization Announcement",
      description: `"${title.trim()}" broadcasted by ${session.name || "Management"}.`,
      isRead: false,
    }))
  });
}
    });

    revalidatePath("/dashboard/announcements");
    revalidatePath("/dashboard"); // Clears standard layout header message indicators instantly
    return { success: true };
  } catch (error) {
    console.error("Broadcast notification exception error:", error);
    return { error: "System fault: Failed to compile broadcast announcement payload." };
  }
}