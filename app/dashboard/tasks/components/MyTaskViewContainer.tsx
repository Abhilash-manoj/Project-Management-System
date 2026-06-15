// app/dashboard/tasks/components/MyTasksViewContainer.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Search, Folder } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: string | null;
  project: { name: string };
  assignee: { name: string } | null;
  assigneeId?: string | null; // Mapped precisely to evaluate user ownership scopes
  creatorId: string;
}

export default function MyTasksViewContainer({ initialTasks, currentUserId }: { initialProjects?: any, initialTasks: TaskItem[], currentUserId: string }) {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filterTabs = ["All", "Today", "Overdue", "Completed", "Assigned By Me", "Assigned To Me"];

  const filteredTasks = useMemo(() => {
    return initialTasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const isCompleted = task.status === "DONE";
      
      switch (activeFilter) {
        case "Completed": 
          return isCompleted && matchesSearch;
        case "Assigned By Me": 
          return task.creatorId === currentUserId && matchesSearch;
        case "Assigned To Me": 
          return task.assigneeId === currentUserId && matchesSearch;
        case "All":
        default: 
          return matchesSearch;
      }
    });
  }, [initialTasks, activeFilter, searchQuery, currentUserId]);

  const getStatusStyle = (status: string) => {
    if (status === "DONE") return "badge-success bg-success/10 text-success border-success/20";
    return "badge-primary bg-primary/10 text-primary border-primary/20";
  };

  const getPriorityStyle = (priority: string) => {
    if (priority === "CRITICAL") return "bg-error/10 text-error border-error/20 font-bold";
    if (priority === "HIGH") return "bg-warning/10 text-warning border-warning/20 font-bold";
    return "bg-base-200 text-neutral/60 border-base-300";
  };

  return (
    <div className="space-y-4 font-sans text-neutral">
      
      {/* FILTER & CONTROL BAR LAYOUT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-100 p-3 border border-base-300 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral/40 stroke-[2.2]" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="input input-sm input-bordered w-full bg-base-200 focus:bg-base-100 focus:input-primary rounded-xl pl-9 text-xs font-medium transition-all"
            />
          </div>

          <div className="tabs tabs-boxed bg-base-200/60 border border-base-300/40 p-0.5 rounded-xl flex overflow-x-auto scrollbar-none">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`tab tab-sm font-bold rounded-lg px-3 transition-all cursor-pointer ${
                  activeFilter === tab ? "tab-active bg-primary text-primary-content shadow-xs" : "text-neutral/60 hover:text-neutral"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE LIST PORTAL LAYOUT SHEET */}
      <div className="card bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="table table-md w-full text-left">
            <thead>
              <tr className="bg-base-200 text-neutral/40 text-[10px] font-black uppercase tracking-wider border-b border-base-300 select-none">
                <th className="py-3.5 px-4">Task</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300/60 text-xs font-medium">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral/40 font-bold italic bg-base-100">
                    No assigned tasks found matching this criteria view.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-base-200/30 transition-colors">
                    <td className="py-4 px-4 max-w-sm">
                      <p className="font-bold text-neutral truncate">{task.title}</p>
                      <p className="text-neutral/40 font-normal text-[11px] truncate mt-0.5">{task.description || "No description provided."}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`badge badge-sm font-bold border rounded px-2 gap-1 ${getStatusStyle(task.status)}`}>
                        ● {task.status === "DONE" ? "Done" : "In Progress"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`badge badge-sm border rounded font-semibold text-[11px] px-2 ${getPriorityStyle(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-neutral/60">
                      <div className="flex items-center gap-1.5 font-bold text-neutral/70">
                        <Folder className="h-3.5 w-3.5 text-primary stroke-[2]" />
                        <span className="truncate max-w-[140px]">{task.project?.name || "Global"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-neutral/50 font-semibold tracking-tight">
                      {task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "2026-06-20"}
                    </td>
                    <td className="py-4 px-4">
                      {task.assignee ? (
                        <div className="avatar placeholder" title={task.assignee.name}>
                          <div className="bg-primary/10 text-primary border-2 border-base-100 text-[10px] font-black h-7 w-7 rounded-full flex items-center justify-center">
                            <span>{task.assignee.name.charAt(0).toUpperCase()}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral/30 text-[11px] italic font-semibold select-none">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}