// app/signin/page.tsx
import React from "react";
import SignInForm from "./components/SignInForm";
import Link from "next/link";
import { LogIn } from "lucide-react"; // Vector icon component

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 text-neutral p-6 font-sans antialiased">
      <div className="card w-full max-w-md p-8 bg-base-100 border border-base-300 rounded-2xl shadow-xl space-y-6">
        
        <div className="space-y-2 text-center flex flex-col items-center">
          {/* Brand Identity Vector Block */}
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center font-black text-primary-content text-xl shadow-md mb-2">
            N
          </div>
          
          <div className="flex items-center gap-1.5 text-primary">
            <LogIn className="h-5 w-5 stroke-[2.5]" />
            <h2 className="text-2xl font-black tracking-tight text-neutral">Welcome back</h2>
          </div>
          
          <p className="text-xs text-neutral/50 font-semibold leading-relaxed">
            Enter your workspace credentials to log in
          </p>
        </div>
        
        {/* Renders our clean, type-safe interactive Client form element */}
        <SignInForm />

        {/* Footer Navigation Link Wrapper */}
        <div className="text-center text-xs font-semibold text-neutral/40 pt-2 border-t border-base-300/60">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="link link-primary font-bold transition-all no-underline hover:underline">
            Create a workspace
          </Link>
        </div>

      </div>
    </div>
  );
}