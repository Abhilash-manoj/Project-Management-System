// app/dashboard/projects/[projectId]/components/AssignMemberModal.tsx
"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { X, UserPlus, AlertCircle, Loader2, Search, Check, User } from "lucide-react";
import { assignUserToProject, getSearchableUsers, SearchableUser } from "../../../../actions";

interface ModalProps {
  projectId: string;
  onClose: () => void;
}

export default function AssignMemberModal({ projectId, onClose }: ModalProps) {
  // Data States
  const [allUsers, setAllUsers] = useState<SearchableUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchableUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // UI Control States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch available platform users on component mount
  useEffect(() => {
    async function initUsers() {
      const response = await getSearchableUsers();
      if (response.error) {
        setErrorMsg(response.error);
      } else if (response.users) {
        setAllUsers(response.users);
      }
      setLoadingUsers(false);
    }
    initUsers();
  }, []);

  // 2. Close searchable dropdown automatically when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Filter users dynamically by typing their Name OR Email
  const filteredUsers = allUsers.filter((user) => {
    const searchString = searchQuery.toLowerCase();
    const nameMatch = user.name?.toLowerCase().includes(searchString) || false;
    const emailMatch = user.email.toLowerCase().includes(searchString);
    return nameMatch || emailMatch;
  });

  // 4. Handle Action form submission pass
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setErrorMsg("Validation Error: Please pick a user from the dropdown registry first.");
      return;
    }
    setErrorMsg(null);

    startTransition(async () => {
      const result = await assignUserToProject(projectId, selectedUser.email);
      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        onClose(); // Close smoothly on assignment success
      }
    });
  };

  return (
    <div className="modal modal-open fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs transition-all">
      <div className="modal-box w-full max-w-md bg-base-100 border border-base-300 p-6 rounded-2xl shadow-xl relative space-y-4">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-base-300 pb-3">
          <div className="flex items-center gap-2 text-neutral">
            <UserPlus className="h-5 w-5 text-primary stroke-[2.2]" />
            <div>
              <h3 className="text-base font-black tracking-tight">Assign Team Member</h3>
              <p className="text-[10px] text-neutral/40 font-black uppercase tracking-wider">Interactive Member Search</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} className="btn btn-ghost btn-xs btn-circle text-neutral/40 hover:text-neutral">
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {errorMsg && (
            <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-start gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.2] mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CUSTOM INTERACTIVE SEARCH COMBOBOX DROPDOWN */}
          <div className="form-control w-full relative" ref={dropdownRef}>
            <label className="label py-1">
              <span className="label-text text-[10px] font-bold text-neutral/50 uppercase tracking-wider">
                Select Workspace User
              </span>
            </label>

            {loadingUsers ? (
              <div className="flex items-center gap-2 text-xs font-bold text-neutral/40 p-2 bg-base-200 rounded-xl">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading users database registry...
              </div>
            ) : (
              <>
                {/* Search Input Box Trigger Area */}
                <div className="relative group">
                  <input 
                    type="text"
                    disabled={isPending}
                    value={searchQuery}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      if (selectedUser && selectedUser.name !== e.target.value) {
                        setSelectedUser(null); // Clear selected if they start typing something else
                      }
                    }}
                    placeholder="Search by user name or corporate email..."
                    className="input input-sm input-bordered w-full pl-9 bg-base-200 text-neutral focus:bg-base-100 focus:input-primary rounded-xl text-xs font-semibold transition-all"
                  />
                  <Search className="h-4 w-4 text-neutral/30 absolute left-3 top-2.5 group-focus-within:text-primary transition-colors" />
                </div>

                {/* Dropdown Floating Options Overlay Panel */}
                {isDropdownOpen && (
                  <div className="absolute top-[100%] left-0 w-full bg-base-100 border border-base-300 rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto z-50 p-1 space-y-0.5 custom-scrollbar">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-4 text-xs font-bold text-neutral/30 uppercase tracking-wide">
                        No platform accounts found
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchQuery(user.name || user.email);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                            selectedUser?.id === user.id 
                              ? "bg-primary text-primary-content font-bold" 
                              : "hover:bg-base-200 text-neutral font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`p-1 rounded-md shrink-0 ${selectedUser?.id === user.id ? "bg-primary-content/20" : "bg-base-300"}`}>
                              <User className="h-3 w-3" />
                            </div>
                            <div className="truncate flex flex-col">
                              <span className="font-bold tracking-tight leading-none mb-0.5">
                                {user.name || "Unnamed Platform User"}
                              </span>
                              <span className={`text-[10px] leading-none ${selectedUser?.id === user.id ? "text-primary-content/70" : "text-neutral/40"}`}>
                                {user.email}
                              </span>
                            </div>
                          </div>
                          {selectedUser?.id === user.id && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Operations Footer Buttons */}
          <div className="modal-action flex items-center justify-end gap-2 pt-3 border-t border-base-300 mt-2">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isPending} 
              className="btn btn-ghost btn-sm rounded-xl font-bold text-neutral/50 hover:bg-base-200 hover:text-neutral transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isPending || !selectedUser} 
              className="btn btn-primary btn-sm rounded-xl font-bold gap-2 min-w-[120px] text-primary-content transition-all disabled:opacity-50"
            >
              {isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Provisioning...</>
              ) : (
                "Add to Project"
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}