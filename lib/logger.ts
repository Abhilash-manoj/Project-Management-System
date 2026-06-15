// lib/logger.ts
import { prisma } from "./db";

interface LogParams {
  projectId: string;
  actorName: string;
  action: string;
}

/**
 * UTILITY: Automated System Audit Logger
 * Saves structural event histories asynchronously into the relational database.
 */
export async function logProjectActivity({ projectId, actorName, action }: LogParams) {
  try {
    await prisma.activityLog.create({
      data: {
        projectId,
        actorName,
        action,
      },
    });
  } catch (error) {
    console.error("Failed to write to system activity log storage:", error);
  }
}