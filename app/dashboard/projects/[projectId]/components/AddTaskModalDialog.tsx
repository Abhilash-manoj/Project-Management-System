// app/dashboard/projects/[projectId]/components/AddTaskModalDialog.tsx
"use client";

import React, { useActionState, useEffect, useTransition } from "react";
import { X, ShieldAlert, CheckSquare, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { createTask } from "../../../../actions";

interface MemberOption {
  id: string;
  name: string;
}

interface ModalProps {
  projectId: string;
  teamMembers: MemberOption[];
  onClose: () => void;
  parentId?: string | null; 
}

interface FormStateShape {
  error: string | null;
  success: boolean;
}

export default function AddTaskModalDialog({ 
  projectId, 
  teamMembers, 
  onClose, 
  parentId = null 
}: ModalProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition(); // 👈 Added navigation transition lock

  const [formState, formAction, isPending] = useActionState(
    async (prevState: FormStateShape, formData: FormData): Promise<FormStateShape> => {
      const res = await createTask(formData);
      
      if (res && "error" in res) {
        return { error: res.error || "An unknown error occurred.", success: false };
      }
      
      return { error: null, success: true };
    },
    { error: null, success: false }
  );

  // ==========================================================================
  // ⚡ FIXED: DATA WORKFLOW SYNCHRONIZATION PASS
  // ==========================================================================
  useEffect(() => {
    if (formState?.success) {
      // Wrap refresh inside a transition context lock so React knows to wait for it
      startRefreshTransition(() => {
        router.refresh();
      });
    }
  }, [formState?.success, router]);

  // Once the server returns fresh data AND our refresh transition completes, shut down safely
  useEffect(() => {
    if (formState?.success && !isRefreshing) {
      onClose();
    }
  }, [formState?.success, isRefreshing, onClose]);
  // ==========================================================================

  // Combine both pending states to keep form inputs locked down securely during operation loops
  const working = isPending || isRefreshing;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4 select-none">
      
      {/* DIALOG SHEET CONTENT CANVAS */}
      <div className="card bg-base-100 border border-base-300 w-full max-w-md shadow-xl rounded-2xl overflow-hidden p-6 space-y-4 animate-scale-up text-neutral text-left">
        
        {/* UPPER MODAL HEADROW TITLE */}
        <div className="flex items-center justify-between border-b border-base-300 pb-3">
          <div className="flex items-center gap-2 text-primary">
            <CheckSquare className="h-4 w-4 stroke-[2.5]" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              {parentId ? "Initialize Sub-Task" : "Initialize Project Task"}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={working}
            className="btn btn-ghost btn-xs btn-circle rounded-lg text-neutral/40 hover:text-neutral hover:bg-base-200 disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* METADATA MUTATION FORM CORE FRAMEWORK */}
        <form action={formAction} className="space-y-4">
          
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="parentId" value={parentId || ""} />

          {formState?.error && (
            <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{formState.error}</span>
            </div>
          )}
          
          {formState?.success && (
            <div className="alert alert-success bg-success/10 border-success/20 text-success text-xs rounded-xl py-2.5 px-3 flex items-center gap-2 font-semibold">
              <span className="loading loading-spinner loading-2xs text-success"></span>
              <span>Syncing system data pipelines...</span>
            </div>
          )}

          <div>
            <label className="label py-1"><span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">Task Title</span></label>
            <input 
              name="title" 
              type="text" 
              required 
              disabled={working}
              placeholder={parentId ? "e.g., Audit authentication tokens validation arrays" : "e.g., Run localized API penetration audits"} 
              className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary text-xs font-semibold rounded-xl transition-all disabled:opacity-60" 
            />
          </div>

          <div>
            <label className="label py-1"><span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">Task Details Overview</span></label>
            <textarea 
              name="description" 
              rows={2}
              disabled={working}
              placeholder="Provide explicit operational parameters or milestones expectations..." 
              className="textarea textarea-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:textarea-primary text-xs font-semibold rounded-xl resize-none leading-relaxed transition-all disabled:opacity-60" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label py-1"><span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">Priority Weight</span></label>
              <select name="priority" disabled={working} className="select select-sm select-bordered w-full bg-base-200 text-neutral focus:select-primary text-xs font-bold rounded-xl transition-all disabled:opacity-60">
                <option value="LOW">Low Weight</option>
                <option value="MEDIUM">Medium Weight</option>
                <option value="HIGH">High Weight</option>
                <option value="CRITICAL">Critical Priority</option>
              </select>
            </div>

            <div>
              <label className="label py-1"><span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">Assignee Teammate</span></label>
              <select name="assigneeId" disabled={working} className="select select-sm select-bordered w-full bg-base-200 text-neutral focus:select-primary text-xs font-bold rounded-xl transition-all disabled:opacity-60">
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label py-1">
              <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3 text-neutral/40" /> Task Target Deadline
              </span>
            </label>
            <input 
              name="dueDate" 
              type="date" 
              disabled={working}
              className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
            />
          </div>

          {/* LOWER ACTIONS BUTTON BAR TERMINAL CONTROLS */}
          <div className="flex justify-end gap-2 pt-2 border-t border-base-300/60 mt-2">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={working}
              className="btn btn-ghost btn-sm font-bold rounded-xl text-neutral/50 hover:bg-base-200 cursor-pointer disabled:opacity-30"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={working}
              className="btn btn-primary btn-sm font-bold rounded-xl text-primary-content shadow-xs min-w-[100px] cursor-pointer"
            >
              {working ? <span className="loading loading-spinner loading-xs"></span> : "Commit Task"}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}