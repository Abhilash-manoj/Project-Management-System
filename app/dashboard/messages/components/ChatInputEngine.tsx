"use client";

import React, { useState } from "react";
import { MentionsInput, Mention } from "react-mentions";

interface Member {
  id: string;
  name: string;
}

interface ChatInputProps {
  teamMembers: Member[];
  onSendMessage: (text: string, mentionedUserIds: string[]) => void;
}

export default function ChatInputEngine({ teamMembers, onSendMessage }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);

  // Format the users collection into the structure react-mentions expects
  const mentionSuggestions = teamMembers.map(m => ({
    id: m.id,
    display: m.name
  }));

  const handleSend = () => {
    if (!value.trim()) return;
    
    // Dispatch text and extracted mention IDs up to your server action handler
    onSendMessage(value, mentions);
    
    // Reset inputs
    setValue("");
    setMentions([]);
  };

  return (
    <div className="flex items-end gap-2 p-3 bg-base-100 border-t border-base-300">
      <div className="flex-1 min-h-[40px] bg-base-200 rounded-xl px-3 py-2 text-xs font-semibold focus-within:ring-2 focus-within:ring-primary focus-within:bg-base-100 transition-all text-left">
        <MentionsInput
          value={value}
          onChange={(e, newValue, newPlainText, mentionsList) => {
            setValue(newValue);
            setMentions(mentionsList.map(m => m.id));
          }}
          className="mentions-input-field w-full outline-none resize-none bg-transparent"
          placeholder="Type a message, use @ to mention someone..."
        >
          <Mention
            trigger="@"
            data={mentionSuggestions}
            markup="@[__display__](__id__)" // 🚀 CRITICAL: Encodes as: @[Tony Stark](user_id_here)
            className="bg-primary/20 text-primary font-bold rounded px-1"
          />
        </MentionsInput>
      </div>
      
      <button onClick={handleSend} className="btn btn-primary btn-sm rounded-xl font-bold">
        Send
      </button>
    </div>
  );
}