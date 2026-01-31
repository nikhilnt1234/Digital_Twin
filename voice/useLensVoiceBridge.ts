/**
 * Lens Voice Bridge hook for BodyTwin UI
 * Connects to Vocal Bridge Lens agent for health coaching and insights
 * Handles transcriptions similar to Mirror's Nova agent
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, TranscriptionSegment, Participant } from 'livekit-client';

export interface LensMessage {
  id: string;
  speaker: 'lens' | 'user';
  text: string;
  timestamp: number;
}

export interface UseLensVoiceBridgeOptions {
  onMessageReceived?: (message: LensMessage) => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error') => void;
  onSessionEnd?: () => void;
}

export function useLensVoiceBridge(options: UseLensVoiceBridgeOptions = {}) {
  const { onMessageReceived, onStatusChange, onSessionEnd } = options;

  // Refs to avoid stale closures
  const onMessageReceivedRef = useRef(onMessageReceived);
  const onStatusChangeRef = useRef(onStatusChange);
  const onSessionEndRef = useRef(onSessionEnd);
  onMessageReceivedRef.current = onMessageReceived;
  onStatusChangeRef.current = onStatusChange;
  onSessionEndRef.current = onSessionEnd;

  const hadConnectionRef = useRef(false);
  const messageIdRef = useRef(0);

  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  const audioElementsRef = useRef<HTMLMediaElement[]>([]);

  // Setup room event handlers
  useEffect(() => {
    // Handle transcription events from LiveKit (primary way Vocal Bridge sends transcripts)
    const handleTranscriptionReceived = (
      segments: TranscriptionSegment[],
      participant?: Participant
    ) => {
      console.log('[LensVoiceBridge] Transcription received:', segments, 'from:', participant?.identity);
      
      for (const segment of segments) {
        if (segment.final && segment.text && segment.text.trim()) {
          const isAgent = participant?.identity?.toLowerCase().includes('agent') || 
                          participant?.identity?.toLowerCase().includes('assistant') ||
                          !participant?.identity?.includes('user');
          
          if (onMessageReceivedRef.current) {
            onMessageReceivedRef.current({
              id: `lens-${++messageIdRef.current}`,
              speaker: isAgent ? 'lens' : 'user',
              text: segment.text.trim(),
              timestamp: Date.now(),
            });
          }
        }
      }
    };

    const handleDataReceived = (payload: Uint8Array, participant?: import('livekit-client').RemoteParticipant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);

        console.log('[LensVoiceBridge] Data received:', data);

        // Handle various transcription formats from Vocal Bridge
        let messageText: string | null = null;
        let speaker: 'lens' | 'user' = 'lens';
        
        if (data.type === 'transcription' && data.text) {
          messageText = data.text;
          speaker = data.participant === 'user' || data.source === 'user' ? 'user' : 'lens';
        } else if (data.type === 'transcript' && data.transcript && data.is_final !== false) {
          messageText = data.transcript;
          speaker = data.source === 'user' ? 'user' : 'lens';
        } else if (data.type === 'agent_message' && data.content) {
          messageText = data.content;
          speaker = 'lens';
        } else if (data.type === 'user_transcript' && data.text) {
          messageText = data.text;
          speaker = 'user';
        } else if (data.type === 'agent_transcript' && data.text) {
          messageText = data.text;
          speaker = 'lens';
        } else if (data.text && typeof data.text === 'string' && data.text.trim()) {
          messageText = data.text;
          speaker = data.speaker === 'user' || data.participant === 'user' || data.role === 'user' ? 'user' : 'lens';
        } else if (data.message && typeof data.message === 'string') {
          messageText = data.message;
          speaker = data.role === 'user' ? 'user' : 'lens';
        } else if (data.content && typeof data.content === 'string') {
          messageText = data.content;
          speaker = 'lens';
        }
        
        // Check participant identity
        if (participant && participant.identity) {
          const identity = participant.identity.toLowerCase();
          if (identity.includes('agent') || identity.includes('assistant')) {
            speaker = 'lens';
          } else if (identity.includes('user')) {
            speaker = 'user';
          }
        }

        if (messageText && messageText.trim() && onMessageReceivedRef.current) {
          onMessageReceivedRef.current({
            id: `lens-${++messageIdRef.current}`,
            speaker,
            text: messageText.trim(),
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        // Might not be JSON, could be raw text
        try {
          const text = new TextDecoder().decode(payload);
          if (text && text.trim().length > 0 && onMessageReceivedRef.current) {
            onMessageReceivedRef.current({
              id: `lens-${++messageIdRef.current}`,
              speaker: 'lens',
              text: text.trim(),
              timestamp: Date.now(),
            });
          }
        } catch {
          console.warn('[LensVoiceBridge] Failed to parse data:', e);
        }
      }
    };

    const handleTrackSubscribed = (
      track: import('livekit-client').RemoteTrack,
      _publication: import('livekit-client').RemoteTrackPublication,
      _participant: import('livekit-client').RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        console.log('[LensVoiceBridge] Agent audio track subscribed');
        const el = track.attach();
        audioElementsRef.current.push(el);
        document.body.appendChild(el);
      }
    };

    // Listen for all relevant events
    room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
    room.on(RoomEvent.DataReceived, handleDataReceived);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.Connected, () => {
      console.log('[LensVoiceBridge] Connected to room');
      setIsConnected(true);
      setError(null);
      hadConnectionRef.current = true;
      onStatusChangeRef.current?.('connected');
    });
    room.on(RoomEvent.Disconnected, () => {
      console.log('[LensVoiceBridge] Disconnected from room');
      const wasConnected = hadConnectionRef.current;
      setIsConnected(false);
      setIsMicEnabled(false);
      audioElementsRef.current.forEach((el) => el.remove());
      audioElementsRef.current = [];
      onStatusChangeRef.current?.('idle');

      if (wasConnected) {
        console.log('[LensVoiceBridge] Session ended');
        setSessionEnded(true);
        onSessionEndRef.current?.();
      }
    });

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
      room.off(RoomEvent.DataReceived, handleDataReceived);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      audioElementsRef.current.forEach((el) => el.remove());
      audioElementsRef.current = [];
      room.disconnect();
    };
  }, [room]);

  // Connect to Vocal Bridge Lens
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setSessionEnded(false);
    hadConnectionRef.current = false;
    onStatusChangeRef.current?.('connecting');

    try {
      // Get token from our backend proxy - using the LENS endpoint
      const res = await fetch('/api/voice-token-lens');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { error?: string }).error || res.statusText || `Token request failed: ${res.status}`;
        throw new Error(msg);
      }

      const { livekit_url, token } = (await res.json()) as { livekit_url: string; token: string };
      if (!livekit_url || !token) {
        throw new Error('Invalid token response');
      }

      console.log('[LensVoiceBridge] Connecting to LiveKit:', livekit_url);

      // Connect to LiveKit room
      await room.connect(livekit_url, token);

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMicEnabled(true);

      console.log('[LensVoiceBridge] Connected and mic enabled');

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[LensVoiceBridge] Connection error:', msg);
      setError(msg);
      onStatusChangeRef.current?.('error');
    } finally {
      setIsConnecting(false);
    }
  }, [room]);

  // Disconnect
  const disconnect = useCallback(async () => {
    console.log('[LensVoiceBridge] Disconnecting...');
    await room.disconnect();
  }, [room]);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    const next = !isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setIsMicEnabled(next);
  }, [room, isMicEnabled]);

  return {
    isConnected,
    isConnecting,
    isMicEnabled,
    sessionEnded,
    error,
    connect,
    disconnect,
    toggleMic,
  };
}
