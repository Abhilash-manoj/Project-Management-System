// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db"; // 🚀 IMPORT YOUR DB INFRASTRUCTURE CLIENT

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_default_secret_for_dev_only"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("nexus_session")?.value;

  // Protect all routes starting with /dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    try {
      // 1. Validate signature and extract decrypted payload details
      const { payload } = await jwtVerify(sessionToken, SECRET_KEY);
      const userId = payload.userId as string;

      if (!userId) {
        throw new Error("Malformed session token frame.");
      }

      // 2. 🚀 NEW: DIRECT LIVE SECURITY GATE CHECK ON ACCOUNT STATUS
      const membership = await prisma.membership.findFirst({
        where: { userId: userId },
        select: { status: true },
      });

      // If they are marked INACTIVE, clear their cookie and throw them out instantly!
      if (membership && membership.status === "INACTIVE") {
        const response = NextResponse.redirect(new URL("/signin?error=deactivated", request.url));
        response.cookies.delete("nexus_session");
        return response;
      }

      return NextResponse.next();
    } catch (error) {
      // Invalid token signature, expired session, or deactivated, force logout
      const response = NextResponse.redirect(new URL("/signin", request.url));
      response.cookies.delete("nexus_session");
      return response;
    }
  }

  return NextResponse.next();
}

// Config criteria to optimize execution
export const config = {
  matcher: ["/dashboard/:path*"],
};