/**
 * Action Executor - Executes voice actions by calling app adapters
 */

import { DashboardTab } from '../types';
import { 
  VoiceAction, 
  ChartTarget, 
  InputPath,
  inputPathToKey 
} from './actionSchema';

// ============================================
// Adapter Interface
// ============================================

export interface VoiceActionAdapters {
  navigateTab: (tab: DashboardTab) => void;
  setInput: (path: InputPath, value: number) => void;
  runSimulation: () => void;
  highlightChart: (target: ChartTarget) => void;
  showInsight: (text: string) => void;
  comparePaths: (mode: 'baseline' | 'optimized' | 'both') => void;
}

// ============================================
// Action Executor
// ============================================

export interface ExecutionResult {
  success: boolean;
  action: VoiceAction;
  error?: string;
}

export async function executeVoiceActions(
  actions: VoiceAction[],
  adapters: VoiceActionAdapters
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const action of actions) {
    try {
      await executeAction(action, adapters);
      results.push({ success: true, action });
      
      // Small delay between actions for visual feedback
      await delay(150);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Action execution failed:`, action, error);
      results.push({ success: false, action, error: errorMessage });
    }
  }

  return results;
}

async function executeAction(
  action: VoiceAction,
  adapters: VoiceActionAdapters
): Promise<void> {
  switch (action.type) {
    case 'NAVIGATE_TAB':
      adapters.navigateTab(action.payload.tab);
      break;

    case 'SET_INPUT':
      adapters.setInput(action.payload.path, action.payload.value);
      break;

    case 'RUN_SIMULATION':
      adapters.runSimulation();
      break;

    case 'HIGHLIGHT_CHART':
      adapters.highlightChart(action.payload.target);
      break;

    case 'SHOW_INSIGHT':
      adapters.showInsight(action.payload.text);
      break;

    case 'COMPARE_PATHS':
      adapters.comparePaths(action.payload.mode);
      break;

    default:
      // TypeScript exhaustiveness check
      const _exhaustiveCheck: never = action;
      throw new Error(`Unknown action type: ${(_exhaustiveCheck as VoiceAction).type}`);
  }
}

// ============================================
// Helper: Get actual input key from path
// ============================================

export function getInputKeyFromPath(path: InputPath): string {
  return inputPathToKey[path];
}

// ============================================
// Utilities
// ============================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Speech Synthesis Helper
// ============================================

// Voice preference ranking (most preferred first)
const VOICE_PREFERENCES = [
  // Premium/Natural voices (macOS)
  'Samantha', 'Karen', 'Daniel', 'Moira', 'Tessa', 'Fiona',
  // Google voices (Chrome)
  'Google UK English Female', 'Google UK English Male', 'Google US English',
  // Microsoft voices (Edge/Windows)
  'Microsoft Zira', 'Microsoft David', 'Microsoft Mark',
  // Other natural voices
  'Alex', 'Victoria', 'Allison',
];

let cachedVoice: SpeechSynthesisVoice | null = null;

function getBestVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  
  // Try to find a preferred voice
  for (const preferred of VOICE_PREFERENCES) {
    const voice = voices.find(v => v.name.includes(preferred));
    if (voice) {
      cachedVoice = voice;
      return voice;
    }
  }
  
  // Fallback: find any English voice that's not robotic
  const englishVoice = voices.find(v => 
    v.lang.startsWith('en') && 
    !v.name.toLowerCase().includes('compact') &&
    !v.name.toLowerCase().includes('espeak')
  );
  
  if (englishVoice) {
    cachedVoice = englishVoice;
    return englishVoice;
  }
  
  // Last resort: first available voice
  cachedVoice = voices[0];
  return voices[0];
}

// Preload voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null; // Reset cache when voices change
    getBestVoice(); // Re-cache
  };
  // Initial load
  getBestVoice();
}

export function speak(text: string, options?: { rate?: number; pitch?: number }): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      resolve();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Natural speech settings
    utterance.rate = options?.rate ?? 0.95; // Slightly slower for clarity
    utterance.pitch = options?.pitch ?? 1.05; // Slightly higher for warmth
    utterance.volume = 1.0;

    // Get the best available voice
    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      resolve(); // Don't reject, just continue
    };

    // Chrome bug workaround: speech can get stuck, so we add a timeout
    const timeout = setTimeout(() => {
      window.speechSynthesis.cancel();
      resolve();
    }, 30000); // 30 second max

    utterance.onend = () => {
      clearTimeout(timeout);
      resolve();
    };

    // Chrome bug workaround: need to wait a tick before speaking
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  });
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Get list of available voices (for debugging/UI)
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}
