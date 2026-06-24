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

  // 1. SECURITY PERIMETER CHECK: Validate project-level contextual clearances
  const guard = await verifyProjectAccess(projectId);
  if (!guard.authorized) {
    redirect("/dashboard");
  }

  // Query the authenticated user's organization-wide workspace membership profile
  const currentMembership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });
  if (!currentMembership) redirect("/signup/organization");

  const projectData = await prisma.project.findUnique({ where: { id: projectId } });
  if (!projectData) notFound();

  const isGlobalOwner = currentMembership.role === "OWNER";
  const isGlobalAdmin = currentMembership.role === "ADMIN";
  const isOwnerOrAdmin = isGlobalOwner || isGlobalAdmin;

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
          avatarUrl: true, // 🚀 FIXED: Added to sync live teammate avatars across project tabs
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
    avatarUrl: a.user.avatarUrl // 🚀 FIXED: Propagate fallback tracking down to form selection fields
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
      // 🚀 FIXED: Added avatarUrl to parent card assignees on the Kanban board view
      assignee: { select: { name: true, avatarUrl: true } },
      subTasks: {
        orderBy: { createdAt: "asc" },
        include: {
          // 🚀 FIXED: Added avatarUrl to child task card assignees inside the drilldown views
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

  // 🔒 ATTRIBUTE ACCESS PERMISSION CHECK (ABAC GATEWAY)
  const isCreator = projectData.creatorId === session.userId;
  const isAssigned = projectAssignments.some(a => a.userId === session.userId);

  if (projectData.visibility === "PRIVATE" && !isGlobalOwner && !isGlobalAdmin && !isAssigned) {
    redirect("/dashboard/projects");
  }

  const canMutate = isGlobalOwner || isCreator || isAssigned;

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
          avatarUrl: a.user.avatarUrl, // 🚀 FIXED: Pass the image straight down to child rosters
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