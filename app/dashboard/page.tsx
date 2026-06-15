// app/dashboard/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import DashboardClientLayout from "./components/DashboardClientLayout";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  // Load active organizational membership workspace tenant
  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId },
    include: { organization: true }
  });
  if (!membership) redirect("/signup/organization");

  const orgId = membership.organizationId;

  // ==========================================================================
  // PARALLELIZED DATA FETCH PROTOCOLS
  // ==========================================================================
  const [allProjects, allOrgTasks] = await prisma.$transaction([
    prisma.project.findMany({
      where: { organizationId: orgId },
      include: {
        assignments: { include: { user: { select: { id: true, name: true } } } }
      }
    }),
    prisma.task.findMany({
      where: { project: { organizationId: orgId } },
      include: { assignee: { select: { name: true } } }
    })
  ]);

  const rightNow = new Date();

  // ==========================================================================
  // METRICS & TELEMETRY CALCULATIONS (HIERARCHICAL LEAF-NODE TRAVERSAL)
  // ==========================================================================
  
  // 1. User Specific Assigned Metrics
  const userAssignedTasks = allOrgTasks.filter(t => t.assigneeId === session.userId);
  const userPendingCount = userAssignedTasks.filter(t => t.status !== "DONE").length;
  const userOverdueCount = userAssignedTasks.filter(t => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < rightNow).length;

  // 2. Compute true project progress percentages via structural work leaves rollup
  const serializedProjects = allProjects.map(project => {
    const projectTasks = allOrgTasks.filter(t => t.projectId === project.id);
    
    // Standalone tasks: no parent and have no subtasks beneath them
    const standalone = projectTasks.filter(t => t.parentId === null && !projectTasks.some(sub => sub.parentId === t.id));
    // Executable leaves subtasks
    const executableSubTasks = projectTasks.filter(t => t.parentId !== null);

    const totalWorkUnits = standalone.length + executableSubTasks.length;
    const completedWorkUnits = standalone.filter(t => t.status === "DONE").length + executableSubTasks.filter(t => t.status === "DONE").length;

    const progressPercent = totalWorkUnits > 0 ? Math.round((completedWorkUnits / totalWorkUnits) * 100) : 0;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      progress: progressPercent,
      members: project.assignments.map(a => ({
        id: a.user.id,
        initials: a.user.name.split(" ").map(n => n[0]).join("").toUpperCase()
      }))
    };
  });

  // 3. Global Task Status Distributions Metrics Charts
  const chartDoneCount = allOrgTasks.filter(t => t.status === "DONE").length;
  const chartInProgressCount = allOrgTasks.filter(t => t.status === "IN_PROGRESS").length;
  const chartReviewCount = allOrgTasks.filter(t => t.status === "REVIEW").length;
  const chartTodoCount = allOrgTasks.filter(t => t.status === "TODO").length;

  // 4. Upcoming Deadlines Engine Tracker Calendar (Merge projects and primary tasks lists)
  const upcomingItems: { title: string; subtitle: string; daysLeft: number }[] = [];
  
  allProjects.forEach(p => {
    if (p.dueDate && p.status !== "COMPLETED") {
      const diffTime = new Date(p.dueDate).getTime() - rightNow.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) upcomingItems.push({ title: p.name, subtitle: "Project Milestone", daysLeft: diffDays });
    }
  });

  allOrgTasks.forEach(t => {
    if (t.dueDate && t.status !== "DONE" && t.parentId === null) {
      const diffTime = new Date(t.dueDate).getTime() - rightNow.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        const targetProj = allProjects.find(p => p.id === t.projectId);
        upcomingItems.push({ title: t.title, subtitle: targetProj?.name || "Task Node", daysLeft: diffDays });
      }
    }
  });

  const sortedUpcoming = upcomingItems.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

  return (
    <DashboardClientLayout 
      userName={session.name}
      orgName={membership.organization.name}
      userRole={membership.role}
      summary={{
        pendingTasks: userPendingCount,
        overdueTasks: userOverdueCount,
        assignedTasksTotal: userAssignedTasks.length,
        completedTasksTotal: allOrgTasks.filter(t => t.status === "DONE").length,
        activeProjectsCount: allProjects.filter(p => p.status === "ACTIVE").length,
      }}
      projects={serializedProjects}
      chart={{
        done: chartDoneCount,
        inProgress: chartInProgressCount,
        review: chartReviewCount,
        todo: chartTodoCount,
        total: allOrgTasks.length
      }}
      upcoming={sortedUpcoming}
    />
  );
}