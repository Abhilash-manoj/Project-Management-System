// app/dashboard/messages/components/MessageAttachmentButton.tsx
"use client";

import React, { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { upload } from "@vercel/blob/client";

interface MessageAttachmentButtonProps {
  onUploadSuccess: (url: string, fileName: string) => void;
  disabled?: boolean;
}

export default function MessageAttachmentButton({ onUploadSuccess, disabled }: MessageAttachmentButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Enforce 15MB max payload constraint locally
    if (file.size > 15 * 1024 * 1024) {
      alert("Security Limit: File sizes must be smaller than 15MB.");
      return;
    }

    setIsUploading(true);

    try {
      // direct handshake targeting the PRIVATE blob store route
      const newBlob = await upload(`attachments/${Date.now()}-${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
      });

      if (!newBlob?.url) throw new Error("Upload response path missing");

      onUploadSuccess(newBlob.url, file.name);
    } catch (error) {
      console.error("Attachment upload failure:", error);
      alert("Failed to securely upload attachment asset.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="shrink-0 flex items-center">
      <button
        type="button"
        disabled={disabled || isUploading}
        onClick={() => fileInputRef.current?.click()}
        className="btn btn-ghost btn-sm h-9 w-9 p-0 rounded-xl flex items-center justify-center text-neutral/40 hover:text-primary hover:bg-base-200 transition-colors disabled:opacity-40"
        title="Attach file (PDF, Doc, Image, Spreadsheet)"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Paperclip className="h-4 w-4 stroke-[2.2]" />
        )}
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
      />
    </div>
  );
}