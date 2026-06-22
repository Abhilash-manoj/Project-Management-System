// app/dashboard/projects/[projectId]/workflows/page.tsx
import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { verifyProjectAccess } from "@/lib/rbac";
import ProjectWorkflowFormClient from "./components/ProjectWorkflowFormClient";
import { Sliders } from "lucide-react";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectWorkflowSettingsPage({ params }: PageProps) {
  const { projectId } = await params;
  
  const session = await getSession();
  if (!session) redirect("/signin");

  // 1. Enforce RBAC/ABAC Gate: Verify user identity and role structure clearance
  const guard = await verifyProjectAccess(projectId);
  if (!guard.authorized || (guard.role !== "OWNER" && guard.role !== "ADMIN")) {
    redirect(`/dashboard/projects/${projectId}`);
  }

  // 2. Fetch project details and current column matrix parameters
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, organizationId: true }
  });
  if (!project) notFound();

  const currentColumns = await prisma.boardColumn.findMany({
    where: { projectId },
    orderBy: { position: "asc" }
  });

  // 3. 🚀 FIXED: Points straight to workflowBlueprint with your database schema fields
  const organizationTemplates = await prisma.workflowBlueprint.findMany({
    where: { organizationId: project.organizationId },
    select: { 
      id: true, 
      name: true,    // Substituted from your raw PostgreSQL schema row label
      columns: true  // Substituted array column reference
    }
  });

  // 🚀 NORMALIZATION MAPPING Layer:
  // Dynamically structuralize the data into the fields ProjectWorkflowFormClient expects
  const serializedTemplates = organizationTemplates.map((tpl) => ({
    id: tpl.id,
    title: tpl.name,   // Maps 'name' database field string safely into frontend 'title'
    items: tpl.columns // Maps 'columns' array string safely into frontend 'items'
  }));

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto p-4 font-sans text-left animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-0.5 border-b border-base-300 pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Sliders className="h-5 w-5 stroke-[2.5]" />
          <h2 className="text-2xl font-black text-neutral tracking-tight">Configure Board Workflow</h2>
        </div>
        <p className="text-xs text-neutral/50 font-semibold">
          Customize columns specifically for <span className="text-primary font-bold">{project.name}</span>. Apply standardized blueprints or extend custom pipeline stages locally.
        </p>
      </div>

      {/* INTERACTIVE FORM ENGINE LAYOUT CONTAINER */}
      <div className="grid grid-cols-1 gap-6">
        <ProjectWorkflowFormClient 
          projectId={project.id}
          currentColumns={currentColumns.map(c => ({ id: c.id, name: c.name, position: c.position }))}
          availableTemplates={serializedTemplates} // 🚀 Passes down fully matching and serialized data array structure
        />
      </div>
    </div>
  );
}