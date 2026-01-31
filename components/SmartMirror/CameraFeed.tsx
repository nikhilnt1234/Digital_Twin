/**
 * CameraFeed - Full-screen mirrored webcam component
 * Handles getUserMedia and displays video with mirror transform
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraFeedProps {
  onReady: () => void;
  onError: (error: string) => void;
}

// Store stream outside component to survive React Strict Mode remounts
let globalStream: MediaStream | null = null;
let isInitializing = false;
let isPlaying = false;

export const CameraFeed: React.FC<CameraFeedProps> = ({ onReady, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const hasCalledReady = useRef(false);
  
  // Store callbacks in refs
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  // Safe play function that handles the promise properly
  const safePlay = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    if (isPlaying) {
      console.log('Play already in progress, skipping');
      return false;
    }
    
    isPlaying = true;
    try {
      await video.play();
      console.log('Video playing successfully');
      return true;
    } catch (err: any) {
      // AbortError means play was interrupted - this is expected during remounts
      if (err.name === 'AbortError') {
        console.log('Play interrupted (AbortError) - this is normal during remount');
        return false;
      }
      throw err;
    } finally {
      isPlaying = false;
    }
  }, []);

  const initCamera = useCallback(async () => {
    // Prevent concurrent initialization
    if (isInitializing) {
      console.log('Camera init already in progress, skipping');
      return;
    }
    
    // If already ready, don't re-init
    if (isReady || hasCalledReady.current) {
      console.log('Camera already ready');
      return;
    }

    try {
      isInitializing = true;
      
      // If we already have a global stream, reuse it
      if (globalStream && globalStream.active) {
        console.log('Reusing existing camera stream');
        if (videoRef.current && videoRef.current.srcObject !== globalStream) {
          videoRef.current.srcObject = globalStream;
          const success = await safePlay(videoRef.current);
          if (success && !hasCalledReady.current) {
            hasCalledReady.current = true;
            setIsLoading(false);
            setIsReady(true);
            onReadyRef.current();
          }
        }
        return;
      }

      console.log('Requesting new camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      console.log('Camera access granted');
      globalStream = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const success = await safePlay(videoRef.current);
        if (success && !hasCalledReady.current) {
          hasCalledReady.current = true;
          console.log('Video ready, calling onReady');
          setIsLoading(false);
          setIsReady(true);
          onReadyRef.current();
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      // Only show error for real errors, not AbortError
      if (err.name !== 'AbortError') {
        const message = err?.message || 'Camera access denied';
        onErrorRef.current(message);
        setIsLoading(false);
      }
    } finally {
      isInitializing = false;
    }
  }, [isReady, safePlay]);

  useEffect(() => {
    initCamera();
    
    // Don't cleanup stream on unmount - let it persist for Strict Mode
    // Stream will be cleaned up when leaving the mirror entirely
  }, [initCamera]);

  // Handle video element loadedmetadata event for autoplay
  const handleLoadedMetadata = useCallback(async () => {
    if (videoRef.current && globalStream && !hasCalledReady.current) {
      console.log('Video metadata loaded, attempting play');
      const success = await safePlay(videoRef.current);
      if (success && !hasCalledReady.current) {
        hasCalledReady.current = true;
        setIsLoading(false);
        setIsReady(true);
        onReadyRef.current();
      }
    }
  }, [safePlay]);

  return (
    <>
      {/* Loading state */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-0">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/80 text-lg">Starting camera...</p>
            <p className="text-white/40 text-sm mt-2">Please allow camera access if prompted</p>
          </div>
        </div>
      )}

      {/* Video feed - mirrored */}
      <video
        ref={videoRef}
        playsInline
        muted
        onLoadedMetadata={handleLoadedMetadata}
        className={`fixed inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Subtle vignette overlay for aesthetics */}
      {!isLoading && (
        <div 
          className="fixed inset-0 pointer-events-none z-[1]"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
          }}
        />
      )}
    </>
  );
};

// Cleanup function to be called when leaving mirror mode entirely
export const cleanupCameraStream = () => {
  if (globalStream) {
    console.log('Cleaning up global camera stream');
    globalStream.getTracks().forEach(track => track.stop());
    globalStream = null;
  }
  // Reset flags so next session starts fresh
  isInitializing = false;
  isPlaying = false;
};

export default CameraFeed;
