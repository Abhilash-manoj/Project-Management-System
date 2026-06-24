// app/api/upload/route.ts
import { processSecureUpload } from "@/lib/storage";
import { type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    
    // Hand off the payload validation and token generation to our core storage utility
    const response = await processSecureUpload(body, request);

    return NextResponse.json(response);
  } catch (error) {
    // Keep this single centralized error log active so you can immediately trace database/handshake exceptions in production
    console.error("❌ [API UPLOAD ROUTE FAILURE]:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server upload processing error",
      },
      {
        status: 400,
      }
    );
  }
}