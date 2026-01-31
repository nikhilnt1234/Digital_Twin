/**
 * ConversationRail - Right side transcript panel
 */

import React, { useRef, useEffect } from 'react';
import { MirrorStatusChip, StatusType } from './MirrorStatusChip';

export interface ConversationMessage {
  id: string;
  speaker: 'nova' | 'user';
  text: string;
  timestamp: number;
}

interface ConversationRailProps {
  messages: ConversationMessage[];
  currentQuestion: number;
  totalQuestions: number;
  status: StatusType;
  updatedField?: string;
}

export const ConversationRail: React.FC<ConversationRailProps> = ({
  messages,
  currentQuestion,
  totalQuestions,
  status,
  updatedField,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className="fixed right-6 top-1/2 -translate-y-1/2 w-80 z-10 flex flex-col"
      style={{
        background: 'rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        maxHeight: '70vh',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/15 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="text-white font-semibold drop-shadow-lg">Nova Check-in</span>
        </div>
        <div className="bg-white/15 px-3 py-1 rounded-full shadow-md">
          <span className="text-white text-sm font-medium drop-shadow-md">
            {currentQuestion}/{totalQuestions}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                msg.speaker === 'nova'
                  ? 'bg-white/15 text-white'
                  : 'bg-violet-500/40 text-white'
              }`}
            >
              <div className="text-xs text-white/70 mb-1 drop-shadow-sm">
                {msg.speaker === 'nova' ? 'Nova' : 'You'}
              </div>
              <div className="text-sm leading-relaxed drop-shadow-md">{msg.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Chip */}
      <div className="p-4 border-t border-white/15 flex justify-center shrink-0">
        <MirrorStatusChip status={status} updatedField={updatedField} />
      </div>
    </div>
  );
};

export default ConversationRail;
