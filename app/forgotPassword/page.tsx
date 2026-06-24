// app/forgotPassword/page.tsx
"use client";

import React, { useState, useTransition } from "react";
import { requestPasswordReset } from "@/app/actions/auth-recovery";
import Link from "next/link";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ success?: boolean; error?: string | null }>({});

  const handleFormSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({});

    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (result?.error) {
        setStatus({ error: result.error });
      } else {
        setStatus({ success: true });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4 font-sans">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300 p-6 space-y-6 text-left">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-base-content">Recover Password</h2>
          <p className="text-xs opacity-60">Enter your email and we'll transmit a secure recovery connection token.</p>
        </div>

        {status.success ? (
          <div className="alert alert-success bg-success/10 border-success/20 text-success text-xs rounded-xl py-3 px-4 flex items-start gap-2.5 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 stroke-[2.2]" />
            <div>
              <span className="font-bold block text-base-content">Transmission Complete</span>
              If that account profile exists, an automated configuration message has been dispatched. Check your inbox.
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmission} className="space-y-4">
            {status.error && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold">
                {status.error}
              </div>
            )}

            <div className="form-control w-full space-y-1">
              <label className="text-xs font-bold opacity-70">Corporate Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 text-base-content/40 h-4 w-4" />
                <input
                  type="email"
                  required
                  disabled={isPending}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input input-bordered input-sm w-full bg-base-100 rounded-xl text-xs focus:outline-primary pl-9 h-10 text-neutral"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-sm w-full h-10 font-bold rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Dispatch Reset Token"}
            </button>
          </form>
        )}

        <div className="text-center text-xs opacity-60">
          <Link href="/signin" className="hover:text-primary hover:underline font-semibold transition-colors">
            ← Back to Login Credentials Gateway
          </Link>
        </div>
      </div>
    </div>
  );
}