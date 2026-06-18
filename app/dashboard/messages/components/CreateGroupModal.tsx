// app/dashboard/messages/components/CreateGroupModal.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { createGroupChatAction } from '@/app/actions/communication';
import { getCompanyDirectory } from '@/app/actions/communication';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  organizationId: string;
  onGroupCreated: (newChatId: string) => void;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  currentUserId,
  organizationId,
  onGroupCreated
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load corporate directory pool to populate checkable invites list options
  useEffect(() => {
    if (!isOpen) return;
    async function loadDirectory() {
      try {
        const users = await getCompanyDirectory({ organizationId, currentUserId, searchQuery: '' });
        setDirectoryUsers(users);
      } catch (err) {
        console.error("Failed to load directory contacts:", err);
      }
    }
    loadDirectory();
    // Wipe form fields clean on open frames toggles
    setGroupName('');
    setSelectedUserIds([]);
    setErrorMsg(null);
  }, [isOpen, organizationId, currentUserId]);

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    startTransition(async () => {
      setErrorMsg(null);
      const result = await createGroupChatAction({
        creatorId: currentUserId,
        organizationId,
        groupName: groupName.trim(),
        invitedUserIds: selectedUserIds
      });

      if (result.error) {
        setErrorMsg(result.error);
      } else if (result.success && result.conversationId) {
        onGroupCreated(result.conversationId);
        onClose();
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-50 animate-fadeIn">
      <div className="modal-box bg-base-100 border border-base-300 text-base-content max-w-sm rounded-2xl shadow-2xl p-6">
        <h3 className="font-bold text-lg tracking-tight mb-4 text-base-content">Create Group Channel</h3>
        
        {errorMsg && (
          <div className="alert alert-error text-xs p-2.5 mb-3 rounded-xl border border-error/20 bg-error/10 text-error">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-xs font-semibold opacity-60">Channel Name</span></label>
            <input
              type="text"
              required
              disabled={isPending}
              placeholder="e.g., Marketing Sync"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input input-bordered input-sm w-full bg-base-200 border-base-300 text-sm focus:outline-primary"
            />
          </div>

          <div className="form-control w-full">
            <label className="label py-1"><span className="label-text text-xs font-semibold opacity-60">Invite Coworkers</span></label>
            <div className="bg-base-200 rounded-xl border border-base-300 p-2 max-h-40 overflow-y-auto space-y-1">
              {directoryUsers.length === 0 ? (
                <div className="p-3 text-center text-xs opacity-40">No matching team members found</div>
              ) : (
                directoryUsers.map((user) => (
                  <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-base-300/50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleToggleUserSelection(user.id)}
                      className="checkbox checkbox-primary checkbox-xs rounded-md"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate text-base-content">{user.name}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="modal-action gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isPending} className="btn btn-sm btn-ghost px-4 rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={isPending || !groupName.trim()} className="btn btn-sm btn-primary px-5 rounded-xl shadow-sm">
              {isPending ? <span className="loading loading-spinner loading-xs"></span> : "Create"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-neutral/40 backdrop-blur-xs" onClick={onClose}></div>
    </div>
  );
}