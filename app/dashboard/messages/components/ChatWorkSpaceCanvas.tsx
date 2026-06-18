// app/dashboard/messages/components/ChatWorkSpaceCanvas.tsx
"use client";

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { getUserConversations, sendMessage, getOrCreatePrivateChat, deleteMessageAction } from '@/app/actions/communication';
import { getConversationMessages } from '@/app/actions/communication';
import { searchCompanyDirectory, getMembershipRoleAction } from '@/app/actions/directory'; 
import CreateGroupModal from "./CreateGroupModal";
import PusherClient from 'pusher-js';

interface ChatWorkspaceCanvasProps {
  currentUserId: string;
  organizationId: string;
}

export default function ChatWorkspaceCanvas({ currentUserId, organizationId }: ChatWorkspaceCanvasProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [activeChatMessages, setActiveChatMessages] = useState<any[]>([]);
  
  const [messageText, setMessageText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  
  const [userRole, setUserRole] = useState<string>("EMPLOYEE");
  const [groupModalOpen, setGroupModalOpen] = useState<boolean>(false);

  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync rooms list view configurations
  const refreshWorkspaceChats = async (selectChatId: string | null = null) => {
    try {
      const liveRooms = await getUserConversations(currentUserId, organizationId);
      
      const mappedRooms = liveRooms.map((room: any) => ({
        ...room,
        unreadCount: room.unreadCount || 0,
        updatedAt: room.messages?.[0]?.createdAt ? new Date(room.messages[0].createdAt) : new Date(room.updatedAt)
      }));

      setConversations(mappedRooms);
      if (selectChatId) setActiveChatId(selectChatId);
    } catch (err) {
      console.error("Failed to sync conversations listing:", err);
    }
  };

  useEffect(() => {
    refreshWorkspaceChats(null);

    async function resolveActiveWorkspacePermissions() {
      const result = await getMembershipRoleAction(currentUserId, organizationId);
      if (result?.role) {
        setUserRole(result.role);
      }
    }
    resolveActiveWorkspacePermissions();
  }, [currentUserId, organizationId]);

  // Handle clearing unread badges when clicking into an active chat tab
  useEffect(() => {
    if (!activeChatId) return;

    setConversations(prev => prev.map(chat => 
      chat.id === activeChatId ? { ...chat, unreadCount: 0 } : chat
    ));

    async function loadActiveChannelMessages() {
      try {
        const fullHistory = await getConversationMessages(activeChatId, currentUserId);
        setActiveChatMessages(fullHistory);
      } catch (err) {
        console.error("Failed to load historical database logs:", err);
      }
    }

    loadActiveChannelMessages();
  }, [activeChatId, currentUserId]);

  // Establish Real-Time Global Network Event Listeners
  useEffect(() => {
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    });

    conversations.forEach(chat => {
      const channel = pusher.subscribe(`chat-${chat.id}`);
      
      // Live message insertion handler
      channel.bind("new-message", (incomingMessage: any) => {
        if (chat.id === activeChatId) {
          setActiveChatMessages((prev) => {
            const filtered = prev.filter(m => !(m.id.startsWith("temp-") && m.body === incomingMessage.body));
            if (filtered.some(m => m.id === incomingMessage.id)) return filtered;
            return [...filtered, incomingMessage];
          });
        }

        setConversations((prevConversations) => {
          return prevConversations.map(c => {
            if (c.id === incomingMessage.conversationId) {
              const isCurrentChatOpen = c.id === activeChatId;
              const isFromMe = incomingMessage.senderId === currentUserId;
              
              return {
                ...c,
                unreadCount: (!isCurrentChatOpen && !isFromMe) ? (c.unreadCount || 0) + 1 : 0,
                messages: [incomingMessage],
                updatedAt: new Date(incomingMessage.createdAt)
              };
            }
            return c;
          });
        });
      });

      // 🚀 NEW: Live dynamic deletion handler stream listener
      channel.bind("message-deleted", (data: { messageId: string }) => {
        if (chat.id === activeChatId) {
          setActiveChatMessages((prev) => prev.filter(msg => msg.id !== data.messageId));
        }
        refreshWorkspaceChats(activeChatId || null);
      });
    });

    return () => {
      conversations.forEach(chat => {
        pusher.unsubscribe(`chat-${chat.id}`);
      });
    };
  }, [conversations, activeChatId, currentUserId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages]);

  // 🚀 FIXED: Re-wired missing user selection handler configuration
  const handleSelectUserToChat = async (targetUserId: string) => {
    setSearchQuery('');
    setDropdownOpen(false);
    try {
      const targetRoom = await getOrCreatePrivateChat(currentUserId, targetUserId, organizationId);
      await refreshWorkspaceChats(targetRoom.id);
    } catch (err) {
      console.error("Failed to initialize direct conversation room mapping:", err);
    }
  };

  const handleMessageDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChatId) return;

    const targetedChatId = activeChatId;
    const bodyContent = messageText.trim();
    setMessageText('');

    const temporaryLocalEchoId = `temp-${Date.now()}`;
    const optimisticEchoPayload = {
      id: temporaryLocalEchoId,
      body: bodyContent,
      senderId: currentUserId,
      createdAt: new Date(),
      sender: { id: currentUserId, name: "You" }
    };
    
    setActiveChatMessages(prev => [...prev, optimisticEchoPayload]);

    startTransition(async () => {
      try {
        await sendMessage(targetedChatId, currentUserId, bodyContent, []);
      } catch (error) {
        console.error("Message process breakdown:", error);
        setActiveChatMessages(prev => prev.filter(m => m.id !== temporaryLocalEchoId));
      }
    });
  };

  // 🚀 NEW: Trigger backend server action to delete selected message securely
  const handleMessageDeletion = async (messageId: string) => {
    setActiveChatMessages(prev => prev.filter(m => m.id !== messageId));

    startTransition(async () => {
      const result = await deleteMessageAction({
        messageId,
        userId: currentUserId,
        organizationId
      });

      if (result.error) {
        console.error("Deletion authorization failure:", result.error);
        refreshWorkspaceChats(activeChatId);
      }
    });
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }

    const delayDebounce = setTimeout(() => {
      startTransition(async () => {
        try {
          const users = await searchCompanyDirectory({ organizationId, currentUserId, searchQuery });
          setSearchResults(users);
          setDropdownOpen(true);
        } catch (err) {
          console.error("Directory autocomplete failure:", err);
        }
      });
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, organizationId, currentUserId]);

  useEffect(() => {
    function clickBoundaryCheck(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", clickBoundaryCheck);
    return () => document.removeEventListener("mousedown", clickBoundaryCheck);
  }, []);

  const currentChat = conversations.find(c => c.id === activeChatId);
  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';
  
  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const directMessages = sortedConversations.filter(c => !c.isGroup);
  const groupChannels = sortedConversations.filter(c => c.isGroup);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden border border-base-300 bg-base-100 text-base-content rounded-box">
      
      {/* Sidebar Controls */}
      <aside className="w-80 border-r border-base-300 flex flex-col bg-base-200/30">
        <div className="p-4 border-b border-base-200 bg-base-100 space-y-3 relative" ref={dropdownRef}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight">Discussions</h2>
            {(userRole === "OWNER" || userRole === "ADMIN") && (
              <button onClick={() => setGroupModalOpen(true)} className="btn btn-primary btn-xs font-bold px-2 rounded-md shadow-xs">＋ Group</button>
            )}
          </div>
          <div className="relative w-full">
            <input type="text" placeholder="Search coworkers to chat..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input input-bordered input-sm w-full bg-base-200 text-xs focus:outline-primary pl-8" />
            <span className="absolute left-2.5 top-2 text-xs opacity-40">🔍</span>
          </div>

          {dropdownOpen && (
            <div className="absolute top-[calc(100%-8px)] left-0 w-full bg-base-100 border border-base-300 rounded-b-box shadow-xl z-50 p-1 max-h-60 overflow-y-auto space-y-1">
              <div className="text-[10px] uppercase font-bold opacity-40 p-1.5 tracking-wider">Company Directory</div>
              {searchResults.length === 0 ? (
                <div className="p-2 text-xs opacity-50 text-center">No teammates found</div>
              ) : (
                searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUserToChat(user.id)}
                    className="w-full text-left p-2 hover:bg-base-200 rounded-btn text-xs flex flex-col"
                  >
                    <span className="font-semibold">{user.name}</span>
                    <span className="opacity-50 text-[10px]">{user.email}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Direct Messages Section */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-base-content/40 px-2 mb-1">Direct Messages</div>
            <div className="space-y-0.5">
              {directMessages.map((chat) => {
                const peer = chat.participants.find((p: any) => p.user.id !== currentUserId)?.user;
                const isSelected = chat.id === activeChatId;
                return (
                  <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`p-2 rounded-btn cursor-pointer transition-colors flex items-center gap-3 relative ${isSelected ? 'bg-primary text-primary-content font-medium shadow-sm' : 'hover:bg-base-200/60'}`}>
                    <div className="avatar placeholder placeholder-xs">
                      <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 text-xs flex items-center justify-center"><span>{getInitials(peer?.name || 'User')}</span></div>
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="text-xs font-semibold truncate">{peer?.name || 'Team Member'}</div>
                      <p className={`text-[11px] truncate ${isSelected ? 'opacity-80' : 'opacity-60'}`}>{chat.messages?.[0]?.body || 'No messages yet'}</p>
                    </div>
                    
                    {chat.unreadCount > 0 && (
                      <span className="absolute right-3 top-4 badge badge-success badge-sm font-black text-[10px] h-5 min-w-5 rounded-full text-success-content">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group Channels Section */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-base-content/40 px-2 mb-1">Group Channels</div>
            <div className="space-y-0.5">
              {groupChannels.length === 0 ? (
                <div className="p-2 text-[11px] opacity-40 italic px-2">No group channels created yet.</div>
              ) : (
                groupChannels.map((chat) => {
                  const isSelected = chat.id === activeChatId;
                  return (
                    <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`p-2 rounded-btn cursor-pointer transition-colors flex items-center gap-3 relative ${isSelected ? 'bg-primary text-primary-content font-medium shadow-sm' : 'hover:bg-base-200/60'}`}>
                      <div className="avatar placeholder placeholder-xs">
                        <div className="bg-base-300 text-base-content rounded-md w-8 h-8 text-xs font-bold flex items-center justify-center"><span>#</span></div>
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="text-xs font-semibold truncate">{chat.name || "Unnamed Channel"}</div>
                        <p className={`text-[11px] truncate ${isSelected ? 'opacity-80' : 'opacity-60'}`}>{chat.messages?.[0]?.body || 'No messages yet'}</p>
                      </div>

                      {chat.unreadCount > 0 && (
                        <span className="absolute right-3 top-4 badge badge-success badge-sm font-black text-[10px] h-5 min-w-5 rounded-full text-success-content">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Viewport */}
      <main className="flex-1 flex flex-col bg-base-100">
        {currentChat ? (
          <>
            <div className="p-4 border-b border-base-300 bg-base-100 flex items-center gap-3 shadow-sm z-10">
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-9 h-9 text-xs flex items-center justify-center"><span>{currentChat.isGroup ? '#' : getInitials(currentChat.participants.find((p: any) => p.user.id !== currentUserId)?.user.name)}</span></div>
              </div>
              <div>
                <span className="font-bold text-base text-base-content block leading-none">{currentChat.isGroup ? currentChat.name : currentChat.participants.find((p: any) => p.user.id !== currentUserId)?.user.name}</span>
                <span className="text-[10px] opacity-50 mt-1 block">Active now</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200/10">
              {activeChatMessages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";
                const canDelete = isMe || isPrivileged;

                return (
                  <div key={msg.id} className={`chat ${isMe ? 'chat-end' : 'chat-start'} group/bubble relative`}>
                    <div className="chat-image avatar placeholder">
                      <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 text-[10px] flex items-center justify-center"><span>{getInitials(msg.sender?.name || (isMe ? 'You' : 'User'))}</span></div>
                    </div>
                    <div className="chat-header text-[11px] opacity-50 mb-1 px-1">{isMe ? 'You' : (msg.sender?.name || 'Team Member')}</div>
                    
                    <div className="relative flex items-center gap-2">
                      {/* 🚀 FIXED: Subtle moderation delete action button overlay controls */}
                      {!msg.id.startsWith("temp-") && canDelete && (
                        <button
                          onClick={() => handleMessageDeletion(msg.id)}
                          className={`btn btn-ghost btn-xs text-error opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 min-h-0 h-6 w-6 rounded-md ${
                            isMe ? 'order-first' : 'order-last'
                          }`}
                          title="Purge message record node"
                        >
                          🗑️
                        </button>
                      )}
                      
                      <div className={`chat-bubble text-xs max-w-md ${isMe ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content'}`}>{msg.body}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <footer className="p-3 border-t border-base-300 bg-base-100">
              <form className="flex gap-2 items-center" onSubmit={handleMessageDispatch}>
                <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} disabled={isPending} placeholder="Type secure company message text..." className="input input-bordered flex-1 bg-base-100 text-sm focus:outline-primary" />
                <button type="submit" disabled={isPending || !messageText.trim()} className="btn btn-primary btn-sm h-10 px-5">Send</button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-base-content/40 bg-base-200/5 p-4">
            <p className="text-center font-medium">Select a discussion or browse your search index to start a channel link thread.</p>
          </div>
        )}
      </main>

      <CreateGroupModal isOpen={groupModalOpen} onClose={() => setGroupModalOpen(false)} currentUserId={currentUserId} organizationId={organizationId} onGroupCreated={async (newGroupId) => { await refreshWorkspaceChats(newGroupId); }} />
    </div>
  );
}