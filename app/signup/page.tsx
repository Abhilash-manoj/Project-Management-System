// app/signup/page.tsx
import React from "react";
import { signUpUser } from "../actions";
import Link from "next/link";
import { User, Mail, KeyRound, UserPlus } from "lucide-react"; // Vector standard icons

export default function UserSignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 text-neutral p-6 font-sans antialiased">
      <div className="card w-full max-w-md p-8 bg-base-100 border border-base-300 rounded-2xl shadow-xl space-y-6">
        
        {/* HEADER BRANDING BLOCK */}
        <div className="space-y-2 text-center flex flex-col items-center">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center font-black text-primary-content text-xl shadow-md mb-2">
            N
          </div>
          
          <div className="flex items-center gap-1.5 text-primary">
            <UserPlus className="h-5 w-5 stroke-[2.5]" />
            <h2 className="text-2xl font-black tracking-tight text-neutral">Create your account</h2>
          </div>
          
          <p className="text-xs text-neutral/50 font-semibold uppercase tracking-wider">
            Step 1 of 2: Global User Registration
          </p>
        </div>
        
        {/* FORM REGISTRATION SYSTEM */}
        <form action={signUpUser} className="space-y-4">
          
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
              className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
              placeholder="e.g., John Doe" 
            />
          </div>

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
              className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
              placeholder="you@example.com" 
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
              className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
              placeholder="••••••••" 
            />
          </div>

          {/* SUBMIT BUTTON */}
          <button 
            type="submit" 
            className="btn btn-primary btn-sm w-full rounded-xl font-bold gap-2 text-primary-content transition-all cursor-pointer mt-2 shadow-sm"
          >
            Continue to Organization Setup
          </button>
        </form>

        {/* FOOTER LINK */}
        <div className="text-center text-xs font-semibold text-neutral/40 pt-2 border-t border-base-300/60">
          Already have an account?{" "}
          <Link href="/signin" className="link link-primary font-bold transition-all no-underline hover:underline">
            Sign In here
          </Link>
        </div>

      </div>
    </div>
  );
}