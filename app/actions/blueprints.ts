// app/actions/blueprints.ts
"use server";

import { prisma } from "@/lib/db";
import { getSession } from "./auth";
import { verifyProjectAccess } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

/**
 * 📊 WORKFLOW BLUEPRINT: Create Custom Kanban Stage Columns (Isolated per Project + Org Multi-Tenant boundary)
 */
export async function createCustomProjectColumn(projectId: string, formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication expired." };

    // 1. Identify organization tenant context via current caller membership records
    const membership = await prisma.membership.findFirst({ 
      where: { userId: session.userId } 
    });
    if (!membership) return { error: "Organization tenant workspace tracking not found." };

    // 2. Enforce Attribute-Based Project Access (ABAC) Guards
    const auth = await verifyProjectAccess(projectId);
    if (!auth.authorized) {
      return { error: auth.error || "Access Gated: Insufficient project modification clearances." };
    }

    // Monday/Asana Gate: Disallow sandboxed guests from altering board structure schemas
    if (auth.role === "GUEST") {
      return { error: "Access Gated: Guest profiles possess Commenter/Viewer rights and cannot alter columns." };
    }

    const columnName = formData.get("columnName") as string;
    const positionInput = formData.get("position") as string;

    if (!columnName || columnName.trim() === "") return { error: "Column name cannot be blank." };

    // 3. Commit composite block bounded to both scopes
    await prisma.boardColumn.create({
      data: {
        name: columnName.trim().toUpperCase().replace(/\s+/g, "_"),
        position: positionInput ? parseInt(positionInput, 10) : 0,
        projectId: projectId,                        // Isolated project context layout
        organizationId: membership.organizationId,    // High-speed analytical reporting boundary
      }
    });

    revalidatePath(`/dashboard/projects/${projectId}/workflows`);
    revalidatePath(`/dashboard/projects/${projectId}/kanban`);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return { error: "This specific column identifier stage already exists within this project board." };
  }
}

/**
 * 📝 CHECKLIST BLUEPRINT: Create reusable task subtask templates
 */
export async function createChecklistBlueprint(title: string, items: string[]) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication expired." };

    const membership = await prisma.membership.findFirst({ where: { userId: session.userId } });
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return { error: "Insufficient clearance parameters." };
    }

    await prisma.checklistBlueprint.create({
      data: {
        title: title.trim(),
        items: items.filter(i => i.trim() !== ""),
        organizationId: membership.organizationId
      }
    });

    return { success: true };
  } catch (error) {
    return { error: "Database pipeline exception while generating template checklist blueprint." };
  }
}

/**
 * 🛬 CLIENT INTAKE PORTAL: Unauthenticated backlog ticket ingestion channel
 */
export async function submitExternalClientTicket(orgSlug: string, formData: FormData) {
  try {
    const targetOrg = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!targetOrg) return { error: "Workspace organization context tracking not found." };

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const clientEmail = formData.get("email") as string;

    if (!title || !description || !clientEmail) {
      return { error: "Validation Fault: Complete all ticket form configurations." };
    }

    await prisma.intakeTicket.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        submittedBy: clientEmail.trim().toLowerCase(),
        status: "UN_TRIAGED",
        organizationId: targetOrg.id,
      }
    });

    return { success: true };
  } catch (error) {
    return { error: "Failed to submit client triage request payload." };
  }
}

/**
 * 🚀 BLUEPRINT INHERITANCE: Copies a template sequence into a localized project
 */
export async function applyOrgBlueprintToProject(projectId: string, blueprintId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: "Authentication expired." };

    // 1. Verify localized project structural permissions
    const auth = await verifyProjectAccess(projectId);
    if (!auth.authorized || auth.role === "GUEST") {
      return { error: "Access Gated: Insufficient parameters to reconfigure workflows." };
    }

    // 2. 🚀 FIXED: Fetch the target corporate record from workflowBlueprint instead of checklistBlueprint
    const template = await prisma.workflowBlueprint.findUnique({
      where: { id: blueprintId }
    });
    if (!template) return { error: "The selected master configuration template was not found." };

    // 3. Purge existing column states for this project to prepare for the new blueprint sequence
    await prisma.boardColumn.deleteMany({
      where: { projectId }
    });

    // 4. 🚀 FIXED: Map over your schema's native 'columns' array property instead of 'items'
    const creationPromises = template.columns.map((stageName, index) => {
      return prisma.boardColumn.create({
        data: {
          name: stageName.trim().toUpperCase().replace(/\s+/g, "_"),
          position: index,
          projectId: projectId,
          organizationId: template.organizationId
        }
      });
    });

    await Promise.all(creationPromises);

    revalidatePath(`/dashboard/projects/${projectId}/workflows`);
    revalidatePath(`/dashboard/projects/${projectId}/kanban`);
    return { success: true };
  } catch (error) {
    return { error: "Database exception while executing blueprint transmission sequence." };
  }
}