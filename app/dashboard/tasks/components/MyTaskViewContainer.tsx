// app/dashboard/tasks/components/MyTasksViewContainer.tsx
"use client";

import React, { useState, useMemo, useTransition } from "react";
import { Search, Folder, X, Clock, Edit3, Save, RotateCcw } from "lucide-react";
import { updateTaskDetailsAction } from "@/app/actions/tasks"; 

interface TaskItem {
  id: string;
  projectId: string; 
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: string | null;
  project: { name: string };
  assignee: { name: string; avatarUrl?: string | null } | null; // 🚀 FIXED: Added avatarUrl to assignee type structure
  assigneeId?: string | null; 
  creatorId: string;
}

export default function MyTasksViewContainer({ initialTasks, currentUserId }: { initialProjects?: any, initialTasks: TaskItem[], currentUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // INTERACTIVE EDIT BUFFER STATES
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<any>("LOW");
  const [editStatus, setEditStatus] = useState<any>("TODO");
  const [editDueDate, setEditDueDate] = useState("");

  const filterTabs = ["All", "Today", "Overdue", "Completed", "Assigned By Me", "Assigned To Me"];

  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const cleanQuery = searchQuery.trim().toLowerCase();

    return initialTasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(cleanQuery) ||
                            (task.description && task.description.toLowerCase().includes(cleanQuery));

      const isCompleted = task.status === "DONE";
      const taskDueDateStr = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;

      switch (activeFilter) {
        case "Today":
          return !isCompleted && taskDueDateStr === todayStr && matchesSearch;
        case "Overdue":
          return !isCompleted && taskDueDateStr && taskDueDateStr < todayStr && matchesSearch;
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

  const handleTaskRowSelect = (task: TaskItem) => {
    setSelectedTask(task);
    setIsEditing(false);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
  };

  const handleSaveInlineDrawer = () => {
    if (!selectedTask) return;
    if (!editTitle.trim()) {
      alert("Validation Error: Task title property string cannot be blank.");
      return;
    }

    startTransition(async () => {
      const res = await updateTaskDetailsAction({
        taskId: selectedTask.id,
        projectId: selectedTask.projectId,
        title: editTitle,
        description: editDescription,
        priority: editPriority === "CRITICAL" ? "URGENT" : editPriority, 
        status: editStatus,
        dueDate: editDueDate || null,
      });

      if (res?.error) {
        alert(res.error);
      } else {
        setIsEditing(false);
        setSelectedTask({
          ...selectedTask,
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          status: editStatus,
          dueDate: editDueDate || null,
        });
      }
    });
  };

  const getStatusStyle = (status: string) => {
    if (status === "DONE") return "badge-success bg-success/10 text-success border-success/20";
    if (status === "IN_PROGRESS") return "badge-info bg-info/10 text-info border-info/20";
    if (status === "REVIEW") return "badge-warning bg-warning/10 text-warning border-warning/20";
    return "badge-primary bg-primary/10 text-primary border-primary/20";
  };

  const getPriorityStyle = (priority: string) => {
    if (priority === "CRITICAL" || priority === "URGENT") return "bg-error/10 text-error border-error/20 font-bold";
    if (priority === "HIGH") return "bg-warning/10 text-warning border-warning/20 font-bold";
    return "bg-base-200 text-neutral/60 border-base-300";
  };

  return (
    <div className="flex gap-6 w-full relative">
      
      {/* LEFT HAND MASTER COLUMN */}
      <div className="flex-1 space-y-4 font-sans text-neutral min-w-0">
        
        {/* FILTER & CONTROL BAR */}
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

        {/* TABLE LIST WORKSPACE */}
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
                  <tr className="bg-base-100">
                    <td colSpan={6} className="py-12 text-center text-neutral/40 font-bold italic">
                      No assigned tasks found matching this criteria view.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const isSelected = selectedTask?.id === task.id;
                    const firstInitial = task.assignee?.name ? task.assignee.name.charAt(0).toUpperCase() : "?";

                    return (
                      <tr 
                        key={task.id} 
                        onClick={() => handleTaskRowSelect(task)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-base-200/30"
                        }`}
                      >
                        <td className="py-4 px-4 max-w-sm text-left">
                          <p className="font-bold text-neutral truncate">{task.title}</p>
                          <p className="text-neutral/40 font-normal text-[11px] truncate mt-0.5">{task.description || "No description provided."}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`badge badge-sm font-bold border rounded px-2 gap-1 capitalize ${getStatusStyle(task.status)}`}>
                            ● {task.status.toLowerCase().replace('_', ' ')}
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
                          {task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "No Date"}
                        </td>
                        <td className="py-4 px-4">
                          {/* 🚀 FIXED: Render user cloud profile avatars with standard initials text fallbacks inside the tasks data table */}
                          {task.assignee ? (
                            <div className="avatar placeholder" title={task.assignee.name}>
                              <div className="bg-neutral text-neutral-content rounded-full h-7 w-7 overflow-hidden flex items-center justify-center text-[10px] font-black border border-base-300/40 select-none">
                                {task.assignee.avatarUrl ? (
                                  <img src={task.assignee.avatarUrl} alt={`${task.assignee.name}'s task avatar`} className="object-cover w-full h-full" />
                                ) : (
                                  <span>{firstInitial}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral/30 text-[11px] italic font-semibold select-none">Unassigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* STICKY DETAILS SIDEBAR CONTEXT DRAWER */}
      {selectedTask && (
        <aside className="w-80 md:w-96 shrink-0 bg-base-100 border border-base-300 rounded-2xl p-4 shadow-xl z-10 flex flex-col h-fit sticky top-0 max-h-[calc(100vh-6rem)] overflow-y-auto animate-fadeIn">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-base-200">
            <div className="space-y-1 flex-1 text-left">
              {!isEditing ? (
                <>
                  <span className={`badge badge-xs border rounded font-black text-[9px] px-1.5 py-1 ${getPriorityStyle(selectedTask.priority)}`}>
                    {selectedTask.priority} Priority
                  </span>
                  <h2 className="text-base font-bold text-base-content leading-tight mt-1">{selectedTask.title}</h2>
                </>
              ) : (
                <div className="space-y-2 mt-1">
                  <span className="text-[9px] font-bold text-neutral/40 uppercase tracking-wide">Edit Task Title</span>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="input input-sm input-bordered w-full bg-base-200 rounded-xl text-xs font-bold focus:bg-base-100 focus:input-primary transition-all"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-ghost btn-xs rounded-lg text-neutral/40 hover:text-primary hover:bg-primary/5 p-1 font-bold h-7 cursor-pointer"
                  title="Modify Task Parameters"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1 animate-fade-in">
                  <button
                    disabled={isPending}
                    onClick={handleSaveInlineDrawer}
                    className="btn btn-success btn-xs btn-circle h-7 w-7 p-0 cursor-pointer"
                    title="Commit Changes"
                  >
                    <Save className="h-3.5 w-3.5 text-success-content" />
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-ghost btn-xs btn-circle h-7 w-7 p-0 hover:bg-base-200 cursor-pointer"
                    title="Cancel Mutation"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-neutral/40" />
                  </button>
                </div>
              )}

              <button 
                onClick={() => setSelectedTask(null)}
                className="btn btn-ghost btn-xs text-neutral/40 hover:text-neutral p-0 w-6 h-6 rounded-md flex items-center justify-center min-h-0"
              >
                <X className="h-4 w-4 stroke-[2.2]" />
              </button>
            </div>
          </div>

          <div className="py-4 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral/40 font-bold uppercase text-[10px] tracking-wider">Workflow Stage</span>
              {!isEditing ? (
                <span className={`badge badge-sm font-bold border rounded px-2 capitalize ${getStatusStyle(selectedTask.status)}`}>
                  {selectedTask.status.toLowerCase().replace('_', ' ')}
                </span>
              ) : (
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="select select-bordered select-xs text-xs font-bold bg-base-200 rounded-lg max-w-[140px]"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral/40 font-bold uppercase text-[10px] tracking-wider">Priority Level</span>
              {!isEditing ? (
                <span className={`badge badge-xs border rounded font-black text-[9px] px-1.5 py-1 ${getPriorityStyle(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
              ) : (
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as any)}
                  className="select select-bordered select-xs text-xs font-bold bg-base-200 rounded-lg max-w-[140px]"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral/40 font-bold uppercase text-[10px] tracking-wider">Workspace Folder</span>
              <span className="font-semibold text-neutral/70 flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-primary stroke-[2]" /> {selectedTask.project?.name || "Global"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral/40 font-bold uppercase text-[10px] tracking-wider">Due Window</span>
              {!isEditing ? (
                <span className="font-semibold text-neutral/70 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 opacity-40" /> {selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : "Flexible Timeline"}
                </span>
              ) : (
                <input 
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="input input-bordered input-xs font-bold text-xs bg-base-200 rounded-lg cursor-pointer max-w-[140px]"
                />
              )}
            </div>

            <div className="space-y-1 bg-base-200/40 p-2.5 rounded-xl border border-base-200 mt-1 flex flex-col text-left">
              <span className="text-neutral/40 font-bold uppercase text-[9px] tracking-wider block">Description Overview</span>
              {!isEditing ? (
                <p className="text-neutral/70 leading-relaxed font-medium text-[11px]">
                  {selectedTask.description || <span className="italic opacity-40">No description provided.</span>}
                </p>
              ) : (
                <textarea
                  value={editDescription}
                  rows={2}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="textarea textarea-bordered bg-base-100 rounded-xl w-full text-[11px] font-medium leading-relaxed resize-none p-1.5 mt-1"
                  placeholder="Provide explicit operational details..."
                />
              )}
            </div>
          </div>
        </aside>
      )}

    </div>
  );
}