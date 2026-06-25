// app/dashboard/projects/[projectId]/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import ProjectTabsContainer from "./components/ProjectTabsContainer";
import { verifyProjectAccess } from "@/lib/rbac"; 

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const { projectId } = await params;

  // ==========================================================================
  // 🔑 STEP 1: RESOLVE USER GLOBAL ROLE FIRST BEFORE ENFORCING PERIMETER ROSTERS
  // ==========================================================================
  const currentMembership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });
  if (!currentMembership) redirect("/signup/organization");

  const isGlobalOwner = currentMembership.role === "OWNER";
  const isGlobalAdmin = currentMembership.role === "ADMIN";
  const isOwnerOrAdmin = isGlobalOwner || isGlobalAdmin;

  // ==========================================================================
  // 🛡️ STEP 2: SECURITY PERIMETER CHECK WITH GLOBAL ADMIN BYPASS
  // ==========================================================================
  // If they are a global administrator, bypass project roster checks entirely
  if (!isOwnerOrAdmin) {
    const guard = await verifyProjectAccess(projectId);
    if (!guard.authorized) {
      redirect("/dashboard");
    }
  }

  const projectData = await prisma.project.findUnique({ where: { id: projectId } });
  if (!projectData) notFound();

  // Hierarchical Leaf-Node Progress Metric Calculator Engine
  const standaloneTasks = await prisma.task.findMany({
    where: {
      projectId,
      parentId: null,
      subTasks: { none: {} }
    }
  });

  const executableSubTasks = await prisma.task.findMany({
    where: {
      projectId,
      NOT: { parentId: null }
    }
  });

  const doneStandalone = standaloneTasks.filter(t => t.status === "DONE").length;
  const doneSubTasks = executableSubTasks.filter(t => t.status === "DONE").length;

  const totalWorkUnits = standaloneTasks.length + executableSubTasks.length;
  const completedWorkUnits = doneStandalone + doneSubTasks;
  const progressRatio = totalWorkUnits > 0 ? Math.round((completedWorkUnits / totalWorkUnits) * 100) : 0;

  // ==========================================================================
  // DEEP-FETCH ASSIGNED USER MEMBERSHIP COHORTS
  // ==========================================================================
  const projectAssignments = await prisma.assignment.findMany({
    where: { projectId },
    include: { 
      user: { 
        select: { 
          id: true, 
          name: true, 
          email: true,
          avatarUrl: true, 
          memberships: {
            where: { organizationId: currentMembership.organizationId },
            select: { 
              role: true,
              department: true 
            }
          }
        } 
      } 
    },
  });

  const serializedMembers = projectAssignments.map(a => ({
    id: String(a.user.id || ""),
    name: String(a.user.name || "Unknown Teammate"),
    avatarUrl: a.user.avatarUrl 
  }));

  // ==========================================================================
  // 📊 FETCH LAYOUT PARAMETERS FOR THE INTEGRATED KANBAN TAB
  // ==========================================================================
  const customColumns = await prisma.boardColumn.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });

  const activeStages = customColumns.length > 0 
    ? customColumns.map((c) => c.name) 
    : ["TODO", "IN_PROGRESS", "DONE"];

  const fallbackLaneName = activeStages[0];

  const allKanbanTasks = await prisma.task.findMany({
    where: { 
      projectId,
      parentId: null 
    },
    orderBy: { createdAt: "asc" },
    include: {
      assignee: { select: { name: true, avatarUrl: true } },
      subTasks: {
        orderBy: { createdAt: "asc" },
        include: {
          assignee: { select: { name: true, avatarUrl: true } }
        }
      }
    }
  });

  // Run server side cascading task migration mapping
  const normalizedKanbanTasks = allKanbanTasks.map((task) => {
    let targetedStatus = task.status;

    if (!activeStages.includes(task.status)) {
      if (task.status === "IN_PROGRESS" && activeStages.includes("IN_DEVELOPMENT")) {
        targetedStatus = "IN_DEVELOPMENT";
      } else if (task.status === "REVIEW" && activeStages.includes("QA_TESTING")) {
        targetedStatus = "QA_TESTING";
      } else {
        targetedStatus = fallbackLaneName;
      }
    }

    return {
      ...task,
      status: targetedStatus,
      priority: (task.priority === "URGENT" ? "CRITICAL" : task.priority) as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      subTasks: task.subTasks.map((sub) => ({
        ...sub,
        status: sub.status
      }))
    };
  });

  const parentTrackTasks = await prisma.task.findMany({
    where: { projectId, parentId: null },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  const dbActivityLogs = await prisma.activityLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const serializedActivityLogs = dbActivityLogs.map(log => {
    const diffMs = new Date().getTime() - new Date(log.createdAt).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let relativeTimeStr = "Just Now";
    if (diffDays > 0) relativeTimeStr = `${diffDays}d ago`;
    else if (diffHours > 0) relativeTimeStr = `${diffHours}h ago`;

    return {
      id: log.id,
      user: log.actorName,
      action: log.action,
      time: relativeTimeStr,
    };
  });

  // ==========================================================================
  // 🔒 ATTRIBUTE PROTECTION FLAGS FOR INTERACTIVE PERMISSIONS
  // ==========================================================================
  const isCreator = projectData.creatorId === session.userId;
  const isAssigned = projectAssignments.some(a => a.userId === session.userId);

  // Private Visibility Guard Check
  if (projectData.visibility === "PRIVATE" && !isOwnerOrAdmin && !isAssigned) {
    redirect("/dashboard/projects");
  }

  // 🚀 ADMIN VIEW MUTATION ACCESS MATRIX WRAPPER
  // Non-participant Admins/Owners pass the isOwnerOrAdmin gate above to VIEW the board,
  // but they fail 'canMutate' here, locking them into Read-Only safety mode!
  const canMutate = isCreator || isAssigned;

  return (
    <ProjectTabsContainer
      isAuthorized={isOwnerOrAdmin}
      canMutate={canMutate} 
      overview={{
        progress: progressRatio,
        totalTasks: totalWorkUnits,
        completedTasks: completedWorkUnits,
        memberCount: projectAssignments.length,
        recentTasks: JSON.parse(JSON.stringify(parentTrackTasks)),
      }}
      members={projectAssignments.map((a) => {
        const orgMembership = a.user.memberships[0];
        const computedRole = orgMembership?.role || "EMPLOYEE";
        const computedDept = orgMembership?.department || "";

        return {
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          avatarUrl: a.user.avatarUrl,
          role: computedRole, 
          department: computedDept, 
          status: "Active",
        };
      })}
      activity={serializedActivityLogs}
      settings={{
        id: projectData.id,
        name: projectData.name,
        description: projectData.description || "",
        visibility: projectData.visibility || "PRIVATE",
        organizationId: currentMembership.organizationId,
        creatorId: projectData.creatorId,
      }}
      currentUserId={session.userId} 
      currentUserOrgRole={currentMembership.role} 
      kanbanTasks={JSON.parse(JSON.stringify(normalizedKanbanTasks))}
      boardColumns={activeStages}
      serializedMembers={serializedMembers}
    />
  );
}