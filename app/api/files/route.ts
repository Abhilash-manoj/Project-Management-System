// app/api/files/route.ts
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized access attempt" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let rawFileUrl = searchParams.get("url");

    if (!rawFileUrl) {
      return NextResponse.json({ error: "Missing source file target URL" }, { status: 400 });
    }

    let fileUrl = decodeURIComponent(rawFileUrl);
    while (fileUrl.includes("url=")) {
      const parts = fileUrl.split("url=");
      fileUrl = decodeURIComponent(parts[parts.length - 1]);
    }

    if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid target protocol address string" }, { status: 400 });
    }

    // 1. Resolve your tokens 
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID;

    // 2. Fetch from Vercel Private Blob
    // 🚀 FIXED: Added the required x-storage-id header to satisfy OIDC verification handshake
    const response = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(storeId && { "x-storage-id": storeId }),
      },
    });

    if (!response.ok) {
      console.error(`❌ Storage proxy rejected: ${response.status} for URL: ${fileUrl}`);
      return NextResponse.json({ error: "Failed to stream asset" }, { status: response.status });
    }

    const fileName = fileUrl.split("/").pop() || "attachment";
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate", 
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (error) {
    console.error("❌ [SECURE STREAMING ROUTE FAULT]:", error);
    return NextResponse.json({ error: "Failed to download secure asset stream" }, { status: 500 });
  }
}