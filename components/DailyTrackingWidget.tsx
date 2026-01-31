import React, { useState } from 'react';
import { DailyEntry, DailyComparison } from '../types';

interface DailyTrackingWidgetProps {
  todayEntry: DailyEntry | null;
  yesterdayEntry: DailyEntry | null;
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

// Calculate comparison between two values
const calculateComparison = (
  metric: string,
  label: string,
  current: number | null,
  previous: number | null,
  unit: string,
  lowerIsBetter: boolean
): DailyComparison => {
  if (current === null || previous === null) {
    return {
      metric,
      label,
      previousValue: previous,
      currentValue: current,
      unit,
      trend: 'unknown',
      changePercent: null,
      lowerIsBetter,
    };
  }

  const change = current - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

  let trend: 'better' | 'worse' | 'same';
  if (Math.abs(change) < 0.01) {
    trend = 'same';
  } else if (lowerIsBetter) {
    trend = change < 0 ? 'better' : 'worse';
  } else {
    trend = change > 0 ? 'better' : 'worse';
  }

  return {
    metric,
    label,
    previousValue: previous,
    currentValue: current,
    unit,
    trend,
    changePercent,
    lowerIsBetter,
  };
};

// Trend indicator component
const TrendIndicator: React.FC<{ comparison: DailyComparison }> = ({ comparison }) => {
  const { trend, changePercent, previousValue, currentValue } = comparison;

  if (trend === 'unknown' || previousValue === null) {
    return <span className="text-xs text-slate-400">No previous data</span>;
  }

  const change = (currentValue ?? 0) - (previousValue ?? 0);
  const absChange = Math.abs(change).toFixed(1);
  const absPercent = Math.abs(changePercent ?? 0).toFixed(0);

  if (trend === 'same') {
    return (
      <div className="flex items-center gap-1">
        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </span>
        <span className="text-xs text-slate-500">Same</span>
      </div>
    );
  }

  if (trend === 'better') {
    return (
      <div className="flex items-center gap-1">
        <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="text-xs text-emerald-600 font-semibold">
          {comparison.lowerIsBetter ? '↓' : '↑'} {absChange} ({absPercent}%)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center">
        <svg className="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </span>
      <span className="text-xs text-rose-600 font-semibold">
        {comparison.lowerIsBetter ? '↑' : '↓'} {absChange} ({absPercent}%)
      </span>
    </div>
  );
};

// Metric card component
const MetricCard: React.FC<{
  comparison: DailyComparison;
  icon: React.ReactNode;
  onEdit: () => void;
}> = ({ comparison, icon, onEdit }) => {
  const { label, currentValue, previousValue, unit, trend } = comparison;

  const getBorderColor = () => {
    if (trend === 'better') return 'border-l-emerald-500';
    if (trend === 'worse') return 'border-l-rose-500';
    return 'border-l-slate-300';
  };

  const getBgColor = () => {
    if (trend === 'better') return 'bg-emerald-50/50';
    if (trend === 'worse') return 'bg-rose-50/50';
    return 'bg-white';
  };

  return (
    <div
      className={`${getBgColor()} rounded-xl border border-slate-200 border-l-4 ${getBorderColor()} p-4 shadow-sm hover:shadow-md transition-all cursor-pointer`}
      onClick={onEdit}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">{icon}</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <button className="text-slate-400 hover:text-blue-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-mono font-bold text-slate-800">
            {currentValue !== null ? currentValue : '--'}
            <span className="text-sm font-sans font-normal text-slate-400 ml-1">{unit}</span>
          </div>
          {previousValue !== null && (
            <div className="text-xs text-slate-400 mt-1">
              Yesterday: {previousValue} {unit}
            </div>
          )}
        </div>
        <TrendIndicator comparison={comparison} />
      </div>
    </div>
  );
};

// Input modal component
const InputModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: number | null;
  onChange: (val: number | null) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}> = ({ isOpen, onClose, title, value, onChange, unit, min = 0, max = 999, step = 0.1 }) => {
  const [localValue, setLocalValue] = useState<string>(value?.toString() ?? '');

  if (!isOpen) return null;

  const handleSave = () => {
    const num = parseFloat(localValue);
    onChange(isNaN(num) ? null : num);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
        <div className="relative">
          <input
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            min={min}
            max={max}
            step={step}
            className="w-full text-3xl font-mono font-bold text-center py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            autoFocus
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
            {unit}
          </span>
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

export const DailyTrackingWidget: React.FC<DailyTrackingWidgetProps> = ({
  todayEntry,
  yesterdayEntry,
  onUpdateEntry,
}) => {
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const entry = todayEntry ?? createEmptyEntry();

  // Calculate comparisons
  const comparisons: DailyComparison[] = [
    calculateComparison('weight', 'Weight', entry.weightKg, yesterdayEntry?.weightKg ?? null, 'kg', true),
    calculateComparison('sleep', 'Sleep', entry.sleepHours, yesterdayEntry?.sleepHours ?? null, 'hrs', false),
    calculateComparison('mealsCost', 'Meals Cost', entry.mealsCost, yesterdayEntry?.mealsCost ?? null, '$', true),
    calculateComparison('exercise', 'Exercise', entry.exerciseMinutes, yesterdayEntry?.exerciseMinutes ?? null, 'min', false),
    calculateComparison('steps', 'Steps', entry.stepsCount, yesterdayEntry?.stepsCount ?? null, '', false),
    calculateComparison('fastingGlucose', 'Fasting Glucose', entry.fastingGlucose, yesterdayEntry?.fastingGlucose ?? null, 'mg/dL', true),
  ];

  const handleUpdateMetric = (metric: string, value: number | null) => {
    const updatedEntry: DailyEntry = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };

    switch (metric) {
      case 'weight':
        updatedEntry.weightKg = value;
        break;
      case 'sleep':
        updatedEntry.sleepHours = value;
        break;
      case 'mealsCost':
        updatedEntry.mealsCost = value;
        break;
      case 'exercise':
        updatedEntry.exerciseMinutes = value;
        break;
      case 'steps':
        updatedEntry.stepsCount = value ? Math.round(value) : null;
        break;
      case 'fastingGlucose':
        updatedEntry.fastingGlucose = value ? Math.round(value) : null;
        break;
    }

    onUpdateEntry(updatedEntry);
  };

  const icons: Record<string, React.ReactNode> = {
    weight: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    sleep: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    mealsCost: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    exercise: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    steps: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    fastingGlucose: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  };

  const getModalConfig = (metric: string) => {
    switch (metric) {
      case 'weight':
        return { title: 'Enter Weight', unit: 'kg', min: 30, max: 300, step: 0.1 };
      case 'sleep':
        return { title: 'Enter Sleep Hours', unit: 'hrs', min: 0, max: 24, step: 0.5 };
      case 'mealsCost':
        return { title: 'Enter Food Cost', unit: '$', min: 0, max: 500, step: 1 };
      case 'exercise':
        return { title: 'Enter Exercise Time', unit: 'min', min: 0, max: 300, step: 5 };
      case 'steps':
        return { title: 'Enter Steps', unit: 'steps', min: 0, max: 50000, step: 100 };
      case 'fastingGlucose':
        return { title: 'Enter Fasting Glucose', unit: 'mg/dL', min: 50, max: 400, step: 1 };
      default:
        return { title: 'Enter Value', unit: '', min: 0, max: 999, step: 1 };
    }
  };

  const currentComparison = comparisons.find((c) => c.metric === editingMetric);
  const modalConfig = editingMetric ? getModalConfig(editingMetric) : null;

  // Calculate overall day score
  const betterCount = comparisons.filter((c) => c.trend === 'better').length;
  const worseCount = comparisons.filter((c) => c.trend === 'worse').length;
  const knownCount = comparisons.filter((c) => c.trend !== 'unknown').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Daily Tracking</h2>
            <p className="text-indigo-200 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {knownCount > 0 ? `${betterCount}/${knownCount}` : '--'}
            </div>
            <div className="text-xs text-indigo-200">metrics improved</div>
          </div>
        </div>

        {/* Summary bar */}
        {knownCount > 0 && (
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-white/20">
            <div
              className="bg-emerald-400 transition-all duration-500"
              style={{ width: `${(betterCount / knownCount) * 100}%` }}
            />
            <div
              className="bg-rose-400 transition-all duration-500"
              style={{ width: `${(worseCount / knownCount) * 100}%` }}
            />
            <div className="flex-1 bg-white/30" />
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comparisons.map((comparison) => (
          <MetricCard
            key={comparison.metric}
            comparison={comparison}
            icon={icons[comparison.metric]}
            onEdit={() => setEditingMetric(comparison.metric)}
          />
        ))}
      </div>

      {/* Quick Add Section */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-sm font-semibold text-slate-600">Quick Log</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {comparisons
            .filter((c) => c.currentValue === null)
            .map((c) => (
              <button
                key={c.metric}
                onClick={() => setEditingMetric(c.metric)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center gap-2"
              >
                {icons[c.metric]}
                Log {c.label}
              </button>
            ))}
        </div>
      </div>

      {/* Input Modal */}
      {editingMetric && modalConfig && (
        <InputModal
          isOpen={true}
          onClose={() => setEditingMetric(null)}
          title={modalConfig.title}
          value={currentComparison?.currentValue ?? null}
          onChange={(val) => handleUpdateMetric(editingMetric, val)}
          unit={modalConfig.unit}
          min={modalConfig.min}
          max={modalConfig.max}
          step={modalConfig.step}
        />
      )}
    </div>
  );
};

export default DailyTrackingWidget;
