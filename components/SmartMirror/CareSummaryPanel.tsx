/**
 * CareSummaryPanel - Clinical summary display for Smart Mirror
 * 
 * Shows MedGemma analysis results including:
 * - Patient summary and key changes
 * - Risk level (traffic light)
 * - Caregiver SMS-ready message
 * - Clinician SOAP note draft
 * 
 * DISCLAIMER: Demo only - not medical advice.
 */

import React, { useState } from 'react';
import type { MedGemmaAnalysis } from '../../types';

type AnalysisState = 'idle' | 'pending' | 'analyzing' | 'ready' | 'error';

type ProviderSource = 'demo' | 'medgemma-cloud' | 'demo-fallback';

interface CareSummaryPanelProps {
  analysis: MedGemmaAnalysis | null;
  analysisState: AnalysisState;
  /** Source of analysis for badge display */
  providerSource?: ProviderSource | null;
  onRetry?: () => void;
  /** If true, renders as embedded panel (not fixed positioned) */
  embedded?: boolean;
  /** Optional transcript for decision-factor derivation */
  transcript?: string;
  /** Optional follow-up answers for decision-factor derivation */
  followUpAnswers?: Record<string, string>;
}

const RiskBadge: React.FC<{ level: 'green' | 'yellow' | 'red' }> = ({ level }) => {
  const config = {
    green: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Low Risk' },
    yellow: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Monitor' },
    red: { bg: 'bg-rose-500/20', border: 'border-rose-500/30', text: 'text-rose-400', label: 'Urgent' },
  }[level];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} border ${config.border}`}>
      <div className={`w-3 h-3 rounded-full ${level === 'green' ? 'bg-emerald-500' : level === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'} ${level !== 'green' ? 'animate-pulse' : ''}`} />
      <span className={`text-sm font-semibold ${config.text}`}>{config.label}</span>
    </div>
  );
};

const CopyButton: React.FC<{ text: string; label?: string; showIcon?: boolean }> = ({
  text,
  label = 'Copy',
  showIcon = true,
}) => {
  const [copied, setCopied] = useState(false);
  const disabled = !text || !text.trim();

  const handleCopy = async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const ClipboardIcon = (
    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );

  return (
    <button
      onClick={handleCopy}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
        disabled
          ? 'opacity-50 cursor-not-allowed bg-white/5 text-white/40'
          : copied
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'
      }`}
    >
      {showIcon && !copied && ClipboardIcon}
      {copied ? 'Copied!' : label}
    </button>
  );
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}> = ({ title, children, defaultOpen = false, actions }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
      >
        <span className="text-sm font-semibold text-white/90">{title}</span>
        <div className="flex items-center gap-2">
          {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
          <svg
            className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && <div className="px-4 py-3 border-t border-white/10">{children}</div>}
    </div>
  );
};

const ProviderBadge: React.FC<{
  source: ProviderSource;
  modelName?: string;
  latencyMs?: number;
}> = ({ source, modelName, latencyMs }) => {
  const config: Record<ProviderSource, { label: string; className: string }> = {
    demo: { label: 'demo', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    'medgemma-cloud': { label: 'medgemma-cloud', className: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
    'demo-fallback': { label: 'demo-fallback', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  };
  const { label, className } = config[source];
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${className}`}>
        {label}
      </span>
      {modelName && (
        <span className="text-[10px] text-white/50">{modelName}</span>
      )}
      {latencyMs != null && (
        <span className="text-[10px] text-white/50">{Math.round(latencyMs)}ms</span>
      )}
    </span>
  );
};

const RED_FLAG_KEYWORDS = /chest pain|shortness of breath|fainting|severe headache|blood|confusion/i;

function deriveConfidence(
  analysis: MedGemmaAnalysis,
  providerSource?: ProviderSource | null,
  transcript?: string,
  followUpAnswers?: Record<string, string>
): { score: number; label: 'High' | 'Medium' | 'Low'; pct: number } {
  let score = 0.7;
  const v = analysis.patient_summary?.vitals;
  const hasVitals = v && [v.bp, v.hr, v.spo2, v.temp, v.weight].some((x) => x && String(x).trim());
  if (!hasVitals) score -= 0.2;
  if (transcript && RED_FLAG_KEYWORDS.test(transcript)) score -= 0.2;
  if (providerSource === 'demo-fallback') score -= 0.1;
  if (followUpAnswers) {
    for (const k of ['urgent_severity', 'urgent_duration', 'allergies', 'current_medications']) {
      if (followUpAnswers[k]) score += 0.05;
    }
  }
  score = Math.min(0.95, Math.max(0.3, score));
  const label = score >= 0.8 ? 'High' : score >= 0.6 ? 'Medium' : 'Low';
  return { score, label, pct: Math.round(score * 100) };
}

function deriveEscalation(
  riskLevel: 'green' | 'yellow' | 'red',
  hasRedFlags: boolean,
  confidenceLabel?: 'High' | 'Medium' | 'Low',
  vitalsMissing?: boolean
): string {
  if (riskLevel === 'red') return 'Urgent care / emergency evaluation';
  if (riskLevel === 'yellow') return 'Schedule appointment / talk to clinician';
  if (hasRedFlags || confidenceLabel === 'Low' || vitalsMissing) return 'Schedule appointment / talk to clinician';
  return 'Self-care + monitor';
}

function extractSymptomPhrases(transcript: string): string[] {
  const userLines = transcript
    .split('\n')
    .filter((l) => /^(User|You):/i.test(l.trim()))
    .map((l) => l.replace(/^(User|You):\s*/i, '').trim())
    .filter(Boolean);

  const symptomHints = /pain|ache|dizzy|nausea|tired|fatigue|sore|burn|itch|swollen|cramp|cough|fever|bleed|numb|weak|anxious|stress|insomnia/i;
  const matches = userLines.filter((l) => symptomHints.test(l));
  if (matches.length > 0) return matches.slice(0, 3);
  return userLines.slice(0, 3);
}

function deriveDecisionFactors(
  analysis: MedGemmaAnalysis,
  providerSource?: ProviderSource | null,
  transcript?: string,
  followUpAnswers?: Record<string, string>
): string[] {
  const out: string[] = [];
  if (providerSource) {
    out.push(`Analysis from ${providerSource}.`);
  }
  const level = analysis.triage?.risk_level;
  if (level) {
    out.push(`Triage level set to ${level} based on reported symptoms and context.`);
  }
  if (transcript && RED_FLAG_KEYWORDS.test(transcript)) {
    out.push('Transcript contains potential red-flag keywords (chest pain, shortness of breath, fainting, severe headache, blood, confusion).');
  }
  const v = analysis.patient_summary?.vitals;
  if (v) {
    const hasAny = [v.bp, v.hr, v.spo2, v.temp, v.weight].some((x) => x && String(x).trim());
    if (!hasAny) {
      out.push('No vitals provided; risk may be underestimated.');
    }
  } else {
    out.push('No vitals provided; risk may be underestimated.');
  }
  if (followUpAnswers && Object.keys(followUpAnswers).length > 0) {
    const severity = followUpAnswers.urgent_severity;
    const duration = followUpAnswers.urgent_duration;

    if (severity) {
      out.push(`Follow-up: severity captured (${severity}/10).`);
    }

    if (duration) {
      out.push(`Follow-up: duration captured (${duration}).`);
    }
  }
  return out.slice(0, 6);
}

export const CareSummaryPanel: React.FC<CareSummaryPanelProps> = ({
  analysis,
  analysisState,
  providerSource,
  onRetry,
  embedded = false,
  transcript,
  followUpAnswers,
}) => {
  const buildAppointmentBrief = () => {
    if (!analysis) return '';
    return [
      `CHECK-IN BRIEF — ${new Date().toLocaleDateString()}`,
      `Risk: ${analysis.triage.risk_level}`,
      '',
      analysis.patient_summary.one_liner,
      ...(analysis.patient_summary.key_changes_since_yesterday.length > 0
        ? ['', 'Key changes:', ...analysis.patient_summary.key_changes_since_yesterday.map((c) => `• ${c}`)]
        : []),
      ...(analysis.triage.recommended_next_steps.length > 0
        ? ['', 'Next steps:', ...analysis.triage.recommended_next_steps.map((s) => `• ${s}`)]
        : []),
      ...(analysis.triage.when_to_seek_urgent_care.length > 0
        ? ['', 'Seek urgent care if:', ...analysis.triage.when_to_seek_urgent_care.map((s) => `• ${s}`)]
        : []),
    ].join('\n');
  };

  // Build SOAP note as markdown for export
  const buildSoapMarkdown = () => {
    if (!analysis) return '';
    const soap = analysis.clinician_note_draft;
    return `# Clinical Note Draft

**Date:** ${new Date().toLocaleDateString()}

## Subjective
${soap.subjective}

## Objective
${soap.objective}

## Assessment
${soap.assessment}

## Plan
${soap.plan}

---
*Generated by DigiCare MedGemma Demo*
*Model: ${analysis.model_meta.model}*
*Limitations: ${analysis.model_meta.limitations.join(', ')}*
`;
  };

  const handleExportMarkdown = () => {
    const markdown = buildSoapMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-note-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Container classes based on embedded mode
  const fixedContainerClass = "fixed left-6 bottom-24 w-80 z-40";
  const embeddedContainerClass = "w-full";
  const containerClass = embedded ? embeddedContainerClass : fixedContainerClass;
  
  const fixedFullContainerClass = "fixed left-6 top-24 bottom-24 w-96 z-40";
  const embeddedFullContainerClass = "w-full max-h-[600px]";
  const fullContainerClass = embedded ? embeddedFullContainerClass : fixedFullContainerClass;

  // Loading state
  if (analysisState === 'pending' || analysisState === 'analyzing') {
    return (
      <div
        className={`${containerClass} p-6 rounded-2xl`}
        style={embedded ? {} : {
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/80 text-sm font-medium">
            {analysisState === 'pending' ? 'Preparing analysis...' : 'Analyzing locally...'}
          </span>
        </div>
        <div className="text-white/50 text-xs">
          MedGemma is processing your check-in data
        </div>
      </div>
    );
  }

  // Error state
  if (analysisState === 'error') {
    return (
      <div
        className={`${containerClass} p-6 rounded-2xl`}
        style={embedded ? { border: '1px solid rgba(239, 68, 68, 0.3)' } : {
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className="text-white/80 text-sm font-medium">Analysis unavailable</span>
        </div>
        <p className="text-white/50 text-xs mb-4">
          Using safety defaults. Your check-in data has been saved.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2 text-sm font-medium bg-white/10 hover:bg-white/20 text-white/80 rounded-lg transition-colors"
          >
            Retry Analysis
          </button>
        )}
      </div>
    );
  }

  // Idle state - no analysis yet
  if (!analysis || analysisState === 'idle') {
    return null;
  }

  // Ready state - show full analysis
  return (
    <div
      className={`${fullContainerClass} flex flex-col rounded-2xl overflow-hidden`}
      style={embedded ? {} : {
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Care Summary</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {providerSource && (
                <ProviderBadge
                  source={providerSource}
                  modelName={analysis.model_meta?.model}
                  latencyMs={(analysis as unknown as Record<string, unknown>).latencyMs as number | undefined}
                />
              )}
              {!providerSource && <span className="text-white/50 text-xs">Offline Analysis</span>}
            </div>
            {providerSource === 'demo-fallback' && (
              <p className="text-amber-400/90 text-xs mt-1.5">
                Cloud unavailable — fell back to offline demo mode.
              </p>
            )}
          </div>
        </div>
        <RiskBadge level={analysis.triage.risk_level} />
      </div>

      {/* Confidence & Safety */}
      {(() => {
        const conf = deriveConfidence(analysis, providerSource, transcript, followUpAnswers);
        const hasRedFlags = !!(transcript && RED_FLAG_KEYWORDS.test(transcript));
        const v = analysis.patient_summary?.vitals;
        const vitalsMissing = !v || ![v.bp, v.hr, v.spo2, v.temp, v.weight].some((x) => x && String(x).trim());
        const escalation = deriveEscalation(analysis.triage.risk_level, hasRedFlags, conf.label, vitalsMissing);
        const confColor = conf.label === 'High' ? 'text-emerald-400' : conf.label === 'Medium' ? 'text-amber-400' : 'text-rose-400';
        return (
          <div className="px-5 py-3 border-b border-white/10 space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-white/60">
                Confidence: <span className={`font-semibold ${confColor}`}>{conf.label} ({conf.pct}%)</span>
              </span>
              <span className="text-xs text-white/50">
                Escalation: <span className="text-white/70 font-medium">{escalation}</span>
              </span>
            </div>
            <p className="text-[11px] text-white/40 leading-snug">
              Safety note: If symptoms worsen or red flags appear, seek urgent care.
            </p>
          </div>
        );
      })()}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Clinical Input Snapshot */}
        <CollapsibleSection title="Clinical Input Snapshot" defaultOpen={false}>
          <div className="space-y-3">
            <div className="text-xs text-white/60 leading-relaxed">
              <div>Inputs used: transcript{followUpAnswers && Object.keys(followUpAnswers).length > 0 ? ' + follow-up' : ''} + vitals ({analysis.patient_summary?.vitals && [analysis.patient_summary.vitals.bp, analysis.patient_summary.vitals.hr, analysis.patient_summary.vitals.spo2, analysis.patient_summary.vitals.temp, analysis.patient_summary.vitals.weight].some((x) => x && String(x).trim()) ? 'present' : 'missing'})</div>
              {providerSource && <div>Reasoning provider: {providerSource}</div>}
            </div>

            {/* Reported symptoms */}
            {transcript && transcript.trim() && (() => {
              const phrases = extractSymptomPhrases(transcript);
              return phrases.length > 0 ? (
                <div>
                  <div className="text-xs font-medium text-white/50 mb-1">Reported Symptoms</div>
                  <ul className="space-y-1">
                    {phrases.map((p, i) => (
                      <li key={i} className="text-white/70 text-xs flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span className="italic">&ldquo;{p}&rdquo;</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}

            {/* Follow-up answers */}
            {followUpAnswers && Object.keys(followUpAnswers).length > 0 && (
              <div>
                <div className="text-xs font-medium text-white/50 mb-1">Follow-up Intake</div>
                <ul className="space-y-1">
                  {followUpAnswers.urgent_severity && (
                    <li className="text-white/70 text-xs flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      Severity: {followUpAnswers.urgent_severity}/10
                    </li>
                  )}
                  {followUpAnswers.urgent_duration && (
                    <li className="text-white/70 text-xs flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      Duration: {followUpAnswers.urgent_duration}
                    </li>
                  )}
                  {followUpAnswers.appt_date && (
                    <li className="text-white/70 text-xs flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      Appointment: {followUpAnswers.appt_date}
                      {followUpAnswers.appt_specialty ? ` (${followUpAnswers.appt_specialty})` : ''}
                    </li>
                  )}
                  {followUpAnswers.allergies && (
                    <li className="text-white/70 text-xs flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      Allergies: {followUpAnswers.allergies}
                    </li>
                  )}
                  {followUpAnswers.current_medications && (
                    <li className="text-white/70 text-xs flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      Medications: {followUpAnswers.current_medications}
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Red flag detection */}
            <div className="text-xs flex items-center gap-2">
              {transcript && RED_FLAG_KEYWORDS.test(transcript) ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-rose-400 font-medium">Red-flag keywords detected</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-white/50">No red-flag keywords detected</span>
                </>
              )}
            </div>

            {/* Vitals status */}
            {(() => {
              const v = analysis.patient_summary?.vitals;
              const hasAny = v && [v.bp, v.hr, v.spo2, v.temp, v.weight].some((x) => x && String(x).trim());
              return (
                <div className="text-xs flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasAny ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-white/50">
                    {hasAny ? 'Vitals provided' : 'No vitals provided'}
                  </span>
                </div>
              );
            })()}

            {/* Full Transcript */}
            {transcript && transcript.trim() && (
              <CollapsibleSection title="Full Transcript" defaultOpen={false}>
                <pre className="text-white/60 text-xs whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                  {transcript}
                </pre>
              </CollapsibleSection>
            )}
          </div>
        </CollapsibleSection>

        {/* Summary */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Summary</h3>
          </div>
          <p className="text-white/90 text-sm leading-relaxed">{analysis.patient_summary.one_liner}</p>
          
          {analysis.patient_summary.key_changes_since_yesterday.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-white/50 mb-1">Changes since yesterday:</div>
              <ul className="space-y-1">
                {analysis.patient_summary.key_changes_since_yesterday.map((change, i) => (
                  <li key={i} className="text-white/70 text-xs flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Appointment Brief */}
        <CollapsibleSection
          title="Appointment Brief"
          defaultOpen={false}
          actions={<CopyButton text={buildAppointmentBrief()} label="📋 Copy" showIcon={false} />}
        >
          <pre className="text-white/80 text-xs whitespace-pre-wrap font-sans">{buildAppointmentBrief()}</pre>
        </CollapsibleSection>

        {/* Red Flags */}
        {analysis.triage.red_flags.length > 0 && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="text-xs font-semibold text-rose-400 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Attention Items
            </div>
            <ul className="space-y-1">
              {analysis.triage.red_flags.map((flag, i) => (
                <li key={i} className="text-white/80 text-xs">{flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Next Steps */}
        {analysis.triage.recommended_next_steps.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Next Steps</h3>
            <ul className="space-y-1.5">
              {analysis.triage.recommended_next_steps.map((step, i) => (
                <li key={i} className="text-white/70 text-xs flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decision Factors */}
        {(() => {
          const factors = (analysis as unknown as Record<string, unknown>).decisionFactors as string[] | undefined;
          const list = factors && Array.isArray(factors) && factors.length > 0
            ? factors.slice(0, 6)
            : deriveDecisionFactors(analysis, providerSource, transcript, followUpAnswers);
          if (list.length === 0) return null;
          return (
            <CollapsibleSection title="Decision Factors" defaultOpen={false}>
              <ul className="space-y-1.5">
                {list.map((item, i) => (
                  <li key={i} className="text-white/70 text-xs flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          );
        })()}

        {/* Caregiver Message */}
        <CollapsibleSection
          title="Caregiver Message"
          defaultOpen={true}
          actions={
            <CopyButton
              text={[
                analysis.caregiver_message.sms_ready_text,
                ...(analysis.caregiver_message.questions_to_ask_patient_today.length > 0
                  ? ['', 'Questions to ask today:', ...analysis.caregiver_message.questions_to_ask_patient_today]
                  : []),
              ].join('\n')}
              label="📋 Copy"
              showIcon={false}
            />
          }
        >
          <p className="text-white/80 text-sm leading-relaxed mb-3">
            {analysis.caregiver_message.sms_ready_text}
          </p>
          {analysis.caregiver_message.questions_to_ask_patient_today.length > 0 && (
            <div>
              <div className="text-xs text-white/50 mb-1">Questions to ask today:</div>
              <ul className="space-y-1">
                {analysis.caregiver_message.questions_to_ask_patient_today.map((q, i) => (
                  <li key={i} className="text-white/60 text-xs">• {q}</li>
                ))}
              </ul>
            </div>
          )}
        </CollapsibleSection>

        {/* Clinician SOAP Note */}
        <CollapsibleSection
          title="Clinician Note (SOAP)"
          actions={
            <div className="flex gap-2">
              <CopyButton
                text={`S: ${analysis.clinician_note_draft.subjective}\nO: ${analysis.clinician_note_draft.objective}\nA: ${analysis.clinician_note_draft.assessment}\nP: ${analysis.clinician_note_draft.plan}`}
                label="📋 Copy"
                showIcon={false}
              />
              <button
                onClick={handleExportMarkdown}
                className="px-3 py-1 text-xs font-medium bg-white/10 text-white/70 hover:bg-white/20 border border-white/10 rounded-lg transition-all"
              >
                Export MD
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-violet-400 mb-1">Subjective</div>
              <p className="text-white/70 text-xs">{analysis.clinician_note_draft.subjective}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-violet-400 mb-1">Objective</div>
              <p className="text-white/70 text-xs">{analysis.clinician_note_draft.objective}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-violet-400 mb-1">Assessment</div>
              <p className="text-white/70 text-xs">{analysis.clinician_note_draft.assessment}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-violet-400 mb-1">Plan</div>
              <p className="text-white/70 text-xs">{analysis.clinician_note_draft.plan}</p>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer Disclaimer */}
      <div className="px-5 py-3 border-t border-white/10 bg-black/30">
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Demo only — not medical advice. Model: {analysis.model_meta.model}</span>
        </div>
      </div>
    </div>
  );
};

export default CareSummaryPanel;
