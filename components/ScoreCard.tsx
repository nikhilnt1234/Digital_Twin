import React from 'react';

interface ScoreCardProps {
  title: string;
  score: number | null;
  colorClass: string; // e.g., 'text-emerald-600'
  bgClass: string; // e.g., 'bg-emerald-50'
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ title, score, colorClass, bgClass }) => {
  if (score === null) return null;

  let label = "Needs Attention";
  let barColor = "bg-rose-500";
  
  if (score >= 80) {
      label = "Optimal";
      barColor = "bg-emerald-500";
  } else if (score >= 60) {
      label = "Good";
      barColor = "bg-blue-500";
  } else if (score >= 40) {
      label = "Fair";
      barColor = "bg-amber-500";
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col justify-between h-full min-w-[140px]">
      <div className="flex justify-between items-start mb-2">
         <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
         <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600`}>
            {label}
         </span>
      </div>
      
      <div className="mt-2">
        <div className={`text-4xl font-mono font-bold tracking-tight ${colorClass}`}>
            {score}
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
        <div 
            className={`h-1.5 rounded-full transition-all duration-1000 ${barColor}`} 
            style={{ width: `${score}%` }}
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
        ></div>
      </div>
    </div>
  );
};