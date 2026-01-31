/**
 * Voice Agent - Interprets voice commands using Gemini
 * Returns structured actions that the UI can execute
 */

import { GoogleGenAI } from "@google/genai";
import { DashboardTab, UserInputs, SimulationResult } from "../types";
import { VoiceAction, VoiceAgentResponse, validateActions } from "./actionSchema";

// ============================================
// Context Types
// ============================================

export interface VoiceContext {
  activeTab: DashboardTab;
  inputs: {
    health: {
      weightKg: number;
      heightCm: number;
      stepsPerDay: number;
      workoutsPerWeek: number;
      averageSleep: number;
      restingHeartRate: number;
      hba1c: number;
      ldlCholesterol: number;
    };
    finance: {
      monthlyIncome: number;
      currentSavings: number;
      totalDebt: number;
      eatingOutSpend: number;
      alcoholSpend: number;
      groceriesSpend: number;
      gymSpend: number;
    };
  };
  simulationSummary?: {
    bodyScore: number | null;
    moneyScore: number | null;
    lifeScore: number | null;
    weightProjection12Mo: number | null;
    netWorthProjection12Mo: number | null;
  };
}

// ============================================
// Helper: Build Context from App State
// ============================================

export function buildVoiceContext(
  activeTab: DashboardTab,
  inputs: UserInputs,
  simulation: SimulationResult | null
): VoiceContext {
  return {
    activeTab,
    inputs: {
      health: {
        weightKg: inputs.weightKg,
        heightCm: inputs.heightCm,
        stepsPerDay: inputs.stepsPerDay,
        workoutsPerWeek: inputs.workoutsPerWeek,
        averageSleep: inputs.averageSleep,
        restingHeartRate: inputs.restingHeartRate,
        hba1c: inputs.hba1c,
        ldlCholesterol: inputs.ldlCholesterol,
      },
      finance: {
        monthlyIncome: inputs.monthlyIncome,
        currentSavings: inputs.currentSavings,
        totalDebt: inputs.totalDebt,
        eatingOutSpend: inputs.eatingOutSpend,
        alcoholSpend: inputs.alcoholSpend,
        groceriesSpend: inputs.groceriesSpend,
        gymSpend: inputs.gymSpend,
      },
    },
    simulationSummary: simulation ? {
      bodyScore: simulation.scores.bodyTwin,
      moneyScore: simulation.scores.moneyTwin,
      lifeScore: simulation.scores.lifeTwin,
      weightProjection12Mo: simulation.forecast.weightImproved[12] ?? null,
      netWorthProjection12Mo: simulation.forecast.netWorthImproved[12] ?? null,
    } : undefined,
  };
}

// ============================================
// System Prompt for Voice Commands
// ============================================

const VOICE_SYSTEM_PROMPT = `You are a Voice Command Interpreter for DigiCare, a health & wealth simulator app. Your job is to parse spoken commands and return ONLY valid JSON.

## OUTPUT FORMAT (STRICT)
You MUST respond with ONLY a JSON object in this exact format:
{
  "speechText": "What to say back to the user",
  "actions": [ ...array of action objects... ]
}

DO NOT include markdown code fences, explanations, or any text outside the JSON.

## AVAILABLE ACTIONS

1. NAVIGATE_TAB - Switch between app tabs
   { "type": "NAVIGATE_TAB", "payload": { "tab": "overview" | "health" | "money" | "connections" } }
   
   Tab aliases:
   - "overview", "home", "main" → "overview"
   - "health", "body", "bodytwin", "body twin" → "health"
   - "money", "finance", "moneytwin", "money twin", "wealth" → "money"
   - "connections", "connect", "links" → "connections"

2. SET_INPUT - Update a user input value
   { "type": "SET_INPUT", "payload": { "path": "<path>", "value": <number> } }
   
   Valid paths:
   Health: health.heightCm, health.weightKg, health.stepsPerDay, health.workoutsPerWeek, 
           health.restingHeartRate, health.averageSleep, health.bloodPressureSys, 
           health.bloodPressureDia, health.hba1c, health.fastingGlucose, health.cholesterol,
           health.ldlCholesterol, health.hdlCholesterol, health.triglycerides
   Finance: finance.monthlyIncome, finance.fixedCosts, finance.lifestyleSpend, 
            finance.currentSavings, finance.totalDebt, finance.debtInterestRate,
            finance.groceriesSpend, finance.eatingOutSpend, finance.alcoholSpend,
            finance.lateNightFoodSpend, finance.gymSpend, finance.pharmacySpend,
            finance.wellnessSpend, finance.subscriptionSpend
   
   Common phrases to paths:
   - "eating out", "takeout", "dining out" → finance.eatingOutSpend
   - "alcohol", "drinking", "bar" → finance.alcoholSpend
   - "groceries", "grocery" → finance.groceriesSpend
   - "gym", "fitness" → finance.gymSpend
   - "workouts", "exercise sessions" → health.workoutsPerWeek
   - "steps" → health.stepsPerDay
   - "sleep", "sleep hours" → health.averageSleep
   - "weight" → health.weightKg
   - "income", "salary" → finance.monthlyIncome
   - "savings" → finance.currentSavings
   - "debt" → finance.totalDebt

3. RUN_SIMULATION - Trigger simulation recalculation
   { "type": "RUN_SIMULATION" }

4. HIGHLIGHT_CHART - Focus on a specific chart
   { "type": "HIGHLIGHT_CHART", "payload": { "target": "<chart>" } }
   
   Valid targets: weight, hba1c, ldl, sleep, rhr, savings, netWorth, junkSpend, healthSpend
   
   Phrases to targets:
   - "weight chart", "weight projection" → weight
   - "hba1c", "blood sugar", "glucose" → hba1c
   - "cholesterol", "ldl" → ldl
   - "sleep", "sleep chart" → sleep
   - "heart rate", "rhr" → rhr
   - "savings", "savings chart" → savings
   - "net worth", "wealth" → netWorth
   - "junk food spending", "bad spending" → junkSpend
   - "health spending" → healthSpend

5. SHOW_INSIGHT - Display an insight message
   { "type": "SHOW_INSIGHT", "payload": { "text": "Insight text here" } }

6. COMPARE_PATHS - Show baseline vs optimized comparison
   { "type": "COMPARE_PATHS", "payload": { "mode": "baseline" | "optimized" | "both" } }
   
   Triggers: "compare", "show comparison", "baseline vs optimized", "show both paths"

## EXAMPLES

User: "Open money twin"
Response: {"speechText":"Opening MoneyTwin tab.","actions":[{"type":"NAVIGATE_TAB","payload":{"tab":"money"}}]}

User: "Set eating out to 200 and run simulation"
Response: {"speechText":"Setting eating out spending to $200 and running simulation.","actions":[{"type":"SET_INPUT","payload":{"path":"finance.eatingOutSpend","value":200}},{"type":"RUN_SIMULATION"}]}

User: "Show me the weight chart"
Response: {"speechText":"Highlighting the weight projection chart.","actions":[{"type":"HIGHLIGHT_CHART","payload":{"target":"weight"}}]}

User: "Go to body twin and show HbA1c"
Response: {"speechText":"Navigating to BodyTwin and highlighting HbA1c chart.","actions":[{"type":"NAVIGATE_TAB","payload":{"tab":"health"}},{"type":"HIGHLIGHT_CHART","payload":{"target":"hba1c"}}]}

User: "Increase workouts to 4 per week"
Response: {"speechText":"Setting workouts to 4 per week.","actions":[{"type":"SET_INPUT","payload":{"path":"health.workoutsPerWeek","value":4}},{"type":"RUN_SIMULATION"}]}

User: "Cut my takeout spending by half" (context: current eatingOutSpend is 400)
Response: {"speechText":"Reducing eating out from $400 to $200.","actions":[{"type":"SET_INPUT","payload":{"path":"finance.eatingOutSpend","value":200}},{"type":"RUN_SIMULATION"}]}

User: "Compare baseline and optimized"
Response: {"speechText":"Showing comparison between your current path and the DigiCare optimized path.","actions":[{"type":"NAVIGATE_TAB","payload":{"tab":"overview"}},{"type":"COMPARE_PATHS","payload":{"mode":"both"}}]}

User: "What is my current score?"
Response: {"speechText":"Your current LifeTwin score is 65. Your body score is 58 and money score is 72.","actions":[]}

User: "Hello there"
Response: {"speechText":"Hello! I'm your DigiCare Voice Coach. You can say things like 'open money twin', 'set eating out to 200', or 'show the weight chart'. What would you like to do?","actions":[]}

## RULES
1. ONLY output valid JSON, nothing else
2. Always include both "speechText" and "actions" keys
3. If you don't understand, return helpful speechText and empty actions
4. For relative changes like "cut by half" or "add 50", calculate the actual value using context
5. If asked about current values/scores, use context data and return informational speechText with no actions
6. Keep speechText short and conversational (1-2 sentences)
7. When setting values, auto-add RUN_SIMULATION after SET_INPUT unless user specifically says not to
8. Validate numbers make sense (no negative spending, reasonable ranges)`;

// ============================================
// Main Interpret Function
// ============================================

export async function interpretCommand(params: {
  transcript: string;
  appContext: VoiceContext;
}): Promise<VoiceAgentResponse> {
  const { transcript, appContext } = params;

  // Check for API key
  if (!process.env.API_KEY) {
    console.error("Voice Agent: No API_KEY found in environment");
    // Provide a helpful local response for common queries when API is unavailable
    return handleOfflineQuery(transcript, appContext);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const contextStr = JSON.stringify(appContext, null, 2);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `APP CONTEXT:
${contextStr}

USER COMMAND:
"${transcript}"`,
      config: {
        systemInstruction: VOICE_SYSTEM_PROMPT,
        temperature: 0.1, // Low temperature for consistent JSON output
      },
    });

    const rawText = response.text || '';
    
    // Parse the response
    return parseGeminiResponse(rawText);
  } catch (error) {
    console.error("Voice Agent Error:", error);
    
    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
      return {
        speechText: "The Gemini API key appears to be invalid or missing. Please check your API key configuration.",
        actions: [],
      };
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ENOTFOUND')) {
      return {
        speechText: "I couldn't connect to the AI service. Please check your internet connection.",
        actions: [],
      };
    }
    
    // Fallback to offline handling
    return handleOfflineQuery(transcript, appContext);
  }
}

// Handle queries when API is unavailable - provides basic functionality
function handleOfflineQuery(transcript: string, context: VoiceContext): VoiceAgentResponse {
  const lower = transcript.toLowerCase();
  
  // Navigation commands
  if (lower.includes('open') || lower.includes('go to') || lower.includes('show')) {
    if (lower.includes('money') || lower.includes('finance') || lower.includes('wealth')) {
      return {
        speechText: "Opening MoneyTwin tab.",
        actions: [{ type: 'NAVIGATE_TAB', payload: { tab: 'money' } }],
      };
    }
    if (lower.includes('health') || lower.includes('body')) {
      return {
        speechText: "Opening BodyTwin tab.",
        actions: [{ type: 'NAVIGATE_TAB', payload: { tab: 'health' } }],
      };
    }
    if (lower.includes('overview') || lower.includes('home')) {
      return {
        speechText: "Opening Overview tab.",
        actions: [{ type: 'NAVIGATE_TAB', payload: { tab: 'overview' } }],
      };
    }
    if (lower.includes('connection')) {
      return {
        speechText: "Opening Connections tab.",
        actions: [{ type: 'NAVIGATE_TAB', payload: { tab: 'connections' } }],
      };
    }
  }
  
  // Status/info queries - provide data from context
  if (lower.includes('saving') || lower.includes('money') || lower.includes('finance') || lower.includes('wealth')) {
    const savings = context.inputs.finance.currentSavings;
    const income = context.inputs.finance.monthlyIncome;
    const debt = context.inputs.finance.totalDebt;
    const score = context.simulationSummary?.moneyScore ?? 'unknown';
    
    return {
      speechText: `Here's your financial snapshot: You have $${savings.toLocaleString()} in savings, monthly income of $${income.toLocaleString()}, and $${debt.toLocaleString()} in debt. Your money score is ${score}.`,
      actions: [{ type: 'NAVIGATE_TAB', payload: { tab: 'money' } }],
    };
  }
  
  if (lower.includes('health') || lower.includes('body') || lower.includes('weight') || lower.includes('status')) {
    const weight = context.inputs.health.weightKg;
    const steps = context.inputs.health.stepsPerDay;
    const sleep = context.inputs.health.averageSleep;
    const workouts = context.inputs.health.workoutsPerWeek;
    const score = context.simulationSummary?.bodyScore ?? 'unknown';
    
    return {
      speechText: `Here's your health snapshot: You weigh ${weight}kg, averaging ${steps.toLocaleString()} steps per day, ${sleep} hours of sleep, and ${workouts} workouts per week. Your body score is ${score}.`,
      actions: [{ type: 'NAVIGATE_TAB', payload: { tab: 'health' } }],
    };
  }
  
  if (lower.includes('score') || lower.includes('overall')) {
    const body = context.simulationSummary?.bodyScore ?? 'N/A';
    const money = context.simulationSummary?.moneyScore ?? 'N/A';
    const life = context.simulationSummary?.lifeScore ?? 'N/A';
    
    return {
      speechText: `Your current scores are: Body score ${body}, Money score ${money}, and overall Life score ${life}.`,
      actions: [],
    };
  }
  
  // Default response when API unavailable
  return {
    speechText: "I'm running in offline mode without the Gemini API. I can help with basic navigation like 'open MoneyTwin' or show your current stats. For full conversational features, please configure your API key in the .env.local file.",
    actions: [],
  };
}

// ============================================
// Response Parser (Resilient)
// ============================================

function parseGeminiResponse(rawText: string): VoiceAgentResponse {
  let text = rawText.trim();
  
  // Strip markdown code fences if present
  if (text.startsWith('```json')) {
    text = text.slice(7);
  } else if (text.startsWith('```')) {
    text = text.slice(3);
  }
  if (text.endsWith('```')) {
    text = text.slice(0, -3);
  }
  text = text.trim();

  // Try to find JSON object if there's extra text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    
    // Validate structure
    const speechText = typeof parsed.speechText === 'string' 
      ? parsed.speechText 
      : "Command processed.";
    
    const rawActions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const validActions = validateActions(rawActions);

    return {
      speechText,
      actions: validActions,
    };
  } catch (parseError) {
    console.error("JSON Parse Error:", parseError, "Raw:", rawText);
    
    // Try to extract speechText from malformed response
    const speechMatch = rawText.match(/"speechText"\s*:\s*"([^"]+)"/);
    const fallbackSpeech = speechMatch 
      ? speechMatch[1] 
      : "I understood your request but had trouble processing the response.";
    
    return {
      speechText: fallbackSpeech,
      actions: [],
    };
  }
}
