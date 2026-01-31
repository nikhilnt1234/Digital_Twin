/**
 * Vocal Bridge token proxy: calls Vocal Bridge API with API key and returns
 * LiveKit token so the frontend avoids CORS and never sees the key.
 * Daily log: frontend receives client_actions in the room; webhook POST /api/daily-log is available for alternate flows.
 */

import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = 3001;
const VOCAL_BRIDGE_URL = 'https://vocalbridgeai.com/api/v1/token';

const apiKey = process.env.VOCAL_BRIDGE_API_KEY || process.env.VITE_VOCAL_BRIDGE_API_KEY;

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

const server = createServer(async (req, res) => {
  const path = req.url?.split('?')[0];
  const isVoiceToken = path === '/api/voice-token' || path === '/api/voice-token/';
  const isDailyLog = path === '/api/daily-log' || path === '/api/daily-log/';

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
  console.log(`Daily log webhook:       http://localhost:${PORT}/api/daily-log (POST)`);
});
