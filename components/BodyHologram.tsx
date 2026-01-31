
import React from 'react';
import { UserInputs, DailyEntry } from '../types';

export const BodyHologram: React.FC<{ inputs: UserInputs; todayEntry?: DailyEntry | null }> = ({ inputs, todayEntry }) => {
  // Use todayEntry values if available, otherwise fall back to inputs
  const sleepHours = todayEntry?.sleepHours ?? inputs.averageSleep;
  const exerciseMinutes = todayEntry?.exerciseMinutes ?? 0;
  const mealsCost = todayEntry?.mealsCost ?? todayEntry?.diningOutSpend ?? 0;
  
  // Logic for identifying hotspots based on health data
  const alerts = [];

  // Brain/Sleep (Top Head)
  if (sleepHours > 0 && sleepHours < 6.5) {
      alerts.push({ id: 'brain', x: 50, y: 15, color: '#fbbf24', label: 'LOW RECOVERY' });
  }

  // Heart (Chest Area)
  if (inputs.bloodPressureSys > 130 || inputs.ldlCholesterol > 130 || inputs.restingHeartRate > 90) {
      alerts.push({ id: 'heart', x: 55, y: 40, color: '#ef4444', label: 'CARDIO LOAD' });
  }

  // Liver (Right Abdomen)
  if (inputs.alt > 40 || (inputs.alcoholSpend > 100)) {
      alerts.push({ id: 'liver', x: 45, y: 55, color: '#f59e0b', label: 'LIVER STRESS' });
  }

  // Metabolism/Gut (Center)
  const heightM = inputs.heightCm / 100;
  const bmi = inputs.heightCm > 0 ? inputs.weightKg / (heightM * heightM) : 0;
  
  if (inputs.hba1c > 5.7 || bmi > 30 || mealsCost > 40) {
       alerts.push({ id: 'gut', x: 50, y: 65, color: '#f97316', label: 'METABOLIC' });
  }
  
  // Kidneys
  if (inputs.eGFR > 0 && inputs.eGFR < 60) {
      alerts.push({ id: 'kidneys', x: 58, y: 60, color: '#ef4444', label: 'RENAL FUNC' });
  }
  
  // Legs/Movement (Lower Body)
  if (exerciseMinutes < 20) {
      alerts.push({ id: 'legs', x: 50, y: 130, color: '#fbbf24', label: 'LOW MOVEMENT' });
  } else if (exerciseMinutes >= 30) {
      alerts.push({ id: 'legs', x: 50, y: 130, color: '#10b981', label: 'ACTIVE' });
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-6 bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 h-full min-h-[500px] group transition-all duration-700 hover:border-cyan-500/30">
        
        {/* === Background Grid & Effects === */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ 
            backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
        }}></div>

        {/* Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>

        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-blue-500/5 pointer-events-none"></div>

        {/* Interactive HUD Circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
             <div className="w-[120%] h-[120%] border border-cyan-500/10 rounded-full animate-[spin_20s_linear_infinite]"></div>
             <div className="w-[90%] h-[90%] border border-blue-500/5 rounded-full absolute border-dashed animate-[spin_15s_linear_infinite_reverse]"></div>
             <div className="w-[70%] h-[70%] border border-cyan-400/10 rounded-full absolute animate-[pulse_4s_ease-in-out_infinite]"></div>
        </div>

        {/* === Main SVG Render === */}
        <div className="relative z-10 w-full h-full max-w-[280px] flex items-center justify-center">
            <svg viewBox="0 0 100 220" className="w-full h-full drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <defs>
                    <linearGradient id="holoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                        <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#0891b2" stopOpacity="0.5" />
                    </linearGradient>
                    <pattern id="hexGrid" patternUnits="userSpaceOnUse" width="6" height="6">
                        <path d="M0 6L6 0" stroke="#22d3ee" strokeWidth="0.3" opacity="0.3"/>
                    </pattern>
                    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* --- Body Segments (Technical Wireframe Style) --- */}
                
                {/* Head */}
                <path d="M50 8 L56 10 L58 18 L55 24 L45 24 L42 18 L44 10 Z" 
                      fill="url(#holoGrad)" stroke="#22d3ee" strokeWidth="0.8" className="opacity-90" />
                
                {/* Torso Upper */}
                <path d="M32 30 L68 30 L74 38 L68 65 L32 65 L26 38 Z" 
                      fill="url(#holoGrad)" stroke="#22d3ee" strokeWidth="0.8" className="opacity-80" />
                
                {/* Abdomen / Waist */}
                <path d="M34 68 L66 68 L63 85 L37 85 Z" 
                      fill="url(#hexGrid)" stroke="#22d3ee" strokeWidth="0.8" className="opacity-70" />

                {/* Pelvis */}
                <path d="M36 88 L64 88 L68 102 L32 102 Z" 
                      fill="url(#holoGrad)" stroke="#22d3ee" strokeWidth="0.8" className="opacity-80" />

                {/* Left Arm */}
                <path d="M28 32 L18 35 L14 65 L22 68 L28 40 Z" fill="url(#holoGrad)" stroke="#22d3ee" strokeWidth="0.6" opacity="0.5" />
                <path d="M14 70 L18 70 L16 100 L12 98 Z" fill="url(#hexGrid)" stroke="#22d3ee" strokeWidth="0.6" opacity="0.4" />
                
                {/* Right Arm */}
                <path d="M72 32 L82 35 L86 65 L78 68 L72 40 Z" fill="url(#holoGrad)" stroke="#22d3ee" strokeWidth="0.6" opacity="0.5" />
                <path d="M86 70 L82 70 L84 100 L88 98 Z" fill="url(#hexGrid)" stroke="#22d3ee" strokeWidth="0.6" opacity="0.4" />

                {/* Left Leg */}
                <path d="M35 105 L48 105 L45 150 L35 150 Z" fill="url(#holoGrad)" stroke="#22d3ee" strokeWidth="0.6" opacity="0.5" />
                <path d="M36 155 L44 155 L42 205 L34 205 Z" fill="url(#hexGrid)" stroke="#22d3ee" strokeWidth="0.6" opacity="0.4" />

                {/* Right Leg */}
                <path d="M52 105 L65 105 L65 150 L55 150 Z" fill="url(#holoGrad)" stroke="#22d3ee" strokeWidth="0.6" opacity="0.5" />
                <path d="M56 155 L64 155 L66 205 L58 205 Z" fill="url(#hexGrid)" stroke="#22d3ee" strokeWidth="0.6" opacity="0.4" />

                {/* --- Hotspots & HUD Labels --- */}
                {alerts.map((a, idx) => (
                    <g key={a.id} className="animate-in fade-in zoom-in duration-500">
                        {/* Connection Line */}
                        <path 
                            d={`M ${a.x} ${a.y} L ${a.x > 50 ? a.x + 20 : a.x - 20} ${a.y - 15} L ${a.x > 50 ? a.x + 45 : a.x - 45} ${a.y - 15}`}
                            fill="none" 
                            stroke={a.color} 
                            strokeWidth="0.8" 
                            opacity="0.8"
                            strokeDasharray="2 2"
                        />
                        
                        {/* Core Point with double ring */}
                        <circle cx={a.x} cy={a.y} r="3" fill={a.color} filter="url(#neonGlow)" />
                        <circle cx={a.x} cy={a.y} r="6" fill="none" stroke={a.color} strokeWidth="0.5" opacity="0.4">
                            <animate attributeName="r" values="4;9" dur="1.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.6;0" dur="1.5s" repeatCount="indefinite" />
                        </circle>

                        {/* Label Background */}
                        <rect 
                            x={a.x > 50 ? a.x + 15 : a.x - 48} 
                            y={a.y - 24} 
                            width="35" 
                            height="12" 
                            fill="#0f172a" 
                            stroke={a.color}
                            strokeWidth="0.5"
                            opacity="0.9"
                            rx="2"
                        />
                        <text 
                            x={a.x > 50 ? a.x + 32.5 : a.x - 30.5} 
                            y={a.y - 16} 
                            fill={a.color} 
                            fontSize="3.5" 
                            fontFamily="monospace" 
                            fontWeight="bold" 
                            textAnchor="middle" 
                            className="tracking-tighter"
                        >
                            {a.label}
                        </text>
                    </g>
                ))}

                {/* --- Vertical Scanning Laser --- */}
                <g>
                    <rect x="5" y="0" width="90" height="1.5" fill="#22d3ee" opacity="0.8" filter="url(#neonGlow)">
                        <animate attributeName="y" from="0" to="220" dur="4s" repeatCount="indefinite" />
                    </rect>
                    <rect x="5" y="0" width="90" height="15" fill="url(#holoGrad)" opacity="0.1">
                        <animate attributeName="y" from="-15" to="205" dur="4s" repeatCount="indefinite" />
                    </rect>
                </g>
            </svg>
        </div>
        
        {/* Today's Vitals from Mirror Check-in */}
        {todayEntry && (todayEntry.weightKg || todayEntry.sleepHours || todayEntry.exerciseMinutes || todayEntry.mealsCost || todayEntry.diningOutSpend) && (
          <div className="absolute top-16 left-4 right-4 flex justify-center">
            <div className="flex items-center gap-3 bg-slate-900/80 border border-cyan-500/30 px-4 py-2 rounded-lg backdrop-blur-sm">
              {todayEntry.weightKg && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  <span className="text-[10px] font-mono text-cyan-300">{todayEntry.weightKg}kg</span>
                </div>
              )}
              {todayEntry.sleepHours && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="text-[10px] font-mono text-indigo-300">{todayEntry.sleepHours}hrs</span>
                </div>
              )}
              {todayEntry.exerciseMinutes && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-[10px] font-mono text-emerald-300">{todayEntry.exerciseMinutes}min</span>
                </div>
              )}
              {(todayEntry.mealsCost || todayEntry.diningOutSpend) && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-mono text-amber-300">${todayEntry.mealsCost || todayEntry.diningOutSpend}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technical HUD Overlay (Corners) */}
        <div className="absolute top-4 left-4 text-[9px] font-mono text-cyan-500/60 leading-tight select-none uppercase">
            [SYS_BIO_ENGINE: v4.2]<br/>
            [LOC_TRACK: ACTIVE]<br/>
            [REF_POINT: CENTER]
        </div>
        <div className="absolute top-4 right-4 text-[9px] font-mono text-cyan-500/60 text-right leading-tight select-none uppercase">
            [HOLOGRAPHIC_MODE]<br/>
            [FREQ: 60HZ]<br/>
            [SIG_STR: HIGH]
        </div>

        {/* Footer Status Bar */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-700 px-6 py-2 rounded-full backdrop-blur-md shadow-lg group-hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${alerts.length > 0 ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]' : 'bg-cyan-500 animate-pulse shadow-[0_0_8px_#06b6d4]'}`}></div>
                    <span className={`text-[11px] font-bold font-mono tracking-widest ${alerts.length > 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                        {alerts.length > 0 ? `${alerts.length} ANOMALIES` : 'SYSTEM NOMINAL'}
                    </span>
                </div>
                <div className="h-4 w-px bg-slate-700"></div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                    {new Date().toLocaleTimeString()} :: BIOMETRIC_FEED
                </div>
            </div>
        </div>
    </div>
  );
};
