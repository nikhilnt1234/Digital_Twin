/**
 * DemoProvider - Rule-based clinical analysis (no network)
 * Server-side JS port for Node.
 */

const SYMPTOM_PATTERNS = [
  ['tired', 'fatigue'],
  ['fatigue', 'fatigue'],
  ['exhausted', 'fatigue'],
  ['pain', 'pain reported'],
  ['ache', 'body aches'],
  ['headache', 'headache'],
  ['dizzy', 'dizziness'],
  ['nausea', 'nausea'],
  ['cough', 'cough'],
  ['fever', 'fever'],
  ['cold', 'cold symptoms'],
  ['stress', 'stress'],
  ['anxiety', 'anxiety'],
  ['sleep', 'sleep issues'],
  ['insomnia', 'insomnia'],
];

const HIGH_RISK_TERMS = [
  'chest pain',
  'difficulty breathing',
  'severe',
  'emergency',
  "can't breathe",
  'cannot breathe',
  'unconscious',
  'bleeding',
  'blood in',
  'coughing blood',
];

const MEDIUM_RISK_TERMS = ['dizzy', 'nausea', 'fever', 'pain', 'worse', 'concerned'];

/**
 * @param {object} payload - { checkin_id, transcript, vitals }
 * @returns {object} CareSummaryOutput with providerSource: 'demo'
 */
export function runDemoAnalysis(payload) {
  const transcript = (payload.transcript || '').toLowerCase();
  const vitals = payload.vitals ?? { bp: '', hr: '', spo2: '', temp: '', weight: '' };

  const symptoms = [];
  for (const [pattern, symptom] of SYMPTOM_PATTERNS) {
    if (transcript.includes(pattern)) symptoms.push(symptom);
  }

  let risk_level = 'green';
  const red_flags = [];

  for (const term of HIGH_RISK_TERMS) {
    if (transcript.includes(term)) {
      risk_level = 'red';
      red_flags.push(`Patient reported: ${term}`);
      break;
    }
  }

  if (risk_level === 'green') {
    for (const term of MEDIUM_RISK_TERMS) {
      if (transcript.includes(term)) {
        risk_level = 'yellow';
        break;
      }
    }
  }

  let med_adherence = 'unknown';
  if (
    transcript.includes('took') &&
    (transcript.includes('med') || transcript.includes('pill') || transcript.includes('medication'))
  ) {
    med_adherence = 'good';
  } else if (
    transcript.includes('forgot') ||
    transcript.includes('missed') ||
    transcript.includes("didn't take")
  ) {
    med_adherence = 'poor';
  }

  const one_liner =
    risk_level === 'green'
      ? 'Patient appears stable with no significant concerns reported.'
      : risk_level === 'yellow'
        ? 'Patient reports some symptoms that warrant monitoring.'
        : 'Patient reports concerning symptoms - clinical review recommended.';

  const vitals_assessment = [];
  if (vitals.bp) {
    const bpParts = vitals.bp.split('/');
    if (bpParts.length === 2) {
      const systolic = parseInt(bpParts[0], 10);
      if (!Number.isNaN(systolic)) {
        if (systolic > 140) vitals_assessment.push('elevated blood pressure');
        else if (systolic < 90) vitals_assessment.push('low blood pressure');
      }
    }
  }
  if (vitals.hr) {
    const hr = parseInt(vitals.hr, 10);
    if (!Number.isNaN(hr)) {
      if (hr > 100) vitals_assessment.push('elevated heart rate');
      else if (hr < 60) vitals_assessment.push('low heart rate');
    }
  }

  const subjective =
    payload.transcript.length > 200
      ? `Patient reports: ${payload.transcript.slice(0, 200)}...`
      : `Patient reports: ${payload.transcript}`;

  const objective = `Vitals: BP ${vitals.bp || 'N/A'}, HR ${vitals.hr || 'N/A'}, SpO2 ${vitals.spo2 || 'N/A'}. ${
    vitals_assessment.length > 0 ? vitals_assessment.join('; ') : 'Vitals within normal limits.'
  }`;

  return {
    patient_summary: {
      one_liner,
      key_changes_since_yesterday: symptoms.length > 0 ? symptoms.slice(0, 2) : ['No significant changes noted'],
      symptoms_reported: symptoms.length > 0 ? symptoms : ['None reported'],
      med_adherence,
      vitals: {
        bp: vitals.bp || 'not recorded',
        hr: vitals.hr || 'not recorded',
        spo2: vitals.spo2 || 'not recorded',
        temp: vitals.temp || 'not recorded',
        weight: vitals.weight || 'not recorded',
      },
    },
    triage: {
      risk_level,
      red_flags:
        red_flags.length > 0
          ? red_flags
          : risk_level === 'yellow'
            ? ['Mild symptoms reported - monitoring advised']
            : [],
      recommended_next_steps:
        risk_level === 'green'
          ? [
              'Continue current care plan',
              'Monitor symptoms and vitals daily',
              'Contact care team if symptoms worsen',
            ]
          : [
              'Close symptom monitoring recommended',
              'Consider scheduling follow-up if symptoms persist',
              'Contact care team with any new concerns',
            ],
      when_to_seek_urgent_care: [
        'Chest pain or pressure',
        'Difficulty breathing',
        'Sudden severe symptoms',
        'Signs of infection (high fever, chills)',
      ],
    },
    caregiver_message: {
      sms_ready_text: `Check-in complete. Status: ${risk_level.toUpperCase()}. ${
        risk_level === 'green' ? 'All looks good!' : 'Some symptoms noted - please monitor.'
      }`,
      questions_to_ask_patient_today: [
        'How is your energy level today?',
        'Any new symptoms or concerns?',
        'Did you take all your medications?',
      ],
    },
    clinician_note_draft: {
      subjective,
      objective,
      assessment: `${risk_level === 'green' ? 'Stable' : risk_level === 'yellow' ? 'Requires monitoring' : 'Concerning symptoms'} - ${one_liner}`,
      plan:
        risk_level === 'green'
          ? 'Continue current treatment plan. Follow up as scheduled.'
          : 'Close monitoring recommended. Consider follow-up if symptoms persist or worsen.',
    },
    model_meta: {
      model: 'medgemma-demo',
      prompt_version: 'v1-demo',
      limitations: ['Demo mode - rule-based analysis', 'Not medical advice', 'For demonstration only'],
    },
    providerSource: 'demo',
  };
}
