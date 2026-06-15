// app/dashboard/components/CreateProjectModal.tsx
"use client";

import React, { useState, useActionState } from "react";
import { createProject } from "../../actions";
import { Plus, X, FolderPlus, AlertCircle, Loader2, Calendar } from "lucide-react"; 

interface ActionState {
  error?: string | null;
  success?: boolean;
}

const initialState: ActionState = {
  error: null,
};

export default function CreateProjectModal() {
  const [isOpen, setIsOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await createProject(formData);
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
        New Project
      </button>

      {/* MODAL BACKDROP */}
      {isOpen && (
        <div className="modal modal-open fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs transition-all duration-200">
          <div className="modal-box w-full max-w-md bg-base-100 border border-base-300 p-6 rounded-2xl shadow-xl relative space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-base-300 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-primary stroke-[2.2]" />
                <div>
                  <h3 className="text-base font-black text-neutral tracking-tight">Create New Project Space</h3>
                  <p className="text-[10px] text-neutral/40 font-black uppercase tracking-wider">Tenant Infrastructure</p>
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
              
              {/* Context Action Errors Alert Layout */}
              {state?.error && (
                <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-start gap-2 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.2] mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* Input: Project Name */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">
                    Project Name
                  </span>
                </label>
                <input 
                  name="projectName" 
                  type="text" 
                  required 
                  disabled={isPending}
                  className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all"
                  placeholder="e.g., Mobile App v3.0, API Gateway"
                />
              </div>

              {/* Input: Description */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">
                    Description <span className="text-neutral/30 font-normal lowercase">(optional)</span>
                  </span>
                </label>
                <textarea 
                  name="description" 
                  disabled={isPending}
                  rows={2}
                  className="textarea textarea-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:textarea-primary rounded-xl text-xs font-medium transition-all resize-none leading-relaxed"
                  placeholder="Summarize core milestone objectives or workspace scopes..."
                />
              </div>

              {/* 👇 NEW INPUT FIELD: PROJECT LEVEL DUE DATE TARGET */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-neutral/40" /> Project Target Deadline
                  </span>
                </label>
                <input 
                  name="dueDate" 
                  type="date" 
                  disabled={isPending}
                  className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary text-xs font-bold rounded-xl transition-all cursor-pointer"
                />
              </div>

              {/* Action Operations Footer Buttons */}
              <div className="modal-action flex items-center justify-end gap-2 pt-3 border-t border-base-300 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="btn btn-ghost btn-sm rounded-xl font-bold text-neutral/50 hover:bg-base-200 hover:text-neutral transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="btn btn-primary btn-sm rounded-xl font-bold gap-2 min-w-[120px] text-primary-content transition-all cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
                      Building...
                    </>
                  ) : (
                    "Build Project"
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