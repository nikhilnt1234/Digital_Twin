import React, { useState } from 'react';
import { PersonaType, UserInputs, TwinType } from '../types';

interface OnboardingProps {
  onComplete: (persona: PersonaType, prefilledInputs?: Partial<UserInputs>) => void;
}

// Persona definitions with pre-filled data for diabetic condition
const PERSONAS: {
  id: PersonaType;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  defaultInputs: Partial<UserInputs>;
}[] = [
  {
    id: 'custom',
    name: 'Custom Profile',
    description: 'Start from scratch and enter your own health & financial data.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    defaultInputs: {},
  },
  {
    id: 'prediabetic',
    name: 'Pre-Diabetic',
    description: 'Track glucose, weight, meals & exercise with daily monitoring optimized for metabolic health.',
    badge: 'Condition Tracking',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    defaultInputs: {
      twinType: TwinType.LifeTwin,
      persona: 'prediabetic',
      // Pre-filled typical pre-diabetic profile
      heightCm: 170,
      weightKg: 88,
      previousWeightKg: 86,
      targetWeightKg: 75,
      stepsPerDay: 4500,
      workoutsPerWeek: 1,
      restingHeartRate: 78,
      averageSleep: 6.2,
      // Lab values typical for pre-diabetic
      bloodPressureSys: 135,
      bloodPressureDia: 88,
      hba1c: 5.9, // Pre-diabetic range: 5.7-6.4%
      fastingGlucose: 115, // Pre-diabetic range: 100-125 mg/dL
      cholesterol: 210,
      ldlCholesterol: 135,
      hdlCholesterol: 42,
      triglycerides: 180,
      alt: 38,
      ast: 32,
      creatinine: 1.1,
      eGFR: 85,
      // Financial profile
      monthlyIncome: 5500,
      fixedCosts: 2200,
      lifestyleSpend: 800,
      currentSavings: 8500,
      totalDebt: 4500,
      debtInterestRate: 18,
      groceriesSpend: 450,
      eatingOutSpend: 380,
      alcoholSpend: 120,
      lateNightFoodSpend: 95,
      gymSpend: 0,
      pharmacySpend: 85,
      wellnessSpend: 0,
      subscriptionSpend: 65,
    },
  },
  {
    id: 'diabetic_type2',
    name: 'Type 2 Diabetic',
    description: 'Comprehensive monitoring for T2D management including medication costs, glucose patterns & lifestyle factors.',
    badge: 'Condition Tracking',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    defaultInputs: {
      twinType: TwinType.LifeTwin,
      persona: 'diabetic_type2',
      // Pre-filled typical Type 2 diabetic profile
      heightCm: 175,
      weightKg: 95,
      previousWeightKg: 93,
      targetWeightKg: 80,
      stepsPerDay: 3200,
      workoutsPerWeek: 0,
      restingHeartRate: 82,
      averageSleep: 5.8,
      // Lab values for managed T2D
      bloodPressureSys: 142,
      bloodPressureDia: 92,
      hba1c: 7.2, // Diabetic: ≥6.5%
      fastingGlucose: 145, // Diabetic: ≥126 mg/dL
      cholesterol: 235,
      ldlCholesterol: 155,
      hdlCholesterol: 38,
      triglycerides: 220,
      alt: 45,
      ast: 40,
      creatinine: 1.3,
      eGFR: 72,
      // Financial profile with higher medical costs
      monthlyIncome: 5000,
      fixedCosts: 2400,
      lifestyleSpend: 600,
      currentSavings: 5200,
      totalDebt: 8500,
      debtInterestRate: 22,
      groceriesSpend: 520,
      eatingOutSpend: 280,
      alcoholSpend: 60,
      lateNightFoodSpend: 45,
      gymSpend: 0,
      pharmacySpend: 245, // Higher due to diabetes medications
      wellnessSpend: 0,
      subscriptionSpend: 55,
      // Medical debt
      medicalDebtTotal: 3200,
      medicalDebtInterest: 12,
      medicalDebtMonthly: 150,
    },
  },
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);

  const steps = [
    {
      title: "Welcome to DigiCare",
      subtitle: "The future of your holistic well-being.",
      description: "We build a digital twin of your body and your finances. By analyzing your past data, we forecast your future self.",
      icon: (
        <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    {
      title: "BodyTwin & MoneyTwin",
      subtitle: "Health and Wealth are connected.",
      description: "Your habits define your future. We simulate how small changes—like cooking more or sleeping better—impact both your waistline and your wallet.",
      icon: (
        <div className="flex gap-4">
             <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
             </div>
             <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
        </div>
      )
    },
    {
      title: "Choose Your Profile",
      subtitle: "Select a starting point.",
      description: "Pick a condition-specific profile for optimized tracking, or start with a blank slate.",
      icon: (
        <svg className="w-16 h-16 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      isPersonaStep: true
    },
    {
      title: "AI Powered Coaching",
      subtitle: "Actionable insights, not just data.",
      description: "Ask questions, get forecasts, and find the path of least resistance to a better life. Let's build your twin.",
      icon: (
        <svg className="w-16 h-16 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    }
  ];

  const handleNext = () => {
    // If on persona step and no selection, default to custom
    if ((steps[step] as any).isPersonaStep && !selectedPersona) {
      setSelectedPersona('custom');
    }
    
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      const persona = selectedPersona || 'custom';
      const personaData = PERSONAS.find(p => p.id === persona);
      onComplete(persona, personaData?.defaultInputs);
    }
  };

  const handlePersonaSelect = (personaId: PersonaType) => {
    setSelectedPersona(personaId);
  };

  const currentStep = steps[step] as any;
  const isPersonaStep = currentStep.isPersonaStep;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in duration-500 my-auto">
        
        {!isPersonaStep && (
          <div className="flex justify-center mb-8">
              {currentStep.icon}
          </div>
        )}

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {currentStep.title}
          </h1>
          <h2 className="text-xl font-medium text-slate-600">
            {currentStep.subtitle}
          </h2>
          <p className="text-slate-500 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Persona Selection Grid */}
        {isPersonaStep && (
          <div className="grid gap-4 mt-8">
            {PERSONAS.map((persona) => (
              <button
                key={persona.id}
                onClick={() => handlePersonaSelect(persona.id)}
                className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                  selectedPersona === persona.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Selection indicator */}
                {selectedPersona === persona.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                    persona.id === 'prediabetic' 
                      ? 'bg-amber-100 text-amber-600' 
                      : persona.id === 'diabetic_type2'
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {persona.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800">{persona.name}</h3>
                      {persona.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${persona.badgeColor}`}>
                          {persona.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {persona.description}
                    </p>
                    
                    {/* Feature highlights for condition profiles */}
                    {(persona.id === 'prediabetic' || persona.id === 'diabetic_type2') && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Daily Tracking</span>
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Glucose Monitor</span>
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Meal Cost</span>
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Exercise Log</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-2 py-8">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={isPersonaStep && !selectedPersona}
          className={`w-full py-4 rounded-2xl font-semibold shadow-lg transition-all active:scale-95 ${
            isPersonaStep && !selectedPersona
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {step === steps.length - 1 ? "Start Engine" : "Next"}
        </button>
      </div>
    </div>
  );
};