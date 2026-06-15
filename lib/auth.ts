// lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_default_secret_for_dev_only"
);

interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
}

// 1. Generate a secure signed JWT token
export async function encryptSession(payload: UserSessionPayload) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d") // Token expires in 24 hours
    .sign(SECRET_KEY);
}

// 2. Decrypt and check if token signature is authentic
export async function decryptSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as UserSessionPayload;
  } catch (error) {
    return null; // Token altered, expired, or invalid
  }
}

// 3. Helper to fetch current session details from server context
export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nexus_session")?.value;
  if (!sessionToken) return null;
  return await decryptSession(sessionToken);
}