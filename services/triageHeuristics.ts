/**
 * Heuristic-based Triage System
 * 
 * A rule-based safety net that detects critical red flags in patient transcripts.
 * Used as a fallback when MedGemma is unavailable and as a safety override
 * when the model might miss critical symptoms.
 */

import type { MedGemmaAnalysis } from '../types';

export interface HeuristicResult {
  risk_level: 'green' | 'yellow' | 'red';
  red_flags: string[];
  triggered_rules: string[];
  should_override: boolean;
}

/**
 * Red flag phrases that indicate urgent medical concern.
 * Organized by severity.
 */
const RED_FLAG_PATTERNS: { pattern: RegExp; flag: string; severity: 'red' | 'yellow' }[] = [
  // RED - Immediate concern
  { pattern: /chest\s*pain/i, flag: 'Chest pain reported', severity: 'red' },
  { pattern: /can'?t\s*breathe|cannot\s*breathe|difficulty\s*breathing|shortness\s*of\s*breath|hard\s*to\s*breathe/i, flag: 'Breathing difficulty reported', severity: 'red' },
  { pattern: /fainted|passed\s*out|lost\s*consciousness|blacked\s*out/i, flag: 'Loss of consciousness reported', severity: 'red' },
  { pattern: /confusion|confused|disoriented|don'?t\s*know\s*where\s*i\s*am/i, flag: 'Confusion or disorientation reported', severity: 'red' },
  { pattern: /severe\s*pain/i, flag: 'Severe pain reported', severity: 'red' },
  { pattern: /numbness.*face|face.*numb|arm.*numb|leg.*numb|one\s*side.*weak/i, flag: 'Possible stroke symptoms', severity: 'red' },
  { pattern: /blood\s*in.*stool|blood\s*in.*urine|coughing.*blood|vomiting.*blood/i, flag: 'Bleeding symptom reported', severity: 'red' },
  { pattern: /suicidal|want\s*to\s*die|harm\s*myself|end\s*my\s*life/i, flag: 'Mental health crisis indicated', severity: 'red' },
  { pattern: /allergic\s*reaction|throat.*swelling|can'?t\s*swallow/i, flag: 'Possible allergic reaction', severity: 'red' },
  { pattern: /seizure|convulsion/i, flag: 'Seizure reported', severity: 'red' },
  
  // YELLOW - Monitor closely
  { pattern: /dizzy|dizziness|lightheaded/i, flag: 'Dizziness reported', severity: 'yellow' },
  { pattern: /nausea|vomiting|threw\s*up/i, flag: 'Nausea/vomiting reported', severity: 'yellow' },
  { pattern: /fever|temperature.*high|feel.*hot/i, flag: 'Possible fever', severity: 'yellow' },
  { pattern: /headache|head\s*hurts|migraine/i, flag: 'Headache reported', severity: 'yellow' },
  { pattern: /swelling|swollen/i, flag: 'Swelling reported', severity: 'yellow' },
  { pattern: /rash|skin.*irritation|hives/i, flag: 'Skin issue reported', severity: 'yellow' },
  { pattern: /didn'?t\s*take.*medication|missed.*medication|forgot.*medication|skip.*medication/i, flag: 'Medication non-adherence', severity: 'yellow' },
  { pattern: /blood\s*sugar.*high|blood\s*sugar.*low|glucose.*high|glucose.*low/i, flag: 'Blood sugar concern', severity: 'yellow' },
  { pattern: /can'?t\s*sleep|insomnia|no\s*sleep/i, flag: 'Sleep issues reported', severity: 'yellow' },
  { pattern: /anxiety|anxious|panic/i, flag: 'Anxiety reported', severity: 'yellow' },
  { pattern: /depressed|depression|sad\s*all\s*the\s*time/i, flag: 'Depression symptoms', severity: 'yellow' },
  { pattern: /pain/i, flag: 'Pain reported', severity: 'yellow' },
];

/**
 * Analyze transcript using rule-based heuristics.
 */
export function runHeuristicTriage(transcript: string): HeuristicResult {
  const redFlags: string[] = [];
  const triggeredRules: string[] = [];
  let maxSeverity: 'green' | 'yellow' | 'red' = 'green';

  for (const { pattern, flag, severity } of RED_FLAG_PATTERNS) {
    if (pattern.test(transcript)) {
      redFlags.push(flag);
      triggeredRules.push(pattern.source);
      
      // Upgrade severity if needed
      if (severity === 'red') {
        maxSeverity = 'red';
      } else if (severity === 'yellow' && maxSeverity !== 'red') {
        maxSeverity = 'yellow';
      }
    }
  }

  // Determine if this should override model output
  const shouldOverride = maxSeverity === 'red' || redFlags.length >= 3;

  return {
    risk_level: maxSeverity,
    red_flags: redFlags,
    triggered_rules: triggeredRules,
    should_override: shouldOverride,
  };
}

/**
 * Merge MedGemma analysis with heuristic results.
 * 
 * Rules:
 * 1. If heuristic finds RED flags, override to at least yellow (or red)
 * 2. If model says green but heuristic says red, bump to yellow with note
 * 3. Combine red flags from both sources
 * 4. Add note about heuristic override if applicable
 */
export function mergeWithHeuristics(
  modelResult: MedGemmaAnalysis,
  heuristicResult: HeuristicResult
): MedGemmaAnalysis {
  const merged = { ...modelResult };
  merged.triage = { ...modelResult.triage };
  merged.model_meta = { ...modelResult.model_meta };

  // Combine red flags (deduplicate)
  const combinedFlags = new Set([
    ...modelResult.triage.red_flags,
    ...heuristicResult.red_flags,
  ]);
  merged.triage.red_flags = Array.from(combinedFlags);

  // Override risk level if heuristics are more severe
  const riskOrder = { green: 0, yellow: 1, red: 2 };
  const modelRisk = riskOrder[modelResult.triage.risk_level] || 0;
  const heuristicRisk = riskOrder[heuristicResult.risk_level] || 0;

  if (heuristicResult.should_override && heuristicRisk > modelRisk) {
    // If model said green but heuristic found red flags, bump to at least yellow
    if (modelResult.triage.risk_level === 'green' && heuristicResult.risk_level === 'red') {
      merged.triage.risk_level = 'yellow';
      merged.triage.recommended_next_steps = [
        'Heuristic safety check flagged potential concerns',
        ...modelResult.triage.recommended_next_steps,
      ];
    } else {
      merged.triage.risk_level = heuristicResult.risk_level;
    }
    
    // Add note about override
    merged.model_meta.limitations = [
      ...modelResult.model_meta.limitations,
      'Risk level adjusted by safety heuristics',
    ];
  }

  // If heuristic found critical flags, ensure they're in urgent care list
  if (heuristicResult.risk_level === 'red') {
    const urgentCare = new Set(merged.triage.when_to_seek_urgent_care);
    heuristicResult.red_flags.forEach(flag => {
      urgentCare.add(`If ${flag.toLowerCase()} worsens`);
    });
    merged.triage.when_to_seek_urgent_care = Array.from(urgentCare);
  }

  return merged;
}

/**
 * Generate a heuristic-only analysis when MedGemma is unavailable.
 */
export function generateHeuristicAnalysis(
  transcript: string,
  vitals: { bp?: string; hr?: string; weight?: string }
): MedGemmaAnalysis {
  const heuristic = runHeuristicTriage(transcript);
  
  return {
    patient_summary: {
      one_liner: heuristic.risk_level === 'red' 
        ? 'Check-in flagged for review - potential concerns detected'
        : heuristic.risk_level === 'yellow'
          ? 'Check-in recorded - some items to monitor'
          : 'Check-in recorded - no immediate concerns detected',
      key_changes_since_yesterday: [],
      symptoms_reported: heuristic.red_flags,
      med_adherence: 'unknown',
      vitals: {
        bp: vitals.bp || '',
        hr: vitals.hr || '',
        spo2: '',
        temp: '',
        weight: vitals.weight || '',
      },
    },
    triage: {
      risk_level: heuristic.risk_level,
      red_flags: heuristic.red_flags,
      recommended_next_steps: heuristic.risk_level === 'red'
        ? [
            'Seek medical attention promptly',
            'Contact your healthcare provider',
            'If symptoms are severe, call emergency services',
          ]
        : heuristic.risk_level === 'yellow'
          ? [
              'Monitor symptoms closely',
              'Contact clinician if symptoms worsen',
              'Follow up at next scheduled visit',
            ]
          : [
              'Continue current care plan',
              'Maintain healthy habits',
              'Schedule regular check-ins',
            ],
      when_to_seek_urgent_care: [
        'Severe or worsening chest pain',
        'Difficulty breathing',
        'Signs of stroke (face drooping, arm weakness, speech difficulty)',
        'Loss of consciousness',
        'Severe allergic reaction',
      ],
    },
    caregiver_message: {
      sms_ready_text: heuristic.risk_level === 'red'
        ? `ALERT: Check-in flagged concerns: ${heuristic.red_flags.slice(0, 2).join(', ')}. Please check on patient and consider medical consultation.`
        : heuristic.risk_level === 'yellow'
          ? `Check-in note: ${heuristic.red_flags.slice(0, 2).join(', ') || 'Some items to monitor'}. Please check in with patient today.`
          : 'Check-in complete. No immediate concerns. Continue supportive care.',
      questions_to_ask_patient_today: heuristic.red_flags.length > 0
        ? [
            'How are you feeling right now?',
            'Has anything changed since your check-in?',
            ...heuristic.red_flags.slice(0, 2).map(f => `Tell me more about: ${f.toLowerCase()}`),
          ]
        : [
            'How are you feeling overall?',
            'Any concerns you want to discuss?',
          ],
    },
    clinician_note_draft: {
      subjective: `Patient check-in analyzed via heuristic rules. ${heuristic.red_flags.length > 0 ? `Flags: ${heuristic.red_flags.join('; ')}` : 'No concerning patterns detected.'}`,
      objective: `Vitals: BP ${vitals.bp || 'N/A'}, HR ${vitals.hr || 'N/A'}, Weight ${vitals.weight || 'N/A'}kg`,
      assessment: `Risk level: ${heuristic.risk_level.toUpperCase()}. ${heuristic.red_flags.length} potential concern(s) identified via keyword analysis.`,
      plan: heuristic.risk_level === 'red'
        ? 'Urgent clinical review recommended. Contact patient to assess symptoms.'
        : heuristic.risk_level === 'yellow'
          ? 'Monitor symptoms. Follow up if condition changes. Review at next visit.'
          : 'Continue current care plan. No immediate intervention needed.',
    },
    model_meta: {
      model: 'heuristic-only',
      prompt_version: 'v1',
      limitations: [
        'Not medical advice',
        'For demo only',
        'Analysis based on keyword matching only',
        'Full AI analysis was unavailable',
      ],
    },
  };
}
