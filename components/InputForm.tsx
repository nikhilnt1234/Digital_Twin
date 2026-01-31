
import React, { useState } from 'react';
import { UserInputs, TwinType } from '../types';

interface InputFormProps {
  inputs: UserInputs;
  setInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  onSubmit: () => void;
}

const PERSONAS = [
  {
    id: 'dev',
    label: "Busy Dev",
    sub: "High stress, high income",
    data: {
        heightCm: 175, weightKg: 88, targetWeightKg: 78,
        stepsPerDay: 4200, workoutsPerWeek: 1, averageSleep: 5.5, restingHeartRate: 78,
        bloodPressureSys: 142, bloodPressureDia: 90,
        hba1c: 6.3, ldlCholesterol: 160, triglycerides: 210, eGFR: 85, alt: 55, ast: 50,
        monthlyIncome: 7000, fixedCosts: 3200, currentSavings: 4000, totalDebt: 18000,
        eatingOutSpend: 700, lateNightFoodSpend: 220, alcoholSpend: 250, groceriesSpend: 450,
        subscriptionSpend: 180, gymSpend: 25, wellnessSpend: 0, pharmacySpend: 50,
        lifestyleSpend: 800
    }
  },
  {
    id: 'health',
    label: "Health Nut",
    sub: "Fit body, leaky wallet",
    data: {
        heightCm: 168, weightKg: 64, targetWeightKg: 60,
        stepsPerDay: 8500, workoutsPerWeek: 4, averageSleep: 7.5, restingHeartRate: 62,
        bloodPressureSys: 118, bloodPressureDia: 76,
        hba1c: 5.3, ldlCholesterol: 105, triglycerides: 110, eGFR: 105, alt: 20, ast: 18,
        monthlyIncome: 6000, fixedCosts: 2600, currentSavings: 2500, totalDebt: 4000,
        eatingOutSpend: 450, lateNightFoodSpend: 50, alcoholSpend: 80, groceriesSpend: 550,
        subscriptionSpend: 220, gymSpend: 220, wellnessSpend: 260, pharmacySpend: 30,
        lifestyleSpend: 400
    }
  },
  {
    id: 'student',
    label: "Broke Student",
    sub: "Young, fit, in debt",
    data: {
        heightCm: 180, weightKg: 72, targetWeightKg: 72,
        stepsPerDay: 9000, workoutsPerWeek: 3, averageSleep: 6.8, restingHeartRate: 66,
        bloodPressureSys: 116, bloodPressureDia: 74,
        hba1c: 5.1, ldlCholesterol: 95, triglycerides: 95, eGFR: 110, alt: 15, ast: 15,
        monthlyIncome: 2200, fixedCosts: 1300, currentSavings: 300, totalDebt: 22000,
        eatingOutSpend: 180, lateNightFoodSpend: 40, alcoholSpend: 120, groceriesSpend: 220,
        subscriptionSpend: 70, gymSpend: 0, wellnessSpend: 0, pharmacySpend: 10,
        lifestyleSpend: 100
    }
  }
];

export const InputForm: React.FC<InputFormProps> = ({ inputs, setInputs, onSubmit }) => {
  const [activeSegment, setActiveSegment] = useState<TwinType>(TwinType.LifeTwin);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleSegmentChange = (type: TwinType) => {
      setActiveSegment(type);
      setInputs(prev => ({ ...prev, twinType: type }));
  };

  // Fix: Ensure value is only a number or string to satisfy React input types when name is a keyof UserInputs
  const InputField = ({ label, name, placeholder, icon }: { label: string, name: keyof UserInputs, placeholder: string, icon?: React.ReactNode }) => {
    const rawValue = inputs[name];
    const displayValue = (typeof rawValue === 'number' || typeof rawValue === 'string') ? rawValue : '';

    return (
      <div className="group">
        <label htmlFor={name} className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 group-focus-within:text-blue-600 transition-colors">{label}</label>
        <div className="relative">
            {icon && (
              <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                  {icon}
              </div>
            )}
            <input 
              id={name}
              type="number" 
              name={name} 
              value={displayValue} 
              onChange={handleChange} 
              className={`w-full ${icon ? 'pl-9' : 'px-3'} py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium font-mono text-slate-700 transition-all placeholder:font-sans`} 
              placeholder={placeholder} 
            />
        </div>
      </div>
    );
  };

  const loadPersona = (personaId: string) => {
    const persona = PERSONAS.find(p => p.id === personaId);
    if (!persona) return;

    setIsSyncing(personaId);
    setTimeout(() => {
        setInputs(prev => ({
            ...prev,
            ...persona.data
        }));
        setIsSyncing(null);
    }, 600);
  };

  // Icons
  const Icons = {
    steps: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, // Generic chart/steps
    dumbbell: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, // Lightning
    sleep: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
    blood: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    dollar: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-in zoom-in-95 duration-500">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        {/* Top Decorative Line */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-600 w-full"></div>

        <div className="p-8 md:p-12">
            
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Initialize Simulation</h2>
                <p className="text-slate-500 text-sm">Configure your twin parameters to generate your forecast.</p>
                
                {/* Segmented Control */}
                <div className="inline-flex bg-slate-100 p-1 rounded-xl mt-6">
                    {(Object.values(TwinType) as TwinType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => handleSegmentChange(type)}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeSegment === type 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                {/* Divider for desktop */}
                <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-100 -ml-px"></div>

                {/* Left: Body Inputs */}
                <div className={`space-y-6 transition-opacity duration-300 ${activeSegment === 'MoneyTwin' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-slate-800">Body Parameters</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Height (cm)" name="heightCm" placeholder="175" />
                        <InputField label="Weight (kg)" name="weightKg" placeholder="80" />
                        <InputField label="Steps/Day" name="stepsPerDay" placeholder="5000" icon={Icons.steps} />
                        <InputField label="Workouts/Wk" name="workoutsPerWeek" placeholder="2" icon={Icons.dumbbell} />
                        <InputField label="Sleep (hrs)" name="averageSleep" placeholder="7.5" icon={Icons.sleep} />
                        <InputField label="HbA1c %" name="hba1c" placeholder="5.7" icon={Icons.blood} />
                    </div>
                </div>

                {/* Right: Money Inputs */}
                 <div className={`space-y-6 transition-opacity duration-300 ${activeSegment === 'BodyTwin' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                     <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-slate-800">Money Parameters</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Monthly Income" name="monthlyIncome" placeholder="5000" icon={Icons.dollar} />
                        <InputField label="Fixed Costs" name="fixedCosts" placeholder="2500" icon={Icons.dollar} />
                        <InputField label="Savings" name="currentSavings" placeholder="10000" icon={Icons.dollar} />
                        <InputField label="Total Debt" name="totalDebt" placeholder="2000" icon={Icons.dollar} />
                        <InputField label="Eating Out" name="eatingOutSpend" placeholder="400" icon={Icons.dollar} />
                        <InputField label="Lifestyle" name="lifestyleSpend" placeholder="1500" icon={Icons.dollar} />
                    </div>
                </div>
            </div>

            <div className="mt-12 flex flex-col items-center gap-6">
                <button 
                    onClick={onSubmit}
                    className="group relative px-8 py-4 bg-slate-900 text-white rounded-2xl font-semibold shadow-xl shadow-blue-500/20 hover:scale-105 hover:shadow-blue-500/40 transition-all duration-300 w-full md:w-auto min-w-[300px]"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        Generate Two Futures
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </span>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                
                <div className="w-full max-w-2xl border-t border-slate-100 pt-6">
                   <p className="text-center text-xs text-slate-400 font-semibold uppercase tracking-wider mb-4">Or Load a Persona</p>
                   <div className="grid grid-cols-3 gap-3">
                      {PERSONAS.map(p => (
                          <button 
                             key={p.id}
                             onClick={() => loadPersona(p.id)}
                             disabled={isSyncing !== null}
                             className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${isSyncing === p.id ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                          >
                             {isSyncing === p.id ? (
                                 <svg className="w-5 h-5 text-blue-500 animate-spin mb-1" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             ) : (
                                 <span className="font-bold text-slate-700 text-sm">{p.label}</span>
                             )}
                             <span className="text-[10px] text-slate-400">{p.sub}</span>
                          </button>
                      ))}
                   </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
