// app/invite/[token]/components/IngestionFormWrapper.tsx
"use client";

import React, { useActionState } from "react";
import { acceptIndividualInvitation } from "@/app/actions/workspace";
import { User, KeyRound, ArrowRight, ShieldAlert, Loader2, Building } from "lucide-react"; 

interface ActionState {
  error?: string | null;
  success?: boolean;
}

const initialState: ActionState = {
  error: null,
};

interface IngestionFormWrapperProps {
  token: string;
  targetEmail: string;
  requireDepartment?: boolean; // 🚀 NEW: Catch permission attribute from parent server page
}

export default function IngestionFormWrapper({ 
  token, 
  targetEmail,
  requireDepartment = true // 🚀 NEW: Required by default for organization joiners
}: IngestionFormWrapperProps) {
  
  // Type-safe server action execution binder passing along the static token route string
  const [state, formAction, isPending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      return await acceptIndividualInvitation(token, formData);
    },
    initialState
  );

  return (
    <form action={formAction} className="space-y-4 font-sans text-neutral">
      
      {/* ERROR CONTEXT BOUNDARY ALERT */}
      {state?.error && (
        <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-start gap-2 font-semibold text-left">
          <ShieldAlert className="h-4 w-4 shrink-0 stroke-[2.2]" />
          <span>{state.error}</span>
        </div>
      )}

      {/* INPUT: EMAIL (Disabled/Locked) */}
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">
            Your Registered Email
          </span>
        </label>
        <input 
          type="text" 
          disabled 
          value={targetEmail} 
          className="input input-sm input-bordered w-full bg-base-200 text-neutral/40 border-base-300 rounded-xl text-xs font-semibold cursor-not-allowed select-none text-left" 
        />
      </div>

      {/* INPUT: FULL LEGAL NAME */}
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
            <User className="h-3 w-3 text-primary" /> Full Legal Name
          </span>
        </label>
        <input 
          name="name" 
          type="text" 
          required 
          disabled={isPending} 
          className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all text-left" 
          placeholder="e.g., Jane Smith" 
        />
      </div>

      {/* 🚀 NEW: REQUIRE INCOMING TEAM USER MEMBERS TO SPECIFY THEIR CORPORATE DIVISION TEXT */}
      {requireDepartment && (
        <div className="form-control w-full">
          <label className="label py-1">
            <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
              <Building className="h-3 w-3 text-primary stroke-[2.2]" /> Workplace Department / Division
            </span>
          </label>
          <input 
            name="department" 
            type="text" 
            required 
            disabled={isPending} 
            className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all text-left" 
            placeholder="e.g., Engineering, Marketing, Operations..." 
          />
        </div>
      )}

      {/* INPUT: SET SECURE PASSWORD */}
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
            <KeyRound className="h-3 w-3 text-primary" /> Set Account Password
          </span>
        </label>
        <input 
          name="password" 
          type="password" 
          required 
          disabled={isPending} 
          className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all text-left" 
          placeholder="••••••••" 
        />
      </div>

      {/* SUBMIT ACTION BUTTON */}
      <button 
        type="submit" 
        disabled={isPending} 
        className="btn btn-primary btn-sm w-full rounded-xl font-bold gap-2 text-primary-content transition-all cursor-pointer mt-2 shadow-sm flex items-center justify-center"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
        ) : (
          <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
        )}
        {isPending ? "Configuring Identity..." : "Finalize Registration & Launch Dashboard"}
      </button>
    </form>
  );
}