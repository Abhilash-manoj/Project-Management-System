// app/dashboard/projects/[projectId]/layout.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProjectHeaderActionToolbar from "./components/ProjectHeaderActionToolbar";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailLayout({ children, params }: LayoutProps) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const { projectId } = await params;

  // Validate organizational multi-tenant boundary clearance
  const userMembership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });
  if (!userMembership) redirect("/signup/organization");

  // Fetch full project data attributes
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: userMembership.organizationId,
    },
  });
  if (!project) notFound();

  // Load team roster assigned to this project to feed into our upcoming Add Task assignment selector dropdown
  const teamAssignments = await prisma.assignment.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true } }
    }
  });

  const serializedTeam = teamAssignments.map(a => ({ id: a.user.id, name: a.user.name }));
  const initials = project.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // 🚀 NEW: Fetch custom workflow column stages to feed into the modal selector
  const customColumns = await prisma.boardColumn.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });

  const activeStages = customColumns.length > 0 
    ? customColumns.map((c) => c.name) 
    : ["TODO", "IN_PROGRESS", "DONE"];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans text-neutral animate-fade-in">
      
      {/* BREADCRUMB BACK ROUTE ENTRY ANCHOR */}
      <Link 
        href="/dashboard/projects" 
        className="inline-flex items-center gap-1 text-xs font-bold text-neutral/40 hover:text-primary tracking-wide uppercase transition-colors group select-none"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 stroke-[2.5]" />
        Back to projects
      </Link>

      {/* PERSISTENT HEADER BLOCK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-300 pb-5">
        <div className="flex items-start gap-4">
          <div className="avatar placeholder shrink-0">
            <div className="bg-primary/10 text-primary font-black rounded-xl h-14 w-14 border border-primary/20 text-lg shadow-inner">
              <span>{initials}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight leading-none">{project.name}</h1>
              <span className="badge badge-success bg-success/10 border-success/20 text-success-content badge-sm font-bold uppercase tracking-wide rounded-md px-2">
                {project.status || "ACTIVE"}
              </span>
            </div>
            <p className="text-xs text-neutral/60 font-medium max-w-2xl leading-relaxed">
              {project.description || "No specific team workspace descriptions recorded."}
            </p>
          </div>
        </div>

        {/* FUNCTIONAL BUTTONS TOOLBAR COMPONENT CONTAINER */}
        <ProjectHeaderActionToolbar 
          projectId={projectId} 
          teamMembers={serializedTeam}  
          boardColumns={activeStages} // 🚀 FIXED: Injected the workflow lanes prop here safely
        />
      </div>

      {/* SUB-PANEL MAIN CONTENT VIEWPORT ROW */}
      <div>{children}</div>

    </div>
  );
}