/**
 * Lens Voice Panel - Voice-enabled health coaching for BodyTwin UI
 * Beautiful chat interface similar to the Mirror conversation rail
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLensVoiceBridge, LensMessage } from '../voice/useLensVoiceBridge';

export interface LensVoicePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Status chip component
const StatusChip: React.FC<{ status: string; isMicEnabled: boolean }> = ({ status, isMicEnabled }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return { label: 'Connecting...', color: 'bg-amber-500', pulse: true };
      case 'connected':
        return { label: isMicEnabled ? 'Listening...' : 'Mic Muted', color: isMicEnabled ? 'bg-emerald-500' : 'bg-rose-500', pulse: isMicEnabled };
      case 'speaking':
        return { label: 'Speaking...', color: 'bg-violet-500', pulse: true };
      case 'error':
        return { label: 'Error', color: 'bg-rose-500', pulse: false };
      default:
        return { label: 'Ready', color: 'bg-slate-500', pulse: false };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-white/80 text-sm font-medium">{config.label}</span>
    </div>
  );
};

export const LensVoicePanel: React.FC<LensVoicePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<LensMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleMessageReceived = useCallback((message: LensMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const handleStatusChange = useCallback((newStatus: typeof status) => {
    setStatus(newStatus);
  }, []);

  const handleSessionEnd = useCallback(() => {
    setStatus('idle');
    // Add a goodbye message
    setMessages(prev => [...prev, {
      id: `lens-end-${Date.now()}`,
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
    setMessages([{
      id: `lens-welcome-${Date.now()}`,
      speaker: 'lens',
      text: "Hi! I'm your Health Coach. I can help you understand your health data, answer questions about your metrics, and provide personalized wellness advice. What would you like to know?",
      timestamp: Date.now(),
    }]);
    await connect();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div 
        className="relative w-full max-w-md flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(16, 24, 48, 0.95), rgba(10, 15, 30, 0.98))',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(16, 185, 129, 0.1)',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Health Coach</h2>
              <p className="text-emerald-400/80 text-xs font-medium">AI-Powered Wellness Advisor</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0 p-4">
          {!isConnected && !isConnecting ? (
            /* Welcome State */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              {/* Animated Rings */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>
                {/* Orbiting dots */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400/60" />
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-teal-400/60" />
                </div>
              </div>

              <h3 className="text-white font-semibold text-lg mb-2">Ready to Chat</h3>
              <p className="text-white/50 text-sm mb-6 max-w-xs leading-relaxed">
                Get personalized insights about your health data, ask questions, and receive wellness guidance.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-sm text-rose-300 max-w-xs">
                  {error}
                </div>
              )}

              <button
                onClick={handleConnect}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Start Conversation
              </button>

              {/* Feature hints */}
              <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-xs">
                {[
                  { icon: '💬', label: 'Ask Questions' },
                  { icon: '📊', label: 'Data Insights' },
                  { icon: '🎯', label: 'Get Tips' },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-white/40 text-[10px] font-medium">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Chat State */
            <>
              {/* Messages */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2"
                style={{ minHeight: '300px', maxHeight: '400px' }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.speaker === 'lens' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-2 shrink-0 shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                        msg.speaker === 'lens'
                          ? 'bg-white/10 text-white rounded-tl-md'
                          : 'bg-gradient-to-r from-emerald-500/40 to-teal-500/40 text-white rounded-tr-md'
                      }`}
                    >
                      <div className="text-[10px] text-white/50 mb-1 font-medium uppercase tracking-wider">
                        {msg.speaker === 'lens' ? 'Health Coach' : 'You'}
                      </div>
                      <div className="text-sm leading-relaxed">{msg.text}</div>
                    </div>
                  </div>
                ))}

                {isConnecting && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-2 shrink-0">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="bg-white/10 rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <StatusChip status={isConnecting ? 'connecting' : isConnected ? 'connected' : 'idle'} isMicEnabled={isMicEnabled} />
                  
                  <div className="flex items-center gap-3">
                    {/* Mic Toggle */}
                    <button
                      onClick={toggleMic}
                      disabled={!isConnected}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        isMicEnabled
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/40 hover:shadow-emerald-500/60'
                          : 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/40 hover:shadow-rose-500/60'
                      } ${!isConnected ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                    >
                      {isMicEnabled ? (
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      )}
                    </button>

                    {/* End Session */}
                    <button
                      onClick={disconnect}
                      disabled={!isConnected}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        isConnected
                          ? 'bg-white/10 hover:bg-white/20 text-white'
                          : 'bg-white/5 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      End
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
      </div>
    </div>
  );
};

export default LensVoicePanel;
