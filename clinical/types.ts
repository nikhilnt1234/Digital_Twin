/**
 * Clinical Analysis Types
 *
 * Input/output types for the clinical analysis provider abstraction.
 */

/** Vitals from check-in */
export interface ClinicalVitals {
  bp: string;
  hr: string;
  spo2: string;
  temp: string;
  weight: string;
}

/** Mirror check-in payload (matches MedGemmaRequest) */
export interface CheckInPayload {
  checkin_id: string;
  transcript: string;
  vitals: ClinicalVitals;
  yesterday_summary: string | null;
  patient_profile: { age: number; conditions: string[] } | null;
  retrieved_guidelines: string[] | null;
}

/** Input to analyzeClinical */
export interface ClinicalAnalysisInput {
  sessionId: string;
  checkInPayload: CheckInPayload;
  followUpAnswers?: Record<string, string>;
}

/** Patient summary section */
export interface PatientSummary {
  one_liner: string;
  key_changes_since_yesterday: string[];
  symptoms_reported: string[];
  med_adherence: string;
  vitals: ClinicalVitals;
}

/** Triage section */
export interface Triage {
  risk_level: 'green' | 'yellow' | 'red';
  red_flags: string[];
  recommended_next_steps: string[];
  when_to_seek_urgent_care: string[];
}

/** Caregiver message section */
export interface CaregiverMessage {
  sms_ready_text: string;
  questions_to_ask_patient_today: string[];
}

/** SOAP note draft section */
export interface SoapNoteDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/** Source of the analysis result */
export type ProviderSource = 'demo' | 'medgemma-cloud' | 'demo-fallback';

/** Output from analyzeClinical */
export interface CareSummaryOutput {
  patient_summary: PatientSummary;
  triage: Triage;
  caregiver_message: CaregiverMessage;
  clinician_note_draft: SoapNoteDraft;
  model_meta: {
    model: string;
    prompt_version: string;
    limitations: string[];
  };
  /** Indicates which provider produced the result (for UI badge) */
  providerSource?: ProviderSource;
}
