/**
 * MetricsPanel - Left side translucent overlay showing health + finance metrics
 */

import React from 'react';

interface MetricsPanelProps {
  // Health metrics
  sleepHours: number | null;
  movementMinutes: number | null;
  carbSugarFlag: boolean | null;
  carbSugarItem: string | null;
  
  // Finance metrics
  diningOutSpend: number | null;
  targetDiningToday: number;
  
  // Streak
  streakDays: number;
  
  // Animation triggers
  highlightField?: 'sleep' | 'movement' | 'carb' | 'dining' | null;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  movementMinutes,
  carbSugarFlag,
  carbSugarItem,
  sleepHours,
  diningOutSpend,
  targetDiningToday,
  streakDays,
  highlightField,
}) => {
  const getHighlightClass = (field: string) => {
    if (highlightField === field) {
      return 'bg-emerald-500/30 scale-105 transition-all duration-300';
    }
    return 'transition-all duration-300';
  };

  return (
    <div
      className="fixed left-6 top-1/2 -translate-y-1/2 w-72 z-10"
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Health Section */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-white/90 font-semibold text-sm uppercase tracking-wider">Health Today</h3>
        </div>

        <div className="space-y-3">
          {/* Movement */}
          <div className={`rounded-lg p-2 -mx-2 ${getHighlightClass('movement')}`}>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Movement</span>
              <span className="text-white font-mono font-bold text-lg">
                {movementMinutes !== null ? `${movementMinutes} min` : '-- min'}
              </span>
            </div>
          </div>

          {/* Carb/Sugar Flag */}
          <div className={`rounded-lg p-2 -mx-2 ${getHighlightClass('carb')}`}>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Carb/Sugar</span>
              <span className={`font-medium text-sm ${
                carbSugarFlag === null 
                  ? 'text-white/40' 
                  : carbSugarFlag 
                    ? 'text-amber-400' 
                    : 'text-emerald-400'
              }`}>
                {carbSugarFlag === null 
                  ? '--' 
                  : carbSugarFlag 
                    ? `Yes` 
                    : 'No'}
              </span>
            </div>
            {carbSugarItem && (
              <div className="text-amber-400/80 text-xs mt-1 truncate">
                {carbSugarItem}
              </div>
            )}
          </div>

          {/* Sleep */}
          <div className={`rounded-lg p-2 -mx-2 ${getHighlightClass('sleep')}`}>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Sleep</span>
              <span className={`font-mono text-sm ${
                sleepHours !== null 
                  ? sleepHours >= 7 ? 'text-emerald-400' : 'text-amber-400'
                  : 'text-white/80'
              }`}>
                {sleepHours !== null ? `${sleepHours} hrs` : '-- hrs'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Section */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-white/90 font-semibold text-sm uppercase tracking-wider">Finance Today</h3>
        </div>

        <div className="space-y-3">
          {/* Dining Out */}
          <div className={`rounded-lg p-2 -mx-2 ${getHighlightClass('dining')}`}>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Dining Out</span>
              <span className={`font-mono font-bold text-lg ${
                diningOutSpend !== null && diningOutSpend > targetDiningToday 
                  ? 'text-rose-400' 
                  : 'text-white'
              }`}>
                {diningOutSpend !== null ? `$${diningOutSpend}` : '$--'}
              </span>
            </div>
          </div>

          {/* Target */}
          <div className="rounded-lg p-2 -mx-2 bg-white/5">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Target Today</span>
              <span className="text-emerald-400 font-medium text-sm">
                ≤ ${targetDiningToday}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Section */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🔥</div>
          <div>
            <div className="text-white font-bold">{streakDays}-Day Streak</div>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-2 rounded-full ${
                    i < Math.min(streakDays, 7) ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
