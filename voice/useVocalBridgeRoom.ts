/**
 * Vocal Bridge / LiveKit integration: connect to Nova, receive daily log data,
 * and pass the whole received structure into the app (→ daily update / notes).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

export interface VocalBridgeDailyLog {
  sleepHours: number | null;
  exerciseMinutes: number | null;
  mealsCost: number | null;
}

/** Validate and normalize payload from LiveKit. All values must be number | null. */
export function parseDailyLogPayload(data: unknown): VocalBridgeDailyLog | null {
  if (typeof data !== 'object' || data === null) return null;
  const o = data as Record<string, unknown>;
  const parse = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string') {
      const n = parseFloat(v);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };
  return {
    sleepHours: parse(o.sleepHours),
    exerciseMinutes: parse(o.exerciseMinutes),
    mealsCost: parse(o.mealsCost),
  };
}

export interface UseVocalBridgeRoomOptions {
  /** Called when Nova sends data; receives the full parsed structure (no parsing). */
  onDailyLogReceived: (data: unknown) => void;
}

export function useVocalBridgeRoom(options: UseVocalBridgeRoomOptions) {
  const { onDailyLogReceived } = options;
  const onDailyLogRef = useRef(onDailyLogReceived);
  onDailyLogRef.current = onDailyLogReceived;

  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioElementsRef = useRef<HTMLMediaElement[]>([]);

  useEffect(() => {
    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        onDailyLogRef.current(data);
      } catch {
        // ignore
      }
    };

    const handleTrackSubscribed = (
      track: import('livekit-client').RemoteTrack,
      _publication: import('livekit-client').RemoteTrackPublication,
      _participant: import('livekit-client').RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        audioElementsRef.current.push(el);
        document.body.appendChild(el);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.Connected, () => {
      setIsConnected(true);
      setError(null);
    });
    room.on(RoomEvent.Disconnected, () => {
      setIsConnected(false);
      audioElementsRef.current.forEach((el) => el.remove());
      audioElementsRef.current = [];
    });

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      audioElementsRef.current.forEach((el) => el.remove());
      audioElementsRef.current = [];
      room.disconnect();
    };
  }, [room]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
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
      await room.connect(livekit_url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMicEnabled(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [room]);

  const disconnect = useCallback(async () => {
    await room.disconnect();
  }, [room]);

  const toggleMic = useCallback(async () => {
    const next = !isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setIsMicEnabled(next);
  }, [room, isMicEnabled]);

  return { isConnected, isConnecting, isMicEnabled, error, connect, disconnect, toggleMic };
}
