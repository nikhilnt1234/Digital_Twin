/**
 * MedGemmaProvider - Calls remote MedGemma endpoint
 * On timeout or error, falls back to DemoProvider.
 */

import { runDemoAnalysis } from './demoProvider.js';

function isValidCareSummary(data) {
  if (!data || typeof data !== 'object') return false;
  return (
    typeof data.patient_summary === 'object' &&
    typeof data.triage === 'object' &&
    typeof data.caregiver_message === 'object' &&
    typeof data.clinician_note_draft === 'object' &&
    typeof data.model_meta === 'object'
  );
}

/**
 * @param {object} payload - CheckInPayload
 * @param {object} config - { endpoint: string, timeoutMs: number }
 * @returns {Promise<object>} CareSummaryOutput with providerSource
 */
export async function runMedGemmaAnalysis(payload, config) {
  const { endpoint, timeoutMs } = config;

  if (!endpoint || String(endpoint).trim() === '') {
    const demo = runDemoAnalysis(payload);
    return { ...demo, providerSource: 'demo-fallback' };
  }

  const url = `${endpoint.replace(/\/$/, '')}/analyze_checkin`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MedGemma API error: ${response.status}`);
    }

    const data = await response.json();
    if (!isValidCareSummary(data)) {
      throw new Error('Invalid response structure');
    }

    return { ...data, providerSource: 'medgemma-cloud' };
  } catch (err) {
    clearTimeout(timeoutId);
    const demo = runDemoAnalysis(payload);
    return { ...demo, providerSource: 'demo-fallback' };
  }
}
