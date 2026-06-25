"use client";

import { FileText, Download } from "lucide-react";

interface SecureAttachmentProps {
  privateUrl: string;
}

export default function SecureChatAttachment({ privateUrl }: SecureAttachmentProps) {
  // 1. Identify if the file is an image by checking the extension
  const isImage = privateUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);

  // 2. 🚀 THE MAGIC CHANGE: Point the source directly to your secure API route
  const secureProxyUrl = `/api/files?url=${encodeURIComponent(privateUrl)}`;

  // 3. If it's an image, pass the proxy route URL directly into the standard image src
  if (isImage) {
    return (
      <img 
        src={secureProxyUrl} 
        alt="Confidential attachment" 
        className="rounded-xl max-w-full max-h-60 object-contain border border-base-300 shadow-xs"
        loading="lazy"
      />
    );
  }

  // 4. Fallback for confidential documents (PDFs, Word docs): show a clean download card
  const fileName = privateUrl.split("/").pop()?.split("-").slice(1).join("-") || "Attachment File";

  return (
    <a 
      href={secureProxyUrl} 
      download
      className="flex items-center justify-between gap-4 p-3 bg-base-200/60 hover:bg-base-200 rounded-xl border border-base-300 transition-all max-w-xs group cursor-pointer"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-bold text-neutral truncate pr-2">{fileName}</span>
      </div>
      <Download className="h-3.5 w-3.5 text-neutral/40 group-hover:text-primary transition-colors shrink-0" />
    </a>
  );
}