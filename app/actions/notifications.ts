// app/actions/notifications.ts
"use server"

import { prisma } from "@/lib/db";
import { realtimeServer } from "@/lib/realtime";
import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface TriggerNotificationPayload {
  recipientId: string;
  senderId?: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  description: string;
}

/**
 * ACTION: Spawns an internal notification event node and alerts the user live.
 */
export async function createNotificationAction(payload: TriggerNotificationPayload) {
  try {
    const notification = await prisma.notification.create({
      data: payload,
      include: {
        sender: { select: { name: true } }
      }
    });

    // 🚀 LIVE BROADCAST: Push notification to the targeted user's unique channel instantly
    await realtimeServer.trigger(`user-alerts-${payload.recipientId}`, "new-alert", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      description: notification.description,
      isRead: false,
      createdAt: notification.createdAt,
      sender: notification.sender
    });

    return { success: true, notification };
  } catch (error) {
    console.error("Failed to execute alert insertion pipeline:", error);
    return { error: "Notification dispatch error encountered." };
  }
}

/**
 * ACTION: Gathers user notifications matching tenant scoping settings.
 */
export async function getUserNotifications(userId: string, organizationId: string) {
  try {
    return await prisma.notification.findMany({
      where: { recipientId: userId, organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { name: true } }
      }
    });
  } catch (error) {
    console.error("Failed to gather user alerts log array:", error);
    return [];
  }
}

/**
 * ACTION: Marks a specific notification element entry as read.
 */
export async function markAsReadAction(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to update notification state cursor." };
  }
}

/**
 * ACTION: Marks all notifications within an organization context as read simultaneously.
 */
export async function markAllNotificationsAsRead(userId: string, organizationId: string) {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: userId, organizationId, isRead: false },
      data: { isRead: true }
    });
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    return { error: "Failed to execute massive read mutation." };
  }
}


/**
 * ACTION: Counts unread system alerts isolated to the current user and org tenant.
 */
export async function getUnreadNotificationCount(userId: string, organizationId: string): Promise<number> {
  try {
    const count = await prisma.notification.count({
      where: {
        recipientId: userId,
        organizationId,
        isRead: false,
      },
    });
    return count;
  } catch (error) {
    console.error("Failed to count unread notifications:", error);
    return 0;
  }
}