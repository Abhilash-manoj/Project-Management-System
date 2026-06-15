// app/dashboard/projects/components/ProjectsViewContainer.tsx
"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation"; // Hook enabling client navigation states
import { Search, LayoutGrid, List, CheckSquare, Users, Calendar, Shield, Folder } from "lucide-react";

interface AssignedUser {
  user: { name: string };
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  visibility: "PRIVATE" | "PUBLIC";
  progress: number;
  createdAt: string;
  creator: { name: string };
  assignments: AssignedUser[];
  _count: { tasks: number };
}

export default function ProjectsViewContainer({ initialProjects }: { initialProjects: ProjectItem[] }) {
  const router = useRouter(); // Initialize core router executor
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewLayout, setViewLayout] = useState<"GRID" | "LIST">("GRID");

  const filterTabs = ["All", "Active", "On Hold", "Completed", "Archived"];

  // Filter project database arrays cleanly dynamically
  const filteredProjects = useMemo(() => {
    return initialProjects.filter((project) => {
      const normalizedStatus = project.status?.replace("_", " ").toLowerCase();
      const normalizedFilter = activeFilter.toLowerCase();
      
      const matchesFilter = activeFilter === "All" || normalizedStatus === normalizedFilter;
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [initialProjects, activeFilter, searchQuery]);

  // Dynamic helper tracking status badge layout styles
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE": return "badge-success text-success-content bg-success/10 border-success/20";
      case "ON_HOLD": return "badge-warning text-warning-content bg-warning/10 border-warning/20";
      case "COMPLETED": return "badge-primary text-primary-content bg-primary/10 border-primary/20";
      default: return "badge-neutral text-neutral-content bg-base-300 border-base-300";
    }
  };

  // Helper assigning colorful accent rings to progress cards mimicking the reference mockup
  const getCardTopAccent = (status: string) => {
    switch (status) {
      case "ACTIVE": return "border-t-4 border-t-primary";
      case "ON_HOLD": return "border-t-4 border-t-warning";
      case "COMPLETED": return "border-t-4 border-t-success";
      default: return "border-t-4 border-t-base-300";
    }
  };

  return (
    <div className="space-y-4 font-sans text-neutral">
      
      {/* FILTER BAR ROW PLATFORM CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-100 p-3 border border-base-300 rounded-2xl shadow-xs">
        
        {/* Search & Tabs Block */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral/40 stroke-[2.2]" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="input input-sm input-bordered w-full bg-base-200 focus:bg-base-100 focus:input-primary rounded-xl pl-9 text-xs font-medium transition-all"
            />
          </div>

          {/* Status Filter Tabs Stacks */}
          <div className="tabs tabs-boxed bg-base-200/60 border border-base-300/40 p-0.5 rounded-xl flex overflow-x-auto scrollbar-none">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`tab tab-sm font-bold rounded-lg px-3 transition-all cursor-pointer ${
                  activeFilter === tab ? "tab-active bg-primary text-primary-content shadow-xs" : "text-neutral/60 hover:text-neutral"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Grid/List Display Toggles */}
        <div className="tabs tabs-boxed bg-base-200/60 border border-base-300/40 p-0.5 rounded-xl self-end md:self-auto select-none">
          <button 
            onClick={() => setViewLayout("GRID")}
            className={`tab tab-sm p-2 rounded-lg cursor-pointer ${viewLayout === "GRID" ? "tab-active bg-base-100 text-primary shadow-xs" : "text-neutral/40"}`}
          >
            <LayoutGrid className="h-4 w-4 stroke-[2.2]" />
          </button>
          <button 
            onClick={() => setViewLayout("LIST")}
            className={`tab tab-sm p-2 rounded-lg cursor-pointer ${viewLayout === "LIST" ? "tab-active bg-base-100 text-primary shadow-xs" : "text-neutral/40"}`}
          >
            <List className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

      </div>

      {/* RENDER MODE CONTAINER VIEWPORT MATRIX */}
      {filteredProjects.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-base-300 rounded-3xl bg-base-100 space-y-2 max-w-xl mx-auto my-12">
          <Folder className="h-8 w-8 text-neutral/20 stroke-[1.5] mx-auto" />
          <p className="text-sm font-bold text-neutral">No project workspaces match your selection</p>
          <p className="text-xs text-neutral/40 font-medium">Try clearing your filters or testing alternate keyword search terms.</p>
        </div>
      ) : viewLayout === "GRID" ? (
        
        /* ==========================================================================
           GRID VIEW MODE 
           ========================================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
          {filteredProjects.map((project) => {
            const initials = project.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            const totalTasks = project._count?.tasks || 0;
            const completedTasks = Math.round((project.progress / 100) * totalTasks);

            return (
              <div 
                key={project.id} 
                // 👇 TRIGGER LINK REDIRECT ROUTING ON SURFACE CLICK
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                className={`card bg-base-100 border border-base-300 shadow-xs rounded-2xl overflow-hidden p-6 flex flex-col justify-between hover:shadow-md hover:border-base-300/80 active:scale-[0.99] transition-all duration-150 relative cursor-pointer select-none ${getCardTopAccent(project.status)}`}
              >
                {/* Upper Identity Details Info */}
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-primary/10 text-primary font-black rounded-xl h-11 w-11 border border-primary/20 text-sm shadow-inner">
                          <span>{initials}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-black text-neutral text-base tracking-tight hover:text-primary transition-colors">
                          {project.name}
                        </h4>
                        <span className="text-[10px] text-neutral/40 font-black uppercase tracking-wider">
                          {project.visibility || "PRIVATE"}
                        </span>
                      </div>
                    </div>

                    <span className={`badge badge-sm font-bold rounded-md px-2 py-1 border text-[11px] uppercase tracking-wide ${getStatusBadgeClass(project.status)}`}>
                      {project.status?.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs text-neutral/60 leading-relaxed font-medium min-h-[40px] line-clamp-2">
                    {project.description || "No project overview summaries configured for this tenant cluster."}
                  </p>
                </div>

                {/* Middle Action Progress Bars Block */}
                <div className="space-y-1.5 pt-4 mt-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-neutral/40">
                    <span>Progress</span>
                    <span className="text-neutral font-bold">{project.progress || 0}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full h-2 bg-base-200" 
                    value={project.progress || 0} 
                    max="100" 
                  />
                </div>

                {/* Bottom Stats Meta Row Panel */}
                <div className="flex items-center justify-between pt-4 border-t border-base-300/60 mt-4 text-[11px] font-bold text-neutral/50 uppercase tracking-wide">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" title="Completed Tasks Ratio">
                      <CheckSquare className="h-3.5 w-3.5 stroke-[2.2]" />
                      <span>{completedTasks}/{totalTasks}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 stroke-[2.2]" />
                      <span>{project.assignments?.length || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 stroke-[2.2]" />
                    <span>67d left</span>
                  </div>
                </div>

                {/* Avatar Overlap Bubble Grid Footer Row */}
                <div className="flex items-center justify-between border-t border-base-300/40 pt-3 mt-3">
                  <div className="avatar-group -space-x-2.5 rtl:space-x-reverse select-none">
                    {project.assignments?.slice(0, 4).map((assignee, idx) => {
                      const initial = assignee.user.name.charAt(0).toUpperCase();
                      return (
                        <div key={idx} className="avatar placeholder" title={assignee.user.name}>
                          <div className="bg-base-300 text-neutral text-[9px] font-black h-6 w-6 rounded-full border-2 border-base-100 ring-1 ring-base-300/40">
                            <span>{initial}</span>
                          </div>
                        </div>
                      );
                    })}
                    {project.assignments?.length > 4 && (
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content text-[8px] font-black h-6 w-6 rounded-full border-2 border-base-100">
                          <span>+{project.assignments.length - 4}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <span className="text-[10px] text-neutral/40 font-bold">
                    by {project.creator?.name || "Unknown"}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        
        /* ==========================================================================
           LIST VIEW MODE
           ========================================================================== */
        <div className="card bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-xs divide-y divide-base-300">
          <div className="p-3 bg-base-200 text-[10px] font-black uppercase tracking-wider text-neutral/40 grid grid-cols-12 gap-4 select-none border-b border-base-300">
            <div className="col-span-4 flex items-center gap-2"><Folder className="h-3.5 w-3.5 text-primary" /> Workspace Title</div>
            <div className="col-span-3 flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Scope / Status</div>
            <div className="col-span-3 flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5" /> Delivery Progress</div>
            <div className="col-span-2 flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Team Weight</div>
          </div>

          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              // 👇 ALLOW ROW SELECTION INTERACTIVITY INSIDE THE TABLE DATA GRID TOO
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              className="p-4 grid grid-cols-12 gap-4 items-center text-sm font-medium hover:bg-base-200/50 transition-colors text-neutral cursor-pointer select-none"
            >
              <div className="col-span-4 space-y-0.5">
                <p className="font-bold tracking-tight text-neutral hover:text-primary transition-colors">{project.name}</p>
                <p className="text-xs text-neutral/40 max-w-xs truncate font-normal">{project.description || "No overview recorded."}</p>
              </div>
              
              <div className="col-span-3 flex items-center gap-2">
                <span className="badge bg-base-200 border-none font-bold text-[9px] px-1.5 py-0.5 uppercase tracking-wide text-neutral/60">
                  {project.visibility}
                </span>
                <span className={`badge badge-xs font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide ${getStatusBadgeClass(project.status)}`}>
                  {project.status?.replace("_", " ")}
                </span>
              </div>

              <div className="col-span-3 flex items-center gap-3">
                <progress className="progress progress-primary h-1.5 w-24 bg-base-200" value={project.progress || 0} max="100" />
                <span className="text-xs font-bold text-neutral/70">{project.progress}%</span>
              </div>

              <div className="col-span-2 flex items-center gap-1 text-xs text-neutral/60 font-semibold">
                <Users className="h-3.5 w-3.5 text-neutral/30" />
                <span>{project.assignments?.length || 0} assigned</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}