/**
 * MedGemma API Client
 * 
 * Handles communication with the MedGemma clinical analysis service.
 * Includes fallback handling and response validation.
 */

import type { MedGemmaAnalysis, MedGemmaRequest, DailyEntry, UserInputs } from '../types';
import { runHeuristicTriage, mergeWithHeuristics } from './triageHeuristics';

const API_ENDPOINT = '/api/analyze-checkin';

/**
 * Build the request payload for MedGemma analysis.
 */
export function buildCheckinPayload(
  checkinId: string,
  transcript: string,
  entry: DailyEntry | null,
  inputs: UserInputs,
  yesterdaySummary: string | null = null
): MedGemmaRequest {
  return {
    checkin_id: checkinId,
    transcript: transcript,
    vitals: {
      bp: inputs.bloodPressureSys && inputs.bloodPressureDia 
        ? `${inputs.bloodPressureSys}/${inputs.bloodPressureDia}` 
        : '',
      hr: inputs.restingHeartRate ? String(inputs.restingHeartRate) : '',
      spo2: '', // Not tracked in current schema
      temp: '', // Not tracked in current schema
      weight: entry?.weightKg ? String(entry.weightKg) : (inputs.weightKg ? String(inputs.weightKg) : ''),
    },
    yesterday_summary: yesterdaySummary,
    patient_profile: {
      age: 45, // Default age - would come from user profile in production
      conditions: inputs.persona === 'prediabetic' 
        ? ['prediabetes'] 
        : inputs.persona === 'diabetic_type2' 
          ? ['type 2 diabetes'] 
          : [],
    },
    retrieved_guidelines: null,
  };
}

/**
 * Get a safe fallback response when the API is unavailable.
 */
function getFallbackResponse(reason: string): MedGemmaAnalysis {
  return {
    patient_summary: {
      one_liner: 'Check-in recorded. Manual review recommended.',
      key_changes_since_yesterday: [],
      symptoms_reported: [],
      med_adherence: 'unknown',
      vitals: { bp: '', hr: '', spo2: '', temp: '', weight: '' },
    },
    triage: {
      risk_level: 'yellow',
      red_flags: [reason],
      recommended_next_steps: [
        'Monitor symptoms closely',
        'Contact clinician if symptoms worsen',
        'Follow up at next scheduled visit',
      ],
      when_to_seek_urgent_care: [
        'Severe pain or discomfort',
        'Difficulty breathing',
        'Any sudden changes in condition',
      ],
    },
    caregiver_message: {
      sms_ready_text: `Check-in completed. ${reason}. Please monitor and contact care team if concerned.`,
      questions_to_ask_patient_today: [
        'How are you feeling overall?',
        'Any new symptoms or concerns?',
      ],
    },
    clinician_note_draft: {
      subjective: 'Patient completed check-in. Automated analysis unavailable.',
      objective: 'See vitals in patient summary.',
      assessment: 'Manual review recommended.',
      plan: 'Continue current care plan. Follow up as scheduled.',
    },
    model_meta: {
      model: 'fallback',
      prompt_version: 'v1',
      limitations: [
        'Not medical advice',
        'For demo only',
        'Automated analysis was unavailable - using safe defaults',
      ],
    },
  };
}

/**
 * Validate that the response has the expected structure.
 */
function isValidAnalysis(data: unknown): data is MedGemmaAnalysis {
  if (!data || typeof data !== 'object') return false;
  
  const d = data as Record<string, unknown>;
  
  return (
    typeof d.patient_summary === 'object' &&
    typeof d.triage === 'object' &&
    typeof d.caregiver_message === 'object' &&
    typeof d.clinician_note_draft === 'object' &&
    typeof d.model_meta === 'object'
  );
}

/**
 * Analyze a check-in using MedGemma.
 * 
 * This function:
 * 1. Calls the MedGemma API
 * 2. Validates the response
 * 3. Runs heuristic triage as a safety net
 * 4. Merges results (heuristics can override model if needed)
 */
export async function analyzeCheckin(
  payload: MedGemmaRequest
): Promise<MedGemmaAnalysis> {
  // Run heuristic analysis in parallel
  const heuristicResult = runHeuristicTriage(payload.transcript);
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('[MedGemma] API error:', response.status);
      const fallback = getFallbackResponse(`API error: ${response.status}`);
      return mergeWithHeuristics(fallback, heuristicResult);
    }

    const data = await response.json();
    
    if (!isValidAnalysis(data)) {
      console.error('[MedGemma] Invalid response structure');
      const fallback = getFallbackResponse('Invalid response structure');
      return mergeWithHeuristics(fallback, heuristicResult);
    }

    // Merge with heuristics for safety
    return mergeWithHeuristics(data, heuristicResult);
    
  } catch (error) {
    console.error('[MedGemma] Request failed:', error);
    const fallback = getFallbackResponse(
      error instanceof Error ? error.message : 'Request failed'
    );
    return mergeWithHeuristics(fallback, heuristicResult);
  }
}

/**
 * Check if the MedGemma service is healthy.
 */
export async function checkMedGemmaHealth(): Promise<{
  ok: boolean;
  modelLoaded: boolean;
  error?: string;
}> {
  try {
    // Note: This would need a /api/medgemma-health proxy endpoint
    // For now, we'll just try to hit the analyze endpoint with minimal data
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkin_id: 'health_check',
        transcript: 'Health check',
        vitals: { bp: '', hr: '', spo2: '', temp: '', weight: '' },
        yesterday_summary: null,
        patient_profile: null,
        retrieved_guidelines: null,
      }),
    });

    return {
      ok: response.ok,
      modelLoaded: response.ok,
      error: response.ok ? undefined : `Status: ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      modelLoaded: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
