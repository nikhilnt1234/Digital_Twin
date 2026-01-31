/**
 * MirrorStatusChip - Status indicator for voice/save states
 */

import React from 'react';

export type StatusType = 'listening' | 'saving' | 'updated' | 'capturing' | 'idle' | 'complete';

interface MirrorStatusChipProps {
  status: StatusType;
  updatedField?: string;
}

export const MirrorStatusChip: React.FC<MirrorStatusChipProps> = ({ status, updatedField }) => {
  const configs: Record<StatusType, { icon: React.ReactNode; text: string; className: string }> = {
    listening: {
      icon: (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
      ),
      text: 'Listening...',
      className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    saving: {
      icon: (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ),
      text: 'Saving...',
      className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    updated: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      text: updatedField ? `Updated ${updatedField}` : 'Updated',
      className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    capturing: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      text: 'Capturing...',
      className: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    },
    idle: {
      icon: null,
      text: '',
      className: 'opacity-0',
    },
    complete: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: 'Check-in Complete',
      className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  };

  const config = configs[status];

  if (status === 'idle') return null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm transition-all duration-300 ${config.className}`}
    >
      {config.icon}
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
};

export default MirrorStatusChip;
