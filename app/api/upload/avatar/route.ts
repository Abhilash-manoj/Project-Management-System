// app/api/upload/avatar/route.ts
import { processPublicAvatarUpload } from "@/lib/storage";
import { type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const response = await processPublicAvatarUpload(body, request);
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [API AVATAR UPLOAD FAILURE]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar upload error" },
      { status: 400 }
    );
  }
}