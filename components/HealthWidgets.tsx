import React from 'react';
import { UserInputs } from '../types';

export const VitalsPanel: React.FC<{ inputs: UserInputs }> = ({ inputs }) => {
  const bmi = inputs.heightCm ? (inputs.weightKg / Math.pow(inputs.heightCm/100, 2)).toFixed(1) : '--';
  
  const VitalRow = ({ label, value, unit, avg }: { label: string, value: string | number, unit: string, avg?: string }) => (
    <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        {avg && <span className="text-[10px] text-slate-400">30d avg: {avg}</span>}
      </div>
      <div className="text-right">
        <div className="text-base font-mono font-bold text-slate-800">{value} <span className="text-xs font-sans font-normal text-slate-400">{unit}</span></div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Today's Vitals
      </h3>
      <div className="flex flex-col">
        <VitalRow label="Weight" value={inputs.weightKg} unit="kg" avg={(inputs.weightKg + 0.5).toFixed(1)} />
        <VitalRow label="BMI" value={bmi} unit="" />
        <VitalRow label="Resting HR" value={inputs.restingHeartRate || '--'} unit="bpm" avg={inputs.restingHeartRate ? String(inputs.restingHeartRate + 2) : undefined} />
        <VitalRow label="Blood Pressure" value={inputs.bloodPressureSys ? `${inputs.bloodPressureSys}/${inputs.bloodPressureDia}` : '--/--'} unit="mmHg" />
        <VitalRow label="Sleep" value={inputs.averageSleep || '--'} unit="hrs" avg="6.8" />
        <VitalRow label="Activity" value={inputs.stepsPerDay.toLocaleString()} unit="steps" avg={(inputs.stepsPerDay - 500).toLocaleString()} />
      </div>
    </div>
  );
};

export const ClinicianSummary: React.FC<{ inputs: UserInputs }> = ({ inputs }) => {
  
  const getStatus = (type: 'meta' | 'cardio' | 'stress') => {
      // Simple mock logic for demonstration
      if (type === 'meta') {
          if (inputs.hba1c > 6.0 || inputs.triglycerides > 180) return { color: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Needs Action' };
          if (inputs.hba1c > 5.7) return { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Monitor' };
          return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Optimal' };
      }
      if (type === 'cardio') {
          if (inputs.ldlCholesterol > 130 || inputs.bloodPressureSys > 130) return { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Elevated Risk' };
          return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Stable' };
      }
      if (type === 'stress') {
          if (inputs.averageSleep < 6.5) return { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Sub-optimal' };
          return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Good' };
      }
      return { color: 'bg-slate-100', label: 'Unknown' };
  };

  const meta = getStatus('meta');
  const cardio = getStatus('cardio');
  const stress = getStatus('stress');

  return (
    <div className="space-y-4">
      {/* Metabolic */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
         <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-slate-800 text-sm">Metabolic Health</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${meta.color} border`}>{meta.label}</span>
         </div>
         <div className="text-xs text-slate-500 mb-3">Markers: A1c, Glucose, Triglycerides</div>
         <p className="text-sm text-slate-700 leading-relaxed">
             {meta.label === 'Optimal' 
                ? "Your glucose control and triglyceride levels suggest high insulin sensitivity." 
                : "Signs of insulin resistance detected. Focus on reducing processed carbs."}
         </p>
      </div>

      {/* Cardiovascular */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
         <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-slate-800 text-sm">Cardiovascular</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${cardio.color} border`}>{cardio.label}</span>
         </div>
         <div className="text-xs text-slate-500 mb-3">Markers: LDL, HDL, BP</div>
         <p className="text-sm text-slate-700 leading-relaxed">
             {cardio.label === 'Stable'
                ? "Lipid profile and blood pressure are within normal ranges."
                : "LDL or Blood Pressure is elevated. Consider dietary adjustments."}
         </p>
      </div>

       {/* Recovery */}
       <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
         <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-slate-800 text-sm">Recovery & Stress</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${stress.color} border`}>{stress.label}</span>
         </div>
         <div className="text-xs text-slate-500 mb-3">Markers: RHR, Sleep Avg</div>
         <p className="text-sm text-slate-700 leading-relaxed">
             {stress.label === 'Good'
                ? "Resting heart rate and sleep duration indicate good somatic recovery."
                : "Sleep duration is below target, potentially impacting cortisol levels."}
         </p>
      </div>
    </div>
  );
};

export const LabResults: React.FC<{ inputs: UserInputs }> = ({ inputs }) => {
  return (
    <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 border-dashed p-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
           <div className="flex items-center gap-3">
               <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               </div>
               <div>
                   <h4 className="font-bold text-slate-800 text-sm">Latest Lab Results</h4>
                   <p className="text-xs text-slate-500">Last panel: Oct 14, 2024</p>
               </div>
           </div>
           <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm transition-all hover:shadow-md">
               Upload New Report (PDF)
           </button>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
               <div className="text-[10px] text-slate-400 font-bold uppercase">HbA1c</div>
               <div className="text-lg font-mono font-bold text-slate-800">{inputs.hba1c || '--'}%</div>
           </div>
           <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
               <div className="text-[10px] text-slate-400 font-bold uppercase">LDL Chol</div>
               <div className="text-lg font-mono font-bold text-slate-800">{inputs.ldlCholesterol || '--'}</div>
           </div>
           <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
               <div className="text-[10px] text-slate-400 font-bold uppercase">eGFR</div>
               <div className="text-lg font-mono font-bold text-slate-800">{inputs.eGFR || '--'}</div>
           </div>
           <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
               <div className="text-[10px] text-slate-400 font-bold uppercase">ALT</div>
               <div className="text-lg font-mono font-bold text-slate-800">{inputs.alt || '--'}</div>
           </div>
       </div>

       <div className="mt-4 flex gap-2 items-start bg-blue-50/50 p-3 rounded-lg">
            <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-xs text-blue-800">
                <strong>Clinician Note:</strong> Kidney function (eGFR) is stable. LDL target is &lt;100 mg/dL; consider increasing fiber intake.
            </p>
       </div>
    </div>
  );
};
