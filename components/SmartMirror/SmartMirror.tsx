/**
 * SmartMirror - Main orchestrator for the wellness mirror experience
 * Manages session flow: intro → questions → face-check → summary → complete
 * Supports both demo mode (click-to-advance) and live mode (Vocal Bridge)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CameraFeed, cleanupCameraStream } from './CameraFeed';
import { MetricsPanel } from './MetricsPanel';
import { ConversationRail, ConversationMessage } from './ConversationRail';
import { FaceCapture } from './FaceCapture';
import { StatusType } from './MirrorStatusChip';
import { useMirrorVoiceBridge, MirrorVoiceData } from './useMirrorVoiceBridge';
import type { DailyEntry } from '../../types';

// Session phases
type SessionPhase = 'intro' | 'questions' | 'face-check' | 'summary' | 'complete';

// Face capture phases
type FaceCapturePhase = 'hidden' | 'frame' | 'countdown' | 'captured';

// Voice modes
type VoiceMode = 'demo' | 'live';

interface MirrorSessionData {
  sleepHours: number | null;
  movementMinutes: number | null;
  carbSugarFlag: boolean | null;
  carbSugarItem: string | null;
  diningOutSpend: number | null;
  faceCheckImage: string | null;
}

interface SmartMirrorProps {
  onComplete: (data: MirrorSessionData) => void;
  existingEntry: DailyEntry | null;
  /** Enable live Vocal Bridge mode instead of demo */
  liveMode?: boolean;
}

// Script for the demo flow - 4 questions covering sleep, exercise, meals, and spending
const DEMO_SCRIPT = {
  intro: [
    { speaker: 'nova' as const, text: "Good morning! I'm Nova. Quick 90-second check-in—four questions about sleep, movement, food, and spending. Ready?" },
  ],
  questions: [
    {
      novaPrompt: "How many hours did you sleep last night?",
      sampleResponse: "About 6 and a half hours.",
      novaConfirm: "Got it—6.5 hours logged.",
      field: 'sleep' as const,
    },
    {
      novaPrompt: "How many minutes did you move yesterday—walk, gym, anything?",
      sampleResponse: "About 20 minutes.",
      novaConfirm: "Nice—20 minutes logged.",
      field: 'movement' as const,
    },
    {
      novaPrompt: "Any sugary drink or heavy-carb moment yesterday? Like soda, dessert, sweetened coffee?",
      sampleResponse: "I had a caramel latte.",
      novaConfirm: "Logging sweetened coffee.",
      field: 'carb' as const,
    },
    {
      novaPrompt: "Roughly what did you spend eating or drinking out yesterday?",
      sampleResponse: "Like $30—$5 Starbucks and $25 lunch.",
      novaConfirm: "Thanks—logging $30 dining out.",
      field: 'dining' as const,
    },
  ],
  coaching: "Quick wins for today: You got 6.5 hours of sleep—try for 7+ tonight. You're under your movement goal—aim for a 10-minute walk. To stay on budget, keep dining out under $15 today.",
  faceCheckIntro: "Before we finish, let's do a quick wellness check. I'll show a frame—look at the camera and hold still for two seconds.",
  faceCheckDone: "Captured—attached to today's update. I can't diagnose conditions, but if you notice anything concerning, it's best to contact a clinician.",
  summary: "All set! Your dashboard is updated with today's check-in. See you tomorrow!",
};

export const SmartMirror: React.FC<SmartMirrorProps> = ({ onComplete, existingEntry, liveMode = false }) => {
  // Voice mode state - can toggle between demo and live
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(liveMode ? 'live' : 'demo');
  
  // Camera state
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Stable callback refs to prevent re-renders triggering camera restart
  const handleCameraError = useCallback((err: string) => {
    // Only set error if camera hasn't already succeeded
    if (!cameraReady) {
      setCameraError(err);
    }
  }, [cameraReady]);

  // Session state
  const [phase, setPhase] = useState<SessionPhase>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [status, setStatus] = useState<StatusType>('idle');
  const [updatedField, setUpdatedField] = useState<string | undefined>();
  const [highlightField, setHighlightField] = useState<'sleep' | 'movement' | 'carb' | 'dining' | null>(null);

  // Collected data
  const [sessionData, setSessionData] = useState<MirrorSessionData>({
    sleepHours: null,
    movementMinutes: null,
    carbSugarFlag: null,
    carbSugarItem: null,
    diningOutSpend: null,
    faceCheckImage: null,
  });

  // Conversation
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const messageIdCounter = useRef(0);
  const introShownRef = useRef(false);
  
  // Track which fields have been updated (for question progress in live mode)
  const fieldsUpdatedRef = useRef<Set<string>>(new Set());
  
  // Voice Bridge callbacks
  const handleVoiceDataUpdate = useCallback((field: keyof MirrorVoiceData, value: number | boolean | null) => {
    console.log('[SmartMirror] Voice data update:', field, value);
    
    // Map field to highlight and session data
    switch (field) {
      case 'sleepHours':
        setSessionData(prev => ({ ...prev, sleepHours: value as number | null }));
        setHighlightField('sleep');
        setUpdatedField('Sleep');
        fieldsUpdatedRef.current.add('sleep');
        break;
      case 'exerciseMinutes':
        setSessionData(prev => ({ ...prev, movementMinutes: value as number | null }));
        setHighlightField('movement');
        setUpdatedField('Movement');
        fieldsUpdatedRef.current.add('movement');
        break;
      case 'carbsBool':
        setSessionData(prev => ({ ...prev, carbSugarFlag: value as boolean | null }));
        setHighlightField('carb');
        setUpdatedField('Carb Flag');
        fieldsUpdatedRef.current.add('carb');
        break;
      case 'mealsCost':
        setSessionData(prev => ({ ...prev, diningOutSpend: value as number | null }));
        setHighlightField('dining');
        setUpdatedField('Dining Out');
        fieldsUpdatedRef.current.add('dining');
        break;
    }
    
    setStatus('updated');
    
    // Update question count based on fields updated
    setCurrentQuestionIndex(fieldsUpdatedRef.current.size);
    
    // Clear highlight after a delay
    setTimeout(() => {
      setHighlightField(null);
      setStatus('listening');
    }, 2000);
  }, []);
  
  const handleVoiceStatusChange = useCallback((newStatus: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error') => {
    console.log('[SmartMirror] Voice status:', newStatus);
    if (newStatus === 'speaking') {
      setStatus('idle');
    } else if (newStatus === 'listening') {
      setStatus('listening');
    } else if (newStatus === 'connecting') {
      setStatus('saving');
    } else if (newStatus === 'error') {
      setStatus('idle');
    }
  }, []);
  
  const handleVoiceMessageReceived = useCallback((message: ConversationMessage) => {
    console.log('[SmartMirror] Voice message:', message);
    setMessages(prev => [...prev, message]);
    
    // Move to questions phase after first message
    if (phase === 'intro') {
      setPhase('questions');
    }
  }, [phase]);
  
  // Ref to store handleComplete for use in session end callback
  const handleCompleteRef = useRef<() => void>(() => {});
  
  // Handle voice session end (agent disconnects)
  const handleVoiceSessionEnd = useCallback(() => {
    console.log('[SmartMirror] Voice session ended');
    setPhase('summary');
    setStatus('complete');
    
    // Add a completion message
    const id = `msg_${messageIdCounter.current++}`;
    setMessages(prev => [...prev, {
      id,
      speaker: 'nova',
      text: "All set! Transitioning to your dashboard...",
      timestamp: Date.now(),
    }]);
    
    // Auto-transition to dashboard after brief delay
    setTimeout(() => {
      console.log('[SmartMirror] Auto-transitioning to dashboard');
      handleCompleteRef.current();
    }, 3000);
  }, []);
  
  // Voice Bridge hook (only active in live mode)
  const voiceBridge = useMirrorVoiceBridge({
    onDataUpdate: handleVoiceDataUpdate,
    onStatusChange: handleVoiceStatusChange,
    onMessageReceived: handleVoiceMessageReceived,
    onSessionEnd: handleVoiceSessionEnd,
  });

  // Face capture state
  const [faceCapturePhase, setFaceCapturePhase] = useState<FaceCapturePhase>('hidden');
  const [countdownValue, setCountdownValue] = useState(3);

  // Helper to add message
  const addMessage = useCallback((speaker: 'nova' | 'user', text: string) => {
    const id = `msg_${messageIdCounter.current++}`;
    setMessages(prev => [...prev, { id, speaker, text, timestamp: Date.now() }]);
  }, []);

  // Handle camera ready - start intro
  const handleCameraReady = useCallback(() => {
    // Guard against multiple calls
    if (introShownRef.current) return;
    introShownRef.current = true;
    
    setCameraReady(true);
    
    if (voiceMode === 'live') {
      // In live mode, connect to Vocal Bridge
      setStatus('saving'); // Show connecting status
      voiceBridge.connect();
    } else {
      // Demo mode - show scripted intro
      setTimeout(() => {
        DEMO_SCRIPT.intro.forEach((msg, i) => {
          setTimeout(() => addMessage(msg.speaker, msg.text), i * 500);
        });
        setStatus('listening');
      }, 1000);
    }
  }, [addMessage, voiceMode, voiceBridge]);

  // Track if we're currently processing a response to prevent double-clicks
  const processingRef = useRef(false);

  // Simulated user response handler (click to advance demo)
  const handleSimulatedResponse = useCallback(() => {
    // Prevent double-clicks
    if (processingRef.current) return;
    processingRef.current = true;

    if (phase === 'intro') {
      // User says "Yep" and we move to questions
      addMessage('user', 'Yep.');
      setPhase('questions');
      setTimeout(() => {
        addMessage('nova', DEMO_SCRIPT.questions[0].novaPrompt);
        setStatus('listening');
        processingRef.current = false;
      }, 800);
      return;
    }

    if (phase === 'questions') {
      const q = DEMO_SCRIPT.questions[currentQuestionIndex];
      if (!q) {
        processingRef.current = false;
        return;
      }
      
      // User response
      addMessage('user', q.sampleResponse);
      setStatus('saving');
      setHighlightField(q.field);

      // Update data based on question
      setTimeout(() => {
        // Update the appropriate field
        if (q.field === 'sleep') {
          setSessionData(prev => ({ ...prev, sleepHours: 6.5 }));
          setUpdatedField('Sleep');
        } else if (q.field === 'movement') {
          setSessionData(prev => ({ ...prev, movementMinutes: 20 }));
          setUpdatedField('Movement');
        } else if (q.field === 'carb') {
          setSessionData(prev => ({ ...prev, carbSugarFlag: true, carbSugarItem: 'caramel latte' }));
          setUpdatedField('Carb Flag');
        } else if (q.field === 'dining') {
          setSessionData(prev => ({ ...prev, diningOutSpend: 30 }));
          setUpdatedField('Dining Out');
        }
        
        setStatus('updated');
        addMessage('nova', q.novaConfirm);

        // Determine next step
        const nextIndex = currentQuestionIndex + 1;
        
        setTimeout(() => {
          setHighlightField(null);
          setStatus('idle');

          if (nextIndex < DEMO_SCRIPT.questions.length) {
            // More questions to ask
            setCurrentQuestionIndex(nextIndex);
            setTimeout(() => {
              addMessage('nova', DEMO_SCRIPT.questions[nextIndex].novaPrompt);
              setStatus('listening');
              processingRef.current = false;
            }, 600);
          } else {
            // Done with questions - show coaching then move to face check
            addMessage('nova', DEMO_SCRIPT.coaching);
            setTimeout(() => {
              addMessage('nova', DEMO_SCRIPT.faceCheckIntro);
              setPhase('face-check');
              setFaceCapturePhase('frame');
              processingRef.current = false;
            }, 2500);
          }
        }, 1500);
      }, 800);
    }
  }, [phase, currentQuestionIndex, addMessage]);

  // Face capture
  const handleCapture = useCallback(() => {
    setFaceCapturePhase('countdown');
    setStatus('capturing');

    // Countdown
    let count = 3;
    setCountdownValue(count);
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownValue(count);
      } else {
        clearInterval(countdownInterval);
        
        // Capture frame from video
        const video = document.querySelector('video');
        if (video) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            setSessionData(prev => ({ ...prev, faceCheckImage: imageData }));
          }
        }

        setFaceCapturePhase('captured');
        setStatus('updated');
        setUpdatedField('Photo');
        addMessage('nova', DEMO_SCRIPT.faceCheckDone);

        // Move to summary after delay
        setTimeout(() => {
          setFaceCapturePhase('hidden');
          setPhase('summary');
          addMessage('nova', DEMO_SCRIPT.summary);
          setStatus('idle');
        }, 3000);
      }
    }, 1000);
  }, [addMessage]);

  // Skip face capture
  const handleSkipCapture = useCallback(() => {
    setFaceCapturePhase('hidden');
    setPhase('summary');
    addMessage('nova', DEMO_SCRIPT.summary);
    setStatus('idle');
  }, [addMessage]);

  // Complete session
  const handleComplete = useCallback(() => {
    setPhase('complete');
    cleanupCameraStream(); // Clean up camera when leaving mirror
    
    // Disconnect from voice bridge if in live mode
    if (voiceMode === 'live' && voiceBridge.isConnected) {
      voiceBridge.disconnect();
    }
    
    onComplete(sessionData);
  }, [sessionData, onComplete, voiceMode, voiceBridge]);
  
  // Keep ref updated for async callbacks
  handleCompleteRef.current = handleComplete;

  // Use session sleep if captured, otherwise show existing entry's sleep
  const displaySleepHours = sessionData.sleepHours ?? existingEntry?.sleepHours ?? null;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Camera Feed */}
      <CameraFeed 
        onReady={handleCameraReady} 
        onError={handleCameraError} 
      />

      {/* Error overlay */}
      {cameraError && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50">
          <div className="text-center max-w-md p-8">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Camera Access Required</h2>
            <p className="text-white/60 mb-6">{cameraError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Left Panel - Metrics */}
      {cameraReady && (
        <MetricsPanel
          sleepHours={displaySleepHours}
          movementMinutes={sessionData.movementMinutes}
          carbSugarFlag={sessionData.carbSugarFlag}
          carbSugarItem={sessionData.carbSugarItem}
          diningOutSpend={sessionData.diningOutSpend}
          targetDiningToday={15}
          streakDays={5}
          highlightField={highlightField}
        />
      )}

      {/* Right Panel - Conversation */}
      {cameraReady && (
        <ConversationRail
          messages={messages}
          currentQuestion={Math.min(currentQuestionIndex + 1, 4)}
          totalQuestions={4}
          status={status}
          updatedField={updatedField}
        />
      )}

      {/* Face Capture Overlay */}
      <FaceCapture
        isVisible={phase === 'face-check'}
        phase={faceCapturePhase}
        countdownValue={countdownValue}
        capturedImage={sessionData.faceCheckImage}
        previousImage={null}
        onCapture={handleCapture}
        onSkip={handleSkipCapture}
      />

      {/* Mode toggle - hide during summary/complete phases */}
      {cameraReady && phase !== 'summary' && phase !== 'complete' && !voiceBridge.sessionEnded && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          <button
            onClick={() => {
              if (voiceMode === 'demo' && !voiceBridge.isConnecting) {
                setVoiceMode('live');
                setMessages([]);
                fieldsUpdatedRef.current.clear();
                introShownRef.current = false;
                // Connect to voice bridge
                voiceBridge.connect();
              }
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              voiceMode === 'live'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {voiceBridge.isConnecting ? 'Connecting...' : voiceBridge.isConnected ? '🎙️ Live' : 'Live Mode'}
          </button>
          <button
            onClick={() => {
              if (voiceMode === 'live') {
                voiceBridge.disconnect();
                setVoiceMode('demo');
                setMessages([]);
                introShownRef.current = false;
              }
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              voiceMode === 'demo'
                ? 'bg-violet-500 text-white shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Demo Mode
          </button>
        </div>
      )}

      {/* Voice bridge error display */}
      {voiceBridge.error && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-rose-500/90 text-white text-sm rounded-xl max-w-md text-center">
          {voiceBridge.error}
        </div>
      )}

      {/* Click to advance (demo mode only) */}
      {cameraReady && voiceMode === 'demo' && phase !== 'face-check' && phase !== 'summary' && phase !== 'complete' && (
        <button
          onClick={handleSimulatedResponse}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95"
        >
          {phase === 'intro' ? 'Start Check-in' : 'Next Response (Demo)'}
        </button>
      )}

      {/* Live mode - mic indicator and complete button */}
      {cameraReady && voiceMode === 'live' && voiceBridge.isConnected && phase !== 'complete' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
          {/* Mic toggle */}
          <button
            onClick={voiceBridge.toggleMic}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl ${
              voiceBridge.isMicEnabled
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-rose-500 hover:bg-rose-600'
            }`}
          >
            {voiceBridge.isMicEnabled ? (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
          
          {/* Complete check-in button (shows when at least 2 fields logged) */}
          {fieldsUpdatedRef.current.size >= 2 && (
            <button
              onClick={handleComplete}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xl transition-all hover:scale-105"
            >
              Complete Check-in
            </button>
          )}
        </div>
      )}

      {/* Summary - auto-transition indicator for live mode, button for demo mode */}
      {phase === 'summary' && voiceMode === 'live' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 px-8 py-4 bg-emerald-600/90 text-white font-semibold rounded-2xl shadow-2xl flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Opening BodyTwin Dashboard...</span>
        </div>
      )}
      {phase === 'summary' && voiceMode === 'demo' && (
        <button
          onClick={handleComplete}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
        >
          <span>Continue to Dashboard</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      )}

      {/* Nova branding */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10">
        <div
          className="px-6 py-3 rounded-2xl flex items-center gap-3"
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg drop-shadow-lg">Wellness Mirror</div>
            <div className="text-white/70 text-xs drop-shadow-md">Powered by Nova</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartMirror;
