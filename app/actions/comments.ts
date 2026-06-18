// app/actions/comments.ts
"use server";

import { prisma } from "@/lib/db";
import { getSession } from "./auth";
import { createNotificationAction } from "./notifications";
import { revalidatePath } from "next/cache";

/**
 * ACTION: Appends a text comment to a specific task card.
 */
export async function createTaskComment(taskId: string, body: string) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication required." };

    const cleanBody = body.trim();
    if (!cleanBody) return { error: "Comment text cannot be empty." };

    // 1. Save the comment row
    const comment = await prisma.comment.create({
      data: {
        body: cleanBody,
        taskId,
        authorId: session.userId,
      },
      include: {
        author: { select: { name: true } },
        // 🚀 FIXED: Added assigneeId to selection criteria alongside creatorId
        task: { select: { title: true, creatorId: true, assigneeId: true, projectId: true } }
      }
    });

    // 2. Resolve organization context for notifications
    const userMembership = await prisma.membership.findFirst({
      where: { userId: session.userId },
    });

    if (userMembership) {
      const orgId = userMembership.organizationId;
      const snippet = cleanBody.length > 40 ? `${cleanBody.substring(0, 40)}...` : cleanBody;

      // 🚀 NOTIFICATION SYSTEM 1: Alert the Task Creator if someone else comments
      if (comment.task.creatorId !== session.userId) {
        await createNotificationAction({
          recipientId: comment.task.creatorId,
          senderId: session.userId,
          organizationId: orgId,
          type: "MENTION", 
          title: "New Comment on Task",
          description: `${session.name} commented on your created task "${comment.task.title}": "${snippet}"`
        });
      }

      // 🚀 NOTIFICATION SYSTEM 2: Alert the Assignee if someone else comments
      if (comment.task.assigneeId && comment.task.assigneeId !== session.userId && comment.task.assigneeId !== comment.task.creatorId) {
        await createNotificationAction({
          recipientId: comment.task.assigneeId,
          senderId: session.userId,
          organizationId: orgId,
          type: "MENTION",
          title: "New Comment on Your Assignment",
          description: `${session.name} commented on a task assigned to you "${comment.task.title}": "${snippet}"`
        });
      }
    }

    revalidatePath(`/dashboard/tasks`);
    return { success: true, comment };
  } catch (error) {
    console.error("Failed to append task comment node:", error);
    return { error: "System fault: Failed to save comment metadata." };
  }
}

/**
 * ACTION: Gathers all historical comments for a specific task card.
 */
export async function getTaskComments(taskId: string) {
  try {
    return await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });
  } catch (error) {
    console.error("Failed to fetch task comments:", error);
    return [];
  }
}