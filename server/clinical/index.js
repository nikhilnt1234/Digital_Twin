/**
 * Clinical Analysis - Server entry point
 *
 * Uses MEDGEMMA_DEMO_MODE, MEDGEMMA_ENDPOINT, MEDGEMMA_TIMEOUT_MS.
 */

import { runDemoAnalysis } from './demoProvider.js';
import { runMedGemmaAnalysis } from './medgemmaProvider.js';

const MEDGEMMA_DEMO_MODE = process.env.MEDGEMMA_DEMO_MODE !== 'false';
const MEDGEMMA_ENDPOINT = process.env.MEDGEMMA_ENDPOINT || process.env.MEDGEMMA_URL || '';
const MEDGEMMA_TIMEOUT_MS = parseInt(process.env.MEDGEMMA_TIMEOUT_MS || '20000', 10);

/**
 * Analyze check-in. Picks provider based on MEDGEMMA_DEMO_MODE.
 *
 * @param {object} input - { sessionId, checkInPayload, followUpAnswers? }
 * @param {object} input.checkInPayload - { checkin_id, transcript, vitals, ... }
 * @returns {Promise<object>} CareSummaryOutput
 */
export async function analyzeClinical(input) {
  const { checkInPayload, followUpAnswers } = input;

  let payload = { ...checkInPayload };

  if (followUpAnswers && Object.keys(followUpAnswers).length > 0) {
    const extra = Object.entries(followUpAnswers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('. ');
    payload = {
      ...payload,
      transcript: `${payload.transcript}\n\nFollow-up: ${extra}`,
    };
  }

  if (MEDGEMMA_DEMO_MODE) {
    return runDemoAnalysis(payload);
  }

  return runMedGemmaAnalysis(payload, {
    endpoint: MEDGEMMA_ENDPOINT,
    timeoutMs: MEDGEMMA_TIMEOUT_MS,
  });
}
