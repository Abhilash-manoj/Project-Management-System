// app/dashboard/tasks/components/TaskComments.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { getTaskComments, createTaskComment } from '@/app/actions/comments';
import { Send } from 'lucide-react';

interface TaskCommentsProps {
  taskId: string;
  currentUserId: string;
}

export default function TaskComments({ taskId, currentUserId }: TaskCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const loadComments = async () => {
    const data = await getTaskComments(taskId);
    setComments(data);
  };

  useEffect(() => {
    if (taskId) loadComments();
  }, [taskId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const messageToSend = newCommentText.trim();
    setNewCommentText('');

    // Optimistic UI update for immediate response feel
    const optimisticPayload = {
      id: `temp-${Date.now()}`,
      body: messageToSend,
      createdAt: new Date(),
      author: { id: currentUserId, name: "You" }
    };
    setComments(prev => [...prev, optimisticPayload]);

    startTransition(async () => {
      const result = await createTaskComment(taskId, messageToSend);
      if (result.error) {
        console.error(result.error);
      }
      await loadComments(); // Re-sync accurate ids and dates from DB
    });
  };

  const getInitials = (name: string) => 
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';

  return (
    <div className="space-y-4 font-sans text-sm mt-6 border-t border-base-200 pt-4">
      <h4 className="font-bold opacity-60 uppercase text-[11px] tracking-wider">
        Comments ({comments.length})
      </h4>

      {/* Render Comment Timeline Stream */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs opacity-40 italic">No comments submitted yet. Start the conversation below.</p>
        ) : (
          comments.map((comment) => {
            const isMe = comment.author.id === currentUserId;
            return (
              <div key={comment.id} className="flex gap-3 items-start text-xs bg-base-200/40 p-3 rounded-xl border border-base-200">
                <div className="avatar placeholder shrink-0">
                  <div className="bg-primary/10 text-primary font-bold rounded-full h-7 w-7 flex items-center justify-center text-[10px]">
                    <span>{getInitials(comment.author.name)}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-bold text-base-content/90">{isMe ? "You" : comment.author.name}</span>
                    <span className="text-[10px] opacity-40">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-base-content/80 leading-relaxed break-words">{comment.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Comment Form Input controls */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center relative mt-2">
        <input
          type="text"
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          disabled={isPending}
          placeholder="Add a comment..."
          className="input input-bordered input-sm flex-1 bg-base-100 rounded-xl text-xs focus:outline-primary pr-10 h-9"
        />
        <button
          type="submit"
          disabled={isPending || !newCommentText.trim()}
          className="btn btn-primary btn-sm rounded-xl h-9 w-9 p-0 min-h-0 flex items-center justify-center absolute right-0 border-none bg-transparent text-primary hover:bg-base-200"
          title="Send comment"
        >
          <Send className="h-4 w-4 stroke-[2.2]" />
        </button>
      </form>
    </div>
  );
}