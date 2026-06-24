// app/dashboard/tasks/components/TaskComments.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { getTaskComments, createTaskComment } from '@/app/actions/comments';
import MessageAttachmentButton from '@/app/dashboard/messages/components/MessageAttachmentButton';
import AttachmentPreviewList from '@/app/dashboard/messages/components/Attachmentpreviewlist'; // 🚀 FIXED: Casing standardized to match components layout file spec
import { Send, ShieldAlert, FileText, Download } from 'lucide-react';

interface TaskCommentsProps {
  taskId: string;
  currentUserId: string;
}

export default function TaskComments({ taskId, currentUserId }: TaskCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [isPending, startTransition] = useTransition();
  const [serverFeedback, setServerFeedback] = useState<string | null>(null);

  const loadComments = async () => {
    const data = await getTaskComments(taskId);
    setComments(data);
  };

  useEffect(() => {
    if (taskId) {
      loadComments();
      setServerFeedback(null); 
      setAttachments([]); // Flush attachments queue when switching task frames
    }
  }, [taskId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() && attachments.length === 0) return;

    const messageToSend = newCommentText.trim();
    const targetFileUrls = attachments.map(a => a.url);

    setNewCommentText('');
    setAttachments([]);
    setServerFeedback(null); 

    const optimisticPayload = {
      id: `temp-${Date.now()}`,
      body: messageToSend,
      createdAt: new Date(),
      attachments: targetFileUrls,
      author: { id: currentUserId, name: "You", avatarUrl: null }
    };
    setComments(prev => [...prev, optimisticPayload]);

    startTransition(async () => {
      const result = await createTaskComment(taskId, messageToSend, targetFileUrls);
      
      if (result && "error" in result && result.error) {
        setServerFeedback(result.error);
        setComments(prev => prev.filter(c => c.id !== optimisticPayload.id));
      } else {
        await loadComments(); 
      }
    });
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
      return lastPart.replace(/^\d+-/, ''); // Remove historical timestamp prefixes
    } catch {
      return "Linked File Document";
    }
  };

  const getInitials = (name: string) => 
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';

  return (
    <div className="space-y-4 font-sans text-sm mt-6 border-t border-base-200 pt-4 text-left">
      <h4 className="font-bold opacity-60 uppercase text-[11px] tracking-wider">
        Comments ({comments.length})
      </h4>

      {serverFeedback && (
        <div className="alert alert-error bg-error/10 border-error/20 text-error text-xs rounded-xl py-2.5 px-3 flex items-start gap-2 font-semibold animate-fade-in">
          <ShieldAlert className="h-4 w-4 shrink-0 stroke-[2.2]" />
          <div className="flex-1">
            <span className="font-bold block text-neutral">Action Refused</span>
            <span className="text-neutral/70 font-medium">{serverFeedback}</span>
          </div>
        </div>
      )}

      {/* Render Comment Timeline Stream */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs opacity-40 italic">No comments submitted yet. Start the conversation below.</p>
        ) : (
          comments.map((comment) => {
            const isMe = comment.author?.id === currentUserId;

            return (
              <div key={comment.id} className="flex gap-3 items-start text-xs bg-base-200/40 p-3 rounded-xl border border-base-200">
                
                <div className="avatar placeholder shrink-0">
                  <div className="bg-neutral text-neutral-content font-bold rounded-full h-7 w-7 overflow-hidden flex items-center justify-center text-[10px] select-none border border-base-300/40">
                    {comment.author?.avatarUrl ? (
                      <img src={comment.author.avatarUrl} alt={`${comment.author.name}'s comment image`} className="object-cover w-full h-full" />
                    ) : (
                      <span>{getInitials(comment.author?.name || "User")}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-base-content/90">{isMe ? "You" : comment.author?.name || "User"}</span>
                    <span className="text-[10px] opacity-40">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {comment.body && <p className="text-base-content/80 leading-relaxed break-words">{comment.body}</p>}

                  {/* Render inline private attachments inside comments bubble frame */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-base-300/60 max-w-sm">
                      {comment.attachments.map((url: string, index: number) => {
                        const fName = getFileNameFromUrl(url);
                        return isImageUrl(url) ? (
                          <div key={index} className="rounded-xl overflow-hidden border border-base-300 shadow-3xs max-w-xs bg-base-100 mt-0.5">
                            <img src={url} alt="Attached Comment Asset" className="object-cover w-full h-auto max-h-40" />
                          </div>
                        ) : (
                          <a 
                            key={index} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center justify-between gap-3 p-2 bg-base-100 hover:bg-base-200 border border-base-300 rounded-xl shadow-3xs transition-all font-semibold text-base-content"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-3.5 w-3.5 shrink-0 opacity-70 text-primary" />
                              <span className="truncate text-[11px]">{fName}</span>
                            </div>
                            <Download className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Comment Form Input controls */}
      {/* 🚀 FIXED: Standardized form container layout card for structural separation */}
      <div className="card border border-base-300 bg-base-200/40 rounded-xl overflow-hidden shadow-2xs w-full mt-2">
        <AttachmentPreviewList 
          files={attachments} 
          onRemove={(index) => setAttachments(p => p.filter((_, i) => i !== index))} 
        />
        
        <form onSubmit={handleSubmit} className="flex gap-2 items-center p-2 bg-base-100 relative w-full">
          <MessageAttachmentButton 
            onUploadSuccess={(url, name) => setAttachments(p => [...p, { url, name }])}
            disabled={isPending}
          />
          
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              disabled={isPending}
              placeholder="Add a comment, attach files or request changes..."
              className="input input-bordered input-sm w-full bg-base-200 rounded-xl text-xs focus:outline-primary pr-10 h-9 text-neutral"
            />
            <button
              type="submit"
              disabled={isPending || (!newCommentText.trim() && attachments.length === 0)}
              className="btn btn-ghost btn-sm rounded-xl h-7 w-7 p-0 min-h-0 flex items-center justify-center absolute right-1.5 border-none text-primary hover:bg-base-300 cursor-pointer transition-colors"
              title="Send comment"
            >
              <Send className="h-3.5 w-3.5 stroke-[2.2]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}