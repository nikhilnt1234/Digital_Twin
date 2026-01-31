import React from 'react';
import { UserInputs } from '../types';
import { ScoreCard } from './ScoreCard';

// Professional SVG Icons for Spending Categories
const CategoryIcons = {
    Groceries: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
    Food: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, // Menu/Book style for restaurant
    Alcohol: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    Gym: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Wellness: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Pharmacy: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    Card: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
};

export const SpendingBreakdown: React.FC<{ inputs: UserInputs }> = ({ inputs }) => {
  const categories = [
    { name: 'Groceries', amount: inputs.groceriesSpend, icon: <CategoryIcons.Groceries />, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Eating Out', amount: inputs.eatingOutSpend, icon: <CategoryIcons.Food />, color: 'text-amber-600 bg-amber-50' },
    { name: 'Alcohol / Bars', amount: inputs.alcoholSpend, icon: <CategoryIcons.Alcohol />, color: 'text-rose-600 bg-rose-50' },
    { name: 'Gym / Sports', amount: inputs.gymSpend, icon: <CategoryIcons.Gym />, color: 'text-blue-600 bg-blue-50' },
    { name: 'Wellness', amount: inputs.wellnessSpend, icon: <CategoryIcons.Wellness />, color: 'text-violet-600 bg-violet-50' },
    { name: 'Pharmacy', amount: inputs.pharmacySpend, icon: <CategoryIcons.Pharmacy />, color: 'text-slate-600 bg-slate-100' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
           <span className="text-slate-400"><CategoryIcons.Card /></span> Monthly Breakdown
        </h3>
      </div>
      <div className="divide-y divide-slate-50">
        {categories.map((c, i) => {
            const percent = inputs.monthlyIncome > 0 ? ((c.amount / inputs.monthlyIncome) * 100).toFixed(1) : '0';
            return (
                <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.color} group-hover:scale-110 transition-transform`}>
                            {c.icon}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{c.name}</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-mono font-bold text-slate-800">${c.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">{percent}% of income</div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export const WealthSnapshot: React.FC<{ inputs: UserInputs; score: number | null }> = ({ inputs, score }) => {
    const totalExpenses = inputs.fixedCosts + inputs.lifestyleSpend;
    const savingsRate = inputs.monthlyIncome > 0 ? (((inputs.monthlyIncome - totalExpenses) / inputs.monthlyIncome) * 100).toFixed(0) : '0';
    const runway = totalExpenses > 0 ? (inputs.currentSavings / totalExpenses).toFixed(1) : '0';
    const discretionaryRatio = inputs.monthlyIncome > 0 ? ((inputs.lifestyleSpend / inputs.monthlyIncome) * 100).toFixed(0) : '0';

    return (
        <div className="space-y-6">
            <ScoreCard title="Wealth Score" score={score} colorClass="text-indigo-600" bgClass="bg-indigo-50 border-indigo-200" />
            
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Financial Vitals
                </h4>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                        <div className="text-2xl font-mono font-bold text-slate-800">{savingsRate}%</div>
                        <div className="text-xs text-slate-500">Savings Rate</div>
                    </div>
                    <div>
                        <div className="text-2xl font-mono font-bold text-slate-800">{runway} <span className="text-sm font-sans font-normal text-slate-400">mo</span></div>
                        <div className="text-xs text-slate-500">Runway</div>
                    </div>
                    <div>
                        <div className="text-2xl font-mono font-bold text-slate-800">${inputs.totalDebt.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">Total Debt</div>
                    </div>
                    <div>
                         <div className="text-2xl font-mono font-bold text-slate-800">{discretionaryRatio}%</div>
                         <div className="text-xs text-slate-500">Discretionary %</div>
                    </div>
                </div>
            </div>

            {/* Safety Alerts */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Safety Signals</h4>
                <div className="space-y-2">
                    {Number(runway) < 3 && (
                        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                             <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                             <span><strong>Low Runway:</strong> Below 3 months. Priority: Build Emergency Fund.</span>
                        </div>
                    )}
                    {Number(discretionaryRatio) > 30 && (
                        <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                             <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             <span><strong>High Lifestyle Spend:</strong> Over 30% of income. High opportunity for savings.</span>
                        </div>
                    )}
                     {Number(runway) >= 3 && Number(discretionaryRatio) <= 30 && (
                        <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                             <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                             <span><strong>Stable:</strong> Core financials look healthy.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};