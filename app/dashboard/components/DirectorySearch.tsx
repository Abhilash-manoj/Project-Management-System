// app/dashboard/components/DirectorySearch.tsx
"use client";

import React, { useState } from "react";
import { queryUserDirectory } from "@/app/actions/communication";
import { Search, UserPlus, ShieldAlert, Loader2 } from "lucide-react"; 

interface SearchResult {
  id: string;
  name: string | null; // 👈 FIXED: Allowed string | null to handle anonymous users safely
  email: string;
  avatarUrl?: string | null; // 👈 FIXED: Added '?' to mark it as optional, matching the query payload
}

export default function DirectorySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Execute our isolated directory action query
      const searchData = await queryUserDirectory(value);
      // Explicitly mapping or supplying the data directly now validates clean type integrity checks
      setResults(searchData as SearchResult[]);
    } catch (err) {
      console.error("Directory lookup failure", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-xs p-6 space-y-4 font-sans text-left">
      <div>
        <div className="flex items-center gap-2 text-primary">
          <Search className="h-4 w-4 stroke-[2.5]" />
          <h3 className="text-base font-black tracking-tight">Workspace Directory Lookup</h3>
        </div>
        <p className="text-xs text-base-content/40 font-bold mt-0.5">
          Phase 1 Sandbox: Search results are isolated based on your account clearance level.
        </p>
      </div>

      <div className="relative w-full">
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          className="input input-sm input-bordered w-full bg-base-200 text-base-content focus:bg-base-100 focus:input-primary rounded-xl pl-4 pr-10 text-xs font-medium transition-all"
          placeholder="Type a name or email to scan directory..."
        />
        {loading && (
          <div className="absolute right-3 top-2.5 text-primary">
            <Loader2 className="h-4 w-4 animate-spin stroke-[2.5]" />
          </div>
        )}
      </div>

      {/* SEARCH RESULTS REGISTRY */}
      {results.length > 0 && (
        <div className="border border-base-300 rounded-xl divide-y divide-base-300 overflow-hidden bg-base-200/50">
          {results.map((user) => (
            <div 
              key={user.id} 
              className="p-3 flex items-center justify-between hover:bg-base-100 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="avatar placeholder">
                  <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content font-bold rounded-full h-8 w-8 border border-primary/20 transition-all text-xs flex items-center justify-center select-none uppercase">
                    <span>{user.name ? user.name.charAt(0) : user.email.charAt(0)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-base-content">{user.name || "Anonymous Teammate"}</p>
                  <p className="text-xs text-base-content/40 font-medium">{user.email}</p>
                </div>
              </div>
              
              <button 
                type="button" 
                className="btn btn-primary btn-xs rounded-lg gap-1 opacity-0 group-hover:opacity-100 transition-all pointer-events-none text-primary-content"
              >
                <UserPlus className="h-3 w-3 stroke-[2.5]" />
                Assign
              </button>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY RESULT CONTEXT BOUNDARY AREA */}
      {query.length >= 2 && results.length === 0 && !loading && (
        <div className="flex items-center justify-center gap-2 p-4 border border-dashed border-base-300 rounded-xl bg-base-200/30 text-base-content/40 select-none">
          <ShieldAlert className="h-4 w-4 shrink-0 stroke-[2.2] text-primary" />
          <p className="text-xs font-bold">
            No directory matches found within your project perimeter scope.
          </p>
        </div>
      )}
    </div>
  );
}