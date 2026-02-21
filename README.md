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
- **MedGemma Clinical Analysis** — Local AI-powered clinical summaries, triage, and SOAP notes (hackathon mode)

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

## MedGemma Hackathon Mode

Enable clinical-grade offline analysis powered by MedGemma. This adds a "Care Summary" panel to the Smart Mirror with:

- Patient summary and key changes
- Risk-level triage (green/yellow/red)
- Caregiver SMS-ready messages
- Clinician SOAP note drafts

**Prerequisites:** Python 3.10+, ~8GB RAM (for 4B model)

### Quick Start (3 terminals)

```bash
# Terminal 1: MedGemma service (port 8000)
cd medgemma-service
pip install -r requirements.txt
python main.py

# Terminal 2: Node proxy (port 3001)
npm run server

# Terminal 3: Vite dev (port 3000)
npm run dev
```

### Environment Variables

Add to `.env.local`:

```bash
# MedGemma service (optional, defaults shown)
MEDGEMMA_URL=http://localhost:8000
MEDGEMMA_MODEL_ID=google/medgemma-4b-it
MEDGEMMA_DEVICE=auto
MEDGEMMA_MAX_NEW_TOKENS=2048
```

### Running Evaluation

```bash
cd eval
pip install requests pandas
python run_eval.py --url http://localhost:3001/api
```

This runs 50 synthetic test cases and outputs metrics:
- JSON validity rate
- Risk level accuracy
- Red-case recall

Results saved to `eval/results.json`.

### Troubleshooting

| Issue | Solution |
|-------|----------|
| MedGemma not loading | Check RAM (~8GB required), try `MEDGEMMA_DEVICE=cpu` |
| Slow inference | Use GPU/MPS if available, or reduce `MEDGEMMA_MAX_NEW_TOKENS` |
| "Service unavailable" | MedGemma service may not be running, fallback heuristics are used |
| Port conflict | Check if ports 3000, 3001, 8000 are free |

**DISCLAIMER:** This is a demo application. Not for actual medical use.

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
| Clinical AI | MedGemma (Python FastAPI) |
| State | LocalStorage persistence |

## Project Structure

```
├── App.tsx                 # Main app orchestrator
├── types.ts                # TypeScript interfaces
├── components/
│   ├── BodyHologram.tsx    # 3D health hologram
│   ├── HealthWidgets.tsx   # Vitals, clinical summary
│   ├── LensVoicePanel.tsx  # Health coach UI
│   └── SmartMirror/
│       ├── SmartMirror.tsx     # Mirror orchestrator
│       ├── CareSummaryPanel.tsx # MedGemma analysis UI
│       └── ...
├── voice/
│   └── useLensVoiceBridge.ts
├── services/
│   ├── lifeTwinEngine.ts   # Simulation engine
│   ├── geminiService.ts    # AI chat service
│   ├── medgemmaClient.ts   # MedGemma API client
│   └── triageHeuristics.ts # Safety fallback rules
├── server/
│   └── voice-token.js      # Token proxy + MedGemma proxy
├── medgemma-service/       # Python MedGemma inference
│   ├── main.py
│   ├── requirements.txt
│   └── README.md
└── eval/                   # Evaluation suite
    ├── checkins.csv        # Test cases
    └── run_eval.py         # Evaluation script
```
