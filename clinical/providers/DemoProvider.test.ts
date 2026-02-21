/**
 * DemoProvider tests - valid structure and risk levels
 */

import { describe, it, expect } from 'vitest';
import { runDemoAnalysis } from './DemoProvider';
import type { CheckInPayload } from '../types';

function makePayload(transcript: string, vitals = { bp: '120/80', hr: '72' }): CheckInPayload {
  return {
    checkin_id: 'test',
    transcript,
    vitals: { bp: vitals.bp, hr: vitals.hr, spo2: '', temp: '', weight: '' },
    yesterday_summary: null,
    patient_profile: null,
    retrieved_guidelines: null,
  };
}

describe('DemoProvider', () => {
  it('returns valid CareSummaryOutput structure', () => {
    const payload = makePayload('I feel good today.');
    const result = runDemoAnalysis(payload);

    expect(result).toHaveProperty('patient_summary');
    expect(result).toHaveProperty('triage');
    expect(result).toHaveProperty('caregiver_message');
    expect(result).toHaveProperty('clinician_note_draft');
    expect(result).toHaveProperty('model_meta');
    expect(result.providerSource).toBe('demo');

    expect(result.patient_summary).toHaveProperty('one_liner');
    expect(result.patient_summary).toHaveProperty('key_changes_since_yesterday');
    expect(result.patient_summary).toHaveProperty('symptoms_reported');
    expect(result.patient_summary).toHaveProperty('med_adherence');
    expect(result.patient_summary).toHaveProperty('vitals');

    expect(result.triage).toHaveProperty('risk_level');
    expect(result.triage).toHaveProperty('red_flags');
    expect(result.triage).toHaveProperty('recommended_next_steps');
    expect(result.triage).toHaveProperty('when_to_seek_urgent_care');

    expect(result.caregiver_message).toHaveProperty('sms_ready_text');
    expect(result.caregiver_message).toHaveProperty('questions_to_ask_patient_today');

    expect(result.clinician_note_draft).toHaveProperty('subjective');
    expect(result.clinician_note_draft).toHaveProperty('objective');
    expect(result.clinician_note_draft).toHaveProperty('assessment');
    expect(result.clinician_note_draft).toHaveProperty('plan');

    expect(['green', 'yellow', 'red']).toContain(result.triage.risk_level);
  });

  it('assigns green risk for stable transcript', () => {
    const payload = makePayload('I slept 7 hours and feel good. Took my meds.');
    const result = runDemoAnalysis(payload);
    expect(result.triage.risk_level).toBe('green');
  });

  it('assigns yellow risk for moderate symptoms', () => {
    const payload = makePayload('I have a headache and feel dizzy.');
    const result = runDemoAnalysis(payload);
    expect(result.triage.risk_level).toBe('yellow');
  });

  it('assigns red risk for high-risk terms', () => {
    const payload = makePayload('I have chest pain and difficulty breathing.');
    const result = runDemoAnalysis(payload);
    expect(result.triage.risk_level).toBe('red');
    expect(result.triage.red_flags.length).toBeGreaterThan(0);
  });
});
