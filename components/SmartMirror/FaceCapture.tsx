/**
 * FaceCapture - Center overlay for face/cut check photo capture
 */

import React, { useState, useEffect } from 'react';

interface FaceCaptureProps {
  isVisible: boolean;
  phase: 'frame' | 'countdown' | 'captured' | 'hidden';
  countdownValue?: number;
  capturedImage: string | null;
  previousImage: string | null; // Placeholder for "last time" comparison
  onCapture: () => void;
  onSkip: () => void;
}

export const FaceCapture: React.FC<FaceCaptureProps> = ({
  isVisible,
  phase,
  countdownValue,
  capturedImage,
  previousImage,
  onCapture,
  onSkip,
}) => {
  if (!isVisible || phase === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center">
      {/* Face Frame */}
      {(phase === 'frame' || phase === 'countdown') && (
        <div className="relative">
          {/* Oval frame */}
          <div
            className="w-48 h-64 border-4 border-dashed border-white/60 rounded-[50%] flex items-center justify-center"
            style={{
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
            }}
          >
            {phase === 'countdown' && countdownValue !== undefined && (
              <div className="text-white text-6xl font-bold animate-pulse">
                {countdownValue}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-center">
            <div
              className="px-6 py-3 rounded-xl"
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {phase === 'frame' && (
                <>
                  <p className="text-white font-medium mb-2">Align your face in the frame</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={onCapture}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Capture Photo
                    </button>
                    <button
                      onClick={onSkip}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 text-sm font-medium rounded-lg transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </>
              )}
              {phase === 'countdown' && (
                <p className="text-white font-medium">Hold still...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Captured view with comparison */}
      {phase === 'captured' && capturedImage && (
        <div
          className="p-6 rounded-2xl max-w-md"
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400 font-semibold">Photo Captured</span>
          </div>

          <div className="flex gap-4 mb-4">
            {/* Previous (placeholder) */}
            <div className="flex-1">
              <div className="text-white/50 text-xs mb-2 text-center">Last Check-in</div>
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white/10">
                {previousImage ? (
                  <img src={previousImage} alt="Previous" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                    No previous
                  </div>
                )}
              </div>
            </div>

            {/* Current */}
            <div className="flex-1">
              <div className="text-white/50 text-xs mb-2 text-center">Today</div>
              <div className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-violet-500">
                <img 
                  src={capturedImage} 
                  alt="Today" 
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} 
                />
              </div>
            </div>
          </div>

          <p className="text-white/60 text-xs text-center">
            Attached to today's check-in. If you notice increasing redness, warmth, or fever, contact a clinician.
          </p>
        </div>
      )}
    </div>
  );
};

export default FaceCapture;
