// app/invite/[token]/page.tsx
import React from "react";
import { prisma } from "@/lib/db";
import IngestionFormWrapper from "./components/IngestionFormWrapper"; 
import Link from "next/link";
import { ShieldX, Sparkles } from "lucide-react"; // Vector icon components

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteIngestionPage({ params }: InvitePageProps) {
  const { token } = await params;

  // 1. Look up invitation token data parameters on server load context
  const inviteContext = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });

  // 2. Validate token viability before allowing them to see form options
  if (!inviteContext || inviteContext.status !== "PENDING" || new Date() > inviteContext.expiresAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-200 text-neutral p-6 font-sans antialiased">
        <div className="card w-full max-w-md p-8 text-center bg-base-100 border border-base-300 rounded-2xl space-y-4 shadow-xl items-center">
          <div className="avatar placeholder mb-2">
            <div className="bg-error/10 text-error rounded-full h-14 w-14 border border-error/20">
              <ShieldX className="h-6 w-6 stroke-[2.2]" />
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-error">Invalid Link</h2>
          <p className="text-xs text-neutral/60 font-semibold leading-relaxed">
            This secure onboarding invitation token has expired, been revoked by an administrator, or was already consumed.
          </p>
          <Link href="/" className="btn btn-ghost btn-sm rounded-xl text-xs font-bold text-primary mt-2">
            ← Return to Nexus Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-theme="fantasy" className="flex min-h-screen items-center justify-center bg-base-200 text-neutral p-6 font-sans antialiased">
      <div className="card w-full max-w-md p-8 bg-base-100 border border-base-300 rounded-2xl shadow-xl space-y-6">
        
        <div className="space-y-2 text-center flex flex-col items-center">
          {/* Brand Logo using Fantasy layout parameters */}
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center font-black text-primary-content text-xl shadow-md mb-2">
            N
          </div>
          
          <div className="flex items-center gap-1.5 text-primary">
            <Sparkles className="h-4 w-4 stroke-[2.5]" />
            <h2 className="text-xl font-black tracking-tight text-neutral">Accept Workspace Invitation</h2>
          </div>

          <p className="text-xs text-neutral/50 font-semibold leading-relaxed px-2">
            You are joining <span className="font-bold text-primary">{inviteContext.organization.name}</span> as an itemized{" "}
            <span className="badge badge-sm font-bold bg-base-200 border-base-300 text-neutral uppercase rounded px-1.5 py-0.5">
              {inviteContext.role}
            </span>{" "}
            configuration.
          </p>
        </div>

        {/* Deliver dynamic token hook context parameters to interactive layout container */}
        <IngestionFormWrapper token={token} targetEmail={inviteContext.email} />

      </div>
    </div>
  );
}