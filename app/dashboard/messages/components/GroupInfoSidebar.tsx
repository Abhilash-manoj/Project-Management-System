// app/dashboard/messages/components/GroupInfoSidebar.tsx
"use client";

import React, { useTransition } from "react";
import { X, Trash2, UserX, Crown } from "lucide-react";
import { removeUserFromGroup, deleteGroupChat } from "@/app/actions/communication";

interface GroupInfoSidebarProps {
  conversation: any;
  currentUserId: string;
  onClose: () => void;
  onGroupModified: () => void;
}

export default function GroupInfoSidebar({ conversation, currentUserId, onClose, onGroupModified }: GroupInfoSidebarProps) {
  const [isPending, startTransition] = useTransition();
  const isCreator = conversation.creatorId === currentUserId;

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user from this group?")) return;
    
    startTransition(async () => {
      const res = await removeUserFromGroup(conversation.id, userId);
      if (res.error) alert(res.error);
      else onGroupModified();
    });
  };

  const handleDeleteGroup = async () => {
    if (!confirm("🚨 WARNING: Disbanding this group will permanently erase all message histories for everyone. Proceed?")) return;

    startTransition(async () => {
      const res = await deleteGroupChat(conversation.id);
      if (res.error) alert(res.error);
      else onGroupModified();
    });
  };

  const getInitials = (name: string) => 
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';

  return (
    <aside className="w-72 border-l border-base-300 flex flex-col bg-base-200/20 h-full text-left font-sans animate-fade-in shrink-0">
      {/* Header Container */}
      <div className="p-4 border-b border-base-200 bg-base-100 flex items-center justify-between shadow-xs">
        <h3 className="font-black text-sm uppercase tracking-wider text-base-content/60">Group Details</h3>
        <button onClick={onClose} className="btn btn-ghost btn-xs h-7 w-7 p-0 rounded-lg hover:bg-base-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Roster Information Display Pane */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral/40 mb-2">Members ({conversation.participants?.length || 0})</h4>
          
          <div className="space-y-1.5">
            {conversation.participants?.map((participant: any) => {
              const userNode = participant.user;
              const isMe = userNode.id === currentUserId;
              const isThisUserCreator = conversation.creatorId === userNode.id;

              return (
                <div key={userNode.id} className="flex items-center justify-between p-2 bg-base-100 border border-base-300/40 rounded-xl transition-all group/user hover:border-base-300">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    
                    {/* 🚀 FIXED: Render user cloud profile avatars with standard initials text fallbacks */}
                    <div className="avatar placeholder shrink-0">
                      <div className="bg-neutral text-neutral-content font-bold rounded-full w-7 h-7 text-[10px] flex items-center justify-center overflow-hidden border border-base-300">
                        {userNode.avatarUrl ? (
                          <img 
                            src={userNode.avatarUrl} 
                            alt={`${userNode.name}'s info thumbnail`} 
                            className="object-cover w-full h-full" 
                          />
                        ) : (
                          <span>{getInitials(userNode.name)}</span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-neutral flex items-center gap-1">
                        {userNode.name} {isMe && <span className="text-[9px] opacity-40 italic font-medium">(You)</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isThisUserCreator && (
                      <span className="badge badge-warning/10 border-none p-1 rounded-md text-warning" title="Group Creator">
                        <Crown className="h-3 w-3 stroke-[2.5]" />
                      </span>
                    )}

                    {/* Moderation Control Button */}
                    {isCreator && !isThisUserCreator && (
                      <button
                        onClick={() => handleRemoveMember(userNode.id)}
                        disabled={isPending}
                        className="btn btn-ghost btn-xs text-error opacity-0 group-hover/user:opacity-100 transition-opacity p-0.5 h-6 w-6 rounded-md"
                        title="Remove user from channel"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Structural Disruption Deletion Block Panel */}
        {isCreator && (
          <div className="pt-4 border-t border-base-300/50">
            <button
              onClick={handleDeleteGroup}
              disabled={isPending}
              className="btn btn-error btn-outline btn-sm w-full font-bold rounded-xl gap-1.5 tracking-tight text-xs hover:text-white"
            >
              <Trash2 className="h-4 w-4" /> Disband & Erase Group
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}