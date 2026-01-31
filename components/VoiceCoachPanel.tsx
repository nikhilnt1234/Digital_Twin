/**
 * Voice Coach Panel - Main UI for voice commands
 * Supports push-to-talk, live transcript, and fallback typed input
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserInputs, SimulationResult, DashboardTab } from '../types';
import { VoiceAction, ChartTarget, InputPath } from '../voice/actionSchema';
import { interpretCommand, buildVoiceContext } from '../voice/voiceAgent';
import { executeVoiceActions, VoiceActionAdapters, speak, stopSpeaking, getInputKeyFromPath } from '../voice/executeActions';

// ============================================
// Types
// ============================================

type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface CommandLogEntry {
  id: string;
  timestamp: Date;
  transcript: string;
  response: string;
  actions: VoiceAction[];
  success: boolean;
}

interface VoiceCoachPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: UserInputs;
  setInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  simulation: SimulationResult | null;
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  onHighlightChart: (target: ChartTarget | null) => void;
  onShowInsight: (text: string) => void;
}

// ============================================
// Speech Recognition Types (for TypeScript)
// ============================================

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ============================================
// Component
// ============================================

export const VoiceCoachPanel: React.FC<VoiceCoachPanelProps> = ({
  isOpen,
  onClose,
  inputs,
  setInputs,
  simulation,
  activeTab,
  setActiveTab,
  onHighlightChart,
  onShowInsight,
}) => {
  // State
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [commandLog, setCommandLog] = useState<CommandLogEntry[]>([]);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [lastActions, setLastActions] = useState<VoiceAction[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  
  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const finalTranscriptRef = useRef<string>(''); // Track final transcript for onend handler
  const processCommandRef = useRef<(text: string) => Promise<void>>(); // Ref for processCommand to avoid stale closure

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognitionAPI);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setStatus('listening');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      if (final) {
        setTranscript(final);
        setInterimTranscript('');
        finalTranscriptRef.current = final; // Store in ref for onend
      } else {
        setInterimTranscript(interim);
        // Also store interim as potential final if user stops early
        if (interim) {
          finalTranscriptRef.current = interim;
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setStatus('error');
        setResponse('🎤 Microphone access denied. Please allow microphone permission in your browser settings (click the lock/info icon in the address bar), then try again. Or use the text input below.');
      } else if (event.error === 'no-speech') {
        setStatus('idle');
        setResponse("I didn't hear anything. Tap the mic and speak, or type your command below.");
      } else if (event.error !== 'aborted') {
        setStatus('error');
        setResponse(`Speech recognition error: ${event.error}. Try using the text input instead.`);
      }
    };

    recognition.onend = () => {
      // Use the ref value which is always up-to-date
      const finalText = finalTranscriptRef.current;
      if (finalText) {
        setTranscript(finalText);
        setInterimTranscript('');
        // Use ref to get latest processCommand function
        if (processCommandRef.current) {
          processCommandRef.current(finalText);
        }
      } else {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  // Create adapters for action execution
  const createAdapters = useCallback((): VoiceActionAdapters => ({
    navigateTab: (tab: DashboardTab) => {
      setActiveTab(tab);
    },
    
    setInput: (path: InputPath, value: number) => {
      const key = getInputKeyFromPath(path);
      setInputs(prev => ({
        ...prev,
        [key]: value,
      }));
    },
    
    runSimulation: () => {
      // Simulation runs automatically when inputs change in App.tsx
      // This is a no-op but signals intent
    },
    
    highlightChart: (target: ChartTarget) => {
      onHighlightChart(target);
      // Auto-clear highlight after 5 seconds
      setTimeout(() => onHighlightChart(null), 5000);
    },
    
    showInsight: (text: string) => {
      onShowInsight(text);
    },
    
    comparePaths: (mode: 'baseline' | 'optimized' | 'both') => {
      // Navigate to overview to show comparison
      setActiveTab('overview');
      onShowInsight(`Showing ${mode === 'both' ? 'baseline vs optimized' : mode} path comparison`);
    },
  }), [setActiveTab, setInputs, onHighlightChart, onShowInsight]);

  // Process a command (voice or typed)
  const processCommand = useCallback(async (commandText: string) => {
    if (!commandText.trim()) return;
    
    setStatus('thinking');
    setResponse('');
    
    try {
      const context = buildVoiceContext(activeTab, inputs, simulation);
      const result = await interpretCommand({
        transcript: commandText,
        appContext: context,
      });
      
      setLastActions(result.actions);
      setResponse(result.speechText);
      
      // Execute actions
      if (result.actions.length > 0) {
        const adapters = createAdapters();
        await executeVoiceActions(result.actions, adapters);
      }
      
      // Speak response
      if (!isMuted && result.speechText) {
        setStatus('speaking');
        await speak(result.speechText, { rate: 1.1 });
      }
      
      // Log command
      const logEntry: CommandLogEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        transcript: commandText,
        response: result.speechText,
        actions: result.actions,
        success: true,
      };
      setCommandLog(prev => [...prev.slice(-4), logEntry]);
      
      setStatus('idle');
    } catch (error) {
      console.error('Command processing error:', error);
      setStatus('error');
      setResponse('Sorry, something went wrong. Please try again.');
      
      const logEntry: CommandLogEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        transcript: commandText,
        response: 'Error processing command',
        actions: [],
        success: false,
      };
      setCommandLog(prev => [...prev.slice(-4), logEntry]);
    }
  }, [activeTab, inputs, simulation, isMuted, createAdapters]);

  // Keep processCommand ref up to date
  useEffect(() => {
    processCommandRef.current = processCommand;
  }, [processCommand]);

  // Scroll to bottom of log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commandLog]);

  // Mic button handlers
  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setInterimTranscript('');
    setResponse('');
    setLastActions([]);
    finalTranscriptRef.current = '';
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started, ignore
      console.warn('Recognition already started', e);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  };

  const toggleListening = () => {
    if (status === 'listening') {
      stopListening();
    } else if (status === 'idle' || status === 'error') {
      startListening();
    }
  };

  // Handle typed command submission
  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim() || status === 'thinking') return;
    
    setTranscript(typedInput);
    processCommand(typedInput);
    setTypedInput('');
  };

  // Mute toggle
  const toggleMute = () => {
    if (!isMuted) {
      stopSpeaking();
    }
    setIsMuted(!isMuted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-none p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative z-10 bg-white w-full max-w-md h-[calc(100vh-2rem)] shadow-2xl rounded-2xl flex flex-col pointer-events-auto border border-slate-200 overflow-hidden animate-in slide-in-from-right-10 duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base">Voice Coach</h3>
              <div className="text-[11px] text-white/70 flex items-center gap-1.5">
                <StatusDot status={status} />
                <span className="capitalize">{status === 'idle' ? 'Ready' : status}</span>
                <span className="mx-1">•</span>
                {process.env.API_KEY ? (
                  <span className="text-emerald-300">AI Online</span>
                ) : (
                  <span className="text-amber-300">Offline Mode</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          
          {/* Mic Button */}
          <div className="flex flex-col items-center py-6">
            <button
              onClick={toggleListening}
              disabled={status === 'thinking' || status === 'speaking'}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                status === 'listening'
                  ? 'bg-red-500 scale-110 animate-pulse shadow-red-500/30'
                  : status === 'thinking'
                  ? 'bg-amber-500 shadow-amber-500/30 cursor-wait'
                  : status === 'speaking'
                  ? 'bg-emerald-500 shadow-emerald-500/30 cursor-wait'
                  : status === 'error'
                  ? 'bg-red-100 hover:bg-red-200 shadow-red-200/30'
                  : 'bg-gradient-to-br from-violet-500 to-indigo-600 hover:scale-105 shadow-violet-500/30'
              }`}
            >
              {status === 'listening' ? (
                <div className="relative">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="2" />
                    <rect x="14" y="4" width="4" height="16" rx="2" />
                  </svg>
                  <div className="absolute -inset-4 rounded-full border-4 border-white/30 animate-ping" />
                </div>
              ) : status === 'thinking' ? (
                <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : status === 'speaking' ? (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
            <p className="mt-3 text-sm text-slate-500 text-center">
              {status === 'listening' ? 'Listening... tap to stop' : 
               status === 'thinking' ? 'Processing command...' :
               status === 'speaking' ? 'Speaking response...' :
               speechSupported ? 'Tap to speak' : 'Speech not supported'}
            </p>
          </div>

          {/* Live Transcript */}
          {(transcript || interimTranscript) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">You said</div>
              <p className="text-slate-800 text-sm">
                {transcript || <span className="text-slate-400 italic">{interimTranscript}</span>}
              </p>
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-4 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mb-2">Coach says</div>
              <p className="text-slate-800 text-sm leading-relaxed">{response}</p>
            </div>
          )}

          {/* Debug Actions (Collapsible) */}
          {lastActions.length > 0 && (
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setDebugExpanded(!debugExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <span className="text-xs font-mono text-slate-400">
                  {lastActions.length} action{lastActions.length > 1 ? 's' : ''} executed
                </span>
                <svg 
                  className={`w-4 h-4 text-slate-400 transition-transform ${debugExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {debugExpanded && (
                <pre className="px-4 pb-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                  {JSON.stringify(lastActions, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Command History */}
          {commandLog.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Commands</div>
              {commandLog.map((entry) => (
                <div 
                  key={entry.id}
                  className={`bg-white rounded-lg border p-3 text-xs ${
                    entry.success ? 'border-slate-200' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 truncate">"{entry.transcript}"</p>
                      <p className="text-slate-500 mt-0.5 line-clamp-2">{entry.response}</p>
                    </div>
                    {entry.actions.length > 0 && (
                      <span className="shrink-0 text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-medium">
                        {entry.actions.length} action{entry.actions.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>

        {/* Fallback Typed Input */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <form onSubmit={handleTypedSubmit} className="relative">
            <input
              type="text"
              placeholder={speechSupported ? "Or type a command..." : "Type a command..."}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-sm text-slate-800"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              disabled={status === 'thinking'}
            />
            <button
              type="submit"
              disabled={!typedInput.trim() || status === 'thinking'}
              className="absolute right-2 top-2 p-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1">
            {['Open BodyTwin', 'Show weight chart', 'Set eating out to 150'].map((hint) => (
              <button
                key={hint}
                onClick={() => setTypedInput(hint)}
                className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Status Dot Component
// ============================================

const StatusDot: React.FC<{ status: VoiceStatus }> = ({ status }) => {
  const colors: Record<VoiceStatus, string> = {
    idle: 'bg-slate-400',
    listening: 'bg-red-500 animate-pulse',
    thinking: 'bg-amber-500 animate-pulse',
    speaking: 'bg-emerald-500 animate-pulse',
    error: 'bg-red-500',
  };
  
  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
};

export default VoiceCoachPanel;
