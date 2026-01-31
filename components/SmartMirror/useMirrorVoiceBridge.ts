/**
 * Mirror-specific Vocal Bridge hook
 * Handles connection to Nova agent and parses incoming client actions
 * Based on the working useVocalBridgeRoom pattern
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

// Types for incoming client actions from Nova
export interface NovaClientAction {
  type: 'client_action';
  action: string;
  payload: Record<string, unknown>;
}

// Parsed mirror data from Nova actions
export interface MirrorVoiceData {
  sleepHours: number | null;
  exerciseMinutes: number | null;
  mealsCost: number | null;
  carbsBool: boolean | null;
}

export interface ConversationMessage {
  id: string;
  speaker: 'nova' | 'user';
  text: string;
  timestamp: number;  // Unix timestamp in ms to match ConversationRail
}

// Face capture request from Nova
export interface FaceCaptureRequest {
  reason: 'follow_up' | 'routine';
  note?: string | null;
}

export interface UseMirrorVoiceBridgeOptions {
  onDataUpdate: (field: keyof MirrorVoiceData, value: number | boolean | null) => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error') => void;
  onMessageReceived?: (message: ConversationMessage) => void;
  /** Called when the voice session ends (agent disconnects or call ends) */
  onSessionEnd?: () => void;
  /** Called when Nova requests a face capture */
  onFaceCaptureRequested?: (request: FaceCaptureRequest) => void;
}

// Helper to parse numbers from various formats
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

// Generate action-based message for conversation rail
function generateActionMessage(action: string, payload: Record<string, unknown>): string {
  switch (action) {
    case 'log_sleep_hours': {
      const hours = payload.sleepHours ?? payload.sleep_hours;
      if (hours !== null && hours !== undefined) {
        return `Got it — ${hours} hours of sleep logged.`;
      }
      return 'Sleep noted.';
    }
    case 'log_exercise_minutes': {
      const mins = payload.exerciseMinutes ?? payload.exercise_minutes;
      if (mins !== null && mins !== undefined) {
        return `${mins} minutes of movement logged.`;
      }
      return 'Movement noted.';
    }
    case 'log_meals_cost': {
      if ('carbsBool' in payload || 'carbs_bool' in payload) {
        const carbs = payload.carbsBool ?? payload.carbs_bool;
        return carbs ? 'Carb/sugar flag noted.' : 'No carb flags — nice!';
      }
      if ('mealsCost' in payload || 'meals_cost' in payload) {
        const cost = payload.mealsCost ?? payload.meals_cost;
        if (cost !== null && cost !== undefined) {
          return `$${cost} dining out logged.`;
        }
      }
      return 'Spending noted.';
    }
    case 'log_carb': {
      const carbs = payload.carbsBool ?? payload.carbs_bool ?? payload.value;
      return carbs ? 'Carb/sugar flag noted.' : 'No carb flags — nice!';
    }
    case 'trigger_face_capture': {
      const reason = payload.reason;
      if (reason === 'follow_up') {
        return "Let's check on that cut from yesterday. Look at the mirror and hold still...";
      }
      return 'Quick visual check-in. Look at the mirror and hold still...';
    }
    default:
      return 'Data logged.';
  }
}

export function useMirrorVoiceBridge(options: UseMirrorVoiceBridgeOptions) {
  const { onDataUpdate, onStatusChange, onMessageReceived, onSessionEnd, onFaceCaptureRequested } = options;
  
  // Refs to avoid stale closures (same pattern as working hook)
  const onDataUpdateRef = useRef(onDataUpdate);
  const onStatusChangeRef = useRef(onStatusChange);
  const onMessageReceivedRef = useRef(onMessageReceived);
  const onSessionEndRef = useRef(onSessionEnd);
  const onFaceCaptureRequestedRef = useRef(onFaceCaptureRequested);
  onDataUpdateRef.current = onDataUpdate;
  onStatusChangeRef.current = onStatusChange;
  onMessageReceivedRef.current = onMessageReceived;
  onSessionEndRef.current = onSessionEnd;
  onFaceCaptureRequestedRef.current = onFaceCaptureRequested;
  
  // Track if we've had a successful connection (to distinguish end from error)
  const hadConnectionRef = useRef(false);

  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  
  const audioElementsRef = useRef<HTMLMediaElement[]>([]);
  const messageIdRef = useRef(0);

  // Setup room event handlers - matching the working useVocalBridgeRoom pattern
  useEffect(() => {
    // Define handleDataReceived INSIDE useEffect (key difference from before!)
    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        
        console.log('[MirrorVoiceBridge] Raw data received:', JSON.stringify(data, null, 2));
        
        // Handle multiple data formats from Vocal Bridge
        let action: string | null = null;
        let actionPayload: Record<string, unknown> = {};
        
        // Format 1: { type: 'client_action', action: '...', payload: {...} }
        if (data.type === 'client_action') {
          action = data.action as string;
          actionPayload = (data.payload ?? {}) as Record<string, unknown>;
        }
        // Format 2: { action: '...', ... } (action at top level, rest is payload)
        else if (data.action && typeof data.action === 'string') {
          action = data.action;
          const { action: _, ...rest } = data;
          actionPayload = rest;
        }
        // Format 3: Direct data fields (sleepHours, exerciseMinutes, etc.)
        else if ('sleepHours' in data || 'sleep_hours' in data) {
          action = 'log_sleep_hours';
          actionPayload = data;
        }
        else if ('exerciseMinutes' in data || 'exercise_minutes' in data) {
          action = 'log_exercise_minutes';
          actionPayload = data;
        }
        else if ('mealsCost' in data || 'meals_cost' in data) {
          action = 'log_meals_cost';
          actionPayload = data;
        }
        else if ('carbsBool' in data || 'carbs_bool' in data) {
          action = 'log_carb';
          actionPayload = data;
        }
        
        if (action) {
          console.log('[MirrorVoiceBridge] Processing action:', action, actionPayload);
          
          // Parse and dispatch the action
          switch (action) {
            case 'log_sleep_hours': {
              const sleepHours = parseNumber(actionPayload.sleepHours ?? actionPayload.sleep_hours);
              console.log('[MirrorVoiceBridge] Sleep hours:', sleepHours);
              onDataUpdateRef.current('sleepHours', sleepHours);
              break;
            }
            case 'log_exercise_minutes': {
              const exerciseMinutes = parseNumber(actionPayload.exerciseMinutes ?? actionPayload.exercise_minutes);
              console.log('[MirrorVoiceBridge] Exercise minutes:', exerciseMinutes);
              onDataUpdateRef.current('exerciseMinutes', exerciseMinutes);
              break;
            }
            case 'log_meals_cost': {
              // This action can carry either carbsBool or mealsCost
              if ('carbsBool' in actionPayload || 'carbs_bool' in actionPayload) {
                const carbsBool = (actionPayload.carbsBool ?? actionPayload.carbs_bool) === true;
                console.log('[MirrorVoiceBridge] Carbs bool:', carbsBool);
                onDataUpdateRef.current('carbsBool', carbsBool);
              }
              if ('mealsCost' in actionPayload || 'meals_cost' in actionPayload) {
                const mealsCost = parseNumber(actionPayload.mealsCost ?? actionPayload.meals_cost);
                console.log('[MirrorVoiceBridge] Meals cost:', mealsCost);
                onDataUpdateRef.current('mealsCost', mealsCost);
              }
              break;
            }
            case 'log_carb': {
              const carbsBool = (actionPayload.carbsBool ?? actionPayload.carbs_bool ?? actionPayload.value) === true;
              console.log('[MirrorVoiceBridge] Carbs bool (log_carb):', carbsBool);
              onDataUpdateRef.current('carbsBool', carbsBool);
              break;
            }
            case 'trigger_face_capture': {
              const reason = (actionPayload.reason ?? 'routine') as 'follow_up' | 'routine';
              const note = (actionPayload.note ?? null) as string | null;
              console.log('[MirrorVoiceBridge] Face capture requested:', { reason, note });
              onFaceCaptureRequestedRef.current?.({ reason, note });
              break;
            }
          }
          
          // Generate a message for the conversation rail
          const messageText = generateActionMessage(action, actionPayload);
          if (onMessageReceivedRef.current && messageText !== 'Data logged.') {
            onMessageReceivedRef.current({
              id: `nova-${++messageIdRef.current}`,
              speaker: 'nova',
              text: messageText,
              timestamp: Date.now(),
            });
          }
        } else {
          console.log('[MirrorVoiceBridge] Unknown data format, not processing');
        }
      } catch (e) {
        console.warn('[MirrorVoiceBridge] Failed to parse data:', e);
      }
    };

    const handleTrackSubscribed = (
      track: import('livekit-client').RemoteTrack,
      _publication: import('livekit-client').RemoteTrackPublication,
      _participant: import('livekit-client').RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        console.log('[MirrorVoiceBridge] Agent audio track subscribed');
        const el = track.attach();
        audioElementsRef.current.push(el);
        document.body.appendChild(el);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.Connected, () => {
      console.log('[MirrorVoiceBridge] Connected to room');
      setIsConnected(true);
      setError(null);
      hadConnectionRef.current = true;
      onStatusChangeRef.current?.('connected');
    });
    room.on(RoomEvent.Disconnected, () => {
      console.log('[MirrorVoiceBridge] Disconnected from room');
      const wasConnected = hadConnectionRef.current;
      setIsConnected(false);
      setIsMicEnabled(false);
      audioElementsRef.current.forEach((el) => el.remove());
      audioElementsRef.current = [];
      onStatusChangeRef.current?.('idle');
      
      // If we had a successful connection before disconnecting, this is a session end
      if (wasConnected) {
        console.log('[MirrorVoiceBridge] Session ended');
        setSessionEnded(true);
        onSessionEndRef.current?.();
      }
    });

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      audioElementsRef.current.forEach((el) => el.remove());
      audioElementsRef.current = [];
      room.disconnect();
    };
  }, [room]);

  // Connect to Vocal Bridge
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    onStatusChangeRef.current?.('connecting');
    
    try {
      // Get token from our backend proxy
      const res = await fetch('/api/voice-token');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { error?: string }).error || res.statusText || `Token request failed: ${res.status}`;
        throw new Error(msg);
      }
      
      const { livekit_url, token } = (await res.json()) as { livekit_url: string; token: string };
      if (!livekit_url || !token) {
        throw new Error('Invalid token response');
      }
      
      console.log('[MirrorVoiceBridge] Connecting to LiveKit:', livekit_url);
      
      // Connect to LiveKit room
      await room.connect(livekit_url, token);
      
      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMicEnabled(true);
      
      console.log('[MirrorVoiceBridge] Connected and mic enabled');
      
      // Add initial greeting message
      if (onMessageReceivedRef.current) {
        onMessageReceivedRef.current({
          id: `nova-${++messageIdRef.current}`,
          speaker: 'nova',
          text: 'Good morning! Quick 90-second check-in — four questions about sleep, movement, food, and spending. Ready?',
          timestamp: Date.now(),
        });
      }
      
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[MirrorVoiceBridge] Connection error:', msg);
      setError(msg);
      onStatusChangeRef.current?.('error');
    } finally {
      setIsConnecting(false);
    }
  }, [room]);

  // Disconnect from Vocal Bridge
  const disconnect = useCallback(async () => {
    console.log('[MirrorVoiceBridge] Disconnecting...');
    await room.disconnect();
  }, [room]);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    const next = !isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setIsMicEnabled(next);
  }, [room, isMicEnabled]);

  // Send action to agent (for future use)
  const sendActionToAgent = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    if (!isConnected) return;
    
    const message = JSON.stringify({
      type: 'client_action',
      action,
      payload,
    });
    
    await room.localParticipant.publishData(
      new TextEncoder().encode(message),
      { reliable: true, topic: 'client_actions' }
    );
  }, [room, isConnected]);

  return {
    isConnected,
    isConnecting,
    isMicEnabled,
    agentSpeaking,
    sessionEnded,
    error,
    connect,
    disconnect,
    toggleMic,
    sendActionToAgent,
  };
}
