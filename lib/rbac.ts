// lib/rbac.ts
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * UTILITY: Centralized Security Gateway Guard (ABAC + RBAC Dynamic Switch)
 * Automatically evaluates execution perimeters:
 * - If no projectId is passed -> Validates global workspace creation rights (RBAC)
 * - If projectId is provided   -> Validates context relationship affiliation (ABAC)
 */
export async function verifyProjectAccess(projectId?: string | null) {
  // 1. Authenticate caller credentials session token layer
  const session = await getSession();
  if (!session) {
    return { authorized: false, error: "Authentication required.", session: null, role: null };
  }

  // 2. Identify global organization membership profile role footprint
  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId },
  });

  if (!membership) {
    return { authorized: false, error: "Workspace clearance anomaly.", session, role: null };
  }

  const role = membership.role;

  // 👑 RULE 1: Organization Sovereign Owners maintain absolute override bypasses
  if (role === "OWNER") {
    return { authorized: true, error: null, session, role };
  }

  // 🏢 CONTEXT A: Global Creation Pipeline Check (No target projectId passed)
  if (!projectId) {
    // Admins can create global projects; Employees and Guests are strictly blocked
    if (role === "ADMIN") {
      return { authorized: true, error: null, session, role };
    }
    
    const contextErrorMessage = role === "GUEST"
      ? "Security Exception: Sandboxed guest accounts are restricted from generating workspace pipelines."
      : "Security Exception: Insufficient workspace administrative clearance.";

    return { 
      authorized: false, 
      error: contextErrorMessage, 
      session, 
      role 
    };
  }

  // 🛡️ CONTEXT B: Attribute-Based Project Mutation Access Checks (projectId exists)
  
  // Check Parameter 1: Verify if the user created the project scope branch 
  // (Note: Guests can never create projects, but this safely covers Admin/Employee paths)
  const project = await prisma.project.findFirst({
    where: { id: projectId, creatorId: session.userId }
  });

  if (project && role !== "GUEST") {
    return { authorized: true, error: null, session, role };
  }

  // Check Parameter 2: Verify if the user is explicitly assigned to the project team roster
  const isAssigned = await prisma.assignment.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: session.userId
      }
    }
  });

  if (isAssigned) {
    return { authorized: true, error: null, session, role };
  }

  // ⛔ BLOCKED: User does not maintain structural context linkages to this project block
  let violationMessage = "Security Exception: Boundary lock violation. Insufficient project team clearance.";
  
  if (role === "ADMIN") {
    violationMessage = "Access Denied: Admins can only perform actions in projects they created or are assigned to as team members.";
  } else if (role === "GUEST") {
    violationMessage = "Access Gated: Sandboxed guest profiles must be explicitly assigned to this project team roster.";
  }

  return { 
    authorized: false, 
    error: violationMessage, 
    session, 
    role 
  };
}