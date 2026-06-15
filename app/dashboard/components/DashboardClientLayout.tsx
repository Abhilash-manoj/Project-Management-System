// app/dashboard/components/DashboardClientLayout.tsx
"use client";

import React from "react";
import { CheckCircle, AlertTriangle, Folder, ListTodo, ArrowUpRight, Calendar, Activity } from "lucide-react";
import Link from "next/link";

interface MemberAvatar {
  id: string;
  initials: string;
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
  progress: number;
  members: MemberAvatar[];
}

interface ClientLayoutProps {
  userName: string;
  orgName: string;
  userRole: string;
  summary: {
    pendingTasks: number;
    overdueTasks: number;
    assignedTasksTotal: number;
    completedTasksTotal: number;
    activeProjectsCount: number;
  };
  projects: ProjectData[];
  chart: { done: number; inProgress: number; review: number; todo: number; total: number };
  upcoming: { title: string; subtitle: string; daysLeft: number }[];
}

export default function DashboardClientLayout({ userName, orgName, userRole, summary, projects, chart, upcoming }: ClientLayoutProps) {
  
  const currentLocalDateString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const totalChartCount = chart.total > 0 ? chart.total : 1;
  const donePercentage = Math.round((chart.done / totalChartCount) * 100);

  return (
    <div className="space-y-6 text-neutral text-left select-none p-1">
      
      {/* 1. TOP HERO BANNER (Semantic Theme Gradients Integration) */}
      <div className="card bg-gradient-to-r from-primary to-primary-focus text-primary-content shadow-xl rounded-2xl p-6 relative overflow-hidden">
        <div className="flex justify-between items-start z-10 relative">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-widest opacity-75">Good morning 👋</span>
            <h1 className="text-2xl font-black tracking-tight">{userName}</h1>
            <p className="text-xs font-medium opacity-90">
              You have <span className="font-bold underline decoration-wavy">{summary.pendingTasks} tasks</span> pending and <span className="font-bold">{summary.overdueTasks} overdue</span> inside <span className="font-bold">{orgName}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-primary-content/10 border border-primary-content/10 backdrop-blur-md px-3 py-2 rounded-xl text-right shrink-0">
            <Calendar className="h-5 w-5 opacity-80" />
            <div className="text-[11px] font-black uppercase tracking-wider leading-none">
              <span className="block text-[9px] opacity-60 font-medium lowercase">Today</span>
              {currentLocalDateString}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TELEMETRY SPARK CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-base-100 border border-base-300 shadow-sm p-4 rounded-xl flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-base-content/50 font-bold uppercase tracking-wider block">Assigned Tasks</span>
            <h2 className="text-2xl font-black text-base-content">{summary.assignedTasksTotal}</h2>
            <span className="text-[10px] text-primary font-bold">+3 this week</span>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary"><ListTodo className="h-5 w-5" /></div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm p-4 rounded-xl flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-base-content/50 font-bold uppercase tracking-wider block">Completed Tasks</span>
            <h2 className="text-2xl font-black text-base-content">{summary.completedTasksTotal}</h2>
            <span className="text-[10px] text-success font-bold">+8 this week</span>
          </div>
          <div className="p-3 bg-success/10 rounded-xl text-success"><CheckCircle className="h-5 w-5" /></div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm p-4 rounded-xl flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-base-content/50 font-bold uppercase tracking-wider block">Overdue Tasks</span>
            <h2 className="text-2xl font-black text-base-content">{summary.overdueTasks}</h2>
            <span className="text-[10px] text-error font-bold">-2 this week</span>
          </div>
          <div className="p-3 bg-error/10 rounded-xl text-error"><AlertTriangle className="h-5 w-5" /></div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm p-4 rounded-xl flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-base-content/50 font-bold uppercase tracking-wider block">Active Projects</span>
            <h2 className="text-2xl font-black text-base-content">{summary.activeProjectsCount}</h2>
            <span className="text-[10px] text-warning font-bold">2 due soon</span>
          </div>
          <div className="p-3 bg-warning/10 rounded-xl text-warning"><Folder className="h-5 w-5" /></div>
        </div>
      </div>

      {/* 3. CORE TWO-COLUMN WORKSPACE VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLUMN LEFT: REAL TIME PROJECTS SUB-SYSTEM LISTS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card bg-base-100 border border-base-300 shadow-sm p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-base-300 pb-3">
              <h3 className="font-black text-sm text-base-content uppercase tracking-wider flex items-center gap-1.5">Projects Space Overview</h3>
              <Link href="/dashboard/projects" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">All projects <ArrowUpRight className="h-3 w-3" /></Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <Link 
                  href={`/dashboard/projects/${proj.id}/kanban`} 
                  key={proj.id}
                  className="card bg-base-200/40 hover:bg-base-200/80 border border-base-300/60 p-4 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base-content text-xs tracking-tight truncate flex-1 pr-2">{proj.name}</h4>
                    <span className="badge badge-success badge-xs font-black px-1.5 uppercase tracking-wider text-[8px] opacity-80">{proj.status.toLowerCase()}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-base-content/50">
                      <span>Progress Metric</span>
                      <span>{proj.progress}%</span>
                    </div>
                    <progress className="progress progress-primary h-1.5 w-full bg-base-300" value={proj.progress} max="100" />
                  </div>

                  <div className="flex -space-x-1.5 overflow-hidden pt-1">
                    {proj.members.slice(0, 4).map((member) => (
                      <div key={member.id} className="avatar placeholder border border-base-100 rounded-full h-5 w-5 text-[8px] font-black flex items-center justify-center bg-neutral text-neutral-content">
                        <span>{member.initials}</span>
                      </div>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN RIGHT: DISTRIBUTION ANALYTICS & CALENDAR TICKERS */}
        <div className="space-y-4">
          
          {/* Radial Metrics Card */}
          <div className="card bg-base-100 border border-base-300 shadow-sm p-5 rounded-2xl space-y-4">
            <h3 className="font-black text-sm text-base-content uppercase tracking-wider border-b border-base-300 pb-2">Task Distribution</h3>
            <div className="flex items-center justify-around gap-2 pt-2">
              <div className="radial-progress text-primary font-black text-sm" style={{ "--value": donePercentage, "--size": "4.5rem", "--thickness": "6px" } as any} role="progressbar">
                {donePercentage}%
              </div>
              <div className="text-[11px] font-bold space-y-1.5 text-base-content/70 flex flex-col">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success inline-block" /> <strong className="text-base-content">{chart.done}</strong> Completed</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> <strong className="text-base-content">{chart.inProgress}</strong> In Progress</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning inline-block" /> <strong className="text-base-content">{chart.review}</strong> In Review</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral inline-block" /> <strong className="text-base-content">{chart.todo}</strong> To Do</span>
              </div>
            </div>
          </div>

          {/* Upcoming Agenda Calendar Feed */}
          <div className="card bg-base-100 border border-base-300 shadow-sm p-5 rounded-2xl space-y-3">
            <h3 className="font-black text-sm text-base-content uppercase tracking-wider border-b border-base-300 pb-2 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary" /> Upcoming Deadlines
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-none">
              {upcoming.length === 0 ? (
                <p className="text-xs text-base-content/40 italic py-4">No imminent target deadlines registered on schedule.</p>
              ) : (
                upcoming.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-base-200/50 border border-base-300/40 text-xs font-bold">
                    <div className="truncate pr-2 flex-1">
                      <span className="block text-base-content truncate tracking-tight">{item.title}</span>
                      <span className="block text-[9px] text-base-content/40 font-semibold">{item.subtitle}</span>
                    </div>
                    <span className="badge badge-error bg-error/10 text-error border-none font-black text-[10px] shrink-0 rounded-md py-1 px-1.5">
                      {item.daysLeft}d left
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}