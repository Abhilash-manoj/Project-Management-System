// lib/storage.ts
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";

/**
 * 🔒 SECURE PRIVATE UPLOAD HANDLER
 * Uses standard BLOB_READ_WRITE_TOKEN to upload to your Private Blob Store
 */
export async function processSecureUpload(
  requestBody: HandleUploadBody,
  rawRequest: Request
) {
  return await handleUpload({
    body: requestBody,
    request: rawRequest,
    onBeforeGenerateToken: async () => {
      const session = await getSession();
      if (!session || !session.userId) throw new Error("Unauthorized");

      return {
        allowedContentTypes: [
          "image/jpeg", "image/png", "image/gif",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ],
        maximumSizeInBytes: 15 * 1024 * 1024, // 15MB file cap
        clientPayload: JSON.stringify({ userId: session.userId }),
      };
    },
    onUploadCompleted: async ({ tokenPayload }) => {
      if (tokenPayload) {
        const { userId } = JSON.parse(tokenPayload);
        console.log(`Private attachment uploaded securely for user ${userId}`);
      }
    },
  });
}

/**
 * 🌐 FAST PUBLIC AVATAR UPLOAD HANDLER
 * Uses the dedicated PUBLIC_AVATARS_BLOB_TOKEN to upload to your Public Blob Store
 */
export async function processPublicAvatarUpload(
  requestBody: HandleUploadBody,
  rawRequest: Request
) {
  return await handleUpload({
    body: requestBody,
    request: rawRequest,
    // Explicitly overrides the default token to target the public store bucket
    token: process.env.BLOBP_READ_WRITE_TOKEN, 
    onBeforeGenerateToken: async () => {
      const session = await getSession();
      if (!session || !session.userId) throw new Error("Unauthorized");

      return {
        allowedContentTypes: ["image/jpeg", "image/png", "image/gif"],
        maximumSizeInBytes: 4 * 1024 * 1024, // 4MB image cap
        clientPayload: JSON.stringify({ userId: session.userId }),
      };
    },
    onUploadCompleted: async ({ tokenPayload }) => {
      if (tokenPayload) {
        const { userId } = JSON.parse(tokenPayload);
        console.log(`Public profile photo uploaded for user ${userId}`);
      }
    },
  });
}