
import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { SimulationResult } from '../types';
import { ChartTarget } from '../voice/actionSchema';

interface ChartSeriesConfig {
  key: string;
  name: string;
  color: string;
  type: 'line' | 'area';
  strokeDash?: string; // e.g. "5 5"
}

interface InteractiveChartProps {
  title: string;
  iconColor: string; // e.g. "bg-emerald-500"
  data: any[];
  config: ChartSeriesConfig[];
  unit: string;
  // Fix: Recharts supports string expressions in domains like "dataMin - 0.5"
  yDomain?: [number | string | 'auto' | 'dataMin' | 'dataMax', number | string | 'auto' | 'dataMin' | 'dataMax'];
  isHighlighted?: boolean;
  chartId?: string;
}

const CustomTooltip = ({ active, payload, label, unit, timeRange }: any) => {
  if (active && payload && payload.length) {
    // Format label based on time range
    let periodLabel = label;
    
    // If it's a day name (Mon, Tue, etc.), use it directly
    if (DAY_NAMES.includes(label)) {
      periodLabel = label;
    } else if (label.startsWith('M')) {
      // Month format
      periodLabel = `Month ${label.replace('M', '')}`;
    }
    
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-4 rounded-xl shadow-xl ring-1 ring-slate-900/5 z-50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">
            {periodLabel}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 text-sm min-w-[140px]">
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                 <span className="font-medium text-slate-600 text-xs">{entry.name}:</span>
              </div>
              <span className="font-mono font-bold text-slate-800">
                {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : entry.value}
                <span className="text-[10px] text-slate-400 font-sans ml-0.5 font-medium">{unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Time range options with labels
const TIME_RANGES = [
  { value: 7, label: 'Weekly', description: 'This Week', type: 'week' },
  { value: 3, label: '3M', description: '3 Months', type: 'month' },
  { value: 6, label: '6M', description: '6 Months', type: 'month' },
  { value: 12, label: '1Y', description: '1 Year', type: 'month' },
];

// Day names for weekly view
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const InteractiveChart: React.FC<InteractiveChartProps> = ({ title, iconColor, data, config, unit, yDomain, isHighlighted, chartId }) => {
  const [timeRange, setTimeRange] = useState<number>(12); // Default to 1 year
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set(config.map(c => c.key)));

  const toggleVisibility = (key: string) => {
    const next = new Set(visibleKeys);
    if (next.has(key)) {
        if (next.size > 1) next.delete(key); // Prevent hiding all
    } else {
        next.add(key);
    }
    setVisibleKeys(next);
  };

  // Check if weekly view
  const isWeekly = timeRange === 7;

  const filteredData = useMemo(() => {
    if (isWeekly) {
      // For weekly view, show 7 days with day names
      return DAY_NAMES.map((day, idx) => ({
        ...data[Math.min(idx, data.length - 1)],
        displayLabel: day
      }));
    }
    // For monthly views, slice data and add M prefix
    const slicedData = data.slice(0, timeRange + 1);
    return slicedData.map((d, idx) => ({
      ...d,
      displayLabel: `M${idx}`
    }));
  }, [data, timeRange, isWeekly]);

  return (
    <div 
      id={chartId} 
      className={`bg-white p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md ${
        isHighlighted 
          ? 'border-violet-400 ring-4 ring-violet-200 shadow-lg animate-pulse' 
          : 'border-slate-200'
      }`}
    >
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${iconColor} shadow-sm ring-2 ring-white`}></span>
          {title}
        </h3>
        
        <div className="flex items-center gap-4 flex-wrap">
             {/* Legend / Toggles */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                {config.map(c => (
                    <button
                        key={c.key}
                        onClick={() => toggleVisibility(c.key)}
                        className={`
                            px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all flex items-center gap-1.5
                            ${visibleKeys.has(c.key) ? 'bg-white text-slate-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}
                        `}
                    >
                        <span className={`w-2 h-2 rounded-full ${visibleKeys.has(c.key) ? '' : 'grayscale opacity-50'}`} style={{ backgroundColor: c.color }}></span>
                        {c.name}
                    </button>
                ))}
            </div>

            {/* Timeframe Selector - Days, Weeks, Months */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                {TIME_RANGES.map(range => (
                    <button
                        key={range.value}
                        onClick={() => setTimeRange(range.value)}
                        title={range.description}
                        className={`
                            px-2 py-1 text-xs font-semibold rounded-md transition-all
                            ${timeRange === range.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        {range.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {config.map(c => (
                 <linearGradient key={c.key} id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c.color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={c.color} stopOpacity={0} />
                 </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
                dataKey="displayLabel" 
                tick={{fontSize: 11, fill: '#94a3b8'}} 
                stroke="#cbd5e1" 
                tickLine={false}
                axisLine={false}
                padding={{ left: 10, right: 10 }}
            />
            <YAxis 
                domain={yDomain || ['auto', 'auto']} 
                tick={{fontSize: 11, fill: '#94a3b8'}} 
                stroke="transparent" 
                tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val}
            />
            <Tooltip content={<CustomTooltip unit={unit} timeRange={timeRange} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
            
            {config.map(c => visibleKeys.has(c.key) && (
                 c.type === 'area' ? (
                     <Area
                        key={c.key}
                        type="monotone"
                        dataKey={c.key}
                        stroke={c.color}
                        fill={`url(#grad-${c.key})`}
                        strokeWidth={2}
                        name={c.name}
                        activeDot={{ r: 6, strokeWidth: 0, fill: c.color }}
                     />
                 ) : (
                     <Line
                        key={c.key}
                        type="monotone"
                        dataKey={c.key}
                        stroke={c.color}
                        strokeWidth={2}
                        strokeDasharray={c.strokeDash}
                        dot={false}
                        name={c.name}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: c.color }}
                     />
                 )
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface SimulationChartsProps {
  simulation: SimulationResult;
  mode?: 'health' | 'money';
  highlightedChart?: ChartTarget | null;
}

export const SimulationCharts: React.FC<SimulationChartsProps> = ({ simulation, mode, highlightedChart }) => {
  // Transform data for Recharts
  const data = useMemo(() => simulation.forecast.months.map((month, index) => ({
    month: `M${month}`,
    weightBase: simulation.forecast.weightBaseline[index],
    weightImp: simulation.forecast.weightImproved[index],
    savingsBase: simulation.forecast.savingsBaseline[index],
    savingsImp: simulation.forecast.savingsImproved[index],
    netWorthBase: simulation.forecast.netWorthBaseline[index],
    netWorthImp: simulation.forecast.netWorthImproved[index],
    hba1cBase: simulation.forecast.hba1cBaseline[index],
    hba1cImp: simulation.forecast.hba1cImproved[index],
    ldlBase: simulation.forecast.ldlBaseline[index],
    ldlImp: simulation.forecast.ldlImproved[index],
    sleepBase: simulation.forecast.sleepBaseline[index],
    sleepImp: simulation.forecast.sleepImproved[index],
    rhrBase: simulation.forecast.rhrBaseline[index],
    rhrImp: simulation.forecast.rhrImproved[index],
    mealsCostBase: simulation.forecast.mealsCostBaseline[index],
    mealsCostImp: simulation.forecast.mealsCostImproved[index],
    exerciseBase: simulation.forecast.exerciseBaseline[index],
    exerciseImp: simulation.forecast.exerciseImproved[index],
    junkBase: simulation.forecast.junkSpendBaseline[index],
    junkImp: simulation.forecast.junkSpendImproved[index],
    healthSpendBase: simulation.forecast.healthSpendBaseline[index],
    healthSpendImp: simulation.forecast.healthSpendImproved[index],
  })), [simulation]);

  const showHealth = !mode || mode === 'health';
  const showMoney = !mode || mode === 'money';

  const hasWeight = data.some(d => d.weightBase !== null);
  const hasNetWorth = data.some(d => d.netWorthBase !== null);
  const hasSleep = data.some(d => d.sleepBase !== null);
  const hasMealsCost = data.some(d => d.mealsCostBase !== null);
  const hasExercise = data.some(d => d.exerciseBase !== null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* --- HEALTH CHARTS --- */}
      {showHealth && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* 1. Weight Projection */}
               {hasWeight && (
                    <InteractiveChart 
                        title="Weight Projection" 
                        iconColor="bg-emerald-500"
                        data={data}
                        unit="kg"
                        chartId="chart-weight"
                        isHighlighted={highlightedChart === 'weight'}
                        config={[
                            { key: 'weightBase', name: 'Baseline', color: '#ef4444', type: 'line' },
                            { key: 'weightImp', name: 'Optimized', color: '#10b981', type: 'area', strokeDash: "5 5" }
                        ]}
                    />
               )}
               
               {/* 2. Sleep Cycle */}
               {hasSleep && (
                    <InteractiveChart 
                        title="Sleep Cycle Recovery" 
                        iconColor="bg-violet-500"
                        data={data}
                        unit="hrs"
                        yDomain={[5, 9]}
                        chartId="chart-sleep"
                        isHighlighted={highlightedChart === 'sleep'}
                        config={[
                            { key: 'sleepBase', name: 'Current Avg', color: '#8b5cf6', type: 'line' },
                            { key: 'sleepImp', name: 'Target Pattern', color: '#a78bfa', type: 'area' }
                        ]}
                    />
                )}

                {/* 3. Meals Cost */}
                {hasMealsCost && (
                    <InteractiveChart 
                        title="Daily Meals Cost" 
                        iconColor="bg-amber-500"
                        data={data}
                        unit="$"
                        chartId="chart-mealsCost"
                        isHighlighted={highlightedChart === 'junkSpend'}
                        config={[
                            { key: 'mealsCostBase', name: 'Current Trend', color: '#f59e0b', type: 'line' },
                            { key: 'mealsCostImp', name: 'Home Cooking', color: '#fbbf24', type: 'area', strokeDash: "4 4" }
                        ]}
                    />
                )}

                 {/* 4. Exercise */}
                {hasExercise && (
                    <InteractiveChart 
                        title="Daily Exercise" 
                        iconColor="bg-rose-500"
                        data={data}
                        unit="min"
                        yDomain={[0, 60]}
                        chartId="chart-exercise"
                        isHighlighted={highlightedChart === 'rhr'}
                        config={[
                            { key: 'exerciseBase', name: 'Current Level', color: '#f43f5e', type: 'line' },
                            { key: 'exerciseImp', name: 'Target Plan', color: '#fda4af', type: 'area', strokeDash: "5 5" }
                        ]}
                    />
                )}
          </div>
      )}


      {/* --- MONEY CHARTS --- */}
      {showMoney && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 1. Net Worth (Key) */}
              {hasNetWorth && (
                <div className="md:col-span-2">
                    <InteractiveChart 
                        title="Net Worth Growth" 
                        iconColor="bg-indigo-500"
                        data={data}
                        unit="$"
                        chartId="chart-netWorth"
                        isHighlighted={highlightedChart === 'netWorth'}
                        config={[
                            { key: 'netWorthBase', name: 'Baseline', color: '#64748b', type: 'line' },
                            { key: 'netWorthImp', name: 'Optimized', color: '#6366f1', type: 'area' }
                        ]}
                    />
                </div>
              )}

              {/* 2. Spending Habits (Junk vs Health) */}
              {hasNetWorth && (
                <InteractiveChart 
                    title="Habit Spending Trends" 
                    iconColor="bg-amber-500"
                    data={data}
                    unit="$"
                    chartId="chart-junkSpend"
                    isHighlighted={highlightedChart === 'junkSpend' || highlightedChart === 'healthSpend'}
                    config={[
                        { key: 'junkBase', name: '"Junk" Baseline', color: '#f59e0b', type: 'line' },
                        { key: 'junkImp', name: '"Junk" Reduced', color: '#fcd34d', type: 'area', strokeDash: "4 4" },
                        { key: 'healthSpendImp', name: 'Health Investment', color: '#10b981', type: 'line' },
                    ]}
                />
              )}

               {/* 3. Savings Accumulation (from cuts) */}
               {hasNetWorth && (
                <InteractiveChart 
                    title="Savings Growth" 
                    iconColor="bg-slate-500"
                    data={data}
                    unit="$"
                    chartId="chart-savings"
                    isHighlighted={highlightedChart === 'savings'}
                    config={[
                        { key: 'savingsBase', name: 'Standard Savings', color: '#94a3b8', type: 'line' },
                        { key: 'savingsImp', name: 'Optimized Flow', color: '#3b82f6', type: 'area' }
                    ]}
                />
              )}
          </div>
      )}
    </div>
  );
};
