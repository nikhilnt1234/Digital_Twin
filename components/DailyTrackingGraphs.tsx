import React, { useState } from 'react';
import { DailyEntry } from '../types';

interface DailyTrackingGraphsProps {
  todayEntry: DailyEntry | null;
  yesterdayEntry: DailyEntry | null;
  allEntries: DailyEntry[];
  onUpdateEntry: (entry: DailyEntry) => void;
}

// Helper to create empty entry for today
const createEmptyEntry = (): DailyEntry => {
  const today = new Date().toISOString().split('T')[0];
  return {
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
};

// Extended entry with meal macros
interface ExtendedDailyEntry extends DailyEntry {
  fiberGrams?: number | null;
  proteinGrams?: number | null;
}

// Get last 7 days of entries for mini charts
const getLast7Days = (entries: DailyEntry[]): (DailyEntry | null)[] => {
  const result: (DailyEntry | null)[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = entries.find(e => e.date === dateStr) || null;
    result.push(entry);
  }
  return result;
};

// Mini bar chart component
const MiniBarChart: React.FC<{
  data: (number | null)[];
  color: string;
  height?: number;
}> = ({ data, color, height = 40 }) => {
  const validData = data.filter(d => d !== null) as number[];
  const max = validData.length > 0 ? Math.max(...validData) : 100;
  
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((value, idx) => {
        const barHeight = value !== null ? (value / max) * height : 0;
        const isToday = idx === data.length - 1;
        return (
          <div
            key={idx}
            className={`flex-1 rounded-t transition-all ${
              value === null 
                ? 'bg-slate-100' 
                : isToday 
                  ? color 
                  : color.replace('500', '300').replace('600', '400')
            }`}
            style={{ height: value !== null ? `${barHeight}px` : '4px' }}
          />
        );
      })}
    </div>
  );
};

// Trend indicator
const TrendBadge: React.FC<{
  current: number | null;
  previous: number | null;
  lowerIsBetter: boolean;
}> = ({ current, previous, lowerIsBetter }) => {
  if (current === null || previous === null) {
    return <span className="text-xs text-slate-400">--</span>;
  }
  
  const diff = current - previous;
  const isBetter = lowerIsBetter ? diff < 0 : diff > 0;
  const isSame = Math.abs(diff) < 0.01;
  
  if (isSame) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
        Same
      </span>
    );
  }
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      isBetter 
        ? 'bg-emerald-100 text-emerald-700' 
        : 'bg-rose-100 text-rose-700'
    }`}>
      {diff > 0 ? '+' : ''}{diff.toFixed(1)} {isBetter ? '✓' : '⚠'}
    </span>
  );
};

// Input modal
const InputModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: { key: string; label: string; unit: string; value: number | null; min?: number; max?: number; step?: number }[];
  onSave: (values: Record<string, number | null>) => void;
}> = ({ isOpen, onClose, title, fields, onSave }) => {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach(f => {
      initial[f.key] = f.value?.toString() ?? '';
    });
    return initial;
  });

  if (!isOpen) return null;

  const handleSave = () => {
    const result: Record<string, number | null> = {};
    fields.forEach(f => {
      const num = parseFloat(values[f.key]);
      result[f.key] = isNaN(num) ? null : num;
    });
    onSave(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
        <div className="space-y-4">
          {fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {field.label}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={values[field.key]}
                  onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  min={field.min ?? 0}
                  max={field.max ?? 999}
                  step={field.step ?? 1}
                  className="w-full text-lg font-mono py-3 px-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="--"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  {field.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-slate-600 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export const DailyTrackingGraphs: React.FC<DailyTrackingGraphsProps> = ({
  todayEntry,
  yesterdayEntry,
  allEntries,
  onUpdateEntry,
}) => {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const entry = todayEntry ?? createEmptyEntry();
  const extendedEntry = entry as ExtendedDailyEntry;
  
  // Get 7-day data for charts
  const last7Days = getLast7Days(allEntries);
  const weightData = last7Days.map(e => e?.weightKg ?? null);
  const sleepData = last7Days.map(e => e?.sleepHours ?? null);
  const exerciseData = last7Days.map(e => e?.exerciseMinutes ?? null);
  const costData = last7Days.map(e => e?.mealsCost ?? null);

  const handleSaveWeight = (values: Record<string, number | null>) => {
    onUpdateEntry({
      ...entry,
      weightKg: values.weight,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveSleep = (values: Record<string, number | null>) => {
    onUpdateEntry({
      ...entry,
      sleepHours: values.sleep,
      sleepQuality: values.quality as any,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveMeals = (values: Record<string, number | null>) => {
    const updated = {
      ...entry,
      carbsGrams: values.carbs,
      caloriesTotal: values.calories,
      updatedAt: new Date().toISOString(),
    } as ExtendedDailyEntry;
    updated.fiberGrams = values.fiber;
    updated.proteinGrams = values.protein;
    onUpdateEntry(updated as DailyEntry);
  };

  const handleSaveCost = (values: Record<string, number | null>) => {
    onUpdateEntry({
      ...entry,
      mealsCost: values.cost,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveExercise = (values: Record<string, number | null>) => {
    onUpdateEntry({
      ...entry,
      exerciseMinutes: values.minutes,
      stepsCount: values.steps ? Math.round(values.steps) : null,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold">Daily Health Tracker</h3>
            <p className="text-indigo-200 text-xs">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-200">vs Yesterday</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100">
        
        {/* Weight */}
        <div 
          className="p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
          onClick={() => setEditingSection('weight')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Weight</span>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold text-slate-800">
              {entry.weightKg ?? '--'}
            </span>
            <span className="text-sm text-slate-400">kg</span>
          </div>
          <TrendBadge current={entry.weightKg} previous={yesterdayEntry?.weightKg ?? null} lowerIsBetter={true} />
          <div className="mt-3">
            <MiniBarChart data={weightData} color="bg-blue-500" />
          </div>
        </div>

        {/* Sleep */}
        <div 
          className="p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
          onClick={() => setEditingSection('sleep')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Sleep</span>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold text-slate-800">
              {entry.sleepHours ?? '--'}
            </span>
            <span className="text-sm text-slate-400">hrs</span>
          </div>
          <TrendBadge current={entry.sleepHours} previous={yesterdayEntry?.sleepHours ?? null} lowerIsBetter={false} />
          <div className="mt-3">
            <MiniBarChart data={sleepData} color="bg-violet-500" />
          </div>
        </div>

        {/* Meals / Nutrition */}
        <div 
          className="p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
          onClick={() => setEditingSection('meals')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Meals</span>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          {/* Macro breakdown */}
          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Protein</span>
              <span className="font-semibold text-slate-700">{extendedEntry.proteinGrams ?? '--'}g</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Fiber</span>
              <span className="font-semibold text-slate-700">{extendedEntry.fiberGrams ?? '--'}g</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Carbs</span>
              <span className="font-semibold text-slate-700">{entry.carbsGrams ?? '--'}g</span>
            </div>
          </div>
          {/* Macro bars */}
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100">
            <div className="bg-emerald-500" style={{ width: `${Math.min(100, ((extendedEntry.proteinGrams ?? 0) / 150) * 100)}%` }} />
            <div className="bg-amber-400" style={{ width: `${Math.min(100, ((extendedEntry.fiberGrams ?? 0) / 30) * 100)}%` }} />
            <div className="bg-blue-400" style={{ width: `${Math.min(100, ((entry.carbsGrams ?? 0) / 250) * 100)}%` }} />
          </div>
        </div>

        {/* Cost */}
        <div 
          className="p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
          onClick={() => setEditingSection('cost')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Cost</span>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-sm text-slate-400">$</span>
            <span className="text-2xl font-bold text-slate-800">
              {entry.mealsCost ?? '--'}
            </span>
          </div>
          <TrendBadge current={entry.mealsCost} previous={yesterdayEntry?.mealsCost ?? null} lowerIsBetter={true} />
          <div className="mt-3">
            <MiniBarChart data={costData} color="bg-amber-500" />
          </div>
        </div>

        {/* Exercise */}
        <div 
          className="p-4 hover:bg-slate-50 cursor-pointer transition-colors group col-span-2 lg:col-span-1"
          onClick={() => setEditingSection('exercise')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Exercise</span>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl font-bold text-slate-800">
              {entry.exerciseMinutes ?? '--'}
            </span>
            <span className="text-sm text-slate-400">min</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">
            {entry.stepsCount ? `${entry.stepsCount.toLocaleString()} steps` : 'No steps logged'}
          </div>
          <TrendBadge current={entry.exerciseMinutes} previous={yesterdayEntry?.exerciseMinutes ?? null} lowerIsBetter={false} />
          <div className="mt-3">
            <MiniBarChart data={exerciseData} color="bg-rose-500" />
          </div>
        </div>
      </div>

      {/* Input Modals */}
      <InputModal
        isOpen={editingSection === 'weight'}
        onClose={() => setEditingSection(null)}
        title="Log Weight"
        fields={[
          { key: 'weight', label: 'Weight', unit: 'kg', value: entry.weightKg, min: 30, max: 300, step: 0.1 }
        ]}
        onSave={handleSaveWeight}
      />

      <InputModal
        isOpen={editingSection === 'sleep'}
        onClose={() => setEditingSection(null)}
        title="Log Sleep"
        fields={[
          { key: 'sleep', label: 'Hours Slept', unit: 'hrs', value: entry.sleepHours, min: 0, max: 24, step: 0.5 }
        ]}
        onSave={handleSaveSleep}
      />

      <InputModal
        isOpen={editingSection === 'meals'}
        onClose={() => setEditingSection(null)}
        title="Log Nutrition"
        fields={[
          { key: 'protein', label: 'Protein', unit: 'g', value: extendedEntry.proteinGrams ?? null, min: 0, max: 500, step: 1 },
          { key: 'fiber', label: 'Fiber', unit: 'g', value: extendedEntry.fiberGrams ?? null, min: 0, max: 100, step: 1 },
          { key: 'carbs', label: 'Carbs', unit: 'g', value: entry.carbsGrams, min: 0, max: 500, step: 1 },
          { key: 'calories', label: 'Total Calories', unit: 'kcal', value: entry.caloriesTotal, min: 0, max: 5000, step: 50 },
        ]}
        onSave={handleSaveMeals}
      />

      <InputModal
        isOpen={editingSection === 'cost'}
        onClose={() => setEditingSection(null)}
        title="Log Food Cost"
        fields={[
          { key: 'cost', label: 'Total Spent', unit: '$', value: entry.mealsCost, min: 0, max: 500, step: 1 }
        ]}
        onSave={handleSaveCost}
      />

      <InputModal
        isOpen={editingSection === 'exercise'}
        onClose={() => setEditingSection(null)}
        title="Log Exercise"
        fields={[
          { key: 'minutes', label: 'Duration', unit: 'min', value: entry.exerciseMinutes, min: 0, max: 300, step: 5 },
          { key: 'steps', label: 'Steps', unit: 'steps', value: entry.stepsCount, min: 0, max: 50000, step: 100 }
        ]}
        onSave={handleSaveExercise}
      />
    </div>
  );
};

export default DailyTrackingGraphs;
