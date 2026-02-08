# DigiCare Voice Agents

This document describes the voice-powered AI agents integrated into the DigiCare Health & Wealth Future Simulator.

## Overview

DigiCare uses **Vocal Bridge** powered by **LiveKit** for real-time voice interactions. There are two distinct agents:

| Agent | Purpose | Location | API Key |
|-------|---------|----------|---------|
| **Nova** | Daily check-in via Smart Mirror | Mirror Mode | `VOCAL_BRIDGE_API_KEY` |
| **Lens** | Health coaching on BodyTwin | Dashboard | `VOCAL_BRIDGE_LENS_API_KEY` |

---

## Nova Agent (Smart Mirror)

### Purpose
Nova conducts a 90-second daily wellness check-in through the Smart Mirror interface. It collects:
- Sleep hours from last night
- Exercise/movement minutes
- Carb/sugar consumption (sweetened drinks, desserts)
- Dining out spending

### Flow
1. User opens mirror mode: `http://localhost:3000/?mode=mirror`
2. Camera activates, Nova greets user
3. Nova asks 4 questions sequentially
4. Optional face capture for wellness tracking
5. Data saved to `DailyEntry` and transitions to BodyTwin dashboard

### Files
```
components/SmartMirror/
├── SmartMirror.tsx          # Main orchestrator
├── useMirrorVoiceBridge.ts  # Nova voice connection hook
├── ConversationRail.tsx     # Chat UI display
├── MetricsPanel.tsx         # Real-time metrics display
├── CameraFeed.tsx           # Camera management
├── FaceCapture.tsx          # Photo capture UI
└── MirrorStatusChip.tsx     # Connection status
```

### Data Schema (from Nova)
```typescript
interface MirrorSessionData {
  sleepHours: number | null;
  movementMinutes: number | null;
  carbSugarFlag: boolean | null;
  carbSugarItem: string | null;
  diningOutSpend: number | null;
  faceCheckImage: string | null;
}
```

### Voice Bridge Hook Usage
```typescript
const voiceBridge = useMirrorVoiceBridge({
  onDataUpdate: (field, value) => { /* Update metrics */ },
  onStatusChange: (status) => { /* Update UI */ },
  onMessageReceived: (message) => { /* Add to conversation */ },
  onSessionEnd: () => { /* Transition to dashboard */ },
});

// Connect/disconnect
voiceBridge.connect();
voiceBridge.disconnect();

// Mic control
voiceBridge.toggleMic();
voiceBridge.isMicEnabled;
```

---

## Lens Agent (Health Coach)

### Purpose
Lens is an AI health coach accessible from the BodyTwin dashboard. It provides:
- Personalized health insights
- Answers questions about user's health data
- Wellness guidance and recommendations

### Access
Click **"Talk to Health Coach"** button in the BodyTwin (health) tab.

### Files
```
components/
└── LensVoicePanel.tsx       # Health coach chat UI

voice/
└── useLensVoiceBridge.ts    # Lens voice connection hook
```

### Voice Bridge Hook Usage
```typescript
const {
  isConnected,
  isConnecting,
  isMicEnabled,
  error,
  connect,
  disconnect,
  toggleMic,
} = useLensVoiceBridge({
  onMessageReceived: (message) => { /* Add to chat */ },
  onStatusChange: (status) => { /* Update UI */ },
  onSessionEnd: () => { /* Cleanup */ },
});
```

### Message Format
```typescript
interface LensMessage {
  id: string;
  speaker: 'lens' | 'user';
  text: string;
  timestamp: number;
}
```

---

## Backend Token Proxy

Voice agents require authentication tokens. The Node.js server proxies token requests to Vocal Bridge.

### Server File
```
server/voice-token.js
```

### Endpoints
| Endpoint | Agent | Environment Variable |
|----------|-------|---------------------|
| `/api/voice-token` | Nova | `VOCAL_BRIDGE_API_KEY` |
| `/api/voice-token-lens` | Lens | `VOCAL_BRIDGE_LENS_API_KEY` |

### Running the Server
```bash
npm run server
# Or directly:
node server/voice-token.js
```

Server runs on **port 3001**. Vite proxies requests from port 3000.

---

## Environment Setup

### Required Variables (`.env.local`)
```bash
# Nova Agent (Mirror Check-in)
VITE_VOCAL_BRIDGE_API_KEY=vb__your_nova_key_here
VOCAL_BRIDGE_API_KEY=vb__your_nova_key_here

# Lens Agent (Health Coach)
VITE_VOCAL_BRIDGE_LENS_API_KEY=vb_your_lens_key_here
VOCAL_BRIDGE_LENS_API_KEY=vb_your_lens_key_here

# Optional: Gemini for text chat
GEMINI_API_KEY=your_gemini_key_here
```

### Vite Proxy Config (`vite.config.ts`)
```typescript
server: {
  port: 3000,
  proxy: {
    '/api/voice-token': 'http://localhost:3001',
    '/api/voice-token-lens': 'http://localhost:3001',
  }
}
```

---

## LiveKit Events

Both agents use LiveKit's real-time communication. Key events handled:

| Event | Purpose |
|-------|---------|
| `RoomEvent.Connected` | Agent connected successfully |
| `RoomEvent.Disconnected` | Agent disconnected |
| `RoomEvent.DataReceived` | Receive structured data/actions |
| `RoomEvent.TranscriptionReceived` | Speech-to-text transcripts |
| `RoomEvent.TrackSubscribed` | Audio track available |

---

## Modes

### Demo Mode (Nova only)
- Click-to-advance scripted conversation
- No Vocal Bridge connection required
- Good for testing UI without API keys

### Live Mode
- Real voice interaction with AI agents
- Requires valid Vocal Bridge API keys
- Full speech recognition and synthesis

---

## Troubleshooting

### Agent not connecting
1. Check `.env.local` has correct API keys
2. Ensure voice server is running on port 3001
3. Check browser console for `[LensVoiceBridge]` or `[MirrorVoiceBridge]` logs

### No audio
1. Check browser microphone permissions
2. Verify `isMicEnabled` is true
3. Check LiveKit track subscription status

### Transcripts not appearing
1. Check console for `TranscriptionReceived` events
2. Verify `DataReceived` handler is parsing messages correctly
3. Ensure speaker identification is working

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ SmartMirror │    │  BodyTwin   │    │   CoachChat     │  │
│  │   (Nova)    │    │   (Lens)    │    │   (Gemini)      │  │
│  └──────┬──────┘    └──────┬──────┘    └────────┬────────┘  │
│         │                  │                     │           │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌────────▼────────┐  │
│  │useMirror    │    │useLens      │    │  geminiService  │  │
│  │VoiceBridge  │    │VoiceBridge  │    │                 │  │
│  └──────┬──────┘    └──────┬──────┘    └────────┬────────┘  │
└─────────┼──────────────────┼───────────────────┼────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Node.js Proxy  │  │  Node.js Proxy  │  │  Google Gemini  │
│  /api/voice-    │  │  /api/voice-    │  │      API        │
│     token       │  │   token-lens    │  │                 │
└────────┬────────┘  └────────┬────────┘  └─────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────┐
│           Vocal Bridge API              │
│         (LiveKit Real-time)             │
└─────────────────────────────────────────┘
```
