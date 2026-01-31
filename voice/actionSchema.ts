/**
 * Voice Coach Action Schema
 * Defines all supported voice command actions and their validators
 */

import { DashboardTab } from '../types';

// ============================================
// Action Type Definitions
// ============================================

export type ActionType = 
  | 'NAVIGATE_TAB'
  | 'SET_INPUT'
  | 'RUN_SIMULATION'
  | 'HIGHLIGHT_CHART'
  | 'SHOW_INSIGHT'
  | 'COMPARE_PATHS';

// Tab navigation
export interface NavigateTabAction {
  type: 'NAVIGATE_TAB';
  payload: {
    tab: DashboardTab;
  };
}

// Input field paths that can be set via voice
export type InputPath = 
  // Health paths
  | 'health.heightCm'
  | 'health.weightKg'
  | 'health.stepsPerDay'
  | 'health.workoutsPerWeek'
  | 'health.restingHeartRate'
  | 'health.averageSleep'
  | 'health.bloodPressureSys'
  | 'health.bloodPressureDia'
  | 'health.hba1c'
  | 'health.fastingGlucose'
  | 'health.cholesterol'
  | 'health.ldlCholesterol'
  | 'health.hdlCholesterol'
  | 'health.triglycerides'
  // Finance paths
  | 'finance.monthlyIncome'
  | 'finance.fixedCosts'
  | 'finance.lifestyleSpend'
  | 'finance.currentSavings'
  | 'finance.totalDebt'
  | 'finance.debtInterestRate'
  | 'finance.groceriesSpend'
  | 'finance.eatingOutSpend'
  | 'finance.alcoholSpend'
  | 'finance.lateNightFoodSpend'
  | 'finance.gymSpend'
  | 'finance.pharmacySpend'
  | 'finance.wellnessSpend'
  | 'finance.subscriptionSpend';

export interface SetInputAction {
  type: 'SET_INPUT';
  payload: {
    path: InputPath;
    value: number;
  };
}

export interface RunSimulationAction {
  type: 'RUN_SIMULATION';
  payload?: Record<string, never>; // Empty object, no payload needed
}

export type ChartTarget = 
  | 'weight'
  | 'hba1c'
  | 'ldl'
  | 'sleep'
  | 'rhr'
  | 'savings'
  | 'netWorth'
  | 'junkSpend'
  | 'healthSpend';

export interface HighlightChartAction {
  type: 'HIGHLIGHT_CHART';
  payload: {
    target: ChartTarget;
  };
}

export interface ShowInsightAction {
  type: 'SHOW_INSIGHT';
  payload: {
    text: string;
  };
}

export interface ComparePathsAction {
  type: 'COMPARE_PATHS';
  payload: {
    mode: 'baseline' | 'optimized' | 'both';
  };
}

// Union of all action types
export type VoiceAction = 
  | NavigateTabAction
  | SetInputAction
  | RunSimulationAction
  | HighlightChartAction
  | ShowInsightAction
  | ComparePathsAction;

// Response from the voice agent
export interface VoiceAgentResponse {
  speechText: string;
  actions: VoiceAction[];
}

// ============================================
// Type Guards (Runtime Validators)
// ============================================

const validTabs: DashboardTab[] = ['overview', 'health', 'money', 'connections'];
const validChartTargets: ChartTarget[] = ['weight', 'hba1c', 'ldl', 'sleep', 'rhr', 'savings', 'netWorth', 'junkSpend', 'healthSpend'];
const validCompareMode = ['baseline', 'optimized', 'both'];

const validInputPaths: InputPath[] = [
  'health.heightCm', 'health.weightKg', 'health.stepsPerDay', 'health.workoutsPerWeek',
  'health.restingHeartRate', 'health.averageSleep', 'health.bloodPressureSys', 
  'health.bloodPressureDia', 'health.hba1c', 'health.fastingGlucose', 'health.cholesterol',
  'health.ldlCholesterol', 'health.hdlCholesterol', 'health.triglycerides',
  'finance.monthlyIncome', 'finance.fixedCosts', 'finance.lifestyleSpend',
  'finance.currentSavings', 'finance.totalDebt', 'finance.debtInterestRate',
  'finance.groceriesSpend', 'finance.eatingOutSpend', 'finance.alcoholSpend',
  'finance.lateNightFoodSpend', 'finance.gymSpend', 'finance.pharmacySpend',
  'finance.wellnessSpend', 'finance.subscriptionSpend'
];

export function isNavigateTabAction(action: unknown): action is NavigateTabAction {
  if (typeof action !== 'object' || action === null) return false;
  const a = action as Record<string, unknown>;
  if (a.type !== 'NAVIGATE_TAB') return false;
  if (typeof a.payload !== 'object' || a.payload === null) return false;
  const payload = a.payload as Record<string, unknown>;
  return validTabs.includes(payload.tab as DashboardTab);
}

export function isSetInputAction(action: unknown): action is SetInputAction {
  if (typeof action !== 'object' || action === null) return false;
  const a = action as Record<string, unknown>;
  if (a.type !== 'SET_INPUT') return false;
  if (typeof a.payload !== 'object' || a.payload === null) return false;
  const payload = a.payload as Record<string, unknown>;
  return (
    validInputPaths.includes(payload.path as InputPath) &&
    typeof payload.value === 'number' &&
    !isNaN(payload.value)
  );
}

export function isRunSimulationAction(action: unknown): action is RunSimulationAction {
  if (typeof action !== 'object' || action === null) return false;
  const a = action as Record<string, unknown>;
  return a.type === 'RUN_SIMULATION';
}

export function isHighlightChartAction(action: unknown): action is HighlightChartAction {
  if (typeof action !== 'object' || action === null) return false;
  const a = action as Record<string, unknown>;
  if (a.type !== 'HIGHLIGHT_CHART') return false;
  if (typeof a.payload !== 'object' || a.payload === null) return false;
  const payload = a.payload as Record<string, unknown>;
  return validChartTargets.includes(payload.target as ChartTarget);
}

export function isShowInsightAction(action: unknown): action is ShowInsightAction {
  if (typeof action !== 'object' || action === null) return false;
  const a = action as Record<string, unknown>;
  if (a.type !== 'SHOW_INSIGHT') return false;
  if (typeof a.payload !== 'object' || a.payload === null) return false;
  const payload = a.payload as Record<string, unknown>;
  return typeof payload.text === 'string' && payload.text.length > 0;
}

export function isComparePathsAction(action: unknown): action is ComparePathsAction {
  if (typeof action !== 'object' || action === null) return false;
  const a = action as Record<string, unknown>;
  if (a.type !== 'COMPARE_PATHS') return false;
  if (typeof a.payload !== 'object' || a.payload === null) return false;
  const payload = a.payload as Record<string, unknown>;
  return validCompareMode.includes(payload.mode as string);
}

export function isValidVoiceAction(action: unknown): action is VoiceAction {
  return (
    isNavigateTabAction(action) ||
    isSetInputAction(action) ||
    isRunSimulationAction(action) ||
    isHighlightChartAction(action) ||
    isShowInsightAction(action) ||
    isComparePathsAction(action)
  );
}

export function validateActions(actions: unknown[]): VoiceAction[] {
  return actions.filter(isValidVoiceAction);
}

// ============================================
// Input Path Mapping Helper
// ============================================

// Maps voice-friendly paths to actual UserInputs keys
export const inputPathToKey: Record<InputPath, string> = {
  'health.heightCm': 'heightCm',
  'health.weightKg': 'weightKg',
  'health.stepsPerDay': 'stepsPerDay',
  'health.workoutsPerWeek': 'workoutsPerWeek',
  'health.restingHeartRate': 'restingHeartRate',
  'health.averageSleep': 'averageSleep',
  'health.bloodPressureSys': 'bloodPressureSys',
  'health.bloodPressureDia': 'bloodPressureDia',
  'health.hba1c': 'hba1c',
  'health.fastingGlucose': 'fastingGlucose',
  'health.cholesterol': 'cholesterol',
  'health.ldlCholesterol': 'ldlCholesterol',
  'health.hdlCholesterol': 'hdlCholesterol',
  'health.triglycerides': 'triglycerides',
  'finance.monthlyIncome': 'monthlyIncome',
  'finance.fixedCosts': 'fixedCosts',
  'finance.lifestyleSpend': 'lifestyleSpend',
  'finance.currentSavings': 'currentSavings',
  'finance.totalDebt': 'totalDebt',
  'finance.debtInterestRate': 'debtInterestRate',
  'finance.groceriesSpend': 'groceriesSpend',
  'finance.eatingOutSpend': 'eatingOutSpend',
  'finance.alcoholSpend': 'alcoholSpend',
  'finance.lateNightFoodSpend': 'lateNightFoodSpend',
  'finance.gymSpend': 'gymSpend',
  'finance.pharmacySpend': 'pharmacySpend',
  'finance.wellnessSpend': 'wellnessSpend',
  'finance.subscriptionSpend': 'subscriptionSpend',
};
