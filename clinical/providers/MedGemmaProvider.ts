/**
 * MedGemmaProvider - Calls remote MedGemma endpoint
 *
 * On timeout or error, falls back to DemoProvider automatically.
 */

import type { CareSummaryOutput, CheckInPayload } from '../types';
import { runDemoAnalysis } from './DemoProvider';

export interface MedGemmaProviderConfig {
  endpoint: string;
  timeoutMs: number;
}

/**
 * Call remote MedGemma endpoint. On failure, fall back to DemoProvider.
 */
export async function runMedGemmaAnalysis(
  payload: CheckInPayload,
  config: MedGemmaProviderConfig
): Promise<CareSummaryOutput> {
  const { endpoint, timeoutMs } = config;

  if (!endpoint || endpoint.trim() === '') {
    const demo = runDemoAnalysis(payload);
    return { ...demo, providerSource: 'demo-fallback' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/analyze_checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MedGemma API error: ${response.status}`);
    }

    const data = (await response.json()) as unknown;

    if (!isValidCareSummary(data)) {
      throw new Error('Invalid response structure');
    }

    return {
      ...data,
      providerSource: 'medgemma-cloud' as const,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const demo = runDemoAnalysis(payload);
    return { ...demo, providerSource: 'demo-fallback' };
  }
}

function isValidCareSummary(data: unknown): data is Omit<CareSummaryOutput, 'providerSource'> {
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
