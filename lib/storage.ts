// lib/storage.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getSession } from '@/lib/auth';

/**
 * UTILITY: Centralized client-upload token generator.
 * Validates user sessions and enforces global file restrictions across the platform.
 */
export async function processSecureUpload(requestBody: HandleUploadBody, rawRequest: Request) {
  return await handleUpload({
    body: requestBody,
    request: rawRequest,
    onBeforeGenerateToken: async () => {
      // 🔒 Security Gate: Ensure user is logged in
      const session = await getSession();
      if (!session) throw new Error('Unauthorized upload request.');

      return {
        allowedContentTypes: [
          'image/jpeg', 
          'image/png', 
          'image/gif', 
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        maximumSizeInBytes: 15 * 1024 * 1024, // 15MB file cap
        clientPayload: JSON.stringify({ userId: session.userId }),
      };
    },
    //onUploadCompleted: async ({ blob }) => {
    // console.log('Blob upload finalized successfully:', blob.url);
    //},
  });
}