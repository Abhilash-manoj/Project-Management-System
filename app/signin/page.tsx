// app/signin/page.tsx
import React from "react";
import SignInForm from "./components/SignInForm";
import Link from "next/link";
import { LogIn, ShieldAlert } from "lucide-react"; 

interface PageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  // Await and destructure searchParams safely on the server side
  const { error } = await searchParams;
  const isDeactivated = error === "deactivated";

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

        {/* Render the warning banner conditionally if kicked by the middleware access shield */}
        {isDeactivated && (
          <div className="alert alert-error text-xs font-bold rounded-xl text-error-content bg-error flex items-start gap-2 text-left p-3 border border-error/20 animate-fade-in">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-black">Access Gated Workspace Token</p>
              <p className="font-medium text-[11px] opacity-90 mt-0.5">
                This user account has been deactivated by the system operations Owner. Contact your workspace administrator for restoration.
              </p>
            </div>
          </div>
        )}
        
        {/* Renders our clean, type-safe interactive Client form element */}
        <SignInForm />

        {/* 🚀 FIXED: Added self-service recovery link anchor node */}
        <div className="text-center text-xs -mt-2">
          <Link 
            href="/forgotPassword" 
            className="text-primary font-bold transition-all hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Footer Navigation Link Wrapper */}
        <div className="text-center text-xs font-semibold text-neutral/40 pt-4 border-t border-base-300/60">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="link link-primary font-bold transition-all no-underline hover:underline">
            Create a workspace
          </Link>
        </div>

      </div>
    </div>
  );
}