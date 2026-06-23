// app/dashboard/settings/components/SettingsDashboardPageClient.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, Palette, ShieldAlert, CheckCircle2, Save, Loader2, Building, Camera } from "lucide-react";
import { updateProfileSettings } from "@/app/actions/workspace"; 
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

const AVAILABLE_THEMES = [
  "light", "dark", "cupcake", "corporate", "winter", "nord", "fantasy"
];

interface SettingsPageProps {
  initialDepartmentName: string | null; 
  initialUserName: string;
  initialUserEmail: string;
  initialAvatarUrl: string | null;
  currentUserId: string;
}

export default function SettingsDashboardPageClient({
  initialDepartmentName,
  initialUserName,
  initialUserEmail,
  initialAvatarUrl,
  currentUserId
}: SettingsPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"PROFILE" | "THEME">("PROFILE");
  const [currentTheme, setCurrentTheme] = useState("light");

  // CONTROLLED SUBMISSION STATES
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formResult, setFormResult] = useState<{ error: string | null; success: boolean }>({
    error: null,
    success: false,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("nexus-theme") || "light";
    setCurrentTheme(savedTheme);
  }, []);

  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName);
    localStorage.setItem("nexus-theme", themeName);
    document.documentElement.setAttribute("data-theme", themeName);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image format (PNG, JPEG, GIF).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert("Image sizes must be smaller than 4MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormResult({ error: null, success: false });

    console.log("🎯 [CLIENT] Form submit initiated. currentUserId status:", currentUserId);

    if (selectedFile && (!currentUserId || currentUserId === "undefined")) {
      setFormResult({
        error: "Configuration Error: User identification parameter missing. Check your parent server component file mappings.",
        success: false,
      });
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    let finalAvatarUrl = undefined;

    try {
      // 1. Send the file binary to Vercel Storage explicitly
      if (selectedFile) {
        console.log("⏳ [CLIENT] Initiating upload chunk handshake workflow via Vercel framework...");
        
        // 🚀 FIXED: Set access right paths cleanly
        const newBlob = await upload(`avatars/${currentUserId}-${Date.now()}`, selectedFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        
        console.log("✅ [CLIENT] Upload handshake completed. Hosted file link address:", newBlob?.url);
        
        if (!newBlob?.url) {
          throw new Error("Cloud host endpoint returned code 200 but failed to parse string URL.");
        }
        finalAvatarUrl = newBlob.url;
      }

      // 2. Deliver text parameters along with the resulting image url string link to Prisma
      console.log("⏳ [CLIENT] Executing Prisma Server Action update request pipeline...");
      const res = await updateProfileSettings(formData, finalAvatarUrl);
      
      if (res?.error) {
        setFormResult({ error: res.error, success: false });
      } else if (res?.success) {
        setFormResult({ error: null, success: true });
        setSelectedFile(null); 
        router.refresh();      
      }
    } catch (err) {
      console.error("❌ [CLIENT ENGINE ERROR]:", err);
      setFormResult({
        error: err instanceof Error ? err.message : "Failed to securely save profile configuration files or upload assets.",
        success: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => 
    name ? name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) : "??";

  return (
    <div className="space-y-6 font-sans text-neutral p-1 text-left">
      {/* HEADER TITLE */}
      <div className="border-b border-base-300 pb-4">
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <p className="text-xs font-semibold text-neutral/40">Manage your account preferences and workspace appearance configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: NAV PANEL */}
        <div className="md:col-span-3 card bg-base-100 border border-base-300 p-3 rounded-2xl space-y-1 select-none">
          <button 
            type="button"
            onClick={() => setActiveTab("PROFILE")} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "PROFILE" ? "bg-primary text-primary-content font-black shadow-xs" : "text-neutral/60 hover:bg-base-200"}`}
          >
            <User className="h-4 w-4" /> Profile Information
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("THEME")} 
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "THEME" ? "bg-primary text-primary-content font-black shadow-xs" : "text-neutral/60 hover:bg-base-200"}`}
          >
            <Palette className="h-4 w-4" /> Workspace Themes
          </button>
        </div>

        {/* RIGHT COLUMN: FORMS CONTAINER */}
        <div className="md:col-span-9 space-y-6">
          {activeTab === "PROFILE" && (
            <div className="card bg-base-100 border border-base-300 p-6 rounded-2xl shadow-2xs space-y-4 animate-fade-in">
              <div className="border-b border-base-300 pb-2">
                <h3 className="text-base font-black tracking-tight">Profile Information</h3>
                <p className="text-[11px] text-neutral/40 font-semibold uppercase tracking-wider">Identity Settings</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {formResult.error && (
                  <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-center gap-2 font-semibold">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{formResult.error}</span>
                  </div>
                )}
                {formResult.success && (
                  <div className="alert alert-success bg-success/10 border-success/20 text-success text-xs rounded-xl py-2.5 px-3 flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Account profile parameters saved cleanly.</span>
                  </div>
                )}

                {/* INTERACTIVE AVATAR DISPLAY FRAME */}
                <div className="flex flex-col items-center sm:items-start gap-3 pb-2">
                  <span className="text-[10px] font-bold text-neutral/50 uppercase tracking-wider">Profile Photo</span>
                  <div className="relative group/avatar">
                    <div className="avatar placeholder">
                      <div className="w-20 h-20 rounded-full ring-2 ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden bg-neutral text-neutral-content relative flex items-center justify-center">
                        {isSubmitting && (
                          <div className="absolute inset-0 bg-base-300/70 flex items-center justify-center z-10">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                        {previewUrl ? (
                          <img src={previewUrl} alt="User Profile Avatar" className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-lg font-bold">{getInitials(initialUserName)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 btn btn-primary btn-circle btn-xs h-6 w-6 shadow-md border border-base-100 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelection}
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-neutral/50 uppercase">Full Name</span></label>
                    <input 
                      name="fullName" 
                      type="text" 
                      required 
                      disabled={isSubmitting} 
                      defaultValue={initialUserName} 
                      className="input input-sm input-bordered w-full bg-base-200 text-xs font-semibold rounded-xl focus:bg-base-100 focus:input-primary transition-all" 
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-neutral/50 uppercase">Corporate Email</span></label>
                    <input 
                      type="email" 
                      disabled 
                      value={initialUserEmail} 
                      className="input input-sm input-bordered w-full bg-base-200/50 text-neutral/40 text-xs font-bold rounded-xl cursor-not-allowed opacity-70" 
                    />
                  </div>

                  <div className="form-control w-full sm:col-span-2">
                    <label className="label py-1">
                      <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                        <Building className="h-3 w-3 text-neutral/40" /> Department / Division
                      </span>
                    </label>
                    <input
                      name="department"
                      type="text"
                      disabled={isSubmitting}
                      defaultValue={initialDepartmentName || ""}
                      placeholder="e.g., Engineering, Marketing, Design, Sales..."
                      className="input input-sm input-bordered w-full bg-base-200 text-neutral text-xs font-semibold rounded-xl focus:bg-base-100 focus:input-primary transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-base-300">
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="btn btn-primary btn-sm rounded-xl font-bold gap-2 min-w-[130px] text-white cursor-pointer"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-3.5 w-3.5" /> Save Changes</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}