// app/join/[token]/page.tsx
import React from "react";
import { prisma } from "@/lib/db";
import LinkOnboardingFormWrapper from "./components/LinkOnboardingFormWrapper";
import Link from "next/link";
import { ShieldAlert, Link2 } from "lucide-react"; // Vector standard icons

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function BulkJoinLinkPage({ params }: JoinPageProps) {
  const { token } = await params;

  const linkContext = await prisma.joinLink.findUnique({
    where: { token },
    include: { 
      organization: { select: { name: true } },
      project: { select: { name: true } }
    },
  });

  // Validate link state parameters before loading input forms
  if (!linkContext || linkContext.currentUses >= linkContext.maxUses || new Date() > linkContext.expiresAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-200 text-neutral p-6 font-sans antialiased">
        <div className="card w-full max-w-md p-8 text-center bg-base-100 border border-base-300 rounded-2xl space-y-4 shadow-xl items-center">
          <div className="avatar placeholder mb-2">
            <div className="bg-error/10 text-error rounded-full h-14 w-14 border border-error/20 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 stroke-[2.2]" />
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-error">Invite Link Inactive</h2>
          <p className="text-xs text-neutral/60 font-semibold leading-relaxed">
            This shared workspace link has hit its maximum usage threshold, been revoked, or has expired.
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
        
        <div className="text-center space-y-2 flex flex-col items-center">
          {/* Brand Identity Wrapper */}
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center font-black text-primary-content text-lg shadow-md mb-2">
            N
          </div>
          
          <div className="flex items-center gap-1.5 text-primary">
            <Link2 className="h-4 w-4 stroke-[2.5]" />
            <h2 className="text-xl font-black tracking-tight text-neutral">Register Workspace Profile</h2>
          </div>
          
          <p className="text-xs text-neutral/50 font-semibold leading-relaxed px-2">
            You are self-registering to <span className="font-bold text-primary">{linkContext.organization.name}</span>. 
            {linkContext.project && (
              <>
                {" "}You will be auto-assigned to project:{" "}
                <span className="badge badge-primary badge-outline font-bold text-[11px] rounded px-1.5 py-0.5 lowercase tracking-normal">
                  {linkContext.project.name}
                </span>
              </>
            )}
          </p>
        </div>

        {/* 🚀 CONNECTED: Calls our updated client wrapper which forces the required department name text input string parameters */}
        <LinkOnboardingFormWrapper token={token} />
      </div>
    </div>
  );
}