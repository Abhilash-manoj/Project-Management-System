// app/api/files/route.ts
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Enforce active database authentication checks first
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized access attempt" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing source file target URL" }, { status: 400 });
    }

    // 2. Securely fetch the file from the private store using the secret token header
    // This authenticates our server with Vercel's private storage infrastructure
    const response = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error(`Storage connection rejected with status code: ${response.status}`);
      return NextResponse.json({ error: "Failed to download secure asset stream from storage." }, { status: response.status });
    }

    // 3. Extract the clean file name from the path string
    const fileName = decodeURIComponent(fileUrl.split("/").pop() || "attachment")
      .replace(/^\d+-/, ""); // Strip the unique timestamp prefix

    // 4. Extract content headers from the storage response
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    // 5. Pipe the unexposed file binary stream directly to the authorized user's session
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