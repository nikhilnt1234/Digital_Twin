<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1vzP7iZEGfmtYsX4tqgPu3iiyrtMT_kPt

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set in [.env.local](.env.local):
   - `GEMINI_API_KEY` — your Gemini API key (for coach chat)
   - `VOCAL_BRIDGE_API_KEY` or `VITE_VOCAL_BRIDGE_API_KEY` — your Vocal Bridge API key (for Nova check-in; backend reads from .env.local)
3. Run the app (two terminals):
   - **Terminal 1:** `npm run dev` — Vite app at http://localhost:3000
   - **Terminal 2:** `npm run server` — Vocal Bridge token proxy at http://localhost:3001 (required for Nova Check-in)
