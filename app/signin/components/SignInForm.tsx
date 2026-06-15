// app/signin/components/SignInForm.tsx
"use client"; 

import React, { useActionState } from "react";
import { signInUser } from "../../actions";
import { Mail, KeyRound, ArrowRight, ShieldAlert, Loader2 } from "lucide-react"; // Vector standard icons

interface ActionState {
  error?: string | null;
  success?: boolean;
}

const initialState: ActionState = {
  error: null,
};

export default function SignInForm() {
  // useActionState handles executing the action while keeping track of any returned errors
  const [state, formAction, isPending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await signInUser(formData);
      return result || { error: null };
    },
    initialState
  );

  return (
    <form action={formAction} className="space-y-4 font-sans text-neutral">
      
      {/* SERVER ERROR BADGE DISPLAY */}
      {state?.error && (
        <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-start gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4 shrink-0 stroke-[2.2]" />
          <span>{state.error}</span>
        </div>
      )}

      {/* INPUT: EMAIL ADDRESS */}
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
            <Mail className="h-3 w-3 text-primary" /> Email Address
          </span>
        </label>
        <input 
          name="email" 
          type="email" 
          required 
          disabled={isPending}
          className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
          placeholder="you@company.com" 
        />
      </div>

      {/* INPUT: PASSWORD */}
      <div className="form-control w-full">
        <div className="flex justify-between items-center py-1">
          <label className="label p-0">
            <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
              <KeyRound className="h-3 w-3 text-primary" /> Password
            </span>
          </label>
          <a href="#" className="link link-primary text-[11px] font-bold no-underline hover:underline transition-colors">
            Forgot password?
          </a>
        </div>
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
          <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
        )}
        {isPending ? "Signing in..." : "Sign In to Workspace"}
      </button>
    </form>
  );
}