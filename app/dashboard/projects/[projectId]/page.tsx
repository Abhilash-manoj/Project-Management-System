// app/dashboard/projects/[projectId]/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import ProjectTabsContainer from "./components/ProjectTabsContainer";

export const dynamic = "force-dynamic"; // Ensure cache resets live on every page bounce

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const { projectId } = await params;

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

  // ==========================================================================
  // HIERARCHICAL LEAF-NODE PROGRESS METRIC CALCULATOR ENGINE
  // ==========================================================================
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
          memberships: {
            where: { organizationId: currentMembership.organizationId },
            select: { 
              role: true,
              department: true // 🚀 FIXED: Dynamic lookup reads plain string value or fallback string cleanly
            }
          }
        } 
      } 
    },
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
  // 🔒 ATTRIBUTE ACCESS PERMISSION CHECK (ABAC GATEWAY)
  // ==========================================================================
  const isCreator = projectData.creatorId === session.userId;
  const isAssigned = projectAssignments.some(a => a.userId === session.userId);

  // Gated URL direct breach attempts. Kick out unassigned employees/guests on private setups.
  if (projectData.visibility === "PRIVATE" && !isGlobalOwner && !isGlobalAdmin && !isAssigned) {
    redirect("/dashboard/projects");
  }

  // Owners edit everything. Admins/Employees can ONLY edit if they are creator or assigned team members.
  const canMutate = isGlobalOwner || isCreator || isAssigned;
  // ==========================================================================

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
        const computedDept = orgMembership?.department || ""; // 🚀 FIXED: Forward the database text property directly

        return {
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          role: computedRole, 
          department: computedDept, // 🚀 FIXED: Replaced static "Engineering" string with live data link token
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
    />
  );
}