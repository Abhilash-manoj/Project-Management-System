// app/dashboard/projects/[projectId]/components/KanbanBoardContainer.tsx
"use client";

import React, { useState, useEffect, useTransition } from "react"; 
import { 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  Clock, 
  X, 
  Calendar, 
  User, 
  Plus, 
  CheckSquare,
  Trash2,
  Edit3,
  Save,
  RotateCcw
} from "lucide-react";
import { deleteMainTask, deleteSubTask, updateTaskStatus, toggleTaskCompletion, updateTaskDetailsAction } from "@/app/actions/tasks"; // 🚀 IMPORTED: updateTaskDetailsAction
import AddTaskModalDialog from "./AddTaskModalDialog";
import TaskComments from "@/app/dashboard/tasks/components/TaskComments"; 

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

interface SubTaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  creatorId: string; 
}

interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: string | null;
  creatorId: string; 
  assignee?: { name: string } | null;
  subTasks: SubTaskItem[];
}

interface BoardProps {
  initialTasks: KanbanTask[];
  projectId: string;
  teamMembers: { id: string; name: string }[];
  canMutate: boolean;
  currentUserId: string; 
  currentUserRole: "OWNER" | "ADMIN" | "EMPLOYEE" | "GUEST"; 
}

export default function KanbanBoardContainer({ 
  initialTasks, 
  projectId, 
  teamMembers, 
  canMutate,
  currentUserId,
  currentUserRole
}: BoardProps) {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [activeDetailedTaskId, setActiveDetailedTaskId] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 🚀 NEW: INLINE DRAWER TASK FIELD STATE BUFFERS
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<any>("LOW");
  const [editDueDate, setEditDueDate] = useState("");

  // Add-Task Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const columns: { id: TaskStatus; title: string; colorClass: string; icon: React.ReactNode }[] = [
    { id: "TODO", title: "To Do", colorClass: "bg-base-300", icon: <Circle className="h-4 w-4 text-neutral/40" /> },
    { id: "IN_PROGRESS", title: "In Progress", colorClass: "bg-primary", icon: <Clock className="h-4 w-4 text-primary" /> },
    { id: "REVIEW", title: "In Review", colorClass: "bg-warning", icon: <AlertCircle className="h-4 w-4 text-warning" /> },
    { id: "DONE", title: "Completed", colorClass: "bg-success", icon: <CheckCircle2 className="h-4 w-4 text-success" /> },
  ];

  const activeDetailedTask = tasks.find(t => t.id === activeDetailedTaskId) || null;

  // 🚀 NEW: SEED BUFFER DICTIONARY ROWS UPON ACTIVE SELECT CLICKS
  const handleOpenDetailedDrawer = (task: KanbanTask) => {
    setActiveDetailedTaskId(task.id);
    setIsEditing(false);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
  };

  // 🚀 NEW: DISPATCH MODIFIED DRAWER PARAMETERS TO THE DATABASE LAYER
  const handleSaveInlineKanbanTask = () => {
    if (!activeDetailedTask) return;
    if (!editTitle.trim()) {
      setErrorToast("Validation Error: Task title property string cannot be empty.");
      return;
    }

    startTransition(async () => {
      const res = await updateTaskDetailsAction({
        taskId: activeDetailedTask.id,
        projectId: projectId,
        title: editTitle,
        description: editDescription,
        priority: editPriority === "CRITICAL" ? "URGENT" : editPriority,
        status: activeDetailedTask.status,
        dueDate: editDueDate || null,
      });

      if (res?.error) {
        setErrorToast(res.error);
        setTimeout(() => setErrorToast(null), 5000);
      } else {
        setIsEditing(false);
        // Sync local client state representation row attributes instantly
        setTasks(prev => prev.map(t => t.id === activeDetailedTask.id ? {
          ...t,
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          dueDate: editDueDate || null
        } : t));
      }
    });
  };

  const handleDeleteMasterCard = (taskId: string) => {
    if (!confirm("CRITICAL ACTIONS WARNING: Are you sure you want to permanently delete this master task card? All child checkpoint arrays will be deleted.")) return;

    startTransition(async () => {
      const res = await deleteMainTask(taskId, projectId);
      if (res?.error) {
        setErrorToast(res.error);
        setTimeout(() => setErrorToast(null), 5000);
      } else {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setActiveDetailedTaskId(null); 
      }
    });
  };

  const handleDeleteChildLeaf = (subTaskId: string, parentId: string) => {
    startTransition(async () => {
      const res = await deleteSubTask(subTaskId, projectId);
      if (res?.error) {
        setErrorToast(res.error);
        setTimeout(() => setErrorToast(null), 5000);
      } else {
        setTasks(prev => prev.map(t => {
          if (t.id !== parentId) return t;
          return { ...t, subTasks: t.subTasks.filter(s => s.id !== subTaskId) };
        }));
      }
    });
  };

  const handleDropdownStatusChange = (taskId: string, targetStatus: TaskStatus) => {
    const previousTasksState = [...tasks];

    if (!canMutate) {
      setErrorToast("Read-Only Mode: You must be assigned to this project team to modify card statuses.");
      setTimeout(() => setErrorToast(null), 5000);
      return;
    }

    if (activeDetailedTask?.status === "DONE" && targetStatus !== "DONE") {
      setErrorToast("Workflow Lock: Completed tasks are archived and cannot be dragged backwards.");
      setTimeout(() => setErrorToast(null), 5000);
      return;
    }

    if (targetStatus !== "TODO") {
      const pendingChecklistCount = activeDetailedTask?.subTasks.filter(s => s.status !== "DONE").length || 0;
      if (pendingChecklistCount > 0) {
        setErrorToast(`Quality Gate Blockade: You must check off all child sub-tasks (${pendingChecklistCount} pending items) before this task can advance.`);
        setTimeout(() => setErrorToast(null), 5000);
        return;
      }
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    startTransition(async () => {
      const result = await updateTaskStatus(taskId, targetStatus);
      if (result && "error" in result && result.error) {
        setErrorToast(result.error);
        setTasks(previousTasksState);
        setTimeout(() => setErrorToast(null), 5000);
      }
    });
  };

  const handleToggleSubTask = (parentTaskId: string, subTaskId: string, currentStatus: TaskStatus) => {
    if (!canMutate) {
      setErrorToast("Read-Only Mode: You must be assigned to this project team to change checklist parameters.");
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    if (activeDetailedTask?.status === "DONE") {
      setErrorToast("Locked: Cannot modify checklist parameters of a finalized project task.");
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    const nextStatus: TaskStatus = currentStatus === "DONE" ? "TODO" : "DONE";

    setTasks(prev => prev.map(p => {
      if (p.id !== parentTaskId) return p;
      return {
        ...p,
        subTasks: p.subTasks.map(s => s.id === subTaskId ? { ...s, status: nextStatus } : s)
      };
    }));

    startTransition(async () => {
      const res = await toggleTaskCompletion(subTaskId, currentStatus);
      if (res && "error" in res && res.error) {
        setErrorToast(res.error);
        setTimeout(() => setErrorToast(null), 4000);
      }
    });
  };

  const triggerAddSubTask = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!canMutate) {
      setErrorToast("Read-Only Mode: Adding sub-task parameters requires active project team membership.");
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    if (activeDetailedTask?.status === "DONE") {
      setErrorToast("Access Gated: Cannot append new sub-task leaves to an already completed execution scope.");
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }
    setActiveParentId(parentId);
    setIsModalOpen(true);
  };

  return (
    <div className="relative flex flex-col h-full space-y-4">
      
      {errorToast && (
        <div className="alert alert-error fixed top-4 right-4 z-[100] w-96 shadow-lg rounded-xl flex items-start gap-2 text-xs font-bold text-error-content bg-error animate-fade-in">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start select-none">
        {columns.map((col) => {
          const columnTasks = tasks.filter(t => t.status === col.id);

          return (
            <div key={col.id} className="card bg-base-200/50 border border-base-300/60 rounded-2xl flex flex-col max-h-[80vh]">
              <div className="p-4 flex items-center justify-between border-b border-base-300/60 bg-base-100/40 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.colorClass}`} />
                  <h3 className="font-black text-xs uppercase tracking-wider text-neutral/70">{col.title}</h3>
                  <span className="badge badge-sm font-black bg-base-300/60 border-none text-neutral/50 text-[10px] rounded-md">{columnTasks.length}</span>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto min-h-[200px]">
                {columnTasks.map((task) => {
                  const completedCount = task.subTasks.filter(s => s.status === "DONE").length;
                  const totalCount = task.subTasks.length;

                  return (
                    <div 
                      key={task.id}
                      onClick={() => handleOpenDetailedDrawer(task)} // 🚀 FIXED: Captures full edit states dynamically on click
                      className="card bg-base-100 border border-base-300 p-4 rounded-xl shadow-2xs hover:shadow-sm hover:border-primary/40 transition-all cursor-pointer space-y-3 group text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-neutral text-sm group-hover:text-primary transition-colors line-clamp-2">{task.title}</h4>
                        <div className="shrink-0 mt-0.5">{col.icon}</div>
                      </div>

                      {totalCount > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral/40 uppercase">
                          <CheckSquare className="h-3.5 w-3.5 text-primary/70" />
                          <span>Subtasks: {completedCount}/{totalCount}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-base-300/40 text-[10px] font-bold">
                        <span className="badge badge-xs uppercase font-black tracking-wider px-1.5 bg-base-200 border-none text-neutral/50">{task.priority}</span>
                        {task.assignee && <span className="text-neutral/60 font-semibold">👤 {task.assignee.name}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================== */}
      {/* SIDE DRAWER SLIDEOUT PANEL WITH FULL EDIT ENGINE INTERPRETATION */}
      {/* ========================================================================== */}
      {activeDetailedTask && (
        <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/40 backdrop-blur-xs animate-fade-in">
          <div className="flex-1" onClick={() => setActiveDetailedTaskId(null)} />
          
          <div className="w-full max-w-lg bg-base-100 border-l border-base-300 h-full shadow-2xl p-6 overflow-y-auto flex flex-col space-y-6 animate-slide-left text-left text-neutral">
            
            <div className="flex items-center justify-between border-b border-base-300 pb-4">
              <div className="flex items-center gap-2">
                <span className="badge badge-primary badge-sm rounded-lg font-black uppercase text-[10px]">{activeDetailedTask.status}</span>
                <span className="text-xs text-neutral/40 font-bold">ID: {activeDetailedTask.id.slice(-5).toUpperCase()}</span>
              </div>
              
              <div className="flex items-center gap-1">
                {/* 🚀 NEW: TASK INTERACTIVE EDIT OPERATIONS SWITCH GATE PANEL */}
                {canMutate && (
                  <>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="btn btn-ghost btn-xs rounded-lg gap-1 font-bold text-neutral/50 hover:text-primary hover:bg-primary/5 h-7 px-2 cursor-pointer transition-colors"
                        title="Edit Task Scope Parameters"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 animate-fade-in">
                        <button
                          disabled={isPending}
                          onClick={handleSaveInlineKanbanTask}
                          className="btn btn-success btn-xs btn-circle h-7 w-7 p-0 cursor-pointer"
                          title="Save Mutated Values"
                        >
                          <Save className="h-3.5 w-3.5 text-success-content" />
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="btn btn-ghost btn-xs btn-circle h-7 w-7 p-0 hover:bg-base-200 cursor-pointer"
                          title="Discard Mutation"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-neutral/40" />
                        </button>
                      </div>
                    )}
                  </>
                )}

                {canMutate && (currentUserRole === "OWNER" || (currentUserRole === "ADMIN" && activeDetailedTask.creatorId === currentUserId)) && (
                  <button 
                    onClick={() => handleDeleteMasterCard(activeDetailedTask.id)}
                    className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10 rounded-xl cursor-pointer"
                    title="Delete Master Card"
                  >
                    <Trash2 className="h-4 w-4 stroke-[2.2]" />
                  </button>
                )}
                <button onClick={() => setActiveDetailedTaskId(null)} className="btn btn-ghost btn-sm btn-circle rounded-xl"><X className="h-5 w-5" /></button>
              </div>
            </div>

            {/* INTERACTIVE TITLE & DESCRIPTION COMPILER NODES */}
            <div className="space-y-2">
              {!isEditing ? (
                <>
                  <h2 className="text-xl font-black text-neutral tracking-tight leading-tight">{activeDetailedTask.title}</h2>
                  <p className="text-xs text-neutral/50 font-medium leading-relaxed bg-base-200/40 p-3 rounded-xl border border-base-300/30">
                    {activeDetailedTask.description || "No supplemental details parameters declared for this task."}
                  </p>
                </>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-neutral/40 uppercase tracking-wide">Modify Task Title</span>
                    <input 
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="input input-sm input-bordered w-full bg-base-200 rounded-xl text-xs font-bold focus:bg-base-100 focus:input-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-neutral/40 uppercase tracking-wide">Modify Task Description</span>
                    <textarea 
                      value={editDescription}
                      rows={3}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="textarea textarea-bordered bg-base-200 rounded-xl w-full text-xs font-medium leading-relaxed resize-none focus:bg-base-100 focus:textarea-primary transition-all p-2"
                      placeholder="Add design specs or notes..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* METRICS CONTROL ARCHITECTURAL BLOCK GRID */}
            <div className="grid grid-cols-2 gap-4 bg-base-200/50 border border-base-300/50 p-4 rounded-2xl text-xs font-bold">
              <div className="space-y-1">
                <span className="text-[10px] text-neutral/40 uppercase tracking-wider block">Priority</span>
                {!isEditing ? (
                  <span className="badge badge-sm rounded-md font-black uppercase tracking-wide bg-warning/10 border-warning/20 text-warning-content">{activeDetailedTask.priority}</span>
                ) : (
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="select select-bordered select-xs text-xs font-bold bg-base-100 rounded-lg w-full mt-0.5"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-neutral/40 uppercase tracking-wider block">Current Workflow Stage</span>
                <select 
                  value={activeDetailedTask.status} 
                  disabled={activeDetailedTask.status === "DONE" || !canMutate}
                  onChange={(e) => handleDropdownStatusChange(activeDetailedTask.id, e.target.value as TaskStatus)}
                  className="select select-xs select-bordered bg-base-100 font-black rounded-lg focus:select-primary"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">In Review</option>
                  <option value="DONE">Completed / Locked</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-neutral/40 uppercase tracking-wider block flex items-center gap-1"><Calendar className="h-3 w-3" /> Target Deadline</span>
                {!isEditing ? (
                  <span className="text-neutral/70 font-black block pt-1">{activeDetailedTask.dueDate ? new Date(activeDetailedTask.dueDate).toLocaleDateString() : "No Deadline Set"}</span>
                ) : (
                  <input 
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="input input-bordered input-xs font-bold text-xs bg-base-100 rounded-lg cursor-pointer w-full mt-0.5"
                  />
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-neutral/40 uppercase tracking-wider block flex items-center gap-1"><User className="h-3 w-3" /> Assignee Team Member</span>
                <span className="text-neutral/70 font-black block pt-1">{activeDetailedTask.assignee?.name || "Unassigned"}</span>
              </div>
            </div>

            {/* CHECKLIST DROPDOWN CONTAINER SUBTASKS SEGMENT */}
            <div className="space-y-3 pb-4 border-b border-base-300">
              <div className="flex items-center justify-between border-b border-base-300 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral/60 flex items-center gap-2">
                  Checklist Progress ({activeDetailedTask.subTasks.filter(s => s.status === "DONE").length}/{activeDetailedTask.subTasks.length})
                </h3>
                {canMutate && (
                  <button 
                    onClick={(e) => triggerAddSubTask(activeDetailedTask.id, e)}
                    disabled={activeDetailedTask.status === "DONE"}
                    className="btn btn-ghost btn-xs text-primary font-bold gap-1 rounded-lg hover:bg-primary/10 disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" /> Add Sub-task
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {activeDetailedTask.subTasks.length === 0 ? (
                  <p className="text-[11px] text-neutral/40 font-medium italic">No sub-task checkpoint rules exist on this card.</p>
                ) : (
                  activeDetailedTask.subTasks.map((sub) => (
                    <div 
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-base-200/60 hover:bg-base-200 border border-base-300/40 transition-all group/sub text-xs font-bold"
                    >
                      <div 
                        onClick={() => handleToggleSubTask(activeDetailedTask.id, sub.id, sub.status)}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <input 
                          type="checkbox" 
                          checked={sub.status === "DONE"}
                          readOnly
                          className="checkbox checkbox-sm checkbox-primary rounded-md pointer-events-none"
                        />
                        <span className={`flex-1 ${sub.status === "DONE" ? "line-through text-neutral/30 font-medium" : "text-neutral/80"}`}>
                          {sub.title}
                        </span>
                      </div>

                      {canMutate && (currentUserRole === "OWNER" || sub.creatorId === currentUserId) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChildLeaf(sub.id, activeDetailedTask.id);
                          }}
                          className="btn btn-ghost btn-2xs btn-circle text-base-content/30 hover:text-error opacity-0 group-hover/sub:opacity-100 transition-all rounded-md cursor-pointer ml-2"
                          title="Delete Subtask"
                        >
                          <X className="h-3.5 w-3.5 stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TASK COMMENTS ENGINE INJECTION */}
            <div className="mt-2">
              <TaskComments 
                taskId={activeDetailedTask.id} 
                currentUserId={currentUserId} 
              />
            </div>

          </div>
        </div>
      )}

      {isModalOpen && (
        <AddTaskModalDialog 
          projectId={projectId}
          teamMembers={teamMembers}
          parentId={activeParentId}
          onClose={() => {
            setIsModalOpen(false);
            setActiveParentId(null);
          }}
        />
      )}
    </div>
  );
}