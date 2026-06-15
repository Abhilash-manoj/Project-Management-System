// app/dashboard/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CheckSquare, CheckCircle2, AlertTriangle, Folder } from "lucide-react";

export default async function HomeDashboardPage() {
  // 1. Authenticate user context session pipeline
  const session = await getSession();
  if (!session) redirect("/signin");

  // 2. Fetch user membership parameters to bind isolated organization data bounds
  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId },
    include: { organization: true },
  });
  if (!membership) redirect("/signup/organization");

  const orgId = membership.organizationId;
  const currentTimestamp = new Date();

  // 3. EXECUTE METRIC AGGREGATIONS IN PARALLEL
  const [
    assignedTasksCount,
    completedTasksCount,
    overdueTasksCount,
    activeProjects,
    projectList,
    taskStatusGroupings
  ] = await Promise.all([
    // A. Count Active Assigned Tasks
    prisma.task.count({
      where: {
        assigneeId: session.userId,
        project: { organizationId: orgId },
        status: { not: "DONE" }
      }
    }),

    // B. Count Completed Assigned Tasks
    prisma.task.count({
      where: {
        assigneeId: session.userId,
        project: { organizationId: orgId },
        status: "DONE"
      }
    }),

    // C. Count Overdue Assigned Tasks
    prisma.task.count({
      where: {
        assigneeId: session.userId,
        project: { organizationId: orgId },
        status: { not: "DONE" },
        dueDate: { lt: currentTimestamp }
      }
    }),

    // D. Count Total Active Projects in Workspace
    prisma.project.count({
      where: {
        organizationId: orgId,
        status: "ACTIVE"
      }
    }),

    // E. Fetch Top Active Projects with Team and Task details
    prisma.project.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      take: 3,
      include: {
        assignments: { include: { user: { select: { name: true } } } },
        tasks: { select: { status: true } }
      }
    }),

    // F. Raw Status Grouping Array for Task Distribution charts
    prisma.task.groupBy({
      by: ["status"],
      where: {
        assigneeId: session.userId,
        project: { organizationId: orgId }
      },
      _count: { id: true }
    })
  ]);

  // 4. MAP STATUS ARRAY TO READABLE OBJECT HOOK DICTIONARIES
  const distribution = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
  taskStatusGroupings.forEach(group => {
    if (group.status in distribution) {
      distribution[group.status as keyof typeof distribution] = group._count.id;
    }
  });

  const totalTasks = assignedTasksCount + completedTasksCount;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // 5. FORMAT ACTIVE SYSTEM DATETIME STAMP FOR HEADER
  const liveDisplayDate = currentTimestamp.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in font-sans text-base-content text-left p-1">
      
      {/* 🎨 DYNAMIC MAIN GREETING BANNER (Uses theme primary gradient profiles) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary-focus p-6 md:p-8 text-primary-content shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1 z-10">
          <p className="text-2xs font-bold uppercase tracking-widest opacity-70">Good Morning 👋</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">{session.name}</h1>
          <p className="text-xs font-medium opacity-90">
            You have <span className="font-bold underline decoration-wavy">{assignedTasksCount} tasks</span> pending and <span className="font-bold">{overdueTasksCount} overdue</span> inside <span className="font-black">{membership.organization.name}</span>.
          </p>
        </div>
        <div className="text-right z-10 shrink-0 select-none hidden sm:block opacity-70 font-mono text-xs font-bold tracking-wider uppercase border border-primary-content/20 bg-primary-content/10 p-3 rounded-xl">
          📅 {liveDisplayDate}
        </div>
      </div>

      {/* METRIC CARD STATS MATRIX GRID CONTAINER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Assigned Tasks */}
        <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl flex flex-row justify-between items-center shadow-2xs">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-wider uppercase text-base-content/40 block">Assigned Tasks</span>
            <span className="text-3xl font-black text-base-content block tracking-tight">{assignedTasksCount}</span>
            <span className="text-[10px] text-secondary font-bold block">Active tracking</span>
          </div>
          <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
            <CheckSquare className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 2: Completed Tasks */}
        <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl flex flex-row justify-between items-center shadow-2xs">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-wider uppercase text-base-content/40 block">Completed Tasks</span>
            <span className="text-3xl font-black text-base-content block tracking-tight">{completedTasksCount}</span>
            <span className="text-[10px] text-success font-bold block">Progressing smoothly</span>
          </div>
          <div className="p-3 bg-success/10 text-success rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 3: Overdue Tasks */}
        <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl flex flex-row justify-between items-center shadow-2xs">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-wider uppercase text-base-content/40 block">Overdue Tasks</span>
            <span className="text-3xl font-black text-base-content block tracking-tight">{overdueTasksCount}</span>
            <span className="text-[10px] text-error font-bold block">
              {overdueTasksCount > 0 ? "Requires attention" : "All clear"}
            </span>
          </div>
          <div className="p-3 bg-error/10 text-error rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 4: Active Projects */}
        <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl flex flex-row justify-between items-center shadow-2xs">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-wider uppercase text-base-content/40 block">Active Projects</span>
            <span className="text-3xl font-black text-base-content block tracking-tight">{activeProjects}</span>
            <span className="text-[10px] text-warning font-bold block">Running tracks</span>
          </div>
          <div className="p-3 bg-warning/10 text-warning rounded-xl">
            <Folder className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* LOWER CONTENT: PROJECT OVERVIEWS & DISTRIBUTION BLOCK TRACKERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* PROJECTS SPACE OVERVIEW CARD SLOTS */}
        <div className="lg:col-span-2 card bg-base-100 border border-base-300 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex justify-between items-center border-b border-base-300 pb-2">
            <h3 className="font-black text-sm tracking-tight uppercase text-base-content/60">Projects Space Overview</h3>
            <span className="text-xs text-primary font-bold hover:underline cursor-pointer">All projects ↗</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectList.map((project) => {
              const projectTotalTasks = project.tasks.length;
              const projectCompletedTasks = project.tasks.filter(t => t.status === "DONE").length;
              const projectProgress = projectTotalTasks > 0 ? Math.round((projectCompletedTasks / projectTotalTasks) * 100) : 0;

              return (
                <div key={project.id} className="p-4 rounded-xl border border-base-300 bg-base-200/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-base-content tracking-tight text-sm truncate max-w-[70%]">{project.name}</h4>
                    <span className="badge badge-success badge-sm font-black tracking-wider text-[9px] uppercase rounded px-1.5 py-0.5">
                      {project.status.toLowerCase()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-2xs font-bold text-base-content/40 uppercase">
                      <span>Progress Metric</span>
                      <span className="text-base-content font-black">{projectProgress}%</span>
                    </div>
                    <progress className="progress progress-primary w-full h-1.5 rounded-full" value={projectProgress} max="100"></progress>
                  </div>

                  {/* Avatar Initials list row map */}
                  <div className="flex -space-x-2 overflow-hidden pt-1">
                    {project.assignments.map((assignee, index) => (
                      <div 
                        key={index} 
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-base-100 bg-neutral text-neutral-content font-black text-[9px] flex items-center justify-center border border-base-300 uppercase select-none"
                        title={assignee.user.name}
                      >
                        {assignee.user.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {projectList.length === 0 && (
              <p className="text-xs text-base-content/40 font-bold p-4 col-span-2 text-center">No active workspace projects tracking currently.</p>
            )}
          </div>
        </div>

        {/* TASK DISTRIBUTION STATS GRAPH VIEWER CONTAINER */}
        <div className="card bg-base-100 border border-base-300 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="border-b border-base-300 pb-2">
            <h3 className="font-black text-sm tracking-tight uppercase text-base-content/60">Task Distribution</h3>
          </div>

          <div className="flex flex-col items-center justify-center p-4 space-y-6">
            {/* 🎨 DYNAMIC PROGRESS RING (Uses theme primary color variables dynamically) */}
            <div className="relative flex items-center justify-center">
              <div 
                className="radial-progress text-primary font-black text-xl bg-base-200 border-base-300" 
                style={{ "--value": progressPercentage, "--size": "7rem", "--thickness": "12px" } as React.CSSProperties}
                role="progressbar"
              >
                {progressPercentage}%
              </div>
            </div>

            {/* Complete Data Breakdown Lists */}
            <div className="w-full space-y-2 pt-2 border-t border-base-300/60">
              <div className="flex justify-between text-xs font-bold items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-success" /> Completed
                </span>
                <span className="font-black text-base-content">{distribution.DONE}</span>
              </div>
              <div className="flex justify-between text-xs font-bold items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-secondary" /> In Progress
                </span>
                <span className="font-black text-base-content">{distribution.IN_PROGRESS}</span>
              </div>
              <div className="flex justify-between text-xs font-bold items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-warning" /> In Review
                </span>
                <span className="font-black text-base-content">{distribution.IN_REVIEW}</span>
              </div>
              <div className="flex justify-between text-xs font-bold items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-base-content/20" /> To Do
                </span>
                <span className="font-black text-base-content">{distribution.TODO}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}