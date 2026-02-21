/**
 * Nova (Vocal Bridge) voice check-in: connect to LiveKit, receive client_action
 * messages (log_sleep_hours, log_exercise_minutes, log_meals_cost), parse payload
 * and update daily entry; full payload is also stored in notes.
 */

import React from 'react';
import { useVocalBridgeRoom } from '../voice/useVocalBridgeRoom';
import type { DailyEntry } from '../types';

export interface NovaVoicePanelProps {
  isOpen: boolean;
  onClose: () => void;
  todayEntry: DailyEntry | null;
  onUpdateEntry: (entry: DailyEntry | ((prev: DailyEntry | null) => DailyEntry)) => void;
}

function createEmptyEntryForDate(date: string): DailyEntry {
  const now = new Date().toISOString();
  return {
    id: `entry_${date}_${Date.now()}`,
    date,
    weightKg: null,
    sleepHours: null,
    sleepQuality: null,
    mealsCount: null,
    mealsCost: null,
    carbsGrams: null,
    proteinGrams: null,
    fiberGrams: null,
    sugarFlag: null,
    mealsDescription: null,
    caloriesTotal: null,
    exerciseMinutes: null,
    exerciseType: null,
    stepsCount: null,
    fastingGlucose: null,
    postMealGlucose: null,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export const NovaVoicePanel: React.FC<NovaVoicePanelProps> = ({
  isOpen,
  onClose,
  todayEntry,
  onUpdateEntry,
}) => {
  const handleDailyLogReceived = React.useCallback(
    (data: unknown) => {
      const today = new Date().toISOString().split('T')[0];
      const rawJson =
        typeof data === 'object' && data !== null
          ? JSON.stringify(data, null, 2)
          : String(data);
      const notes = `Vocal Bridge payload:\n${rawJson}`;

      onUpdateEntry(prev => {
        const base = prev ?? createEmptyEntryForDate(today);
        let sleepHours = base.sleepHours;
        let exerciseMinutes = base.exerciseMinutes;
        let mealsCost = base.mealsCost;

        const obj = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
        if (obj?.type === 'client_action' && typeof obj?.payload === 'object' && obj.payload !== null) {
          const payload = obj.payload as Record<string, unknown>;
          const num = (v: unknown): number | null => {
            if (v == null) return null;
            if (typeof v === 'number' && !Number.isNaN(v)) return v;
            if (typeof v === 'string') {
              const n = parseFloat(v);
              return Number.isNaN(n) ? null : n;
            }
            return null;
          };
          const action = String(obj.action ?? '');
          if (action === 'log_sleep_hours') {
            sleepHours = num(payload.sleepHours ?? payload.sleep_hours) ?? sleepHours;
          } else if (action === 'log_exercise_minutes') {
            exerciseMinutes = num(payload.exerciseMinutes ?? payload.exercise_minutes) ?? exerciseMinutes;
          } else if (action === 'log_meals_cost') {
            mealsCost = num(payload.mealsCost ?? payload.meals_cost) ?? mealsCost;
          }
        }

        return {
          ...base,
          notes,
          sleepHours,
          exerciseMinutes,
          mealsCost,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [onUpdateEntry]
  );

  const {
    isConnected,
    isConnecting,
    isMicEnabled,
    error,
    connect,
    disconnect,
    toggleMic,
  } = useVocalBridgeRoom({ onDailyLogReceived: handleDailyLogReceived });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Nova Check-in</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Connect to Nova for a quick 30-second check-in. Sleep, movement, and food spend will sync to your dashboard.
        </p>
        {error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {error}
          </div>
        )}
        {!isConnected ? (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                Connecting…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Start Nova Check-in
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected — talk to Nova; data will update when she sends it.
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleMic}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isMicEnabled ? 'bg-slate-200 text-slate-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {isMicEnabled ? 'Mute' : 'Unmute'}
              </button>
              <button
                onClick={disconnect}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                End Call
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
