// app/join/[token]/components/LinkOnboardingFormWrapper.tsx
"use client";

import React, { useActionState } from "react";
import { acceptJoinLinkOnboarding } from "../../../actions";
import { User, Mail, KeyRound, UserPlus, ShieldAlert, Loader2 } from "lucide-react"; // Vector standard icons

interface ActionState {
  error?: string | null;
  success?: boolean;
}

const initialState: ActionState = {
  error: null,
};

export default function LinkOnboardingFormWrapper({ token }: { token: string }) {
  // Type-safe server action execution binder passing along the static link token string
  const [state, formAction, isPending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      return await acceptJoinLinkOnboarding(token, formData);
    },
    initialState
  );

  return (
    <form action={formAction} className="space-y-4 font-sans text-neutral">
      
      {/* ERROR CONTEXT BOUNDARY ALERT */}
      {state?.error && (
        <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-start gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4 shrink-0 stroke-[2.2]" />
          <span>{state.error}</span>
        </div>
      )}
      
      {/* INPUT: FULL NAME */}
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
            <User className="h-3 w-3 text-primary" /> Full Name
          </span>
        </label>
        <input 
          name="name" 
          type="text" 
          required 
          disabled={isPending} 
          className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
          placeholder="e.g., Alex Smith" 
        />
      </div>

      {/* INPUT: WORK EMAIL ADDRESS */}
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
            <Mail className="h-3 w-3 text-primary" /> Work Email Address
          </span>
        </label>
        <input 
          name="email" 
          type="email" 
          required 
          disabled={isPending} 
          className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
          placeholder="alex@company.com" 
        />
      </div>

      {/* INPUT: PASSWORD */}
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
            <KeyRound className="h-3 w-3 text-primary" /> Password
          </span>
        </label>
        <input 
          name="password" 
          type="password" 
          required 
          disabled={isPending} 
          className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
          placeholder="••••••••" 
        />
      </div>

      {/* SUBMIT ACTION BUTTON */}
      <button 
        type="submit" 
        disabled={isPending} 
        className="btn btn-primary btn-sm w-full rounded-xl font-bold gap-2 text-primary-content transition-all cursor-pointer mt-2 shadow-sm"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
        ) : (
          <UserPlus className="h-3.5 w-3.5 stroke-[2.5]" />
        )}
        {isPending ? "Configuring Account..." : "Join Workspace Team"}
      </button>
    </form>
  );
}