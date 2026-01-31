/**
 * Lens Voice Bridge hook for BodyTwin UI
 * Connects to Vocal Bridge Lens agent for health coaching and insights
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

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
    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);

        console.log('[LensVoiceBridge] Data received:', data);

        // Handle transcription or agent messages
        if (data.type === 'transcription' && data.text) {
          if (onMessageReceivedRef.current) {
            onMessageReceivedRef.current({
              id: `lens-${++messageIdRef.current}`,
              speaker: data.participant === 'agent' ? 'lens' : 'user',
              text: data.text,
              timestamp: Date.now(),
            });
          }
        }
      } catch (e) {
        console.warn('[LensVoiceBridge] Failed to parse data:', e);
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
