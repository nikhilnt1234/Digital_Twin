/**
 * Vocal Bridge token proxy: calls Vocal Bridge API with API key and returns
 * LiveKit token so the frontend avoids CORS and never sees the key.
 * Daily log: frontend receives client_actions in the room; webhook POST /api/daily-log is available for alternate flows.
 */

import dotenv from 'dotenv';
import { createServer } from 'http';
import { analyzeClinical } from './clinical/index.js';
import { getNextFollowUps } from './followup/engine.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = 3001;
const VOCAL_BRIDGE_URL = 'https://vocalbridgeai.com/api/v1/token';

const apiKey = process.env.VOCAL_BRIDGE_API_KEY || process.env.VITE_VOCAL_BRIDGE_API_KEY;
const lensApiKey = process.env.VOCAL_BRIDGE_LENS_API_KEY || process.env.VITE_VOCAL_BRIDGE_LENS_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

// In-memory store for daily log from webhook (POST /api/daily-log). Frontend gets data from Vocal Bridge via LiveKit.
let latestDailyLog = null; // { sleepHours, exerciseMinutes, mealsCost, receivedAt }

function parseNum(v) {
  if (v == null) return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

// MedGemma service URL (use 127.0.0.1 to avoid IPv6 resolution issues)
const MEDGEMMA_URL = process.env.MEDGEMMA_URL || 'http://127.0.0.1:8000';

// Safe fallback response when MedGemma is unavailable
function getMedGemmaFallbackResponse(reason) {
  return {
    patient_summary: {
      one_liner: "Check-in recorded. Manual review recommended.",
      key_changes_since_yesterday: [],
      symptoms_reported: [],
      med_adherence: "unknown",
      vitals: { bp: "", hr: "", spo2: "", temp: "", weight: "" }
    },
    triage: {
      risk_level: "yellow",
      red_flags: [reason],
      recommended_next_steps: [
        "Monitor symptoms closely",
        "Contact clinician if symptoms worsen",
        "Follow up at next scheduled visit"
      ],
      when_to_seek_urgent_care: [
        "Severe pain or discomfort",
        "Difficulty breathing",
        "Any sudden changes in condition"
      ]
    },
    caregiver_message: {
      sms_ready_text: `Check-in completed. ${reason}. Please monitor and contact care team if concerned.`,
      questions_to_ask_patient_today: [
        "How are you feeling overall?",
        "Any new symptoms or concerns?"
      ]
    },
    clinician_note_draft: {
      subjective: "Patient completed check-in. Automated analysis unavailable.",
      objective: "See vitals in patient summary.",
      assessment: "Manual review recommended.",
      plan: "Continue current care plan. Follow up as scheduled."
    },
    model_meta: {
      model: "fallback",
      prompt_version: "v1",
      limitations: [
        "Not medical advice",
        "For demo only",
        "MedGemma service unavailable - using safe defaults"
      ]
    }
  };
}

const server = createServer(async (req, res) => {
  const path = req.url?.split('?')[0];
  const isVoiceToken = path === '/api/voice-token' || path === '/api/voice-token/';
  const isVoiceTokenLens = path === '/api/voice-token-lens' || path === '/api/voice-token-lens/';
  const isDailyLog = path === '/api/daily-log' || path === '/api/daily-log/';
  const isClinicalAnalyze = path === '/api/clinical/analyze' || path === '/api/clinical/analyze/';
  const isFollowUpNext = path === '/api/followup/next' || path === '/api/followup/next/';
  const isAnalyzeCheckin = path === '/api/analyze-checkin' || path === '/api/analyze-checkin/';
  const isCoachChat = path === '/api/coach/chat' || path === '/api/coach/chat/';

  // POST /api/coach/chat - Gemini proxy (keeps API key server-side)
  if (isCoachChat) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    if (!geminiApiKey) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'GEMINI_PROXY_MISCONFIGURED', detail: 'Missing GEMINI_API_KEY on server.' }));
      return;
    }
    try {
      const body = await parseJsonBody(req).catch(() => ({}));
      const { messages = [], model = 'gemini-2.0-flash', temperature = 0.6, systemInstruction } = body;

      if (!Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GEMINI_PROXY_ERROR', detail: 'messages array required' }));
        return;
      }

      const contents = messages.map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : (m.text || '') }],
      }));

      const reqBody = {
        contents,
        generationConfig: { temperature: Number(temperature) || 0.6 },
      };
      if (systemInstruction && typeof systemInstruction === 'string') {
        reqBody.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API ${geminiRes.status}: ${errText.slice(0, 200)}`);
      }

      const geminiData = await geminiRes.json();
      const candidate = geminiData.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text ?? '';

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text, raw: geminiData }));
    } catch (err) {
      console.error('[voice-token] /api/coach/chat error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'GEMINI_PROXY_ERROR',
          detail: err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Unknown error'),
        })
      );
    }
    return;
  }

  // POST /api/clinical/analyze - Provider abstraction with demo/remote toggle
  if (isClinicalAnalyze) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    try {
      const body = await parseJsonBody(req).catch(() => ({}));
      const { sessionId, checkInPayload, followUpAnswers } = body;
      if (!checkInPayload) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'checkInPayload required' }));
        return;
      }
      const result = await analyzeClinical({ sessionId: sessionId || 'unknown', checkInPayload, followUpAnswers });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('[voice-token] /api/clinical/analyze error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Clinical analysis failed' }));
    }
    return;
  }

  // POST /api/followup/next - Agentic follow-up question loop
  if (isFollowUpNext) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    try {
      const body = await parseJsonBody(req).catch(() => ({}));
      const { sessionId, checkInPayload, followUpAnswers } = body;
      if (!checkInPayload) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'checkInPayload required' }));
        return;
      }
      const result = getNextFollowUps(checkInPayload, followUpAnswers ?? []);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('[voice-token] /api/followup/next error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Follow-up engine failed' }));
    }
    return;
  }

  if (isDailyLog) {
    if (req.method === 'POST') {
      try {
        const body = await parseJsonBody(req).catch(() => ({}));
        latestDailyLog = {
          sleepHours: parseNum(body.sleepHours),
          exerciseMinutes: parseNum(body.exerciseMinutes),
          mealsCost: parseNum(body.mealsCost),
          receivedAt: Date.now(),
        };
        console.log('[voice-token] Daily log updated from webhook: sleepHours=%s exerciseMinutes=%s mealsCost=%s', latestDailyLog.sleepHours, latestDailyLog.exerciseMinutes, latestDailyLog.mealsCost);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Bad request' }));
      }
      return;
    }
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Handle MedGemma analyze-checkin endpoint
  if (isAnalyzeCheckin) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const body = await parseJsonBody(req).catch(() => ({}));
      console.log('[voice-token] Forwarding analyze-checkin to MedGemma:', body.checkin_id || 'unknown');

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(`${MEDGEMMA_URL}/analyze_checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          console.error('[voice-token] MedGemma returned error:', response.status);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(getMedGemmaFallbackResponse(`MedGemma error: ${response.status}`)));
          return;
        }

        const data = await response.json();
        console.log('[voice-token] MedGemma analysis complete, risk_level:', data.triage?.risk_level);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (fetchErr) {
        clearTimeout(timeout);
        if (fetchErr.name === 'AbortError') {
          console.error('[voice-token] MedGemma request timed out');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(getMedGemmaFallbackResponse('Analysis timed out')));
        } else {
          console.error('[voice-token] MedGemma fetch error:', fetchErr.message);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(getMedGemmaFallbackResponse(`Service unavailable: ${fetchErr.message}`)));
        }
      }
    } catch (err) {
      console.error('[voice-token] analyze-checkin error:', err.message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getMedGemmaFallbackResponse(err.message || 'Unknown error')));
    }
    return;
  }

  // Handle Lens token endpoint
  if (isVoiceTokenLens) {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    if (!lensApiKey) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'VOCAL_BRIDGE_LENS_API_KEY not set' }));
      return;
    }

    try {
      const participantName = req.method === 'POST' && req.headers['content-type']?.includes('application/json')
        ? await parseJsonBody(req).then(b => b?.participant_name || 'User').catch(() => 'User')
        : 'User';

      const response = await fetch(VOCAL_BRIDGE_URL, {
        method: 'POST',
        headers: {
          'X-API-Key': lensApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participant_name: participantName }),
      });

      const data = await response.json().catch(() => ({}));

      res.writeHead(response.ok ? 200 : response.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Lens token request failed' }));
    }
    return;
  }

  if (!isVoiceToken) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'VOCAL_BRIDGE_API_KEY not set' }));
    return;
  }

  try {
    const participantName = req.method === 'POST' && req.headers['content-type']?.includes('application/json')
      ? await parseJsonBody(req).then(b => b?.participant_name || 'User').catch(() => 'User')
      : 'User';

    const response = await fetch(VOCAL_BRIDGE_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ participant_name: participantName }),
    });

    const data = await response.json().catch(() => ({}));

    res.writeHead(response.ok ? 200 : response.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Token request failed' }));
  }
});

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

server.listen(PORT, 'localhost', () => {
  console.log(`Vocal Bridge token proxy: http://localhost:${PORT}/api/voice-token`);
  console.log(`Vocal Bridge Lens proxy:  http://localhost:${PORT}/api/voice-token-lens`);
  console.log(`Daily log webhook:        http://localhost:${PORT}/api/daily-log (POST)`);
  console.log(`MedGemma analyze:         http://localhost:${PORT}/api/analyze-checkin (POST)`);
  console.log(`  -> Forwards to:         ${MEDGEMMA_URL}/analyze_checkin`);
  console.log(`Coach chat (Gemini):     http://localhost:${PORT}/api/coach/chat (POST)`);
  console.log(`Clinical analyze:         http://localhost:${PORT}/api/clinical/analyze (POST)`);
  console.log(`Follow-up next:           http://localhost:${PORT}/api/followup/next (POST)`);
  console.log(`  -> MEDGEMMA_DEMO_MODE:  ${process.env.MEDGEMMA_DEMO_MODE ?? 'true'}`);
  console.log(`  -> MEDGEMMA_ENDPOINT:   ${process.env.MEDGEMMA_ENDPOINT || process.env.MEDGEMMA_URL || '(not set)'}`);
});
