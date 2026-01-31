import React from 'react';
import { UserInputs, DailyEntry } from '../types';

export const VitalsPanel: React.FC<{ inputs: UserInputs; todayEntry?: DailyEntry | null }> = ({ inputs, todayEntry }) => {
  // Use todayEntry values if available
  const weight = todayEntry?.weightKg ?? inputs.weightKg;
  const sleepHours = todayEntry?.sleepHours ?? inputs.averageSleep;
  const exerciseMinutes = todayEntry?.exerciseMinutes ?? 0;
  const steps = todayEntry?.stepsCount ?? inputs.stepsPerDay;
  
  const bmi = inputs.heightCm && weight ? (weight / Math.pow(inputs.heightCm/100, 2)).toFixed(1) : '--';
  
  const VitalRow = ({ label, value, unit, avg, highlight }: { label: string, value: string | number, unit: string, avg?: string, highlight?: boolean }) => (
    <div className={`flex justify-between items-center py-3 border-b border-slate-50 last:border-0 ${highlight ? 'bg-emerald-50/50 -mx-2 px-2 rounded-lg' : ''}`}>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        {avg && <span className="text-[10px] text-slate-400">30d avg: {avg}</span>}
        {highlight && <span className="text-[10px] text-emerald-600 font-medium">From Mirror</span>}
      </div>
      <div className="text-right">
        <div className={`text-base font-mono font-bold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value} <span className="text-xs font-sans font-normal text-slate-400">{unit}</span></div>
      </div>
    </div>
  );

  // Check if we have meals data
  const hasMealsData = todayEntry?.mealsDescription || todayEntry?.proteinGrams || todayEntry?.carbsGrams;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Today's Vitals
      </h3>
      <div className="flex flex-col">
        <VitalRow label="Weight" value={weight || '--'} unit="kg" avg={(inputs.weightKg + 0.5).toFixed(1)} highlight={!!todayEntry?.weightKg} />
        <VitalRow label="BMI" value={bmi} unit="" />
        <VitalRow label="Resting HR" value={inputs.restingHeartRate || '--'} unit="bpm" avg={inputs.restingHeartRate ? String(inputs.restingHeartRate + 2) : undefined} />
        <VitalRow label="Blood Pressure" value={inputs.bloodPressureSys ? `${inputs.bloodPressureSys}/${inputs.bloodPressureDia}` : '--/--'} unit="mmHg" />
        <VitalRow label="Sleep" value={sleepHours || '--'} unit="hrs" avg="6.8" highlight={!!todayEntry?.sleepHours} />
        <VitalRow label="Exercise" value={exerciseMinutes || '--'} unit="min" highlight={!!todayEntry?.exerciseMinutes} />
        <VitalRow label="Activity" value={steps ? steps.toLocaleString() : '--'} unit="steps" avg={(inputs.stepsPerDay - 500).toLocaleString()} />
      </div>

      {/* Meals Section */}
      {hasMealsData && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Today's Meals
          </h4>
          
          {/* Meal Description */}
          {todayEntry?.mealsDescription && (
            <div className="bg-amber-50 rounded-lg p-3 mb-3">
              <div className="text-xs text-amber-600 font-medium mb-1">What you ate</div>
              <div className="text-sm font-semibold text-amber-800">{todayEntry.mealsDescription}</div>
              {todayEntry?.sugarFlag && (
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Contains Sugar
                </div>
              )}
            </div>
          )}
          
          {/* Nutritional Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Protein</div>
              <div className="text-lg font-mono font-bold text-emerald-600">
                {todayEntry?.proteinGrams ?? '--'}<span className="text-xs font-normal text-slate-400">g</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Fiber</div>
              <div className="text-lg font-mono font-bold text-blue-600">
                {todayEntry?.fiberGrams ?? '--'}<span className="text-xs font-normal text-slate-400">g</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Carbs</div>
              <div className="text-lg font-mono font-bold text-amber-600">
                {todayEntry?.carbsGrams ?? '--'}<span className="text-xs font-normal text-slate-400">g</span>
              </div>
            </div>
          </div>
        </div>
      )}
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
