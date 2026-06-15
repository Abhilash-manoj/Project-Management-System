// app/signup/organization/page.tsx
import React from "react";
import { createOrganization } from "../../actions";
import { Building2, Globe, Rocket } from "lucide-react"; // Vector standard icons

interface PageProps {
  searchParams: Promise<{ userId?: string }>;
}

export default async function OrganizationSignUpPage({ searchParams }: PageProps) {
  const { userId } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 text-neutral p-6 font-sans antialiased">
      <div className="card w-full max-w-md p-8 bg-base-100 border border-base-300 rounded-2xl shadow-xl space-y-6">
        
        {/* HEADER BRANDING BLOCK */}
        <div className="space-y-2 text-center flex flex-col items-center">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center font-black text-primary-content text-xl shadow-md mb-2">
            N
          </div>
          
          <div className="flex items-center gap-1.5 text-primary">
            <Building2 className="h-5 w-5 stroke-[2.5]" />
            <h2 className="text-2xl font-black tracking-tight text-neutral">Create your Workspace</h2>
          </div>
          
          <p className="text-xs text-neutral/50 font-semibold text-center px-4 leading-relaxed">
            This is where your projects, tasks, and teams live.
          </p>
        </div>
        
        {/* ORGANIZATION CREATION FORM */}
        <form action={createOrganization} className="space-y-4">
          
          {/* Hidden user identification tracking field */}
          <input type="hidden" name="userId" value={userId || ""} />

          {/* INPUT: WORKSPACE NAME */}
          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="h-3 w-3 text-primary" /> Workspace Name
              </span>
            </label>
            <input 
              name="orgName" 
              type="text" 
              required 
              className="input input-sm input-bordered w-full bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-medium transition-all" 
              placeholder="e.g., My Awesome Team" 
            />
          </div>

          {/* INPUT: WORKSPACE URL SLUG WITH INLINE PREFIX */}
          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider flex items-center gap-1">
                <Globe className="h-3 w-3 text-primary" /> Workspace URL
              </span>
            </label>
            
            <div className="flex items-center bg-base-200 border border-base-300 rounded-xl px-3 focus-within:border-primary focus-within:bg-base-100 transition-all group">
              <span className="text-neutral/40 font-mono text-2xs font-bold select-none pr-1">
                workspace/
              </span>
              <input 
                name="slug" 
                type="text" 
                required 
                className="w-full py-2 bg-transparent text-neutral text-xs font-medium outline-none" 
                placeholder="my-awesome-team" 
              />
            </div>
          </div>

          {/* SUBMIT FORM BUTTON */}
          <button 
            type="submit" 
            className="btn btn-primary btn-sm w-full rounded-xl font-bold gap-2 text-primary-content transition-all cursor-pointer mt-2 shadow-sm"
          >
            <Rocket className="h-4 w-4 stroke-[2.5]" />
            Launch Workspace
          </button>
        </form>

      </div>
    </div>
  );
}