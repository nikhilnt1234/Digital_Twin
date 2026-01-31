/**
 * Lens Voice Panel - Health Coach chat interface
 * Matching the Mirror's ConversationRail style exactly
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLensVoiceBridge, LensMessage } from '../voice/useLensVoiceBridge';

export interface LensVoicePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Status chip matching mirror's MirrorStatusChip
const StatusChip: React.FC<{ status: string; isMicEnabled: boolean; updatedField?: string }> = ({ status, isMicEnabled, updatedField }) => {
  if (status === 'updated' && updatedField) {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-full">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-emerald-300 text-sm font-medium">{updatedField} logged</span>
      </div>
    );
  }

  const config = {
    connecting: { label: 'Connecting...', color: 'bg-amber-500', pulse: true, icon: '⏳' },
    connected: { label: isMicEnabled ? 'Listening...' : 'Mic Muted', color: isMicEnabled ? 'bg-emerald-500' : 'bg-rose-500', pulse: isMicEnabled, icon: isMicEnabled ? '🎙️' : '🔇' },
    speaking: { label: 'Coach speaking...', color: 'bg-violet-500', pulse: true, icon: '🔊' },
    error: { label: 'Error', color: 'bg-rose-500', pulse: false, icon: '⚠️' },
    idle: { label: 'Ready to connect', color: 'bg-slate-400', pulse: false, icon: '💬' },
  }[status] || { label: 'Ready', color: 'bg-slate-400', pulse: false, icon: '💬' };

  return (
    <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full shadow-md">
      <div className={`w-2.5 h-2.5 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-white text-sm font-medium drop-shadow-md">{config.label}</span>
    </div>
  );
};

export const LensVoicePanel: React.FC<LensVoicePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<LensMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'updated' | 'error'>('idle');
  const [updatedField, setUpdatedField] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleMessageReceived = useCallback((message: LensMessage) => {
    console.log('[LensVoicePanel] Message received:', message);
    setMessages(prev => [...prev, message]);
  }, []);

  const handleStatusChange = useCallback((newStatus: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error') => {
    console.log('[LensVoicePanel] Status changed:', newStatus);
    if (newStatus === 'connected') {
      setStatus('connected');
    } else if (newStatus === 'connecting') {
      setStatus('connecting');
    } else if (newStatus === 'error') {
      setStatus('error');
    } else {
      setStatus(newStatus);
    }
  }, []);

  const handleSessionEnd = useCallback(() => {
    setStatus('idle');
    // Add a goodbye message
    const id = `lens-${++messageIdCounter.current}`;
    setMessages(prev => [...prev, {
      id,
      speaker: 'lens',
      text: "Great talking with you! Remember, small consistent changes lead to big results. See you next time!",
      timestamp: Date.now(),
    }]);
  }, []);

  const {
    isConnected,
    isConnecting,
    isMicEnabled,
    error,
    connect,
    disconnect,
    toggleMic,
  } = useLensVoiceBridge({
    onMessageReceived: handleMessageReceived,
    onStatusChange: handleStatusChange,
    onSessionEnd: handleSessionEnd,
  });

  const handleClose = () => {
    if (isConnected) {
      disconnect();
    }
    setMessages([]);
    setStatus('idle');
    onClose();
  };

  const handleConnect = async () => {
    // Add welcome message when connecting
    const id = `lens-${++messageIdCounter.current}`;
    setMessages([{
      id,
      speaker: 'lens',
      text: "Hi! I'm your Health Coach. Ask me anything about your health data, get personalized insights, or discuss wellness goals. What would you like to know?",
      timestamp: Date.now(),
    }]);
    await connect();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[140] bg-black/30"
        onClick={handleClose}
      />

      {/* Panel - Matching Mirror's ConversationRail exactly */}
      <div
        className="fixed right-6 top-1/2 -translate-y-1/2 w-96 z-[150] flex flex-col"
        style={{
          background: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          maxHeight: '70vh',
        }}
      >
        {/* Header - Matching mirror style */}
        <div className="p-4 border-b border-white/15 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-white font-semibold drop-shadow-lg">Health Coach</span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages - Matching mirror's ConversationRail */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" style={{ minHeight: '300px' }}>
          {!isConnected && !isConnecting && messages.length === 0 ? (
            /* Welcome State */
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2 drop-shadow-lg">Talk to Health Coach</h3>
              <p className="text-white/60 text-sm mb-4 max-w-xs">
                Get personalized insights about your health data and wellness guidance.
              </p>
              {error && (
                <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-sm text-rose-300 max-w-xs">
                  {error}
                </div>
              )}
              <button
                onClick={handleConnect}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Start Conversation
              </button>
            </div>
          ) : (
            /* Chat Messages - Exact mirror style */
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                      msg.speaker === 'lens'
                        ? 'bg-white/15 text-white'
                        : 'bg-emerald-500/40 text-white'
                    }`}
                  >
                    <div className="text-xs text-white/70 mb-1 drop-shadow-sm">
                      {msg.speaker === 'lens' ? 'Health Coach' : 'You'}
                    </div>
                    <div className="text-sm leading-relaxed drop-shadow-md">{msg.text}</div>
                  </div>
                </div>
              ))}

              {/* Connecting/thinking indicator */}
              {isConnecting && (
                <div className="flex justify-start">
                  <div className="bg-white/15 rounded-2xl px-4 py-3 shadow-md">
                    <div className="text-xs text-white/70 mb-1">Health Coach</div>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Connected hint when no messages yet */}
              {isConnected && messages.length === 1 && (
                <div className="text-center text-white/50 text-xs py-2">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connected — start speaking
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Status Chip - Matching mirror */}
        <div className="p-4 border-t border-white/15 flex flex-col gap-3 shrink-0">
          <div className="flex justify-center">
            <StatusChip 
              status={isConnecting ? 'connecting' : isConnected ? 'connected' : status} 
              isMicEnabled={isMicEnabled}
              updatedField={updatedField}
            />
          </div>

          {/* Controls - only show when connected */}
          {(isConnected || isConnecting) && (
            <div className="flex items-center justify-center gap-3">
              {/* Mic Toggle - matching mirror */}
              <button
                onClick={toggleMic}
                disabled={!isConnected}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                  isMicEnabled
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-rose-500 hover:bg-rose-600'
                } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isMicEnabled ? (
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </button>

              {/* End Session */}
              <button
                onClick={() => {
                  disconnect();
                  setStatus('idle');
                }}
                disabled={!isConnected && !isConnecting}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                End Session
              </button>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="text-center text-rose-300 text-xs bg-rose-500/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LensVoicePanel;
