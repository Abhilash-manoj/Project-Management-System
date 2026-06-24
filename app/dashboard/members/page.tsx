// app/dashboard/members/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers"; 
import MemberOnboardingForm from "./components/MemberOnboardingForm"; 
import ShareLinkTerminal from "../components/ShareLinkTerminal"; 
import MemberRosterRowControls from "./components/MemberRosterRowControls"; 
import { Users, KeyRound, Link as LinkIcon, Building } from "lucide-react"; 

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

  // 4. Query live active team roster matching permissions architecture
  let activeTeamMembers = [];

  if (membership.role === "GUEST") {
    // 🛡️ GUEST SANDBOX LOCKDOWN: Query only project IDs explicitly assigned to this guest
    const sharedAssignments = await prisma.assignment.findMany({
      where: { userId: session.userId },
      select: { projectId: true },
    });
    const assignedProjectIds = sharedAssignments.map((a) => a.projectId);

    // Fetch only teammates sharing those project parameters to prevent directory data leaks
    activeTeamMembers = await prisma.membership.findMany({
      where: {
        organizationId: membership.organizationId,
        user: {
          assignments: {
            some: {
              projectId: { in: assignedProjectIds },
            },
          },
        },
      },
      select: {
        id: true,
        role: true,
        status: true,
        department: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true, // 🚀 FIXED: Added to pull the live cloud image link
          },
        },
      },
      orderBy: { role: "asc" },
    });
  } else {
    // Standard Employees, Admins, and Owners view the complete global corporate framework
    activeTeamMembers = await prisma.membership.findMany({
      where: { organizationId: membership.organizationId },
      select: {
        id: true,
        role: true,
        status: true,
        department: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true, // 🚀 FIXED: Added to pull the live cloud image link
          },
        },
      },
      orderBy: { role: "asc" },
    });
  }

  // 5. Query active bulk links (Only valid, unexpired, and unspent links are retrieved)
  const currentTimestampDate = new Date();
  const deployedJoinLinks = isInternalAdmin
    ? await prisma.joinLink.findMany({
        where: { 
          organizationId: membership.organizationId,
          AND: [
            {
              currentUses: {
                lt: prisma.joinLink.fields.maxUses 
              }
            },
            {
              expiresAt: {
                gt: currentTimestampDate 
              }
            }
          ]
        },
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

  // 🌐 DETECT THE SYSTEM HOST NAME PREFIX DIRECTLY ON THE SERVER PAGE
  const headersList = await headers();
  const activeHost = headersList.get("host") || "localhost:3000";
  const protocol = activeHost.includes("localhost") ? "http://" : "https://";
  const systemAbsoluteOrigin = `${protocol}${activeHost}`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in font-sans">
      
      {/* PAGE HEADER ROW */}
      <div className="flex flex-col gap-0.5 border-b border-base-300 pb-4 text-left">
        <div className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5 stroke-[2.5]" />
          <h2 className="text-2xl font-black text-neutral tracking-tight">Team Members Directory</h2>
        </div>
        <p className="text-xs text-neutral/50 font-semibold">
          {isInternalAdmin 
            ? "Orchestrate organization identity profiles, bulk onboarding parameters, and sandbox limits."
            : membership.role === "GUEST"
              ? "Sandboxed view of active colleagues assigned to your matching project channels."
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
          <div className="card bg-base-100 border border-base-300 p-5 space-y-3 text-neutral/60 shadow-xs text-left">
            <div className="flex items-center gap-2 text-warning">
              <KeyRound className="h-4 w-4 stroke-[2.5]" />
              <h4 className="font-black text-neutral text-sm">Clearance Restricted</h4>
            </div>
            <p className="text-xs font-medium leading-relaxed">
              Your profile is registered under a <span className="badge badge-sm font-bold bg-base-200 border-base-300 text-neutral uppercase px-1 rounded">{membership.role}</span> configuration. Account creation generation features are masked. Contact a workspace Administrator to register additional project colleagues.
            </p>
          </div>
        )}

        {/* RIGHT COLUMN: Active Directory Data Lists */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Active Workspace Directory Card */}
          <div className="card bg-base-100 border border-base-300 shadow-xs p-6 space-y-4">
            <h3 className="font-black text-sm uppercase tracking-wider text-neutral/40 text-left">
              Active Team Roster ({activeTeamMembers.length})
            </h3>
            
            <div className="divide-y divide-base-300 border border-base-300 rounded-xl overflow-hidden bg-base-200/30">
              {activeTeamMembers.length === 0 ? (
                <p className="text-xs text-neutral/40 font-semibold italic p-6 text-center bg-base-100">
                  No visible organization colleagues found within your project perimeters.
                </p>
              ) : (
                activeTeamMembers.map((member) => {
                  const initials = member.user.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2);

                  return (
                    <div key={member.id} className="p-3.5 flex items-center justify-between text-sm font-medium hover:bg-base-100 transition-colors">
                      <div className="flex items-center gap-3">
                        
                        {/* 🚀 FIXED: RENDER USER AVATAR WITH SYSTEM INITIALS FALLBACK */}
                        <div className="avatar placeholder shrink-0">
                          <div className="h-8 w-8 bg-neutral text-neutral-content font-bold rounded-full overflow-hidden flex items-center justify-center text-xs select-none ring-1 ring-base-300">
                            {member.user.avatarUrl ? (
                              <img 
                                src={member.user.avatarUrl} 
                                alt={`${member.user.name}'s profile photo`} 
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-neutral font-bold tracking-tight">{member.user.name}</p>
                            <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.2 border ${
                              member.status === "INACTIVE" 
                                ? "bg-error/10 text-error border-error/20" 
                                : "bg-success/10 text-success border-success/20"
                            }`}>
                              {member.status || "ACTIVE"}
                            </span>
                          </div>
                          <p className="text-xs text-neutral/40 font-semibold leading-tight">{member.user.email}</p>
                          
                          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral/40 flex items-center gap-1 mt-1 select-none">
                            <Building className="h-3 w-3 text-neutral/30 stroke-[2.2]" /> 
                            {member.department && member.department.trim() !== "" ? (
                              <span className="text-primary font-black">{member.department} Division</span>
                            ) : (
                              <span className="italic opacity-50 font-semibold">Unassigned</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="badge bg-base-200 border border-base-300 text-neutral/60 badge-sm font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                          {member.role === "OWNER" || member.role === "ADMIN" ? "🛡️" : "👤"}
                          {member.role}
                        </span>

                        <MemberRosterRowControls 
                          targetUser={{
                            id: member.user.id,
                            name: member.user.name,
                            role: member.role,
                            status: member.status || "ACTIVE"
                          }}
                          currentUserId={session.userId}
                          currentUserOrgRole={membership.role}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Bulk Share Links view tracker */}
          {isInternalAdmin && deployedJoinLinks.length > 0 && (
            <div className="card bg-base-100 border border-base-300 shadow-xs p-6 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-neutral/50">
                <LinkIcon className="h-4 w-4 stroke-[2.2]" />
                <h3 className="font-black text-sm uppercase tracking-wider text-neutral/40 text-left">
                  Onboarding Cohort Share Links
                </h3>
              </div>
              
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