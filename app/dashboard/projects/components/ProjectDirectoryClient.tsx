// app/dashboard/projects/components/ProjectsDirectoryClient.tsx
"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Folder, Search, Users, Shield, ArrowUpRight, Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import CreateProjectModal from "../../components/CreateProjectModal"; 

interface ProjectCardData {
  id: string;
  name: string;
  description: string;
  status: string;
  visibility: string;
  progress: number;
  memberCount: number;
}

interface ClientProps {
  initialProjects: ProjectCardData[];
  totalTrackedLabel: number;
  currentActiveFilter: string;
  currentSearchValue: string;
  isOwnerOrAdmin: boolean;
}

export default function ProjectsDirectoryClient({
  initialProjects = [], // 🚀 PREVENT CRASHES: Ensure default empty fallback array
  totalTrackedLabel,
  currentActiveFilter,
  currentSearchValue,
  isOwnerOrAdmin,
}: ClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [searchVal, setSearchVal] = useState(currentSearchValue);
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { id: "ALL", label: "All" },
    { id: "ACTIVE", label: "Active" },
    { id: "ON_HOLD", label: "On Hold" },
    { id: "COMPLETED", label: "Completed" },
    { id: "ARCHIVED", label: "Archived" },
  ];

  // 🚀 SHARED NAVIGATION PARAMS COMPILER
  const updateWorkspaceQueries = (statusFilter: string, textSearch: string) => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter.toLowerCase());
    if (textSearch.trim() !== "") params.set("search", textSearch.trim());

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchVal(newVal);
    updateWorkspaceQueries(currentActiveFilter, newVal);
  };

  const handleTabToggle = (tabId: string) => {
    updateWorkspaceQueries(tabId, searchVal);
  };

  const handleSearchKeystroke = (e: React.FormEvent) => {
    e.preventDefault(); 
    updateWorkspaceQueries(currentActiveFilter, searchVal);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-success/10 border-success/20 text-success";
      case "ON_HOLD": return "bg-warning/10 border-warning/20 text-warning-content";
      case "ARCHIVED": return "bg-neutral text-neutral-content/60 border-none";
      default: return "bg-primary/10 border-primary/20 text-primary";
    }
  };

  return (
    <div className="space-y-6 text-base-content text-left font-sans select-none p-1">
      
      {/* HEADER SECTION TITLE BLOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-300 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-base-content">
            <Folder className="h-6 w-6 text-primary stroke-[2.2]" /> Projects Scopes
          </h1>
          <p className="text-xs font-bold text-base-content/40 uppercase tracking-wide">
            {totalTrackedLabel} {totalTrackedLabel === 1 ? "project" : "projects"} total tracked in infrastructure
          </p>
        </div>

        {isOwnerOrAdmin && (
          <div className="shrink-0 self-start sm:self-auto animate-fade-in flex items-center">
            <button 
              type="button"
              onClick={() => setIsOpen(true)}
              className="btn btn-primary btn-sm rounded-xl font-bold text-primary-content shadow-xs cursor-pointer flex items-center gap-1.5 bg-primary"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" /> New Project
            </button>
            <CreateProjectModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
          </div>
        )}
      </div>

      {/* FILTER & INTERACTIVE OPERATION CONTROLS TABS BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-base-100 p-3 rounded-2xl border border-base-300 shadow-2xs">
        <form onSubmit={handleSearchKeystroke} className="relative flex-1 max-w-sm group">
          <input
            type="text"
            value={searchVal}
            onChange={handleInputChange} 
            placeholder="Search projects by name..."
            className="input input-sm input-bordered w-full pl-9 bg-base-200 text-base-content focus:bg-base-100 focus:input-primary text-xs font-semibold rounded-xl transition-all"
          />
          <Search className="h-3.5 w-3.5 text-base-content/30 absolute left-3 top-2.5 group-focus-within:text-primary transition-colors" />
          <button type="submit" className="hidden">Search</button>
        </form>

        <div className="tabs tabs-boxed bg-base-200 border border-base-300/60 p-1 rounded-xl flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabToggle(tab.id)}
              className={`tab tab-sm font-black rounded-lg text-xs tracking-tight px-3.5 transition-all cursor-pointer ${
                currentActiveFilter === tab.id
                  ? "tab-active bg-primary text-primary-content shadow-xs"
                  : "text-base-content/50 hover:text-base-content"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* PROJECTS SCOPES DISPLAY STREAM GRID */}
      {initialProjects.length === 0 ? (
        <div className="card bg-base-100 border border-dashed border-base-300 rounded-2xl text-center py-16 px-4 space-y-2 max-w-xl mx-auto my-4">
          <Folder className="h-8 w-8 text-base-content/20 mx-auto stroke-[1.5]" />
          <h3 className="text-sm font-black text-base-content">No structural projects discovered</h3>
          <p className="text-xs text-base-content/40 font-semibold px-6 leading-relaxed">
            No matching active registry pipelines were found that fit your search parameters. Try altering your filters queries tracking flags.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {initialProjects.map((project) => (
            <Link
              href={`/dashboard/projects/${project.id}`}
              key={project.id}
              className="card bg-base-100 border border-base-300 hover:border-primary/40 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:scale-[1.005] active:scale-[0.995] transition-all space-y-4 group text-left relative overflow-hidden"
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-black text-base-content text-sm tracking-tight leading-tight group-hover:text-primary transition-colors truncate flex-1 pr-1">
                    {project.name}
                  </h3>
                  <span className={`badge badge-sm font-black uppercase text-[9px] tracking-wider px-2 py-0.5 rounded-md shrink-0 border ${getStatusBadgeStyle(project.status)}`}>
                    {project.status.toLowerCase()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-bold text-base-content/40 uppercase tracking-wide">
                  <span className="flex items-center gap-0.5"><Shield className="h-3 w-3" /> {project.visibility}</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {project.memberCount} assigned</span>
                </div>
              </div>

              <p className="text-xs text-base-content/50 font-medium line-clamp-2 leading-relaxed h-8">
                {project.description}
              </p>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-base-content/40 uppercase tracking-wide">
                  <span>Aggregate Progress</span>
                  <span className="text-base-content font-black">{project.progress}%</span>
                </div>
                <progress
                  className="progress progress-primary h-1.5 w-full bg-base-200 rounded-full"
                  value={project.progress}
                  max="100"
                />
              </div>

              <div className="flex justify-end pt-2 text-primary font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity items-center gap-0.5 select-none pointer-events-none">
                Open Project Space <ArrowUpRight className="h-3 w-3 stroke-[2.5]" />
              </div>

            </Link>
          ))}
        </div>
      )}

    </div>
  );
}