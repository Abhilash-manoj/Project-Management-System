// app/dashboard/tasks/components/CreateTaskModal.tsx
"use client";

import React, { useState, useActionState } from "react";
import { createTask } from "../../../actions";
import { Plus, X, ListTodo, ShieldAlert, User, Tags, AlertTriangle, Loader2 } from "lucide-react";

interface DropdownProject {
  id: string;
  name: string;
}

interface DropdownUser {
  id: string;
  name: string;
}

interface CreateTaskModalProps {
  projects: DropdownProject[];
  teamMembers: DropdownUser[];
  parentTaskId?: string | null; 
}

interface ActionState {
  error?: string | null;
  success?: boolean;
}

const initialState: ActionState = {
  error: null,
};

export default function CreateTaskModal({ projects, teamMembers, parentTaskId = null }: CreateTaskModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await createTask(formData);
      if (result?.success) {
        setIsOpen(false); 
        return { error: null, success: true };
      }
      return result || { error: null };
    },
    initialState
  );

  return (
    <>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-primary btn-sm rounded-xl font-bold gap-2 shadow-sm cursor-pointer text-primary-content"
      >
        <Plus className="h-4 w-4 stroke-[2.5]" />
        {parentTaskId ? "Add Sub-Task" : "Create Task"}
      </button>

      {/* MODAL LIGHTBOX OVERLAY */}
      {isOpen && (
        <div className="modal modal-open fixed inset-0 z-50 flex items-center justify-center bg-neutral/40 backdrop-blur-xs transition-all duration-200">
          <div className="modal-box w-full max-w-lg bg-base-100 border border-base-300 p-6 rounded-2xl shadow-xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-base-300 pb-3">
              <div className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-primary stroke-[2.2]" />
                <div>
                  <h3 className="text-base font-black text-neutral tracking-tight">
                    {parentTaskId ? "Construct Sub-Task Unit" : "Construct Project Task"}
                  </h3>
                  <p className="text-[10px] text-neutral/40 font-black uppercase tracking-wider">Phase 1 Pipeline Architecture</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="btn btn-ghost btn-xs btn-circle text-neutral/40 hover:text-neutral cursor-pointer"
              >
                <X className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form action={formAction} className="space-y-4 font-sans">
              {state?.error && (
                <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-start gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4 shrink-0 stroke-[2.2]" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* Hidden self-referential tree parameters field */}
              <input type="hidden" name="parentId" value={parentTaskId || ""} />

              {/* Input: Title */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">
                    Task Title
                  </span>
                </label>
                <input 
                  name="title" 
                  type="text" 
                  required 
                  disabled={isPending}
                  className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all"
                  placeholder="e.g., Build Auth Middleware, Create UI components"
                />
              </div>

              {/* Input: Description */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">
                    Scope Description
                  </span>
                </label>
                <textarea 
                  name="description" 
                  disabled={isPending}
                  rows={3}
                  className="textarea textarea-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:textarea-primary rounded-xl text-xs font-medium transition-all resize-none leading-relaxed"
                  placeholder="Provide explicit technical instructions..."
                />
              </div>

              {/* Selector Matrix Grid Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Select: Project */}
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                      <Tags className="h-3 w-3" /> Project
                    </span>
                  </label>
                  <select 
                    name="projectId" 
                    disabled={isPending} 
                    className="select select-sm select-bordered w-full bg-base-200 text-neutral focus:select-primary text-xs font-bold rounded-xl"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Select: Assignee */}
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                      <User className="h-3 w-3" /> Assignee
                    </span>
                  </label>
                  <select 
                    name="assigneeId" 
                    disabled={isPending} 
                    className="select select-sm select-bordered w-full bg-base-200 text-neutral focus:select-primary text-xs font-bold rounded-xl"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Select: Priority */}
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Priority
                    </span>
                  </label>
                  <select 
                    name="priority" 
                    disabled={isPending} 
                    className="select select-sm select-bordered w-full bg-base-200 text-neutral focus:select-primary text-xs font-bold rounded-xl"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

              </div>

              {/* Actions Footer Control Box */}
              <div className="modal-action flex items-center justify-end gap-2 pt-3 border-t border-base-300 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="btn btn-ghost btn-sm rounded-xl font-bold text-neutral/50 hover:bg-base-200 hover:text-neutral transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  disabled={isPending || projects.length === 0}
                  className="btn btn-primary btn-sm rounded-xl font-bold gap-2 min-w-[120px] text-primary-content transition-all cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
                  ) : (
                    "Publish Task"
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}