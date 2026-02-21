/**
 * Clinical Analysis Provider - Main entry point
 *
 * analyzeClinical() calls the API route which uses DemoProvider or
 * MedGemmaProvider based on MEDGEMMA_DEMO_MODE.
 */

import type { CareSummaryOutput, ClinicalAnalysisInput } from '../types';

const API_ANALYZE = '/api/clinical/analyze';

/**
 * Analyze a Mirror check-in and return clinical summary.
 *
 * Calls POST /api/clinical/analyze. The server selects DemoProvider
 * or MedGemmaProvider based on MEDGEMMA_DEMO_MODE.
 */
export async function analyzeClinical(input: ClinicalAnalysisInput): Promise<CareSummaryOutput> {
  const payload = buildPayload(input);

  const response = await fetch(API_ANALYZE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Clinical analysis failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as CareSummaryOutput;

  if (!data.patient_summary || !data.triage || !data.caregiver_message || !data.clinician_note_draft) {
    throw new Error('Invalid response structure');
  }

  return data;
}

function buildPayload(input: ClinicalAnalysisInput): {
  sessionId: string;
  checkInPayload: typeof input.checkInPayload;
  followUpAnswers?: Record<string, string>;
} {
  return {
    sessionId: input.sessionId,
    checkInPayload: input.checkInPayload,
    followUpAnswers: input.followUpAnswers,
  };
}
