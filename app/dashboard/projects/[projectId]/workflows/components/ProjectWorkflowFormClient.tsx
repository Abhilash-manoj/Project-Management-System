// app/dashboard/projects/[projectId]/workflows/components/ProjectWorkflowFormClient.tsx
"use client";

import React, { useState, useTransition } from "react";
import { createCustomProjectColumn, applyOrgBlueprintToProject } from "@/app/actions/blueprints"; // 🚀 IMPORTED: applyOrgBlueprintToProject
import { Kanban, ClipboardList, PlusCircle, CheckCircle2, ShieldAlert, Loader2, ArrowRight } from "lucide-react";

interface ColumnItem {
  id: string;
  name: string;
  position: number;
}

interface TemplateItem {
  id: string;
  title: string;
  items: string[];
}

interface FormProps {
  projectId: string; 
  currentColumns: ColumnItem[];
  availableTemplates: TemplateItem[];
}

export default function ProjectWorkflowFormClient({ projectId, currentColumns, availableTemplates }: FormProps) {
  const [isPending, startTransition] = useTransition();
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);

  const handleAppendColumn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(false);

    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await createCustomProjectColumn(projectId, formData);
      if (result?.error) {
        setFeedbackError(result.error);
      } else {
        setFeedbackSuccess(true);
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  // 🚀 NEW: HANDLER FOR REUSABLE ORGANIZATIONAL BLUEPRINTS
  const handleApplyBlueprintTemplate = async (blueprintId: string) => {
    const confirmation = confirm(
      "CRITICAL OVERWRITE WARNING:\n\nApplying this template blueprint will overwrite this project's current board layout lanes. Existing tasks will fall back into the first lane of the new layout. Continue?"
    );
    if (!confirmation) return;

    setFeedbackError(null);
    setFeedbackSuccess(false);

    startTransition(async () => {
      const result = await applyOrgBlueprintToProject(projectId, blueprintId);
      if (result?.error) {
        setFeedbackError(result.error);
      } else {
        setFeedbackSuccess(true);
        // Instantly refresh window state to mount new layout configuration parameters
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-6 w-full text-neutral font-sans">
      
      {/* TRANSACTION STATE NOTIFICATIONS */}
      {feedbackError && (
        <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-3 px-4 flex items-start gap-2.5 font-semibold text-left">
          <ShieldAlert className="h-4 w-4 shrink-0 stroke-[2.2]" />
          <span>{feedbackError}</span>
        </div>
      )}

      {feedbackSuccess && (
        <div className="alert alert-success bg-success/10 border-success/20 text-success text-xs rounded-xl py-3 px-4 flex items-start gap-2.5 font-semibold text-left">
          <CheckCircle2 className="h-4 w-4 shrink-0 stroke-[2.2]" />
          <span>Project workflow configuration parameter sequence synchronized successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* COLUMN INHERITANCE / CREATION DECK */}
        <div className="md:col-span-2 space-y-6">
          
          {/* BLOCK 1: APPEND INDIVIDUAL TARGET WORKFLOW COLUMN */}
          <div className="card bg-base-100 border border-base-300 shadow-xs p-5 space-y-4 rounded-xl">
            <div className="flex items-center gap-1.5 text-neutral/60">
              <PlusCircle className="h-4 w-4 stroke-[2.2]" />
              <h3 className="font-black text-xs uppercase tracking-wider text-neutral/80 text-left">Append Custom Pipeline Phase</h3>
            </div>

            <form onSubmit={handleAppendColumn} className="grid grid-cols-3 gap-2 items-end">
              <div className="form-control col-span-2 text-left">
                <label className="label py-0.5"><span className="label-text text-[9px] font-bold uppercase text-neutral/40">Stage Machine ID Name</span></label>
                <input name="columnName" type="text" placeholder="e.g., IN_REVIEW, STAGING" required disabled={isPending} className="input input-bordered input-sm rounded-lg bg-base-200/50 text-xs text-neutral font-semibold" />
              </div>
              <div className="form-control col-span-1 text-left">
                <label className="label py-0.5"><span className="label-text text-[9px] font-bold uppercase text-neutral/40">Sort Order</span></label>
                <input name="position" type="number" defaultValue={currentColumns.length} disabled={isPending} className="input input-bordered input-sm rounded-lg bg-base-200/50 text-xs text-neutral font-semibold text-center" />
              </div>
              <button type="submit" disabled={isPending} className="btn btn-primary btn-sm col-span-3 rounded-lg text-white font-bold gap-1.5 cursor-pointer mt-2 flex items-center justify-center">
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Kanban className="h-3.5 w-3.5" />}
                Commit Custom Column Parameter
              </button>
            </form>
          </div>

          {/* BLOCK 2: PRE-BUILD SELECTION DECK TEMPLATES */}
          <div className="card bg-base-100 border border-base-300 shadow-xs p-5 space-y-3 rounded-xl">
            <div className="flex items-center gap-1.5 text-neutral/60">
              <ClipboardList className="h-4 w-4 stroke-[2.2]" />
              <h3 className="font-black text-xs uppercase tracking-wider text-neutral/80 text-left">Inherit Reusable Org Blueprints</h3>
            </div>
            
            {availableTemplates.length === 0 ? (
              <p className="text-xs italic text-neutral/40 bg-base-200/30 p-4 rounded-xl border text-center">
                No corporate library structural templates declared in Organization settings.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {availableTemplates.map((tpl) => (
                  <button 
                    key={tpl.id} 
                    type="button"
                    disabled={isPending}
                    onClick={() => handleApplyBlueprintTemplate(tpl.id)} // 🚀 FIXED: Wired interaction directly into dynamic template cloner
                    className="flex items-center justify-between p-3 rounded-xl border border-base-300 hover:border-primary/40 bg-base-200/20 text-left cursor-pointer transition-all hover:bg-base-100 group w-full"
                  >
                    <div className="flex-1 pr-2">
                      <p className="text-xs font-bold text-neutral">{tpl.title}</p>
                      <p className="text-[10px] text-neutral/40 font-semibold mt-0.5 whitespace-normal leading-relaxed">Includes: {tpl.items.join(" → ")}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral/30 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ACTIVE SEQUENCE MONITOR TRACKER */}
        <div className="card bg-base-100 border border-base-300 shadow-xs p-5 space-y-3 rounded-xl text-left">
          <h4 className="text-[10px] font-black uppercase text-neutral/40 tracking-wider">Active Board Track Layout</h4>
          
          <div className="flex flex-col gap-1.5">
            {currentColumns.length === 0 ? (
              <div className="space-y-1 pl-2 border-l-2 border-base-300 opacity-50">
                {["TODO", "IN_PROGRESS", "DONE"].map((std, i) => (
                  <div key={i} className="bg-base-200 p-2 rounded-lg font-mono text-[10px] font-bold text-neutral/60">
                    {i} : {std} <span className="text-[8px] font-sans opacity-60">(System Standard)</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                {currentColumns.map((col) => (
                  <div key={col.id} className="bg-base-200/60 border border-base-300 p-2 rounded-lg font-mono text-[10px] font-bold text-neutral">
                    {col.position} : {col.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}