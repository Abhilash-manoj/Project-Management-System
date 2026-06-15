// app/dashboard/layout.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logOutUser } from "../actions";
import { redirect } from "next/navigation";
import SidebarNav from "./components/SidebarNav";
import DirectorySearch from "./components/DirectorySearch"; // 👈 FIXED: Connected your live directory search component
import { LogOut, ChevronDown, Bell } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const userMembership = await prisma.membership.findFirst({
    where: { userId: session.userId },
    include: { organization: true },
  });

  const organizationName = userMembership?.organization?.name || "No Workspace";
  const organizationInitial = organizationName.charAt(0).toUpperCase();
  
  const userInitials = session.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen w-screen bg-base-200 text-base-content overflow-hidden font-sans antialiased">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-64 border-r border-base-300 bg-base-100 flex flex-col justify-between p-4 shrink-0 z-20">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center font-black text-primary-content text-lg shadow-sm">
              N
            </div>
            <span className="font-bold text-xl tracking-tight text-base-content">Nexus</span>
          </div>

          <SidebarNav />
        </div>

        {/* PROFILE CARD */}
        <div className="p-2 bg-base-200 rounded-xl border border-base-300">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content font-bold rounded-full h-9 w-9 shadow-inner flex items-center justify-center">
                  <span className="text-xs">{userInitials}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-base-content truncate">{session.name}</p>
                <p className="text-[10px] text-base-content/50 font-black uppercase tracking-wider">
                  {userMembership?.role || "MEMBER"}
                </p>
              </div>
            </div>

            <form action={logOutUser} className="shrink-0">
              <button 
                type="submit" 
                title="Log out of session"
                className="btn btn-ghost btn-xs text-base-content/40 hover:text-error hover:bg-error/10 h-8 w-8 rounded-lg p-0 transition-colors"
              >
                <LogOut className="h-4 w-4 stroke-[2.2]" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* TOP NAVBAR HEADER */}
        <header className="h-16 border-b border-base-300 bg-base-100 flex items-center justify-between px-8 shrink-0 z-30">
          <div className="flex items-center gap-6 w-full max-w-2xl">
            
            {/* Workspace Dropdown */}
            <div className="flex items-center gap-2 bg-base-200 hover:bg-base-300 transition-colors border border-base-300 rounded-xl px-3 py-1.5 cursor-pointer shrink-0">
              <span className="badge badge-primary badge-sm font-bold text-primary-content rounded-md p-1.5">
                {organizationInitial}
              </span>
              <span className="font-semibold text-xs text-base-content">{organizationName}</span>
              <ChevronDown className="h-3 w-3 text-base-content/40 stroke-[2.5]" />
            </div>

            {/* 🌟 FIXED: Embedded the live isolated Directory Search input portal here */}
            <div className="w-full relative">
              <DirectorySearch />
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 ml-4">
            <button className="btn btn-ghost btn-circle btn-sm relative text-base-content/60 hover:text-base-content">
              <Bell className="h-4 w-4 stroke-[2.2]" />
              {/* 🎨 FIXED: Replaced hardcoded text marker color with clean semantic utility token */}
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-error rounded-full"></span>
            </button>
          </div>
        </header>

        {/* WORKSPACE APP CANVAS */}
        <main className="flex-1 overflow-y-auto p-8 bg-base-200">
          {children}
        </main>
      </div>

    </div>
  );
}