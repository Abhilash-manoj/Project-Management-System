// app/dashboard/messages/components/ChatWorkspaceCanvas.tsx
"use client";

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { getUserConversations, sendMessage, getOrCreatePrivateChat, deleteMessageAction, getConversationMessages } from '@/app/actions/communication';
import { searchCompanyDirectory } from '@/app/actions/directory'; // 🚀 FIXED: Removed old getMembershipRoleAction import reference
import CreateGroupModal from "./CreateGroupModal";
import GroupInfoSidebar from "./GroupInfoSidebar"; 
import MessageAttachmentButton from "./MessageAttachmentButton";
import AttachmentPreviewList from "./Attachmentpreviewlist"; // 🚀 FIXED: Standardized case-sensitivity path naming to match components specs
import PusherClient from 'pusher-js';
import { MentionsInput, Mention } from 'react-mentions'; 
import { Info, Download, FileText } from 'lucide-react'; 

interface ChatWorkspaceCanvasProps {
  currentUserId: string;
  organizationId: string;
}

export default function ChatWorkspaceCanvas({ currentUserId, organizationId }: ChatWorkspaceCanvasProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [activeChatMessages, setActiveChatMessages] = useState<any[]>([]);
  
  const [messageText, setMessageText] = useState<string>('');
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]); 
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  
  const [userRole, setUserRole] = useState<string>("EMPLOYEE");
  const [groupModalOpen, setGroupModalOpen] = useState<boolean>(false);
  const [showGroupSidebar, setShowGroupSidebar] = useState<boolean>(false); 

  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      try {
        // 🚀 FIXED: Direct dynamic fetch handshake targeting the new micro-route endpoint
        const response = await fetch(`/api/membership?orgId=${organizationId}&userId=${currentUserId}`);
        if (!response.ok) throw new Error("HTTP Handshake failed");
        
        const result = await response.json();
        if (result?.role) {
          setUserRole(result.role);
        }
      } catch (err) {
        console.error("Failed to resolve dynamic workspace permissions, falling back to lower privileges:", err);
        setUserRole("EMPLOYEE");
      }
    }
    
    resolveActiveWorkspacePermissions();
  }, [currentUserId, organizationId]);

  useEffect(() => {
    if (!activeChatId) return;

    async function loadActiveChannelMessages() {
      try {
        const fullHistory = await getConversationMessages(activeChatId, currentUserId);
        setActiveChatMessages(fullHistory);

        setConversations(prev => prev.map(chat => 
          chat.id === activeChatId && chat.unreadCount > 0 ? { ...chat, unreadCount: 0 } : chat
        ));
      } catch (err) {
        console.error("Failed to load historical database logs:", err);
      }
    }

    loadActiveChannelMessages();
    setAttachments([]); 
  }, [activeChatId, currentUserId]);

  useEffect(() => {
    if (conversations.length === 0) return;

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    });

    const activeSubscriptions: string[] = [];

    conversations.forEach(chat => {
      const targetChannel = `chat-${chat.id}`;
      const channel = pusher.subscribe(targetChannel);
      activeSubscriptions.push(targetChannel);
      
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

      channel.bind("message-deleted", (data: { messageId: string }) => {
        if (chat.id === activeChatId) {
          setActiveChatMessages((prev) => prev.filter(msg => msg.id !== data.messageId));
        }
        refreshWorkspaceChats(activeChatId || null);
      });
    });

    return () => {
      activeSubscriptions.forEach(channelName => {
        pusher.unsubscribe(channelName);
      });
      pusher.disconnect(); 
    };
  }, [conversations.map(c => c.id).join(','), activeChatId, currentUserId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages]);

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
    if ((!messageText.trim() && attachments.length === 0) || !activeChatId) return;

    const targetedChatId = activeChatId;
    const bodyContent = messageText.trim();
    const targetFileUrls = attachments.map(a => a.url);

    setMessageText('');
    setAttachments([]); 

    const temporaryLocalEchoId = `temp-${Date.now()}`;
    const optimisticEchoPayload = {
      id: temporaryLocalEchoId,
      body: bodyContent,
      senderId: currentUserId,
      createdAt: new Date(),
      attachments: targetFileUrls, 
      sender: { id: currentUserId, name: "You", avatarUrl: previewUrlFallback() }
    };
    
    setActiveChatMessages(prev => [...prev, optimisticEchoPayload]);

    function previewUrlFallback() {
      const activeMe = conversations.flatMap(c => c.participants).find(p => p?.user?.id === currentUserId);
      return activeMe?.user?.avatarUrl || null;
    }

    startTransition(async () => {
      try {
        await sendMessage(targetedChatId, currentUserId, bodyContent, targetFileUrls);
      } catch (error) {
        console.error("Message process breakdown:", error);
        setActiveChatMessages(prev => prev.filter(m => m.id !== temporaryLocalEchoId));
      }
    });
  };

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

  const renderMessageContentWithHighlights = (textBody: string, isMe: boolean) => {
    if (!textBody) return "";
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const segments = [];
    let lastCursor = 0;
    let matchItem;

    while ((matchItem = mentionRegex.exec(textBody)) !== null) {
      const [fullMatch, displayName, userId] = matchItem;
      const matchIndex = matchItem.index;

      if (matchIndex > lastCursor) {
        segments.push(textBody.substring(lastCursor, matchIndex));
      }

      segments.push(
        <span 
          key={`${userId}-${matchIndex}`} 
          className={`font-bold px-1 rounded select-all ${
            isMe 
              ? 'text-white bg-white/20' 
              : 'text-primary bg-primary/10'
          }`}
        >
          @{displayName}
        </span>
      );
      lastCursor = mentionRegex.lastIndex;
    }

    if (lastCursor < textBody.length) {
      segments.push(textBody.substring(lastCursor));
    }

    return segments.length > 0 ? segments : textBody;
  };

  const isImageUrl = (url: string) => {
    const cleanUrl = url.split(/[?#]/)[0];
    return /\.(jpeg|jpg|gif|png|webp|avif)$/i.test(cleanUrl);
  };

  const getFileNameFromUrl = (url: string) => {
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart.replace(/^\d+-/, ''); 
    } catch {
      return "Linked Shared Document File";
    }
  };

  const cleanPreviewText = (text: string) => {
    if (!text) return "No messages yet";
    return text.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '@$1');
  };

  const currentChat = conversations.find(c => c.id === activeChatId);
  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';
  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const directMessages = sortedConversations.filter(c => !c.isGroup);
  const groupChannels = sortedConversations.filter(c => c.isGroup);

  const activeDirectoryMembers = currentChat && currentChat.participants
    ? currentChat.participants.map((p: any) => ({
        id: p.user.id,
        display: p.user.name,
      }))
    : [];

  const peerUserObject = currentChat?.participants?.find((p: any) => p.user.id !== currentUserId)?.user;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden border border-base-300 bg-base-100 text-base-content rounded-box text-left">
      
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
                searchResults.map(user => {
                  const searchInitials = getInitials(user.name);
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUserToChat(user.id)}
                      className="w-full text-left p-1.5 hover:bg-base-200 rounded-btn text-xs flex items-center gap-2.5"
                    >
                      <div className="avatar placeholder shrink-0">
                        <div className="h-7 w-7 bg-neutral text-neutral-content font-bold rounded-full overflow-hidden flex items-center justify-center text-[10px] border border-base-300">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={`${user.name}'s lookups`} className="object-cover w-full h-full" />
                          ) : (
                            <span>{searchInitials}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold truncate">{user.name}</span>
                        <span className="opacity-50 text-[10px] truncate">{user.email}</span>
                      </div>
                    </button>
                  );
                })
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
                    
                    <div className="avatar placeholder placeholder-xs shrink-0">
                      <div className="bg-neutral text-neutral-content font-bold rounded-full w-8 h-8 text-xs flex items-center justify-center overflow-hidden border border-base-300/30">
                        {peer?.avatarUrl ? (
                          <img src={peer.avatarUrl} alt={peer.name} className="object-cover w-full h-full" />
                        ) : (
                          <span>{getInitials(peer?.name || 'User')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="text-xs font-semibold truncate">{peer?.name || 'Team Member'}</div>
                      <p className={`text-[11px] truncate ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                        {cleanPreviewText(chat.messages?.[0]?.body || (chat.messages?.[0]?.attachments?.length ? "📁 Shared attachment file" : ""))}
                      </p>
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
                <div className="p-2 text-p-2 text-[11px] opacity-40 italic px-2">No group channels created yet.</div>
              ) : (
                groupChannels.map((chat) => {
                  const isSelected = chat.id === activeChatId;
                  return (
                    <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`p-2 rounded-btn cursor-pointer transition-colors flex items-center gap-3 relative ${isSelected ? 'bg-primary text-primary-content font-medium shadow-sm' : 'hover:bg-base-200/60'}`}>
                      <div className="avatar placeholder placeholder-xs shrink-0">
                        <div className="bg-base-300 text-base-content rounded-md w-8 h-8 text-xs font-bold flex items-center justify-center"><span>#</span></div>
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="text-xs font-semibold truncate">{chat.name || "Unnamed Channel"}</div>
                        <p className={`text-[11px] truncate ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                          {cleanPreviewText(chat.messages?.[0]?.body || (chat.messages?.[0]?.attachments?.length ? "📁 Shared attachment file" : ""))}
                        </p>
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
            <div className="p-4 border-b border-base-300 bg-base-100 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                
                <div className="avatar placeholder shrink-0">
                  <div className="bg-neutral text-neutral-content font-bold rounded-full w-9 h-9 text-xs flex items-center justify-center overflow-hidden border border-base-300">
                    {currentChat.isGroup ? (
                      <span>#</span>
                    ) : peerUserObject?.avatarUrl ? (
                      <img src={peerUserObject.avatarUrl} alt={peerUserObject.name} className="object-cover w-full h-full" />
                    ) : (
                      <span>{getInitials(peerUserObject?.name || 'User')}</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-base text-base-content block leading-none">{currentChat.isGroup ? currentChat.name : peerUserObject?.name}</span>
                  <span className="text-[10px] opacity-50 mt-1 block">Active now</span>
                </div>
              </div>

              {currentChat.isGroup && (
                <button 
                  onClick={() => setShowGroupSidebar(!showGroupSidebar)}
                  className={`btn btn-ghost btn-sm rounded-xl px-2 h-9 border border-transparent ${showGroupSidebar ? 'bg-base-300 text-primary border-base-300' : ''}`}
                  title="Toggle channel participant card drawer"
                >
                  <Info className="h-4 w-4 stroke-[2.2]" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200/10">
              {activeChatMessages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";
                const canDelete = isMe || isPrivileged;

                return (
                  <div key={msg.id} className={`chat ${isMe ? 'chat-end' : 'chat-start'} group/bubble relative`}>
                    
                    <div className="chat-image avatar placeholder shrink-0">
                      <div className="bg-neutral text-neutral-content font-bold rounded-full w-8 h-8 text-[10px] flex items-center justify-center overflow-hidden border border-base-300/30">
                        {msg.sender?.avatarUrl ? (
                          <img src={msg.sender.avatarUrl} alt={msg.sender.name} className="object-cover w-full h-full" />
                        ) : (
                          <span>{getInitials(msg.sender?.name || (isMe ? 'You' : 'User'))}</span>
                        )}
                      </div>
                    </div>
                    <div className="chat-header text-[11px] opacity-50 mb-1 px-1">{isMe ? 'You' : (msg.sender?.name || 'Team Member')}</div>
                    
                    <div className="relative flex items-center gap-2">
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
                      
                      <div className={`chat-bubble text-xs max-w-md leading-relaxed whitespace-pre-wrap flex flex-col gap-2 ${
                        isMe ? 'bg-primary text-white font-medium' : 'bg-base-200 text-base-content'
                      }`}>
                        {msg.body && <div>{renderMessageContentWithHighlights(msg.body, isMe)}</div>}

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-col gap-1.5 pt-1 border-t border-current/10 min-w-[180px] max-w-sm">
                            {msg.attachments.map((url: string, index: number) => {
                              const fName = getFileNameFromUrl(url);
                              return isImageUrl(url) ? (
                                <div key={index} className="rounded-xl overflow-hidden border border-base-300 shadow-2xs max-w-xs bg-base-100">
                                  <img src={url} alt="Attached Timeline Graphic" className="object-cover w-full h-auto max-h-48" />
                                </div>
                              ) : (
                                <a 
                                  key={index} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className={`flex items-center justify-between gap-3 p-2 border rounded-xl shadow-3xs transition-all font-semibold ${
                                    isMe 
                                      ? "bg-white/10 hover:bg-white/20 border-white/20 text-white" 
                                      : "bg-base-100 hover:bg-base-200 border-base-300 text-base-content"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="h-4 w-4 shrink-0 opacity-80" />
                                    <span className="truncate text-[11px]">{fName}</span>
                                  </div>
                                  <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <footer className="p-3 border-t border-base-300 bg-base-100 font-sans">
              <div className="card border border-base-300 bg-base-200/40 rounded-xl overflow-hidden shadow-2xs max-w-5xl">
                <AttachmentPreviewList 
                  files={attachments} 
                  onRemove={(index) => setAttachments(p => p.filter((_, i) => i !== index))} 
                />
                
                <form className="flex gap-2 items-center p-2 bg-base-100" onSubmit={handleMessageDispatch}>
                  <MessageAttachmentButton 
                    onUploadSuccess={(url, name) => setAttachments(p => [...p, { url, name }])} 
                    disabled={isPending}
                  />

                  <div className="flex-1 bg-base-200 rounded-xl px-3 py-2 text-xs font-semibold focus-within:ring-2 focus-within:ring-primary focus-within:bg-base-100 transition-all text-left relative">
                    <MentionsInput
                      value={messageText}
                      onChange={(e, newValue) => setMessageText(newValue)}
                      disabled={isPending}
                      placeholder="Type a message, use @ to mention someone..."
                      a11ySuggestionsListLabel="Suggested teammates for mention"
                      className="w-full text-xs font-semibold outline-none bg-transparent"
                      style={{
                        control: {
                          fontSize: 12,
                          lineHeight: '20px',
                          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
                          minHeight: '20px',
                        },
                        input: {
                          margin: 0,
                          padding: 0,
                          border: '0px solid transparent',
                          outline: 'none',
                          fontSize: 12,
                          lineHeight: '20px',
                          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
                        },
                        highlighter: {
                          margin: 0,
                          padding: 0,
                          border: '0px solid transparent',
                          fontSize: 12,
                          lineHeight: '20px',
                          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
                          boxSizing: 'border-box',
                        },
                        suggestions: {
                          list: {
                            backgroundColor: 'var(--fallback-b1,oklch(var(--b1)))',
                            border: '1px solid var(--fallback-b3,oklch(var(--b3)))',
                            borderRadius: '0.75rem',
                            fontSize: 12,
                            padding: '0.25rem',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            marginBottom: '0.5rem',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 50,
                            minWidth: '220px',
                          },
                          item: {
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.5rem',
                            '&focused': {
                              backgroundColor: 'var(--fallback-p,oklch(var(--p)))',
                              color: 'var(--fallback-pc,oklch(var(--pc)))',
                              fontWeight: 'bold',
                            },
                          },
                        },
                      }}
                    >
                      <Mention
                        trigger="@"
                        data={activeDirectoryMembers} 
                        markup="@[__display__](__id__)"
                        displayTransform={(id, display) => `@${display}`} 
                        className="text-primary font-bold bg-transparent" 
                      />
                    </MentionsInput>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isPending || (!messageText.trim() && attachments.length === 0)} 
                    className="btn btn-primary btn-sm h-9 px-5 font-bold rounded-xl cursor-pointer shadow-xs active:scale-[0.98] transition-all shrink-0"
                  >
                    Send
                  </button>
                </form>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-base-content/40 bg-base-200/5 p-4">
            <p className="text-center font-medium">Select a discussion or browse your search index to start a channel link thread.</p>
          </div>
        )}
      </main>

      {currentChat && currentChat.isGroup && showGroupSidebar && (
        <GroupInfoSidebar
          conversation={currentChat}
          currentUserId={currentUserId}
          onClose={() => setShowGroupSidebar(false)}
          onGroupModified={async () => {
            setShowGroupSidebar(false);
            setActiveChatId(''); 
            await refreshWorkspaceChats(null);
          }}
        />
      )}

      <CreateGroupModal isOpen={groupModalOpen} onClose={() => setGroupModalOpen(false)} currentUserId={currentUserId} organizationId={organizationId} onGroupCreated={async (newGroupId) => { await refreshWorkspaceChats(newGroupId); }} />
    </div>
  );
}