"use server";

import { prisma } from "@/lib/db";
import { encryptSession, decryptSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashSync, compareSync } from "bcrypt-ts";

/**
 * UTILITY: Explicit Session Parameter Loader
 * Pulls, decrypts, and passes the calling teammate's active identity tokens securely.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nexus_session")?.value;
  if (!sessionToken) return null;
  return await decryptSession(sessionToken);
}

/**
 * FLOW A: Global User Sign Up
 */
export async function signUpUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    throw new Error("All fields are required.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const securePasswordHash = hashSync(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: securePasswordHash,
    },
  });

  const token = await encryptSession({
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
  });

  const cookieStore = await cookies();
  cookieStore.set("nexus_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 Day
  });

  redirect("/signup/organization");
}

/**
 * FLOW B: Production-Grade Sign In Traffic Controller
 */
export async function signInUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please fill in all fields." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !compareSync(password, user.password)) {
    return { error: "Invalid email or password structure." };
  }

  const token = await encryptSession({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const cookieStore = await cookies();
  cookieStore.set("nexus_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  const userMembership = await prisma.membership.findFirst({
    where: { userId: user.id },
  });

  if (!userMembership) {
    redirect("/signup/organization");
  }

  redirect("/dashboard");
}

/**
 * FLOW C: Absolute Session Terminate / Sign Out
 */
export async function logOutUser() {
  const cookieStore = await cookies();
  
  cookieStore.set("nexus_session", "", {
    path: "/",
    expires: new Date(0), 
  });

  redirect("/");
}

/**
 * ACTION: Simple sign-out termination pipeline redirection gateway
 */
export async function handleSignOutSession() {
  const cookieStore = await cookies();
  cookieStore.set("nexus_session", "", {
    path: "/",
    expires: new Date(0), 
  });
  return { success: true };
}

/**
 * UTILITY: Secure server-side routing guardian thread.
 * Checks for valid user sessions; redirects to signin if unauthenticated.
 */
export async function verifySessionOrRedirect() {
  const session = await getSession();
  
  if (!session || !session.userId) {
    redirect("/signin");
  }

  return session;
}