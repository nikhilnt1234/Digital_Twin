/**
 * MedGemmaProvider tests - fallback to demo when endpoint missing or fetch fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runMedGemmaAnalysis } from './MedGemmaProvider';
import type { CheckInPayload } from '../types';

function makePayload(transcript: string): CheckInPayload {
  return {
    checkin_id: 'test',
    transcript,
    vitals: { bp: '120/80', hr: '72', spo2: '', temp: '', weight: '' },
    yesterday_summary: null,
    patient_profile: null,
    retrieved_guidelines: null,
  };
}

describe('MedGemmaProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to demo when endpoint is empty', async () => {
    const payload = makePayload('I feel good.');
    const result = await runMedGemmaAnalysis(payload, { endpoint: '', timeoutMs: 5000 });

    expect(result.providerSource).toBe('demo-fallback');
    expect(result.patient_summary).toBeDefined();
    expect(result.triage.risk_level).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('falls back to demo when fetch fails', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const payload = makePayload('I feel good.');
    const result = await runMedGemmaAnalysis(payload, {
      endpoint: 'http://localhost:9999',
      timeoutMs: 1000,
    });

    expect(result.providerSource).toBe('demo-fallback');
    expect(result.patient_summary.one_liner).toBeDefined();
  });

  it('falls back to demo when endpoint returns non-ok', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const payload = makePayload('I feel good.');
    const result = await runMedGemmaAnalysis(payload, {
      endpoint: 'http://localhost:8000',
      timeoutMs: 5000,
    });

    expect(result.providerSource).toBe('demo-fallback');
  });

  it('returns medgemma-cloud when endpoint succeeds', async () => {
    const validResponse = {
      patient_summary: {
        one_liner: 'Stable',
        key_changes_since_yesterday: [],
        symptoms_reported: [],
        med_adherence: 'good',
        vitals: { bp: '120/80', hr: '72', spo2: '', temp: '', weight: '' },
      },
      triage: {
        risk_level: 'green',
        red_flags: [],
        recommended_next_steps: [],
        when_to_seek_urgent_care: [],
      },
      caregiver_message: {
        sms_ready_text: 'OK',
        questions_to_ask_patient_today: [],
      },
      clinician_note_draft: {
        subjective: 'S',
        objective: 'O',
        assessment: 'A',
        plan: 'P',
      },
      model_meta: { model: 'medgemma', prompt_version: 'v1', limitations: [] },
    };

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(validResponse),
    });

    const payload = makePayload('I feel good.');
    const result = await runMedGemmaAnalysis(payload, {
      endpoint: 'http://localhost:8000',
      timeoutMs: 5000,
    });

    expect(result.providerSource).toBe('medgemma-cloud');
    expect(result.patient_summary.one_liner).toBe('Stable');
  });
});
