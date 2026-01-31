import React, { useState } from 'react';
import { UserInputs, Appointment, RecurringPayment } from '../types';

interface ConnectionsProps {
  inputs: UserInputs;
  setInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  onAskCoach: (question: string) => void;
}

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; color: string }> = ({ title, icon, color }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
      {icon}
    </div>
    <h3 className="font-bold text-slate-800">{title}</h3>
  </div>
);

export const HealthConnections: React.FC<ConnectionsProps> = ({ inputs, setInputs, onAskCoach }) => {
  const [apptDate, setApptDate] = useState('');
  const [apptDoctor, setApptDoctor] = useState('');
  const [apptReason, setApptReason] = useState('Check-up');
  const [billInput, setBillInput] = useState('');

  const handleConnectHospital = () => {
    // Simulation
    setInputs(prev => ({ ...prev, isConnectedHospital: true }));
  };

  const handleAddAppointment = () => {
    if (!apptDate || !apptDoctor) return;
    const newAppt: Appointment = {
      id: Date.now().toString(),
      date: apptDate,
      doctor: apptDoctor,
      reason: apptReason
    };
    setInputs(prev => ({ ...prev, appointments: [...(prev.appointments || []), newAppt] }));
    setApptDate('');
    setApptDoctor('');
  };

  const handleAnalyzeBill = () => {
      setInputs(prev => ({ ...prev, billText: billInput }));
      onAskCoach("Please analyze this medical bill I just pasted. Explain the charges in simple terms and tell me if anything looks like an optional administrative fee.");
  };

  return (
    <div className="space-y-6">
      {/* 1. Hospitals */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <SectionHeader 
            title="Hospital & Labs" 
            color="bg-emerald-50 text-emerald-600"
            icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 100-4 2 2 0 000 4zM7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
        />
        
        {!inputs.isConnectedHospital ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                    type="text" 
                    placeholder="Hospital / Clinic Name" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={inputs.hospitalName || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, hospitalName: e.target.value }))}
                />
                <input 
                    type="text" 
                    placeholder="Patient ID (Optional)" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={inputs.hospitalPatientId || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, hospitalPatientId: e.target.value }))}
                />
            </div>
            <button 
                onClick={handleConnectHospital}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors w-full md:w-auto"
            >
                Connect Provider
            </button>
          </div>
        ) : (
           <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
               <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   </div>
                   <div>
                       <div className="font-bold text-slate-800">{inputs.hospitalName || 'Health Provider'}</div>
                       <div className="text-xs text-emerald-600">Connected • ID: {inputs.hospitalPatientId || '******'}</div>
                   </div>
               </div>
               <button onClick={() => setInputs(prev => ({...prev, isConnectedHospital: false}))} className="text-xs text-slate-400 hover:text-rose-500">Disconnect</button>
           </div>
        )}
      </div>

      {/* 2. Bills */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <SectionHeader 
            title="Bills & Pharmacy" 
            color="bg-blue-50 text-blue-600"
            icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <div className="space-y-4">
             <textarea 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none h-24"
                placeholder="Paste text from a digital bill or receipt here..."
                value={billInput}
                onChange={(e) => setBillInput(e.target.value)}
             />
             <div className="flex gap-3">
                 <button 
                    onClick={handleAnalyzeBill}
                    disabled={!billInput}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                     Analyze My Bill
                 </button>
                 <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                     Upload Photo
                 </button>
             </div>
        </div>
      </div>

       {/* 3. Appointments */}
       <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <SectionHeader 
            title="Appointments" 
            color="bg-violet-50 text-violet-600"
            icon={<svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        
        {inputs.appointments.length > 0 && (
             <div className="mb-6 space-y-2">
                 {inputs.appointments.map((appt) => (
                     <div key={appt.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                         <div>
                             <div className="font-bold text-slate-700 text-sm">{appt.doctor}</div>
                             <div className="text-xs text-slate-500">{appt.reason} • {new Date(appt.date).toLocaleDateString()}</div>
                         </div>
                         <button 
                            onClick={() => onAskCoach(`I have an appointment with ${appt.doctor} for ${appt.reason} on ${appt.date}. What should I ask or prepare?`)}
                            className="text-xs font-medium text-violet-600 hover:text-violet-800 bg-white px-2 py-1 rounded border border-violet-100"
                        >
                             Prepare Me
                         </button>
                     </div>
                 ))}
             </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Date</label>
                <input type="datetime-local" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={apptDate} onChange={e => setApptDate(e.target.value)} />
            </div>
            <div className="md:col-span-1">
                 <label className="text-[10px] uppercase font-bold text-slate-400">Doctor / Clinic</label>
                 <input type="text" placeholder="Dr. Smith" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={apptDoctor} onChange={e => setApptDoctor(e.target.value)} />
            </div>
            <div className="md:col-span-1 flex gap-2">
                 <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Reason</label>
                    <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={apptReason} onChange={e => setApptReason(e.target.value)}>
                        <option>Check-up</option>
                        <option>Lab Results</option>
                        <option>Follow-up</option>
                        <option>Issue/Pain</option>
                    </select>
                 </div>
                 <button onClick={handleAddAppointment} className="h-[38px] px-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export const MoneyConnections: React.FC<ConnectionsProps> = ({ inputs, setInputs, onAskCoach }) => {
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<RecurringPayment['type']>('Subscription');
  const [recEssential, setRecEssential] = useState(false);

  const handleAddRecurring = () => {
      if (!recName || !recAmount) return;
      const newPay: RecurringPayment = {
          id: Date.now().toString(),
          name: recName,
          amount: Number(recAmount),
          type: recType,
          isEssential: recEssential
      };
      setInputs(prev => ({ ...prev, recurringPayments: [...prev.recurringPayments, newPay] }));
      setRecName('');
      setRecAmount('');
      setRecEssential(false);
  };

  const handleRemoveRecurring = (id: string) => {
    setInputs(prev => ({ ...prev, recurringPayments: prev.recurringPayments.filter(p => p.id !== id) }));
  };

  return (
    <div className="space-y-6">
        {/* 1. Accounts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <SectionHeader 
                title="Accounts & Assets" 
                color="bg-indigo-50 text-indigo-600"
                icon={<svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Take-Home</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400">$</span>
                        <input 
                            type="number" 
                            className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm"
                            value={inputs.monthlyIncome || ''}
                            onChange={e => setInputs(prev => ({ ...prev, monthlyIncome: Number(e.target.value) }))}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Bank Cash</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400">$</span>
                        <input 
                            type="number" 
                            className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm"
                            value={inputs.bankTotal || inputs.currentSavings || ''}
                            onChange={e => setInputs(prev => ({ ...prev, bankTotal: Number(e.target.value), currentSavings: Number(e.target.value) }))}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Investments (401k/Apps)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400">$</span>
                        <input 
                            type="number" 
                            className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm"
                            value={inputs.investmentTotal || ''}
                            onChange={e => setInputs(prev => ({ ...prev, investmentTotal: Number(e.target.value) }))}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* 2. Recurring Payments */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <SectionHeader 
                title="Recurring & Fixed Costs" 
                color="bg-amber-50 text-amber-600"
                icon={<svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            />
            
            {/* List */}
            <div className="mb-6 space-y-2">
                {inputs.recurringPayments.map((pay) => (
                    <div key={pay.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg group">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${pay.isEssential ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                {pay.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-slate-700 text-sm">{pay.name}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">{pay.type} • {pay.isEssential ? 'Essential' : 'Optional'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-slate-800">${pay.amount}</span>
                            <button onClick={() => handleRemoveRecurring(pay.id)} className="text-slate-300 hover:text-rose-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
                 {inputs.recurringPayments.length > 0 && (
                     <button 
                        onClick={() => onAskCoach("Look at my recurring payments list. Which 2 items are non-essential that I could cut safely to increase my runway?")}
                        className="w-full text-center text-xs font-semibold text-amber-600 hover:text-amber-700 py-2 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                        Ask Coach to Review
                    </button>
                 )}
            </div>

            {/* Add Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <div className="md:col-span-1">
                     <label className="text-[10px] uppercase font-bold text-slate-400">Name</label>
                     <input type="text" placeholder="Netflix" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" value={recName} onChange={e => setRecName(e.target.value)} />
                 </div>
                 <div className="md:col-span-1">
                     <label className="text-[10px] uppercase font-bold text-slate-400">Amount</label>
                     <input type="number" placeholder="15" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" value={recAmount} onChange={e => setRecAmount(e.target.value)} />
                 </div>
                 <div className="md:col-span-1">
                     <label className="text-[10px] uppercase font-bold text-slate-400">Type</label>
                     <select className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" value={recType} onChange={e => setRecType(e.target.value as any)}>
                         <option value="Housing">Housing</option>
                         <option value="Loan">Loan / EMI</option>
                         <option value="Subscription">Subscription</option>
                         <option value="Other">Other</option>
                     </select>
                 </div>
                 <div className="md:col-span-1 flex gap-2 items-center">
                     <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 h-[38px] px-3 rounded-lg flex-1">
                         <input type="checkbox" checked={recEssential} onChange={e => setRecEssential(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                         <span className="text-xs font-medium text-slate-600">Essential?</span>
                     </label>
                     <button onClick={handleAddRecurring} className="h-[38px] px-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     </button>
                 </div>
            </div>
        </div>

        {/* 3. Medical Debt */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <SectionHeader 
                title="Medical Debt Strategy" 
                color="bg-rose-50 text-rose-600"
                icon={<svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Debt</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400">$</span>
                        <input 
                            type="number" 
                            className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm"
                            value={inputs.medicalDebtTotal || ''}
                            onChange={e => setInputs(prev => ({ ...prev, medicalDebtTotal: Number(e.target.value) }))}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Interest Rate (%)</label>
                    <input 
                        type="number" 
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm"
                        value={inputs.medicalDebtInterest || ''}
                        onChange={e => setInputs(prev => ({ ...prev, medicalDebtInterest: Number(e.target.value) }))}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Payment</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400">$</span>
                        <input 
                            type="number" 
                            className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm"
                            value={inputs.medicalDebtMonthly || ''}
                            onChange={e => setInputs(prev => ({ ...prev, medicalDebtMonthly: Number(e.target.value) }))}
                        />
                    </div>
                </div>
            </div>
             {(inputs.medicalDebtTotal || 0) > 0 && (
                 <div className="mt-4 flex justify-end">
                     <button 
                        onClick={() => onAskCoach(`I have $${inputs.medicalDebtTotal} in medical debt at ${inputs.medicalDebtInterest || 0}% interest. Help me plan a strategy to pay this off without losing my housing.`)}
                        className="text-sm font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-4 py-2 rounded-lg transition-colors border border-rose-100"
                    >
                        Create Debt Payoff Plan
                    </button>
                 </div>
            )}
        </div>
    </div>
  );
};