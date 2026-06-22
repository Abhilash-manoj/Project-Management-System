// app/actions/communication.ts
"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { decryptSession } from "@/lib/auth";
import { validateMessagingBoundary } from "@/lib/messaging";
import { revalidatePath } from "next/cache";
import { OrgRole } from "@prisma/client";
import { realtimeServer } from "@/lib/realtime";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface SearchPayload {
  organizationId: string;
  currentUserId: string;
  searchQuery: string;
}

interface DeleteMessagePayload {
  messageId: string;
  userId: string;
  organizationId: string;
}

interface GroupChatPayload {
  creatorId: string;
  organizationId: string;
  groupName: string;
  invitedUserIds: string[];
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

export async function getOrCreatePrivateChat(senderId: string, targetUserId: string, organizationId: string) {
  const hasAccess = await validateMessagingBoundary(senderId, targetUserId, organizationId);
  if (!hasAccess) throw new Error("Directory access violation: Cannot communicate with this user.");

  const existingChat = await prisma.conversation.findFirst({
    where: {
      organizationId,
      isGroup: false,
      AND: [
        { participants: { some: { userId: senderId } } },
        { participants: { some: { userId: targetUserId } } }
      ]
    },
    include: { participants: { include: { user: { select: { id: true, name: true } } } } }
  });

  if (existingChat) return existingChat;

  return await prisma.conversation.create({
    data: {
      organizationId,
      isGroup: false,
      participants: {
        create: [
          { userId: senderId },
          { userId: targetUserId }
        ]
      }
    },
    include: { participants: { include: { user: { select: { id: true, name: true } } } } }
  });
}

/**
 * Creates an authorized multi-user group chat room.
 */
export async function createGroupChat(creatorId: string, userIds: string[], groupName: string, organizationId: string) {
  const creatorMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: creatorId, organizationId } }
  });
  if (!creatorMembership || creatorMembership.role === "GUEST") {
    throw new Error("Action restricted: Guests cannot create group channels.");
  }

  const uniqueParticipants = Array.from(new Set([creatorId, ...userIds]));

  return await prisma.conversation.create({
    data: {
      name: groupName,
      isGroup: true,
      organizationId,
      creatorId, 
      participants: {
        create: uniqueParticipants.map(id => ({ userId: id }))
      }
    }
  });
}

/**
 * ACTION: Fetches all employees belonging to the exact same company tenant boundary.
 */
export async function getCompanyDirectory(payload: SearchPayload) {
  const { organizationId, currentUserId, searchQuery } = payload;
  const cleanSearch = searchQuery.trim().toLowerCase();

  const callerMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: currentUserId, organizationId } }
  });
  if (!callerMembership) throw new Error("Multi-Tenant Isolation Exception: Core boundary mismatch.");

  if (callerMembership.role === "GUEST") {
    const guestAssignments = await prisma.assignment.findMany({
      where: { userId: currentUserId },
      select: { projectId: true }
    });
    const projectIds = guestAssignments.map(a => a.projectId);

    return await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        assignments: { some: { projectId: { in: projectIds } } },
        memberships: { some: { organizationId } },
        OR: [
          { name: { contains: cleanSearch, mode: "insensitive" } },
          { email: { contains: cleanSearch, mode: "insensitive" } }
        ]
      },
      select: { id: true, name: true, email: true },
      take: 20
    });
  }

  return await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      memberships: {
        some: { organizationId }
      },
      OR: [
        { name: { contains: cleanSearch, mode: "insensitive" } },
        { email: { contains: cleanSearch, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        where: { organizationId },
        select: { role: true }
      }
    },
    orderBy: { name: "asc" },
    take: 50
  });
}

/**
 * ACTION: Fetches all active conversations for the current user.
 */
export async function getUserConversations(userId: string, organizationId: string) {
  return await prisma.conversation.findMany({
    where: {
      organizationId,
      participants: { some: { userId } }
    },
    // 🚀 FIXED: Only relational fields are left here. Base fields are fetched automatically!
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { name: true } } }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}

/**
 * ACTION: Fetches messages for a specific conversation and updates lastViewedAt cursor references.
 */
export async function getConversationMessages(conversationId: string, userId: string) {
  try {
    await prisma.participant.updateMany({
      where: {
        conversationId,
        userId
      },
      data: {
        lastViewedAt: new Date() 
      }
    });

    return await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true } } }
    });
  } catch (error) {
    console.error("Failed to clear read status indexes:", error);
    return [];
  }
}
/**
 * ACTION: Computes the aggregate number of unread messages across all company rooms the user is a part of.
 */
export async function getUnreadMessageCount(userId: string, organizationId: string): Promise<number> {
  try {
    const participantRooms = await prisma.participant.findMany({
      where: {
        userId,
        conversation: { organizationId }
      },
      select: {
        conversationId: true,
        lastViewedAt: true
      }
    });

    if (participantRooms.length === 0) return 0;

    let totalUnread = 0;

    for (const room of participantRooms) {
      const count = await prisma.message.count({
        where: {
          conversationId: room.conversationId,
          senderId: { not: userId }, 
          createdAt: { gt: room.lastViewedAt }
        }
      });
      totalUnread += count;
    }

    return totalUnread;
  } catch (error) {
    console.error("Failed to compute unread metrics:", error);
    return 0;
  }
}

/**
 * ACTION: Resets the read cursor whenever a user opens or updates a chat viewport thread.
 */
export async function markConversationAsRead(conversationId: string, userId: string) {
  try {
    await prisma.participant.update({
      where: {
        conversationId_userId: { conversationId, userId }
      },
      data: {
        lastViewedAt: new Date()
      }
    });
    return { success: true };
  } catch (err) {
    console.error("Failed to update cursor reference stamp:", err);
    return { error: "Cursor modification failed." };
  }
}

/**
 * ACTION: Securely generates a multi-tenant group conversation space.
 */
export async function createGroupChatAction(payload: GroupChatPayload) {
  const { creatorId, organizationId, groupName, invitedUserIds } = payload;
  const cleanName = groupName.trim();

  if (!cleanName) return { error: "A valid group name designation is required." };

  try {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: creatorId,
          organizationId
        }
      }
    });

    if (!membership) {
      return { error: "Multi-tenant isolation breach: Profile link not verified." };
    }

    const isAuthorized = membership.role === OrgRole.OWNER || membership.role === OrgRole.ADMIN;
    if (!isAuthorized) {
      return { error: "Access Gated: Only workspace Owners and Administrators can establish group channels." };
    }

    const cleanParticipantIds = Array.from(new Set([creatorId, ...invitedUserIds]));

    const newGroup = await prisma.conversation.create({
      data: {
        name: cleanName,
        isGroup: true,
        organizationId,
        creatorId, 
        participants: {
          create: cleanParticipantIds.map(id => ({
            userId: id,
            lastViewedAt: new Date()
          }))
        }
      },
      select: { id: true }
    });

    revalidatePath("/dashboard/messages");
    return { success: true, conversationId: newGroup.id };

  } catch (error) {
    console.error("Group Chat Generation Pipeline Fault:", error);
    return { error: "Database transaction runtime interruption encountered." };
  }
}

/**
 * Dispatches a message entry transaction node, extracts mentions, and triggers layouts syncs.
 */
export async function sendMessage(conversationId: string, senderId: string, body: string, attachments: string[] = []) {
  const isParticipant = await prisma.participant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
    include: { conversation: true }
  });
  if (!isParticipant) throw new Error("Unauthorized message dispatch attempt.");

  const targetOrgId = isParticipant.conversation.organizationId;

  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const extractedUserIds: string[] = [];
  let match;
  while ((match = mentionRegex.exec(body)) !== null) {
    const parsedId = match[2];
    if (parsedId !== senderId) {
      extractedUserIds.push(parsedId);
    }
  }
  const uniqueMentionedIds = Array.from(new Set(extractedUserIds));

  return await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: { conversationId, senderId, body, attachments },
      include: { 
        sender: { select: { id: true, name: true, email: true } } 
      }
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    if (uniqueMentionedIds.length > 0) {
      await tx.messageMention.createMany({
        data: uniqueMentionedIds.map(userId => ({
          messageId: message.id,
          userId: userId
        }))
      });

      await tx.notification.createMany({
        data: uniqueMentionedIds.map(userId => ({
          recipientId: userId,
          organizationId: targetOrgId,
          type: "MENTION" as any, 
          title: "💬 Mentions Tag Alert",
          description: `${message.sender.name || "A team member"} tagged you in a conversation timeline thread.`,
          isRead: false
        }))
      });
    }

    try {
      await realtimeServer.trigger(`chat-${conversationId}`, "new-message", {
        id: message.id,
        body: message.body,
        senderId: message.senderId,
        createdAt: message.createdAt,
        conversationId: conversationId,
        sender: message.sender
      });
    } catch (realtimeError) {
      console.error("Non-blocking fault encountered in real-time streaming pool:", realtimeError);
    }

    return message;
  });
}

/**
 * API ENDPOINT: Resolves a specific user's operational role within an organization.
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
 * ACTION: Securely purges a message from a chat timeline.
 */
export async function deleteMessageAction({ messageId, userId, organizationId }: DeleteMessagePayload) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true }
    });

    if (!message) {
      return { error: "Message does not exist or has already been deleted." };
    }

    const isAuthor = message.senderId === userId;

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      }
    });

    const isPrivileged = membership && (membership.role === OrgRole.OWNER || membership.role === OrgRole.ADMIN);

    if (!isAuthor && !isPrivileged) {
      return { error: "Access Gated: You do not have permission to delete this message." };
    }

    await prisma.message.delete({
      where: { id: messageId }
    });

    try {
      await realtimeServer.trigger(`chat-${message.conversationId}`, "message-deleted", {
        messageId: messageId,
        conversationId: message.conversationId
      });
    } catch (realtimeError) {
      console.error("Non-blocking real-time sync drop:", realtimeError);
    }

    return { success: true };
  } catch (error) {
    console.error("Message deletion transactional fault:", error);
    return { error: "Failed to execute server-side removal transaction." };
  }
}

/**
 * Moderation Action: Evict an active member from a group chat conversation stream.
 */
export async function removeUserFromGroup(conversationId: string, targetUserId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication expired." };

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { creatorId: true, isGroup: true }
    });

    if (!conversation || !conversation.isGroup) {
      return { error: "Target conversational node is not an active group cluster." };
    }

    if (conversation.creatorId !== session.userId) {
      return { error: "Clearance Fault: Only the group creator can remove team members." };
    }

    if (targetUserId === session.userId) {
      return { error: "Validation Fault: You cannot evict yourself. Disband or delete the channel instead." };
    }

    await prisma.participant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId
        }
      }
    });

    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch (error) {
    console.error("Failed to execute member eviction:", error);
    return { error: "Database transaction exception encountered during moderation change." };
  }
}

/**
 * Moderation Action: Disband and securely delete an entire group chat timeline matrix.
 */
export async function deleteGroupChat(conversationId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication expired." };

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { creatorId: true }
    });

    if (!conversation) return { error: "Conversation target missing." };

    if (conversation.creatorId !== session.userId) {
      return { error: "Clearance Fault: Only the group creator possesses structural access to purge this room." };
    }

    await prisma.conversation.delete({
      where: { id: conversationId }
    });

    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch (error) {
    console.error("Group deletion critical exception:", error);
    return { error: "Failed to execute server-side removal transaction." };
  }
}