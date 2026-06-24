// app/dashboard/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CheckSquare, CheckCircle2, AlertTriangle, Folder, Calendar } from "lucide-react";

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
  
  const currentDepartmentString = membership.department && membership.department.trim() !== "" 
    ? membership.department.trim() 
    : "Unassigned";

  // Determine if the caller is an administrator/owner context
  const isGlobalOwner = membership.role === "OWNER";
  const isGlobalAdmin = membership.role === "ADMIN";
  const isWorkspaceAdmin = isGlobalOwner || isGlobalAdmin;

  // 3. EXECUTE METRIC AGGREGATIONS IN PARALLEL
  const [
    assignedTasksCount,
    completedTasksCount,
    overdueTasksCount,
    activeProjects,
    completedProjectsCount,
    projectList,
    taskStatusGroupings
  ] = await Promise.all([
    // A. Count Active Assigned Tasks
    prisma.task.count({
      where: {
        assigneeId: session.userId,
        project: { organizationId: orgId },
        status: { notIn: ["DONE", "ARCHIVED"] }
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

    // E. Count Closed/Completed Projects
    prisma.project.count({
      where: {
        organizationId: orgId,
        status: { in: ["COMPLETED", "ARCHIVED"] }
      }
    }),

    // F. Fetch Top Active Projects with Role Security Constraints
    prisma.project.findMany({
      where: { 
        organizationId: orgId, 
        status: "ACTIVE",
        AND: [
          isGlobalOwner
            ? {} 
            : isGlobalAdmin
            ? {
                OR: [
                  { visibility: "PUBLIC" },
                  { visibility: "PRIVATE" }
                ]
              }
            : {
                OR: [
                  { visibility: "PUBLIC" },
                  {
                    visibility: "PRIVATE",
                    assignments: {
                      some: {
                        userId: session.userId
                      }
                    }
                  }
                ]
              }
        ]
      },
      take: 3,
      orderBy: { createdAt: "desc" },
      include: {
        // 🚀 FIXED: Modified the relational query to explicitly grab avatarUrl fields live from the database
        assignments: { 
          include: { 
            user: { 
              select: { 
                name: true,
                avatarUrl: true 
              } 
            } 
          } 
        },
        tasks: { select: { status: true } }
      }
    }),

    // G. Raw Status Grouping Array for Task Distribution charts
    prisma.task.groupBy({
      by: ["status"],
      where: {
        assigneeId: session.userId,
        project: { organizationId: orgId }
      },
      _count: { id: true }
    })
  ]);

  // 4. MAP STATUS ARRAY WITH STRING SANITIZATION
  const distribution = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
  
  taskStatusGroupings.forEach(group => {
    const normalizedKey = group.status
      .toUpperCase()
      .replace(/\s+/g, "_") as keyof typeof distribution;

    if (normalizedKey in distribution) {
      distribution[normalizedKey] = group._count.id;
    }
  });

  const totalTasks = distribution.TODO + distribution.IN_PROGRESS + distribution.IN_REVIEW + distribution.DONE;
  const progressPercentage = totalTasks > 0 ? Math.round((distribution.DONE / totalTasks) * 100) : 0;

  const liveDisplayDate = currentTimestamp.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in font-sans text-base-content text-left p-1">
      
      {/* GREETING HERO BANNER OVERHAUL */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-blue-600 p-6 md:p-8 text-primary-content shadow-md border border-primary/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 select-none">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-64 h-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10 text-left max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-xs text-white">
            👋 {currentDepartmentString} Division
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">{session.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs md:text-sm font-semibold text-white/90">
            <p>
              You have <span className="bg-white text-primary px-1.5 py-0.5 rounded-md font-black text-xs shadow-xs mx-0.5">{assignedTasksCount} tasks</span> pending
            </p>
            <span className="opacity-30 hidden sm:inline">•</span>
            <p>
              and <span className={`px-1.5 py-0.5 rounded-md font-black text-xs ${overdueTasksCount > 0 ? "bg-error text-error-content" : "bg-white/20 text-white"}`}>{overdueTasksCount} overdue</span> inside <span className="text-white font-black underline decoration-white/30 underline-offset-2">{membership.organization.name}</span>
            </p>
          </div>
        </div>

        <div className="z-10 shrink-0 self-start md:self-center">
          <div className="flex items-center gap-2.5 bg-neutral-950/20 border border-white/10 px-4 py-2.5 rounded-xl shadow-xs backdrop-blur-md">
            <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
              <Calendar className="h-4 w-4 text-blue-200 stroke-[2.2]" />
            </div>
            <div className="text-left space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-200/60 leading-none">Current Date Timeline</p>
              <p className="text-xs md:text-sm font-black text-white tracking-tight leading-none">
                {liveDisplayDate}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* METRIC CARD STATS MATRIX GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className="card bg-base-100 border border-base-300 p-5 rounded-2xl flex flex-row justify-between items-center shadow-2xs">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-wider uppercase text-base-content/40 block">
              {isWorkspaceAdmin ? "Completed Projects" : "Completed Tasks"}
            </span>
            <span className="text-3xl font-black text-base-content block tracking-tight">
              {isWorkspaceAdmin ? completedProjectsCount : completedTasksCount}
            </span>
            <span className="text-[10px] text-success font-bold block">
              {isWorkspaceAdmin ? "Workspace growth steady" : "Progressing smoothly"}
            </span>
          </div>
          <div className="p-3 bg-success/10 text-success rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

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
              const projectCompletedTasks = project.tasks.filter(t => t.status.toUpperCase() === "DONE").length;
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

                  {/* 🚀 FIXED: RENDER RENDER USER REAL-TIME AVATAR CLOUD MAPPINGS WITH INITIALS FALLBACK */}
                  <div className="flex -space-x-2 overflow-hidden pt-1">
                    {project.assignments.map((assignment, index) => {
                      const firstInitial = assignment.user.name.charAt(0).toUpperCase();

                      return (
                        <div 
                          key={index} 
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-base-100 bg-neutral text-neutral-content font-black text-[9px] flex items-center justify-center border border-base-300 uppercase select-none overflow-hidden"
                          title={assignment.user.name}
                        >
                          {assignment.user.avatarUrl ? (
                            <img 
                              src={assignment.user.avatarUrl} 
                              alt={`${assignment.user.name}'s avatar profile`} 
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <span>{firstInitial}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {projectList.length === 0 && (
              <p className="text-xs text-base-content/40 font-bold p-4 col-span-2 text-center">No active workspace projects tracking currently.</p>
            )}
          </div>
        </div>

        {/* TASK DISTRIBUTION CHART BREAKDOWN */}
        <div className="card bg-base-100 border border-base-300 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="border-b border-base-300 pb-2">
            <h3 className="font-black text-sm tracking-tight uppercase text-base-content/60">Task Distribution</h3>
          </div>

          <div className="flex flex-col items-center justify-center p-4 space-y-6">
            <div className="relative flex items-center justify-center">
              <div 
                className="radial-progress text-primary font-black text-xl bg-base-200 border-base-300" 
                style={{ "--value": progressPercentage, "--size": "7rem", "--thickness": "12px" } as React.CSSProperties}
                role="progressbar"
              >
                {progressPercentage}%
              </div>
            </div>

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