<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DigiCare – Health & Wealth Future Simulator

A Digital Twin application that simulates and projects your health and financial future based on daily habits and biometric data. Visualize the connection between lifestyle choices and long-term outcomes.

## Features

- **BodyTwin** — Health simulation with 3D hologram, vitals tracking, and clinical markers
- **MoneyTwin** — Financial simulation with spending analysis and wealth projections
- **Smart Mirror** — Voice-powered daily check-in with Nova AI agent
- **Health Coach** — AI-powered coaching with Lens agent on BodyTwin
- **Daily Tracking** — Track weight, sleep, meals, exercise, and glucose for diabetic personas

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables in `.env.local`:
   ```bash
   # Required for voice agents
   VITE_VOCAL_BRIDGE_API_KEY=your_nova_key
   VOCAL_BRIDGE_API_KEY=your_nova_key
   VITE_VOCAL_BRIDGE_LENS_API_KEY=your_lens_key
   VOCAL_BRIDGE_LENS_API_KEY=your_lens_key
   
   # Optional for text chat
   GEMINI_API_KEY=your_gemini_key
   ```

3. Run the app (two terminals):
   ```bash
   # Terminal 1: Voice token proxy (port 3001)
   npm run server
   
   # Terminal 2: Vite dev server (port 3000)
   npm run dev
   ```

4. Open in browser:
   - **Main app:** http://localhost:3000
   - **Mirror mode:** http://localhost:3000/?mode=mirror
   - **Reset data:** http://localhost:3000/?reset=true

## Documentation

- [AGENTS.md](./AGENTS.md) — Voice agents (Nova & Lens) documentation
- [SMART_MIRROR_PLAN.md](./SMART_MIRROR_PLAN.md) — Smart Mirror feature plan

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Voice | LiveKit + Vocal Bridge |
| AI Chat | Google Gemini API |
| State | LocalStorage persistence |

## Project Structure

```
├── App.tsx                 # Main app orchestrator
├── types.ts                # TypeScript interfaces
├── components/
│   ├── BodyHologram.tsx    # 3D health hologram
│   ├── HealthWidgets.tsx   # Vitals, clinical summary
│   ├── LensVoicePanel.tsx  # Health coach UI
│   └── SmartMirror/        # Mirror mode components
├── voice/
│   └── useLensVoiceBridge.ts
├── services/
│   ├── lifeTwinEngine.ts   # Simulation engine
│   └── geminiService.ts    # AI chat service
└── server/
    └── voice-token.js      # Token proxy server
```
