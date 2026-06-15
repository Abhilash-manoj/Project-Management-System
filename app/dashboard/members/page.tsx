// app/dashboard/members/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers"; // 👈 FIXED: Added headers import for dynamic domain generation pass
import MemberOnboardingForm from "./components/MemberOnboardingForm"; 
import ShareLinkTerminal from "../components/ShareLinkTerminal"; // 👈 FIXED: Connected your reusable absolute copy container terminal
import { Users, KeyRound, Link as LinkIcon } from "lucide-react"; 

export default async function MembersManagementDashboardPage() {
  // 1. Authenticate session context
  const session = await getSession();
  if (!session) redirect("/signin");

  // 2. Query workspace membership parameters
  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });
  if (!membership) redirect("/signup/organization");

  // 3. SECURITY CHECK: Determine administration permissions
  const isInternalAdmin = membership.role === "OWNER" || membership.role === "ADMIN";

  // 4. Query live active team roster matching active organization space
  const activeTeamMembers = await prisma.membership.findMany({
    where: { organizationId: membership.organizationId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { role: "asc" },
  });

  // 5. Query active bulk links (Only compiled for Admin viewing options)
  const deployedJoinLinks = isInternalAdmin
    ? await prisma.joinLink.findMany({
        where: { organizationId: membership.organizationId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // 6. Query projects array context needed to seed creation forms
  const workspaceProjectsList = isInternalAdmin
    ? await prisma.project.findMany({
        where: { organizationId: membership.organizationId },
        select: { id: true, name: true },
      })
    : [];

  // ==========================================================================
  // 🌐 FIXED: DETECT THE SYSTEM HOST NAME PREFIX DIRECTLY ON THE SERVER PAGE
  // ==========================================================================
  const headersList = await headers();
  const activeHost = headersList.get("host") || "localhost:3000";
  const protocol = activeHost.includes("localhost") ? "http://" : "https://";
  const systemAbsoluteOrigin = `${protocol}${activeHost}`;
  // ==========================================================================

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in font-sans">
      
      {/* PAGE HEADER ROW */}
      <div className="flex flex-col gap-0.5 border-b border-base-300 pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5 stroke-[2.5]" />
          <h2 className="text-2xl font-black text-neutral tracking-tight">Team Members Directory</h2>
        </div>
        <p className="text-xs text-neutral/50 font-semibold">
          {isInternalAdmin 
            ? "Orchestrate organization identity profiles, bulk onboarding parameters, and sandbox limits."
            : "View-only access to your active organizational team directory network."}
        </p>
      </div>

      {/* DYNAMIC RESPONSIVE LAYOUT MATRIX */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls view clearance for Forms */}
        {isInternalAdmin ? (
          <div className="space-y-6">
            <MemberOnboardingForm projectContextList={workspaceProjectsList} />
          </div>
        ) : (
          /* Notice plate rendered explicitly to Employees explaining directory boundaries */
          <div className="card bg-base-100 border border-base-300 p-5 space-y-3 text-neutral/60 shadow-xs">
            <div className="flex items-center gap-2 text-warning">
              <KeyRound className="h-4 w-4 stroke-[2.5]" />
              <h4 className="font-black text-neutral text-sm">Clearance Restricted</h4>
            </div>
            <p className="text-xs font-medium leading-relaxed">
              Your profile is registered under an <span className="badge badge-sm font-bold bg-base-200 border-base-300 text-neutral uppercase px-1 rounded">{membership.role}</span> configuration. Account creation generation features are masked. Contact a workspace Administrator to register additional project colleagues.
            </p>
          </div>
        )}

        {/* RIGHT COLUMN: Active Directory Data Lists */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Active Workspace Directory Card */}
          <div className="card bg-base-100 border border-base-300 shadow-xs p-6 space-y-4">
            <h3 className="font-black text-sm uppercase tracking-wider text-neutral/40">
              Active Team Roster ({activeTeamMembers.length})
            </h3>
            
            <div className="divide-y divide-base-300 border border-base-300 rounded-xl overflow-hidden bg-base-200/30">
              {activeTeamMembers.map((member) => (
                <div key={member.id} className="p-3.5 flex items-center justify-between text-sm font-medium hover:bg-base-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="h-8 w-8 bg-primary/10 text-primary font-bold rounded-full border border-primary/20 flex items-center justify-center text-xs select-none">
                        <span>{member.user.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-neutral font-bold tracking-tight">{member.user.name}</p>
                      <p className="text-xs text-neutral/40 font-semibold">{member.user.email}</p>
                    </div>
                  </div>
                  
                  <span className="badge bg-base-200 border-base-300 text-neutral/60 badge-sm font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                    {member.role === "OWNER" || member.role === "ADMIN" ? "🛡️" : "👤"}
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Bulk Share Links view tracker */}
          {isInternalAdmin && deployedJoinLinks.length > 0 && (
            <div className="card bg-base-100 border border-base-300 shadow-xs p-6 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-neutral/50">
                <LinkIcon className="h-4 w-4 stroke-[2.2]" />
                <h3 className="font-black text-sm uppercase tracking-wider text-neutral/40">
                  Onboarding Cohort Share Links
                </h3>
              </div>
              
              {/* 👇 FIXED: Reconfigured mapping block grid layout arrays to render the copy-safe component terminals */}
              <div className="grid grid-cols-1 gap-4">
                {deployedJoinLinks.map((link) => {
                  const absoluteLinkUrl = `${systemAbsoluteOrigin}/join/${link.token}`;
                  const usagesLabel = `👥 ${link.currentUses} / ${link.maxUses} Used`;

                  return (
                    <div key={link.id} className="w-full">
                      <ShareLinkTerminal 
                        url={absoluteLinkUrl} 
                        label={`${link.role} POOL  •  ${usagesLabel}`} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}