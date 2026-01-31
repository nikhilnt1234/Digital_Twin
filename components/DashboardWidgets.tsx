import React from 'react';
import { UserInputs, Recommendation } from '../types';

// Shared Icon Components for consistency
const Icons = {
  Medical: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Watch: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Bank: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  Balance: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>,
  Heart: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  Money: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  TrendUp: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
};

export const DataSourcesStrip: React.FC = () => {
  const sources = [
    { name: 'Medical Records', status: 'Connected', time: 'Synced 2h ago', icon: <Icons.Medical />, active: true },
    { name: 'Health Watch', status: 'Connected', time: 'Live', icon: <Icons.Watch />, active: true },
    { name: 'Bank & Cards', status: 'Connected', time: 'Synced 10m ago', icon: <Icons.Bank />, active: true },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {sources.map((s, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm group hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-500 border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors`}>
              {s.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">{s.name}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {s.status} • {s.time}
              </div>
            </div>
          </div>
          <div className="text-slate-300 group-hover:text-blue-400 transition-colors">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TradeOffsCard: React.FC<{ inputs: UserInputs }> = ({ inputs }) => {
  // Logic to generate paired benefits
  const tradeoffs = [
    {
      action: "Shift 50% of 'Eating Out' to 'Groceries'",
      health: "Reduces sodium & caloric intake (~300kcal/day)",
      money: `Saves approx $${Math.round(inputs.eatingOutSpend * 0.3)}/month`
    },
    {
      action: "Prioritize 7.5h Sleep Schedule",
      health: "Lowers cortisol & improves glucose recovery",
      money: "Increases decision quality & productivity"
    },
    {
      action: inputs.alcoholSpend > 50 ? "Cut Alcohol consumption by half" : "Add 2 Home Workouts per week",
      health: inputs.alcoholSpend > 50 ? "Improves liver enzymes (ALT) & sleep quality" : "Improves cardiovascular efficiency",
      money: inputs.alcoholSpend > 50 ? `Saves approx $${Math.round(inputs.alcoholSpend * 0.5)}/month` : "Zero cost vs $50+ gym membership"
    }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>

      <h3 className="text-lg font-bold mb-6 flex items-center gap-3 relative z-10">
        <span className="text-blue-400"><Icons.Balance /></span> 
        Health ↔ Money Trade-offs
      </h3>
      <div className="grid gap-4 relative z-10">
        {tradeoffs.map((t, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors group">
            <div className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:scale-125 transition-transform"></span>
                {t.action}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
               <div className="flex items-start gap-2 text-emerald-300">
                  <span className="mt-0.5 opacity-70"><Icons.Heart /></span>
                  <span>{t.health}</span>
               </div>
               <div className="flex items-start gap-2 text-indigo-300">
                  <span className="mt-0.5 opacity-70"><Icons.Money /></span>
                  <span>{t.money}</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProgressStrip: React.FC<{ inputs: UserInputs }> = ({ inputs }) => {
  // Mock deltas for "30-day progress"
  const weightDelta = -0.8;
  const runwayDelta = +0.2;
  const sleepDays = 18;

  const Metric = ({ label, value, delta, unit, isGood }: any) => (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-xl font-mono font-bold text-slate-700">{value}</span>
        {delta && (
          <span className={`text-xs font-medium ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
            {delta > 0 ? '+' : ''}{delta} {unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-6 shadow-sm">
      <div className="flex items-center gap-3">
         <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Icons.TrendUp />
         </div>
         <span className="font-bold text-sm text-slate-800 leading-tight">30-Day<br/>Velocity</span>
      </div>
      <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
      
      <Metric label="Weight Change" value={(inputs.weightKg).toFixed(1)} delta={weightDelta} unit="kg" isGood={true} />
      <div className="w-px h-10 bg-slate-100 hidden md:block"></div>

      <Metric label="Runway Trend" value={(inputs.currentSavings / (inputs.fixedCosts + inputs.lifestyleSpend)).toFixed(1)} delta={runwayDelta} unit="mo" isGood={true} />
      <div className="w-px h-10 bg-slate-100 hidden md:block"></div>

      <Metric label="Eating Out" value={`$${inputs.eatingOutSpend}`} delta={-120} unit="mo" isGood={true} />
      <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
      
      <div className="flex flex-col">
         <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Restorative Sleep</span>
         <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-mono font-bold text-slate-700">{sleepDays}</span>
            <span className="text-xs font-medium text-slate-500">nights &ge; 7h</span>
         </div>
      </div>
    </div>
  );
};