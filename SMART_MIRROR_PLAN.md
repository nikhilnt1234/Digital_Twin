# Smart Mirror Feature - Technical Plan

## Overview

A full-screen "Wellness Mirror" experience that uses the laptop camera as a reflective surface with translucent health + finance overlays. A voice agent (Nova via Vocal Bridge) runs a 90-second morning check-in, capturing data that flows into the existing DigiCare tracker.

---

## 1. Architecture Approach

**Routing Strategy**: URL-parameter based routing (simplest for hackathon)
- `/?mode=mirror` → Smart Mirror experience
- `/?mode=dashboard` or `/` → Regular DigiCare app

**Why this approach?**
- No additional routing library needed
- Clean separation of experiences
- Easy to demo (just change URL)
- Data sharing via existing localStorage

---

## 2. File Structure

```
components/
  SmartMirror/
    SmartMirror.tsx          # Main orchestrator component
    CameraFeed.tsx           # Full-screen mirrored webcam
    MetricsPanel.tsx         # Left side: health + finance metrics
    ConversationRail.tsx     # Right side: chat transcript
    FaceCapture.tsx          # Center: face frame + capture
    MirrorStatusChip.tsx     # Status indicator
    
types.ts                     # Extended with MirrorSession types
```

---

## 3. Component Details

### 3.1 `SmartMirror.tsx` - Main Orchestrator
**Responsibilities:**
- Manages overall session state (intro → questions → face-check → summary)
- Coordinates camera, voice, and UI panels
- Handles transition to DigiCare app on completion

**State:**
```typescript
interface MirrorSessionState {
  phase: 'intro' | 'questions' | 'face-check' | 'summary' | 'complete';
  currentQuestion: number; // 0-2 (movement, carb, dining)
  cameraReady: boolean;
  
  // Collected Data
  movementMinutes: number | null;
  carbSugarFlag: boolean | null;
  carbSugarItem: string | null;
  diningOutSpend: number | null;
  targetDiningToday: number; // Calculated guardrail
  faceCheckImage: string | null; // base64
  
  // Voice state
  isListening: boolean;
  isSaving: boolean;
  lastSavedField: string | null;
  
  // Transcript
  conversationHistory: { speaker: 'nova' | 'user'; text: string }[];
}
```

### 3.2 `CameraFeed.tsx` - Mirrored Webcam
**Features:**
- Full-screen video element with `transform: scaleX(-1)` for mirror effect
- Handles `getUserMedia` with graceful permission flow
- Emits `onReady` callback when camera stream is active
- Optional: subtle vignette overlay for aesthetics

**CSS:**
```css
.camera-feed {
  position: fixed;
  inset: 0;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror effect */
  z-index: 0;
}
```

### 3.3 `MetricsPanel.tsx` - Left Side Overlay
**Layout (dark translucent, 30-40% opacity):**
```
┌─────────────────────────┐
│ 🏃 HEALTH TODAY         │
│ Movement: 20 min        │ ← Updates live
│ Carb Flag: ✓ latte      │ ← Updates live  
│ Sleep: 7.5 hrs          │ ← From yesterday's entry
├─────────────────────────┤
│ 💰 FINANCE TODAY        │
│ Dining Out: $30         │ ← Updates live
│ Target: ≤$15 today      │ ← Calculated guardrail
├─────────────────────────┤
│ 🔥 7-Day Streak         │
│ ████████░░ 80%          │
└─────────────────────────┘
```

**Styling:**
```css
.metrics-panel {
  position: fixed;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 280px;
  background: rgba(15, 23, 42, 0.75); /* slate-900 */
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 24px;
  z-index: 10;
}
```

### 3.4 `ConversationRail.tsx` - Right Side Transcript
**Layout:**
```
┌─────────────────────────┐
│ NOVA CHECK-IN     1/3   │ ← Progress indicator
├─────────────────────────┤
│ Nova: Good morning!     │
│ Quick 90-second...      │
│                         │
│ You: Yep.               │
│                         │
│ Nova: How many minutes  │
│ did you move yesterday? │
│                         │
│ You: About 20 minutes.  │
├─────────────────────────┤
│ ● Listening...          │ ← Status chip
└─────────────────────────┘
```

**Auto-scroll:** Transcript auto-scrolls to bottom as new messages appear.

### 3.5 `FaceCapture.tsx` - Center Overlay
**States:**
1. **Hidden** (during voice questions)
2. **Frame showing** - Oval guide with "Align your face here"
3. **Countdown** - "Hold still... 3... 2... 1..."
4. **Captured** - Shows "Before" (placeholder) vs "Today" thumbnails

**Face frame CSS:**
```css
.face-frame {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 280px;
  border: 3px dashed rgba(255,255,255,0.6);
  border-radius: 50%;
  z-index: 15;
}
```

### 3.6 `MirrorStatusChip.tsx`
**States:**
- `🎤 Listening...` (green pulse)
- `💾 Saving...` (amber)
- `✓ Updated` (green, fades after 2s)
- `📸 Capturing...` (during face check)

---

## 4. Voice Integration Strategy

**Approach 1 (Recommended for hackathon): Simulated Voice Flow**
- Use a scripted demo flow with simulated responses
- Pre-recorded Nova audio or TTS
- User speaks → simulate transcript update → update metrics
- Can add real Vocal Bridge integration as enhancement

**Approach 2: Full Vocal Bridge Integration**
- Extend `useVocalBridgeRoom` hook to handle:
  - Transcript events (for ConversationRail)
  - Structured actions (log_movement, log_carb_flag, log_dining_spend)
- Nova agent configured for the 3-question flow

**Recommended for Phase 1:** Start with Approach 1 (simulated) to get UI working, then layer in real voice.

---

## 5. Data Mapping to Existing Types

**New fields needed in `DailyEntry`:**
```typescript
// Add to types.ts
interface DailyEntry {
  // ... existing fields ...
  
  // Mirror-specific (new)
  carbSugarFlag?: boolean | null;
  carbSugarItem?: string | null;
  diningOutSpend?: number | null;
  faceCheckImage?: string | null;
}
```

**Mapping:**
| Mirror Field | DailyEntry Field | Notes |
|--------------|------------------|-------|
| Movement minutes | `exerciseMinutes` | Existing field |
| Carb/sugar flag | `carbSugarFlag` (new) | Boolean |
| Carb/sugar item | `carbSugarItem` (new) | String description |
| Dining out $ | `diningOutSpend` (new) or `mealsCost` | Could use existing |
| Face image | `faceCheckImage` (new) | Base64 string |

---

## 6. Navigation Flow

```
┌──────────────────────────────────────────────────────────────┐
│  LAUNCH: /?mode=mirror                                        │
│                                                               │
│  1. SmartMirror loads                                         │
│  2. Audio starts: "Good morning, while your camera starts..." │
│  3. Camera permission requested                                │
│  4. Camera ready → fade in mirror view                         │
│  5. Voice check-in (3 questions)                               │
│  6. Face check (optional photo)                                │
│  7. Summary shown                                              │
│  8. "Complete" → Redirect to /?mode=dashboard&persona=prediabetic │
│  9. DigiCare loads with prediabetic persona                    │
│ 10. Auto-navigate to BodyTwin tab                              │
│ 11. Daily tracker shows updated metrics from mirror session   │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Phases

### Phase 1: UI Shell (First Priority)
1. Create `SmartMirror.tsx` with basic layout
2. Implement `CameraFeed.tsx` with mirror effect
3. Implement `MetricsPanel.tsx` with hardcoded data
4. Implement `ConversationRail.tsx` with static transcript
5. Add URL routing in `App.tsx`
6. Test: Camera shows mirrored, panels render correctly

### Phase 2: Interactive Demo Flow
1. Add session state management
2. Implement simulated voice flow (click-through or auto-timed)
3. Add live metric updates as "responses" come in
4. Implement `FaceCapture.tsx` with webcam snapshot
5. Add transition animation to DigiCare
6. Test: Full walkthrough works with simulated data

### Phase 3: Vocal Bridge Integration
1. Extend `useVocalBridgeRoom` for transcript events
2. Connect real voice agent
3. Map incoming actions to state updates
4. Test: Real voice controls the flow

### Phase 4: Polish
1. Audio warm-start (Nova speaks while camera loads)
2. Smooth animations and transitions
3. Error handling (camera denied, voice fails)
4. Mobile-friendly adjustments (if time)

---

## 8. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Routing | URL params | Simple, no library needed |
| State management | React useState + localStorage | Matches existing pattern |
| Camera API | getUserMedia | Standard, well-supported |
| Mirror effect | CSS transform | Simplest approach |
| Translucent panels | backdrop-filter + rgba | Modern browsers support |
| Voice (Phase 1) | Simulated | Get UI right first |
| Face capture | canvas.toDataURL | Native, no library needed |

---

## 9. Demo Script Alignment

The UI will support this exact script:
1. **Scene 0**: Nova audio plays while camera loads → mirror fades in
2. **Scene 1**: 3 questions with live metric updates
3. **Scene 2**: Face frame → capture → thumbnail comparison
4. **Scene 3**: Summary card → "See you tomorrow" → transition to DigiCare

---

## 10. Estimated Component Sizes

| Component | Estimated Lines | Complexity |
|-----------|-----------------|------------|
| SmartMirror.tsx | 200-250 | High (orchestration) |
| CameraFeed.tsx | 60-80 | Medium |
| MetricsPanel.tsx | 100-120 | Medium |
| ConversationRail.tsx | 80-100 | Medium |
| FaceCapture.tsx | 100-120 | Medium |
| MirrorStatusChip.tsx | 40-50 | Low |
| App.tsx changes | 30-40 | Low |
| types.ts changes | 10-15 | Low |

---

## Status

- [x] Plan approved
- [x] Phase 1: UI Shell
- [x] Phase 2: Interactive Demo Flow (combined with Phase 1)
- [ ] Phase 3: Vocal Bridge Integration
- [ ] Phase 4: Polish

## Quick Start

**Launch Mirror Mode:**
```
http://localhost:3000/?mode=mirror
```

**Launch Regular App:**
```
http://localhost:3000/
```

**Reset Everything:**
```
http://localhost:3000/?reset=true
```
