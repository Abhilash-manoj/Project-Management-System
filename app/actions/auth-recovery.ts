// app/actions/auth-recovery.ts
"use server";

import { prisma } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import nodemailer from "nodemailer";

// Initialize the free SMTP mail transmission channel pool configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * 1. REQUEST RESET: Generates a token, builds the link, and fires it via standard free SMTP
 */
export async function requestPasswordReset(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return { error: "Please enter a valid email address." };

    const userExists = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!userExists) {
      return { success: true }; // Account enumeration scraping protection gate
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiryWindow = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email: cleanEmail,
        token: resetToken,
        expiresAt: tokenExpiryWindow,
      },
    });

    // Derive your system environment address context dynamically from headers
    const headerList = await headers();
    const activeHost = headerList.get("host") || "localhost:3000";
    const protocol = headerList.get("x-forwarded-proto") === "https" ? "https" : "http";
    const recoveryLink = `${protocol}://${activeHost}/resetPassword?token=${resetToken}`;

    // 🚀 DISPATCH TRANSMISSION VIA FREE NODEMAILER PIPELINES
    await transporter.sendMail({
      from: `"Nexus Workspace" <${process.env.SMTP_USER}>`,
      to: cleanEmail,
      subject: "Reset Your Nexus Workspace Password",
      html: `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 40px;">
          <div style="height: 40px; width: 100%; display: flex; align-items: center; margin-bottom: 20px;">
            <div style="height: 36px; width: 36px; background-color: #5850ec; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #ffffff; font-size: 18px; text-align: center; line-height: 36px;">N</div>
          </div>
          <h1 style="font-size: 20px; font-weight: 800; margin-top: 0; color: #1a202c;">Password Reset Request</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #4a5568;">
            We received a request to reset the password for your account. Click the secure button below to establish your new platform access credentials:
          </p>
          <div style="text-align: left; margin: 24px 0;">
            <a href="${recoveryLink}" target="_blank" style="display: inline-block; background-color: #5850ec; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; text-align: center;">Reset Account Password</a>
          </div>
          <p style="font-size: 13px; line-height: 1.6; color: #4a5568;">
            This security link will automatically expire in <strong>1 hour</strong>. If you did not authorize this credential change, you can safely ignore this automated message.
          </p>
          <div style="font-size: 11px; color: #718096; margin-top: 32px; border-top: 1px solid #edf2f7; padding-top: 16px;">
            <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #5850ec; font-weight: 500;">${recoveryLink}</p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Nodemailer SMTP delivery transaction failure:", error);
    return { error: "Failed to dispatch password recovery email transmission." };
  }
}

/**
 * 2. EXECUTE OVERWRITE: Validates token expiration and commits the newly hashed password.
 */
export async function executePasswordReset(token: string, newPasswordStr: string) {
  try {
    const cleanPassword = newPasswordStr.trim();
    if (!token) return { error: "Invalid or missing token parameters." };
    if (cleanPassword.length < 8) return { error: "Security Policy: Passwords must be at least 8 characters." };

    const activeTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!activeTokenRecord) {
      return { error: "This password recovery link is invalid or has already been used." };
    }

    if (new Date() > activeTokenRecord.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { id: activeTokenRecord.id } }).catch(() => {});
      return { error: "This password recovery link has expired. Please request a new one." };
    }

    const saltRounds = 10;
    const encryptedSecretHash = await bcrypt.hash(cleanPassword, saltRounds);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: activeTokenRecord.email },
        data: { password: encryptedSecretHash },
      }),
      prisma.passwordResetToken.delete({
        where: { token },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Critical transactional block failure during password rewrite:", error);
    return { error: "Internal transaction failure: Failed to rewrite account credentials." };
  }
}