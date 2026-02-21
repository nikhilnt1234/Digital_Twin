/**
 * Follow-up Question Engine (server)
 * Mirrors logic in followup/FollowUpEngine.ts.
 */

const MAX_PER_CALL = 3;

/**
 * @param {object} checkInPayload - { transcript?, patient_profile?, ... }
 * @param {Array<{id: string, answer: unknown}>} [followUpAnswers]
 * @returns {{ nextQuestions: object[], isComplete: boolean }}
 */
export function getNextFollowUps(checkInPayload, followUpAnswers = []) {
  const answeredIds = new Set(followUpAnswers.map((a) => a.id));
  const transcript = ((checkInPayload?.transcript) ?? '').toLowerCase();
  const out = [];

  function add(q) {
    if (!answeredIds.has(q.id) && out.length < MAX_PER_CALL) {
      out.push(q);
      answeredIds.add(q.id);
    }
  }

  // Urgent symptoms: chest pain, shortness of breath, fainting, severe headache
  const urgentMatch = /\b(chest pain|shortness of breath|fainting|severe headache)\b/i.test(transcript);
  if (urgentMatch) {
    add({
      id: 'urgent_duration',
      questionText: 'How long have you had this symptom?',
      inputType: 'text',
      required: true,
      rationale: 'Assessing duration for urgent symptoms',
    });
    add({
      id: 'urgent_severity',
      questionText: 'On a scale of 1–10, how severe is it right now?',
      inputType: 'number',
      required: true,
      rationale: 'Severity assessment',
    });
    add({
      id: 'urgent_dizziness',
      questionText: 'Any dizziness or vision changes?',
      inputType: 'text',
      required: false,
      rationale: 'Rule out neurological involvement',
    });
  }

  // Doctor appointment
  if (/\bdoctor appointment\b|\bappointment\b.*\bdoctor\b/i.test(transcript) && out.length < MAX_PER_CALL) {
    add({
      id: 'appt_date',
      questionText: 'When is the appointment?',
      inputType: 'text',
      required: true,
      rationale: 'Track upcoming care',
    });
    add({
      id: 'appt_specialty',
      questionText: 'What specialty (e.g., cardiology, primary care)?',
      inputType: 'text',
      required: true,
      rationale: 'Context for care coordination',
    });
    add({
      id: 'appt_top_question',
      questionText: "What's the one question you most want to ask the doctor?",
      inputType: 'text',
      required: false,
      rationale: 'Prepare patient for visit',
    });
  }

  // Meds/allergies missing
  const hasAllergies = /\b(allerg(y|ies)|allergic to)\b/i.test(transcript);
  const hasMeds = /\b(medication|meds|taking|prescribed)\b/i.test(transcript);
  if (!hasAllergies && out.length < MAX_PER_CALL) {
    add({
      id: 'allergies',
      questionText: 'Do you have any known allergies (medications, foods, etc.)?',
      inputType: 'text',
      required: false,
      rationale: 'Safety - medication reconciliation',
    });
  }
  if (!hasMeds && out.length < MAX_PER_CALL) {
    add({
      id: 'current_medications',
      questionText: 'What medications are you currently taking?',
      inputType: 'text',
      required: false,
      rationale: 'Medication reconciliation',
    });
  }

  return {
    nextQuestions: out.slice(0, MAX_PER_CALL),
    isComplete: out.length === 0,
  };
}
