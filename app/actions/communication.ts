"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { decryptSession } from "@/lib/auth";
import { validateMessagingBoundary } from "@/lib/messaging";
import { revalidatePath } from "next/cache";
import { OrgRole } from "@prisma/client";
import { realtimeServer } from "@/lib/realtime";
import { NextRequest, NextResponse } from "next/server";

interface SearchPayload {
  organizationId: string;
  currentUserId: string;
  searchQuery: string;
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

    // Fetch and return historical message arrays as normal
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
    // 1. Grab all conversations joined by the user inside this organization boundary
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

    // 2. Count messages created after each room's specific lastViewedAt cursor
    for (const room of participantRooms) {
      const count = await prisma.message.count({
        where: {
          conversationId: room.conversationId,
          senderId: { not: userId }, // Don't count your own text echoes as unread
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


interface GroupChatPayload {
  creatorId: string;
  organizationId: string;
  groupName: string;
  invitedUserIds: string[];
}

/**
 * ACTION: Securely generates a multi-tenant group conversation space.
 * Gated Constraint: Only Org Owners and Admins have structural clearance to invoke this mutation.
 */
export async function createGroupChatAction(payload: GroupChatPayload) {
  const { creatorId, organizationId, groupName, invitedUserIds } = payload;
  const cleanName = groupName.trim();

  if (!cleanName) return { error: "A valid group name designation is required." };

  try {
    // 1. Resolve caller membership and authorize against role constraints
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

    // Strict Clearance Gate: Prevent EMPLOYEE and GUEST tiers from completing initialization
    const isAuthorized = membership.role === OrgRole.OWNER || membership.role === OrgRole.ADMIN;
    if (!isAuthorized) {
      return { error: "Access Gated: Only workspace Owners and Administrators can establish group channels." };
    }

    // 2. Build explicit unique participant array ensuring creator is pinned
    const cleanParticipantIds = Array.from(new Set([creatorId, ...invitedUserIds]));

    // 3. Commit atomic transaction pool instantiation
    const newGroup = await prisma.conversation.create({
      data: {
        name: cleanName,
        isGroup: true,
        organizationId,
        participants: {
          create: cleanParticipantIds.map(id => ({
            userId: id,
            // Pre-seed read cursor layout to synchronize unread badge baselines cleanly
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
 * Dispatches a message entry transaction node and triggers a real-time layout sync.
 */
export async function sendMessage(conversationId: string, senderId: string, body: string, attachments: string[] = []) {
  const isParticipant = await prisma.participant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } }
  });
  if (!isParticipant) throw new Error("Unauthorized message dispatch attempt.");

  return await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: { conversationId, senderId, body, attachments },
      include: { 
        sender: { select: { id: true, name: true, email: true } } 
      }
    });

    // Touch conversation record timestamp update flag
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    // 🚀 NEW: Broadcast the fresh payload into the unique room subscription channel stream
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


interface DeleteMessagePayload {
  messageId: string;
  userId: string;
  organizationId: string;
}

/**
 * ACTION: Securely purges a message from a chat timeline.
 * Constraints: Gated to the original message sender, or workspace Owners and Admins.
 */
export async function deleteMessageAction({ messageId, userId, organizationId }: DeleteMessagePayload) {
  try {
    // 1. Fetch target message along with context about the room layout
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true }
    });

    if (!message) {
      return { error: "Message does not exist or has already been deleted." };
    }

    // 2. Check if the user is the original author
    const isAuthor = message.senderId === userId;

    // 3. Resolve caller organization role permissions criteria
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      }
    });

    const isPrivileged = membership && (membership.role === OrgRole.OWNER || membership.role === OrgRole.ADMIN);

    // Security Gate check
    if (!isAuthor && !isPrivileged) {
      return { error: "Access Gated: You do not have permission to delete this message." };
    }

    // 4. Purge message node securely
    await prisma.message.delete({
      where: { id: messageId }
    });

    // 5. 🚀 REAL-TIME BROADCAST: Emits delete payload into Pusher stream instantly
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