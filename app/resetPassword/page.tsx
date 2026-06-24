// app/resetPassword/page.tsx
"use client";

import React, { useState, useTransition, useEffect, Suspense } from "react"; // 🚀 FIXED: Added Suspense import
import { useSearchParams, useRouter } from "next/navigation";
import { executePasswordReset } from "@/app/actions/auth-recovery";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";

// 🚀 FIXED: Extracted the interactive form logic into a sub-component
function ResetPasswordFormInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ success?: boolean; error?: string | null }>({});

  useEffect(() => {
    if (!token) {
      setStatus({ error: "Missing identity token. This session is invalid." });
    }
  }, [token]);

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({});

    if (password !== confirmPassword) {
      setStatus({ error: "Validation Error: Passwords do not match." });
      return;
    }

    if (!token) return;

    startTransition(async () => {
      const result = await executePasswordReset(token, password);
      if (result?.error) {
        setStatus({ error: result.error });
      } else {
        setStatus({ success: true });
        setTimeout(() => {
          router.push("/auth/login");
        }, 3000);
      }
    });
  };

  return (
    <form onSubmit={handleResetSubmit} className="space-y-4">
      {status.success && (
        <div className="alert alert-success bg-success/10 border-success/20 text-success text-xs rounded-xl py-3 px-4 flex items-start gap-2.5 font-medium mb-4">
          <CheckCircle2 className="h-4 w-4 shrink-0 stroke-[2.2]" />
          <div>
            <span className="font-bold block text-base-content">Password Modified!</span>
            Your credential nodes have updated successfully. Redirecting you to login portal canvas...
          </div>
        </div>
      )}

      {status.error && (
        <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold">
          {status.error}
        </div>
      )}

      {!status.success && (
        <>
          <div className="form-control w-full space-y-1">
            <label className="text-xs font-bold opacity-70">New Secure Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 text-base-content/40 h-4 w-4" />
              <input
                type="password"
                required
                disabled={isPending || !token}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input input-bordered input-sm w-full bg-base-100 rounded-xl text-xs focus:outline-primary pl-9 h-10 text-neutral"
              />
            </div>
          </div>

          <div className="form-control w-full space-y-1">
            <label className="text-xs font-bold opacity-70">Confirm New Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 text-base-content/40 h-4 w-4" />
              <input
                type="password"
                required
                disabled={isPending || !token}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input input-bordered input-sm w-full bg-base-100 rounded-xl text-xs focus:outline-primary pl-9 h-10 text-neutral"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !token}
            className="btn btn-primary btn-sm w-full h-10 font-bold rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save New Credentials"}
          </button>
        </>
      )}
    </form>
  );
}

// 🚀 FIXED: Main export component wraps the inner form inside a lazy-loaded Suspense container block
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4 font-sans">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300 p-6 space-y-6 text-left">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-base-content">Reset Password</h2>
          <p className="text-xs opacity-60">Establish your new platform access credentials signature configuration.</p>
        </div>

        {/* 🚀 FIXED: This prevents the Vercel build worker thread from failing static prerendering loops */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-8 opacity-40 text-xs font-semibold gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading authentication parameter tokens...
          </div>
        }>
          <ResetPasswordFormInner />
        </Suspense>
      </div>
    </div>
  );
}