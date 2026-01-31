import React from 'react';

interface TrendIndicatorProps {
  status: 'improving' | 'stable' | 'worsening';
  label?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ status, label }) => {
  const config = {
    improving: { 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50', 
      border: 'border-emerald-100',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    stable: { 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      border: 'border-blue-100',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      )
    },
    worsening: { 
      color: 'text-rose-600', 
      bg: 'bg-rose-50', 
      border: 'border-rose-100',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      )
    },
  };

  const c = config[status];

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.color} ${c.bg} ${c.border}`}
      role="status"
      aria-label={`Trend is ${status}`}
    >
       {c.icon}
       <span>{label || status}</span>
    </span>
  );
};