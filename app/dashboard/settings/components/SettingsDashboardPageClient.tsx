// app/dashboard/settings/components/SettingsDashboardPageClient.tsx
"use client";

import React, { useState, useActionState, useEffect } from "react";
import { User, Palette, LogOut, ShieldAlert, CheckCircle2, Save, Loader2, Building } from "lucide-react";
import { updateProfileSettings } from "@/app/actions/workspace"; 
import { useRouter } from "next/navigation";

const AVAILABLE_THEMES = [
  "light", "dark", "cupcake", "corporate", "winter", "nord", "fantasy"
];

interface SettingsPageProps {
  initialDepartmentName: string | null; // 🚀 Plain string from the database
  initialUserName: string;
  initialUserEmail: string;
}

export default function SettingsDashboardPageClient({
  initialDepartmentName,
  initialUserName,
  initialUserEmail
}: SettingsPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"PROFILE" | "THEME">("PROFILE");
  const [currentTheme, setCurrentTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("nexus-theme") || "light";
    setCurrentTheme(savedTheme);
  }, []);

  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName);
    localStorage.setItem("nexus-theme", themeName);
    document.documentElement.setAttribute("data-theme", themeName);
  };

  // 🚀 Type-safe useActionState setup with explicit signatures
  const [profState, profAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const res = await updateProfileSettings(formData);
      return {
        error: res?.error || null,
        success: res?.success || false,
      };
    },
    {
      error: null as string | null,
      success: false,
    }
  );

  const handleManualLogOut = async () => {
    if (confirm("Are you entirely sure you want to terminate your current workspace session?")) {
      localStorage.removeItem("nexus-theme");
      router.push("/signin");
    }
  };

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
          <div className="border-t border-base-300 my-2 pt-2">
            <button 
              type="button"
              onClick={handleManualLogOut} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Sign Out Workspace
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: FORMS CONTAINER */}
        <div className="md:col-span-9 space-y-6">
          {activeTab === "PROFILE" && (
            <div className="card bg-base-100 border border-base-300 p-6 rounded-2xl shadow-2xs space-y-4 animate-fade-in">
              <div className="border-b border-base-300 pb-2">
                <h3 className="text-base font-black tracking-tight">Profile Information</h3>
                <p className="text-[11px] text-neutral/40 font-semibold uppercase tracking-wider">Identity Settings</p>
              </div>

              <form action={profAction} className="space-y-4">
                {profState?.error && (
                  <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-center gap-2 font-semibold">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{profState.error}</span>
                  </div>
                )}
                {profState?.success && (
                  <div className="alert alert-success bg-success/10 border-success/20 text-success text-xs rounded-xl py-2.5 px-3 flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Account profile parameters saved cleanly.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-neutral/50 uppercase">Full Name</span></label>
                    <input 
                      name="fullName" 
                      type="text" 
                      required 
                      disabled={isPending} 
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

                  {/* 🚀 FIXED: INTERACTIVE PLAIN TEXT INPUT BOX FOR DEPARTMENT */}
                  <div className="form-control w-full sm:col-span-2">
                    <label className="label py-1">
                      <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                        <Building className="h-3 w-3 text-neutral/40" /> Department / Division
                      </span>
                    </label>
                    <input
                      name="department"
                      type="text"
                      disabled={isPending}
                      defaultValue={initialDepartmentName || ""}
                      placeholder="e.g., Engineering, Marketing, Design, Sales..."
                      className="input input-sm input-bordered w-full bg-base-200 text-neutral text-xs font-semibold rounded-xl focus:bg-base-100 focus:input-primary transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-base-300">
                  <button 
                    type="submit" 
                    disabled={isPending} 
                    className="btn btn-primary btn-sm rounded-xl font-bold gap-2 min-w-[130px] text-white cursor-pointer"
                  >
                    {isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-3.5 w-3.5" /> Save Changes</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* THEMES TAB PANEL */}
          {activeTab === "THEME" && (
            <div className="card bg-base-100 border border-base-300 p-6 rounded-2xl shadow-2xs space-y-4 animate-fade-in">
              <div className="border-b border-base-300 pb-2">
                <h3 className="text-base font-black tracking-tight">Interface Theme Selector</h3>
                <p className="text-[11px] text-neutral/40 font-semibold uppercase tracking-wider">Workspace Personalization</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                {AVAILABLE_THEMES.map((themeName) => (
                  <button 
                    key={themeName} 
                    type="button" 
                    onClick={() => handleThemeChange(themeName)} 
                    className={`p-3 rounded-xl border text-left text-xs capitalize font-bold flex flex-col justify-between h-20 transition-all cursor-pointer ${currentTheme === themeName ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20" : "border-base-300 bg-base-200/50 hover:bg-base-200"}`}
                  >
                    <span className="tracking-tight text-neutral">{themeName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}