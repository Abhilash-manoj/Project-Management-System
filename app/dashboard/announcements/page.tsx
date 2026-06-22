// app/dashboard/announcements/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Megaphone, ShieldAlert, Sparkles, Calendar, User } from "lucide-react";
import AnnouncementFormClient from "./components/AnnouncementFormClient";

export const dynamic = "force-dynamic";

export default async function AnnouncementsDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId },
    include: { organization: true }
  });
  if (!membership) redirect("/signup/organization");

  const isManager = membership.role === "OWNER" || membership.role === "ADMIN";

  // Fetch all live announcements assigned to this organization tier space boundary
  const activeAnnouncements = await prisma.announcement.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: "desc" },
    include: { creator: { select: { name: true } } }
  });

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto p-4 font-sans text-neutral text-left animate-fade-in">
      
      {/* SECTION BANNER HEADROW */}
      <div className="flex flex-col gap-0.5 border-b border-base-300 pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Megaphone className="h-5 w-5 stroke-[2.5]" />
          <h2 className="text-2xl font-black tracking-tight text-neutral">Workspace Announcements</h2>
        </div>
        <p className="text-xs text-neutral/50 font-semibold">
          Review central announcements broadcasted across <span className="text-primary font-bold">{membership.organization.name}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* MANAGEMENT CREATOR CONTROL ENGINE CARD */}
        {isManager && (
          <div className="lg:col-span-5 card bg-base-100 border border-base-300 p-5 rounded-2xl shadow-xs space-y-4">
            <h3 className="font-black text-xs uppercase tracking-wider text-base-content/40 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Dispatch New Broadcast
            </h3>
            <AnnouncementFormClient />
          </div>
        )}

        {/* FEED ARCHIVE CONTAINER VIEWPORT */}
        <div className={`${isManager ? "lg:col-span-7" : "lg:col-span-12"} space-y-4`}>
          {activeAnnouncements.length === 0 ? (
            <div className="card bg-base-200/40 border border-base-300/60 p-8 text-center rounded-2xl italic text-xs text-neutral/40 font-medium">
              No central workspace bulletins or broadcast notices have been issued yet.
            </div>
          ) : (
            activeAnnouncements.map((announcement) => (
              <div 
                key={announcement.id} 
                className={`card bg-base-100 border p-5 rounded-2xl transition-all relative overflow-hidden ${
                  announcement.isPriority 
                    ? "border-error/40 shadow-xs bg-gradient-to-br from-base-100 to-error/5" 
                    : "border-base-300 shadow-2xs"
                }`}
              >
                {announcement.isPriority && (
                  <div className="badge badge-error badge-xs font-black tracking-wider uppercase text-[9px] px-1.5 rounded rounded-tl-none absolute top-0 left-0 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Urgent Notice
                  </div>
                )}

                <div className="space-y-2 mt-1">
                  <h4 className="text-base font-black tracking-tight leading-tight text-neutral">{announcement.title}</h4>
                  <p className="text-xs text-neutral/70 font-medium leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-base-300/50 text-[10px] text-neutral/40 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-primary/60" /> By {announcement.creator.name}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(announcement.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}