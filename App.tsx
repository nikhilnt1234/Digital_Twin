import React, { useState, useEffect, useCallback } from 'react';
import { UserInputs, TwinType, SimulationResult, DashboardTab, DailyEntry, PersonaType } from './types';
import { InputForm } from './components/InputForm';
import { SimulationCharts } from './components/SimulationCharts';
import { CoachChat } from './components/CoachChat';
import { Onboarding } from './components/Onboarding';
import { runSimulation } from './services/lifeTwinEngine';

// New Widget Imports
import { DataSourcesStrip, TradeOffsCard, ProgressStrip } from './components/DashboardWidgets';
import { VitalsPanel, ClinicianSummary, LabResults } from './components/HealthWidgets';
import { SpendingBreakdown, WealthSnapshot } from './components/MoneyWidgets';
import { BodyHologram } from './components/BodyHologram';
import { HealthConnections, MoneyConnections } from './components/ConnectionsWidgets';

// Daily Tracking for Diabetic Personas
import { DailyTrackingGraphs } from './components/DailyTrackingGraphs';

// Voice Coach
import { VoiceCoachPanel } from './components/VoiceCoachPanel';
import { NovaVoicePanel } from './components/NovaVoicePanel';
import { ChartTarget } from './voice/actionSchema';

// Smart Mirror
import { SmartMirror } from './components/SmartMirror';

const DEFAULT_INPUTS: UserInputs = {
  twinType: TwinType.LifeTwin,
  persona: 'custom',
  heightCm: 0,
  weightKg: 0,
  stepsPerDay: 0,
  workoutsPerWeek: 0,
  monthlyIncome: 0,
  fixedCosts: 0,
  lifestyleSpend: 0,
  currentSavings: 0,
  totalDebt: 0,
  debtInterestRate: 0,
  restingHeartRate: 0,
  averageSleep: 0,
  previousWeightKg: 0,
  bloodPressureSys: 0,
  bloodPressureDia: 0,
  hba1c: 0,
  cholesterol: 0,
  ldlCholesterol: 0,
  hdlCholesterol: 0,
  triglycerides: 0,
  fastingGlucose: 0,
  alt: 0,
  ast: 0,
  creatinine: 0,
  eGFR: 0,
  groceriesSpend: 0,
  eatingOutSpend: 0,
  alcoholSpend: 0,
  lateNightFoodSpend: 0,
  gymSpend: 0,
  pharmacySpend: 0,
  wellnessSpend: 0,
  subscriptionSpend: 0,
  // New Connection Defaults
  appointments: [],
  recurringPayments: [],
  hospitalName: '',
  hospitalPatientId: '',
  isConnectedHospital: false,
  billText: '',
  bankTotal: 0,
  investmentTotal: 0,
  medicalDebtTotal: 0,
  medicalDebtInterest: 0,
  medicalDebtMonthly: 0
};

const STORAGE_KEY_INPUTS = 'digicare_inputs';
const STORAGE_KEY_STATE = 'digicare_state';
const STORAGE_KEY_DAILY_ENTRIES = 'digicare_daily_entries';

// Helper to get today's date string
const getTodayString = () => new Date().toISOString().split('T')[0];
const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

// Check for mirror mode from URL
const getInitialMode = (): 'mirror' | 'app' => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'mirror') {
      return 'mirror';
    }
  }
  return 'app';
};

const App: React.FC = () => {
  // Mirror mode state
  const [appMode, setAppMode] = useState<'mirror' | 'app'>(getInitialMode);

  // Initialize state from LocalStorage to persist data across refreshes
  const [appState, setAppState] = useState<'onboarding' | 'input' | 'dashboard'>(() => {
    // Allow forcing a reset via URL param (useful for sharing demos: ?reset=true)
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('reset') === 'true') {
            localStorage.removeItem(STORAGE_KEY_STATE);
            localStorage.removeItem(STORAGE_KEY_INPUTS);
            localStorage.removeItem(STORAGE_KEY_DAILY_ENTRIES);
            window.history.replaceState(null, '', window.location.pathname);
            return 'onboarding';
        }
        // If coming from mirror completion, go straight to dashboard
        if (params.get('fromMirror') === 'true') {
            return 'dashboard';
        }
    }

    try {
      const savedState = localStorage.getItem(STORAGE_KEY_STATE);
      // Only restore valid states that aren't 'onboarding' if the user has progressed
      if (savedState === 'input' || savedState === 'dashboard') {
        return savedState;
      }
      return 'onboarding';
    } catch (e) {
      console.warn("Failed to load app state", e);
      return 'onboarding';
    }
  });

  const [inputs, setInputs] = useState<UserInputs>(() => {
    try {
      const savedInputs = localStorage.getItem(STORAGE_KEY_INPUTS);
      if (savedInputs) {
        // Merge with defaults to ensure schema changes don't break the app
        const parsed = JSON.parse(savedInputs);
        // Ensure arrays are initialized if old localstorage exists
        if (!parsed.appointments) parsed.appointments = [];
        if (!parsed.recurringPayments) parsed.recurringPayments = [];
        if (!parsed.persona) parsed.persona = 'custom';
        return { ...DEFAULT_INPUTS, ...parsed };
      }
      return DEFAULT_INPUTS;
    } catch (e) {
      console.warn("Failed to load inputs", e);
      return DEFAULT_INPUTS;
    }
  });

  // Daily Tracking State for Diabetic Personas
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DAILY_ENTRIES);
      if (saved) {
        return JSON.parse(saved);
      }
      return [];
    } catch (e) {
      console.warn("Failed to load daily entries", e);
      return [];
    }
  });

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  
  // Dashboard State
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [simMonth, setSimMonth] = useState(12);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');

  // 2-Step Reset Confirmation State
  const [resetConfirm, setResetConfirm] = useState(false);

  // Voice Coach State
  const [voiceCoachOpen, setVoiceCoachOpen] = useState(false);
  const [novaPanelOpen, setNovaPanelOpen] = useState(false);
  const [highlightedChart, setHighlightedChart] = useState<ChartTarget | null>(null);
  const [insightToast, setInsightToast] = useState<string | null>(null);

  // Check if current persona is diabetic (needs daily tracking)
  const isDiabeticPersona = inputs.persona === 'prediabetic' || inputs.persona === 'diabetic_type2';

  // Get today's and yesterday's entries
  const todayEntry = dailyEntries.find(e => e.date === getTodayString()) || null;
  const yesterdayEntry = dailyEntries.find(e => e.date === getYesterdayString()) || null;

  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INPUTS, JSON.stringify(inputs));
    } catch (e) {
      console.error("Failed to save inputs to localStorage", e);
    }
  }, [inputs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, appState);
    } catch (e) {
      console.error("Failed to save app state to localStorage", e);
    }
  }, [appState]);

  // Persist daily entries
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_ENTRIES, JSON.stringify(dailyEntries));
    } catch (e) {
      console.error("Failed to save daily entries to localStorage", e);
    }
  }, [dailyEntries]);

  useEffect(() => {
    if (appState === 'dashboard') {
        const result = runSimulation(inputs);
        setSimulation(result);
    }
  }, [inputs, appState]);

  const triggerChat = (question: string) => {
      setChatQuestion(question);
      setChatOpen(true);
  };

  // Handle daily entry updates. Supports functional form so Nova can merge with latest (avoids nullifying prior values).
  const handleUpdateDailyEntry = useCallback((entryOrUpdater: DailyEntry | ((prev: DailyEntry | null) => DailyEntry)) => {
    setDailyEntries(prev => {
      const todayStr = getTodayString();
      const current = prev.find(e => e.date === todayStr) ?? null;
      const entry = typeof entryOrUpdater === 'function' ? entryOrUpdater(current) : entryOrUpdater;
      const existingIndex = prev.findIndex(e => e.date === entry.date);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  }, []);

  // Handle onboarding completion with persona
  const handleOnboardingComplete = useCallback((persona: PersonaType, prefilledInputs?: Partial<UserInputs>) => {
    if (prefilledInputs && Object.keys(prefilledInputs).length > 0) {
      // Diabetic persona - prefill data and go directly to dashboard
      setInputs(prev => ({ ...prev, ...prefilledInputs, persona }));
      setAppState('dashboard');
      // Navigate to BodyTwin (health) tab for diabetic personas
      if (persona === 'prediabetic' || persona === 'diabetic_type2') {
        setActiveTab('health');
      }
    } else {
      // Custom persona - go to input form
      setInputs(prev => ({ ...prev, persona }));
      setAppState('input');
    }
  }, []);

  const handleReset = () => {
    if (resetConfirm) {
        // Confirmed action
        localStorage.removeItem(STORAGE_KEY_STATE);
        localStorage.removeItem(STORAGE_KEY_INPUTS);
        localStorage.removeItem(STORAGE_KEY_DAILY_ENTRIES);
        setInputs(DEFAULT_INPUTS);
        setDailyEntries([]);
        setAppState('onboarding');
        setActiveTab('overview');
        setResetConfirm(false);
    } else {
        // Request confirmation
        setResetConfirm(true);
        // Reset confirmation state after 3 seconds if not clicked
        setTimeout(() => setResetConfirm(false), 3000);
    }
  };

  // Handle mirror session completion
  const handleMirrorComplete = useCallback((data: {
    sleepHours: number | null;
    movementMinutes: number | null;
    carbSugarFlag: boolean | null;
    carbSugarItem: string | null;
    diningOutSpend: number | null;
    faceCheckImage: string | null;
  }) => {
    const today = getTodayString();
    
    // Update daily entry with mirror data
    handleUpdateDailyEntry((prev) => {
      const base = prev ?? {
        id: `entry_${today}_${Date.now()}`,
        date: today,
        weightKg: null,
        sleepHours: null,
        sleepQuality: null,
        mealsCount: null,
        mealsCost: null,
        carbsGrams: null,
        caloriesTotal: null,
        exerciseMinutes: null,
        exerciseType: null,
        stepsCount: null,
        fastingGlucose: null,
        postMealGlucose: null,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return {
        ...base,
        sleepHours: data.sleepHours ?? base.sleepHours,
        exerciseMinutes: data.movementMinutes ?? base.exerciseMinutes,
        carbSugarFlag: data.carbSugarFlag,
        carbSugarItem: data.carbSugarItem,
        diningOutSpend: data.diningOutSpend,
        mealsCost: data.diningOutSpend ?? base.mealsCost, // Also update mealsCost
        faceCheckImage: data.faceCheckImage,
        notes: base.notes + (base.notes ? '\n' : '') + `Mirror check-in completed at ${new Date().toLocaleTimeString()}`,
        updatedAt: new Date().toISOString(),
      };
    });

    // Set prediabetic persona
    setInputs(prev => ({ ...prev, persona: 'prediabetic' }));
    
    // Switch to app mode and navigate to dashboard
    setAppMode('app');
    setAppState('dashboard');
    setActiveTab('health');
    
    // Update URL
    window.history.replaceState(null, '', '/?fromMirror=true');
  }, [handleUpdateDailyEntry]);

  // Voice Coach Handlers
  const handleHighlightChart = useCallback((target: ChartTarget | null) => {
    setHighlightedChart(target);
    
    // Navigate to appropriate tab based on chart target
    if (target) {
      const healthCharts: ChartTarget[] = ['weight', 'hba1c', 'ldl', 'sleep', 'rhr'];
      const moneyCharts: ChartTarget[] = ['savings', 'netWorth', 'junkSpend', 'healthSpend'];
      
      if (healthCharts.includes(target) && activeTab !== 'health') {
        setActiveTab('health');
      } else if (moneyCharts.includes(target) && activeTab !== 'money') {
        setActiveTab('money');
      }
      
      // Scroll to charts section after a brief delay for tab switch
      setTimeout(() => {
        const chartSection = document.querySelector('[data-chart-section]');
        chartSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [activeTab]);

  const handleShowInsight = useCallback((text: string) => {
    setInsightToast(text);
    // Auto-dismiss after 5 seconds
    setTimeout(() => setInsightToast(null), 5000);
  }, []);

  // Render Smart Mirror if in mirror mode
  if (appMode === 'mirror') {
    return (
      <SmartMirror
        onComplete={handleMirrorComplete}
        existingEntry={todayEntry}
      />
    );
  }

  if (appState === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (appState === 'input') {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-5xl mb-8 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-lg shadow-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">DigiCare Engine</h1>
                  </div>
                  {/* Cancel/Reset in Input phase */}
                  <button 
                    onClick={handleReset} 
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                        resetConfirm ? 'bg-rose-100 text-rose-700 font-bold' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {resetConfirm ? 'Confirm Reset?' : 'Reset'}
                  </button>
              </div>
              <InputForm 
                inputs={inputs} 
                setInputs={setInputs} 
                onSubmit={() => setAppState('dashboard')} 
              />
          </div>
      );
  }

  if (!simulation) return <div className="flex h-screen items-center justify-center">Loading Engine...</div>;

  const getVal = (arr: (number | null)[], idx: number) => arr[idx] ?? 0;
  const netWorthBase = getVal(simulation.forecast.netWorthBaseline, simMonth);
  const netWorthImp = getVal(simulation.forecast.netWorthImproved, simMonth);
  const weightBase = getVal(simulation.forecast.weightBaseline, simMonth);
  const weightImp = getVal(simulation.forecast.weightImproved, simMonth);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      {/* Top Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
             <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setActiveTab('overview')}>
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center">
                     <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 hidden sm:block">DigiCare</h1>
             </div>
             
             {/* Middle Tabs - Scrollable on mobile, flexible width */}
             <div className="flex-1 overflow-x-auto mx-2 sm:mx-4 no-scrollbar min-w-0">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-max sm:w-auto">
                    <button onClick={() => setActiveTab('overview')} className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Overview</button>
                    <button onClick={() => setActiveTab('health')} className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'health' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>BodyTwin</button>
                    <button onClick={() => setActiveTab('money')} className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'money' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>MoneyTwin</button>
                    <button onClick={() => setActiveTab('connections')} className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'connections' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        Connections
                    </button>
                </div>
             </div>

             <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                 {/* Voice Coach Button */}
                 <button 
                    onClick={() => setVoiceCoachOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                 >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                     </svg>
                     <span className="hidden sm:inline">Voice Coach</span>
                 </button>
                 {/* Nova (Vocal Bridge) Check-in */}
                 <button 
                    onClick={() => setNovaPanelOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                 >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                     </svg>
                     <span className="hidden sm:inline">Nova Check-in</span>
                 </button>
                 <button onClick={() => setAppState('input')} className="hidden sm:block text-xs font-semibold text-slate-500 hover:text-blue-600">
                     Parameters
                 </button>
                 <button 
                    onClick={handleReset} 
                    className={`text-xs font-semibold border px-3 sm:px-4 py-2 rounded-lg transition-all active:scale-95 touch-manipulation ${
                        resetConfirm 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md animate-pulse' 
                        : 'text-rose-500 hover:text-rose-700 border-rose-200 hover:bg-rose-50'
                    }`}
                 >
                     {resetConfirm ? 'Confirm?' : 'Reset'}
                 </button>
             </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {/* GLOBAL DATA STRIP (Show on Overview & Connections) */}
        {(activeTab === 'overview' || activeTab === 'connections') && <DataSourcesStrip />}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* HERO HERO */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                 <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between group relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-300"></div>
                     <div className="relative z-10">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Current Path (Month {simMonth})</div>
                        <div className="flex justify-between items-baseline mb-4">
                            <div>
                                <div className="text-3xl font-mono font-bold text-slate-800">{weightBase}kg</div>
                                <div className="text-sm text-slate-500">Weight</div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-mono font-bold text-slate-800">${netWorthBase.toLocaleString()}</div>
                                <div className="text-sm text-slate-500">Net Worth</div>
                            </div>
                        </div>
                     </div>
                 </div>
                 
                 <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl flex flex-col justify-between group relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                     <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full"></div>
                     <div className="relative z-10 text-white">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">DigiCare Path (Month {simMonth})</div>
                        <div className="flex justify-between items-baseline mb-4">
                            <div>
                                <div className="text-3xl font-mono font-bold">{weightImp}kg</div>
                                <div className="text-sm text-slate-400">Weight</div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-mono font-bold">${netWorthImp.toLocaleString()}</div>
                                <div className="text-sm text-slate-400">Net Worth</div>
                            </div>
                        </div>
                     </div>
                 </div>
             </div>
            
            <ProgressStrip inputs={inputs} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TradeOffsCard inputs={inputs} />
                </div>
                <div className="lg:col-span-1 flex flex-col justify-center items-center bg-blue-50/50 rounded-2xl border border-blue-100 p-8 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Need a holistic view?</h3>
                    <p className="text-sm text-slate-500 mb-6">I can correlate your gym spending with your health outcomes.</p>
                    <button 
                        onClick={() => triggerChat("How do my habits today impact my net worth next year?")}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                        Ask DigiCare
                    </button>
                </div>
            </div>
          </>
        )}

        {/* HEALTH TAB (BodyTwin) */}
        {activeTab === 'health' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Col: Hologram & Vitals */}
              <div className="lg:col-span-1 space-y-6">
                  <BodyHologram inputs={inputs} />
                  <VitalsPanel inputs={inputs} />
              </div>

              {/* Center Col: Daily Tracking + Clinical */}
              <div className="lg:col-span-2 space-y-6">
                  {/* Daily Tracking Graphs for Diabetic Personas */}
                  {isDiabeticPersona && (
                    <DailyTrackingGraphs
                      todayEntry={todayEntry}
                      yesterdayEntry={yesterdayEntry}
                      allEntries={dailyEntries}
                      onUpdateEntry={handleUpdateDailyEntry}
                    />
                  )}
                  <ClinicianSummary inputs={inputs} />
                  <LabResults inputs={inputs} />
              </div>

              {/* Right Col: Projections */}
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">12-Month Projection</h4>
                      <div className="space-y-4">
                           <div>
                               <div className="text-xs text-slate-400">Weight Forecast</div>
                               <div className="flex justify-between font-mono text-sm font-bold">
                                   <span className="text-slate-700">{weightBase}kg</span>
                                   <span className="text-emerald-600">→ {weightImp}kg</span>
                               </div>
                           </div>
                           <div>
                               <div className="text-xs text-slate-400">HbA1c Trend</div>
                               <div className="flex justify-between font-mono text-sm font-bold">
                                   <span className="text-slate-700">{inputs.hba1c}%</span>
                                   <span className="text-emerald-600">→ {(inputs.hba1c - 0.2).toFixed(1)}%</span>
                               </div>
                           </div>
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => triggerChat(isDiabeticPersona 
                      ? "Analyze my daily tracking data and clinical markers. What patterns do you see and what should I prioritize?"
                      : "Analyze my clinical markers. What is the most urgent thing to fix?"
                    )}
                    className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    {isDiabeticPersona ? 'Analyze My Progress' : 'Ask Clinician'}
                  </button>
              </div>
              
              {/* Full Width Charts below */}
              <div className="lg:col-span-4 mt-8" data-chart-section>
                  <SimulationCharts simulation={simulation} mode="health" highlightedChart={highlightedChart} />
              </div>
          </div>
        )}

        {/* MONEY TAB (MoneyTwin) */}
        {activeTab === 'money' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
             {/* Left: Breakdown */}
             <div className="lg:col-span-1">
                 <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold uppercase text-slate-400">Bank Connection</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Live</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-slate-800">${inputs.currentSavings.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Available Cash</div>
                 </div>
                 <SpendingBreakdown inputs={inputs} />
             </div>

             {/* Center: Snapshot */}
             <div className="lg:col-span-2">
                 <WealthSnapshot inputs={inputs} score={simulation.scores.moneyTwin} />
                 
                 {/* Cashflow Bar */}
                 <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Monthly Cash Flow</h4>
                     <div className="flex h-4 w-full rounded-full overflow-hidden">
                         <div style={{ width: `${(inputs.fixedCosts/inputs.monthlyIncome)*100}%` }} className="bg-slate-400" title="Fixed Costs"></div>
                         <div style={{ width: `${(inputs.lifestyleSpend/inputs.monthlyIncome)*100}%` }} className="bg-indigo-400" title="Discretionary"></div>
                         <div className="flex-1 bg-emerald-400" title="Savings"></div>
                     </div>
                     <div className="flex justify-between mt-2 text-xs text-slate-500">
                         <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span>Fixed</div>
                         <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span>Lifestyle</div>
                         <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Savings</div>
                     </div>
                 </div>
             </div>

             {/* Right: Actions */}
             <div className="lg:col-span-1 space-y-6">
                 <button 
                    onClick={() => triggerChat("Review my spending. Where is the 'lifestyle creep' happening?")}
                    className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Audit My Spending
                  </button>
             </div>

              {/* Full Width Charts below */}
              <div className="lg:col-span-4 mt-8" data-chart-section>
                  <SimulationCharts simulation={simulation} mode="money" highlightedChart={highlightedChart} />
              </div>
          </div>
        )}

        {/* NEW CONNECTIONS TAB */}
        {activeTab === 'connections' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <HealthConnections inputs={inputs} setInputs={setInputs} onAskCoach={triggerChat} />
                <MoneyConnections inputs={inputs} setInputs={setInputs} onAskCoach={triggerChat} />
            </div>
        )}

      </main>

      {/* Coach Chat Overlay */}
      <CoachChat 
        inputs={inputs} 
        simulation={simulation} 
        activeTab={activeTab}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        initialQuestion={chatQuestion}
      />

      {/* Voice Coach Panel */}
      <VoiceCoachPanel
        isOpen={voiceCoachOpen}
        onClose={() => setVoiceCoachOpen(false)}
        inputs={inputs}
        setInputs={setInputs}
        simulation={simulation}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onHighlightChart={handleHighlightChart}
        onShowInsight={handleShowInsight}
      />

      {/* Nova (Vocal Bridge) Panel – receives daily log JSON and pushes to localStorage */}
      <NovaVoicePanel
        isOpen={novaPanelOpen}
        onClose={() => setNovaPanelOpen(false)}
        todayEntry={todayEntry}
        onUpdateEntry={handleUpdateDailyEntry}
      />

      {/* Insight Toast */}
      {insightToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-md">
            <div className="w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm">{insightToast}</p>
            <button 
              onClick={() => setInsightToast(null)}
              className="ml-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;