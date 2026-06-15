// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_default_secret_for_dev_only"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("nexus_session")?.value;

  // Protect all routes starting with /dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!sessionToken) {
      // No token found, kick them out back to login page
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    try {
      // Validate signature
      await jwtVerify(sessionToken, SECRET_KEY);
      return NextResponse.next();
    } catch (error) {
      // Invalid token signature or expired session, force logout
      const response = NextResponse.redirect(new URL("/signin", request.url));
      response.cookies.delete("nexus_session");
      return response;
    }
  }

  return NextResponse.next();
}

// Config criteria to optimize execution: Matcher tells Next.js to avoid running on asset folders
export const config = {
  matcher: ["/dashboard/:path*"],
};