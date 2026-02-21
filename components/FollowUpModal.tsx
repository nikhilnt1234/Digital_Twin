/**
 * Follow-up Question Modal
 * Displays 1–3 follow-up questions (text, number, select) and collects answers.
 */

import React, { useState, useCallback } from 'react';

export interface FollowUpQuestion {
  id: string;
  questionText: string;
  inputType: 'text' | 'number' | 'select';
  options?: string[];
  required: boolean;
  rationale?: string;
}

interface FollowUpModalProps {
  isOpen: boolean;
  questions: FollowUpQuestion[];
  loading: boolean;
  error: string | null;
  onSubmit: (answers: Array<{ id: string; answer: string | number }>) => void;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  questions,
  loading,
  error,
  onSubmit,
}) => {
  const [values, setValues] = useState<Record<string, string | number>>({});

  const handleChange = useCallback((id: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const answers = questions
      .map((q) => {
        const v = values[q.id];
        if (v === undefined || v === '') return null;
        return { id: q.id, answer: q.inputType === 'number' ? Number(v) : v };
      })
      .filter((a): a is { id: string; answer: string | number } => a !== null);
    onSubmit(answers);
    setValues({});
  }, [questions, values, onSubmit]);

  if (!isOpen) return null;

  const canSubmit = questions.every((q) => {
    const v = values[q.id];
    if (q.required && (v === undefined || v === '')) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick follow-up</h3>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg">{error}</div>
        )}

        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {q.questionText}
                {q.required && <span className="text-rose-500 ml-0.5">*</span>}
              </label>
              {q.rationale && (
                <p className="text-xs text-slate-400 mb-1">{q.rationale}</p>
              )}
              {q.inputType === 'text' && !q.options?.length && (
                <input
                  type="text"
                  value={(values[q.id] ?? '') as string}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your answer"
                />
              )}
              {q.inputType === 'number' && (
                <input
                  type="number"
                  value={(values[q.id] ?? '') as string | number}
                  onChange={(e) =>
                    handleChange(q.id, e.target.value === '' ? '' : e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Number"
                />
              )}
              {((q.inputType === 'select') || (q.inputType === 'text' && q.options?.length)) && q.options && q.options.length > 0 && (
                <select
                  value={(values[q.id] ?? '') as string}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};
