
export enum TwinType {
  BodyTwin = 'BodyTwin',
  MoneyTwin = 'MoneyTwin',
  LifeTwin = 'LifeTwin',
}

// ==========================================
// PERSONA TYPES
// ==========================================
export type PersonaType = 'custom' | 'prediabetic' | 'diabetic_type2';

export interface Persona {
  id: PersonaType;
  name: string;
  description: string;
  icon: string; // emoji or icon identifier
  defaultInputs: Partial<UserInputs>;
}

// ==========================================
// DAILY TRACKING TYPES - DATABASE SCHEMA
// ==========================================

/**
 * DailyEntry represents a single day's tracked metrics for a diabetic user.
 * This is the core schema for daily tracking data.
 * 
 * Database Schema (if using SQL):
 * 
 * CREATE TABLE daily_entries (
 *   id VARCHAR(36) PRIMARY KEY,           -- UUID
 *   user_id VARCHAR(36) NOT NULL,         -- Foreign key to users table
 *   date DATE NOT NULL,                   -- Entry date (YYYY-MM-DD)
 *   
 *   -- Weight Tracking
 *   weight_kg DECIMAL(5,2),               -- e.g., 85.50
 *   
 *   -- Sleep Tracking
 *   sleep_hours DECIMAL(3,1),             -- e.g., 7.5
 *   sleep_quality ENUM('poor','fair','good','excellent'),
 *   
 *   -- Meal Tracking
 *   meals_count INT,                       -- Number of meals
 *   meals_cost DECIMAL(8,2),              -- Total food cost for the day
 *   carbs_grams INT,                       -- Estimated carb intake
 *   calories_total INT,                    -- Estimated total calories
 *   
 *   -- Exercise Tracking
 *   exercise_minutes INT,                  -- Total exercise duration
 *   exercise_type VARCHAR(50),            -- 'walking', 'gym', 'swimming', etc.
 *   steps_count INT,                       -- Steps from wearable
 *   
 *   -- Glucose Tracking (critical for diabetics)
 *   fasting_glucose INT,                   -- mg/dL
 *   post_meal_glucose INT,                -- mg/dL (2 hours after meal)
 *   
 *   -- Metadata
 *   notes TEXT,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *   
 *   UNIQUE KEY unique_user_date (user_id, date),
 *   INDEX idx_user_date (user_id, date DESC)
 * );
 */
export interface DailyEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  
  // Weight
  weightKg: number | null;
  
  // Sleep
  sleepHours: number | null;
  sleepQuality: 'poor' | 'fair' | 'good' | 'excellent' | null;
  
  // Meals
  mealsCount: number | null;
  mealsCost: number | null; // Total food spending for the day
  carbsGrams: number | null;
  proteinGrams: number | null;
  fiberGrams: number | null;
  sugarFlag: boolean | null; // Had sugary items
  mealsDescription: string | null; // e.g., "Chai Tea Latte, Steak"
  caloriesTotal: number | null;
  
  // Exercise
  exerciseMinutes: number | null;
  exerciseType: 'walking' | 'running' | 'gym' | 'swimming' | 'cycling' | 'yoga' | 'other' | null;
  stepsCount: number | null;
  
  // Glucose (critical for diabetics)
  fastingGlucose: number | null; // mg/dL
  postMealGlucose: number | null; // mg/dL
  
  // Mirror-specific fields (Smart Mirror check-in)
  carbSugarFlag?: boolean | null;      // Did user have sugary/high-carb item?
  carbSugarItem?: string | null;       // Description of the item
  diningOutSpend?: number | null;      // Amount spent dining out
  faceCheckImage?: string | null;      // Base64 image from face check
  
  // Metadata
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Comparison result between two days
 */
export interface DailyComparison {
  metric: string;
  label: string;
  previousValue: number | null;
  currentValue: number | null;
  unit: string;
  trend: 'better' | 'worse' | 'same' | 'unknown';
  changePercent: number | null;
  lowerIsBetter: boolean; // For weight, glucose - lower is better; for exercise - higher is better
}

/**
 * Daily tracking state for the app
 */
export interface DailyTrackingState {
  entries: DailyEntry[];
  todayEntry: DailyEntry | null;
  yesterdayEntry: DailyEntry | null;
}

export type DashboardTab = 'overview' | 'health' | 'money' | 'connections';

export interface Appointment {
  id: string;
  date: string;
  doctor: string;
  reason: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  type: 'Housing' | 'Loan' | 'Subscription' | 'Other';
  isEssential: boolean;
}

export interface UserInputs {
  twinType: TwinType;
  persona: PersonaType; // Added for persona selection
  // Body - Basic
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  stepsPerDay: number;
  workoutsPerWeek: number;
  restingHeartRate: number; // bpm
  averageSleep: number; // hours
  previousWeightKg: number; // from medical report
  
  // Body - Advanced Medical / Labs
  bloodPressureSys: number;
  bloodPressureDia: number;
  hba1c: number; // %
  fastingGlucose: number; // mg/dL
  cholesterol: number; // Total mg/dL
  ldlCholesterol: number; // mg/dL
  hdlCholesterol: number; // mg/dL
  triglycerides: number; // mg/dL
  alt: number; // Liver u/L
  ast: number; // Liver u/L
  creatinine: number; // Kidney mg/dL
  eGFR: number; // Kidney filtration rate

  // Money - Basic
  monthlyIncome: number;
  fixedCosts: number;
  lifestyleSpend: number; // General discretionary
  currentSavings: number;
  totalDebt: number; // Credit cards, loans (excluding mortgage ideally, or inclusive if tracking net worth)
  debtInterestRate: number; // Avg % APR

  // Money - Detailed Spending Categories
  groceriesSpend: number;
  eatingOutSpend: number; // Fast food / restaurants
  alcoholSpend: number; // Bars / alcohol
  lateNightFoodSpend: number;
  gymSpend: number; // Health & Fitness
  pharmacySpend: number; // Medical / Pharmacy
  wellnessSpend: number; // Yoga, massage, therapy
  subscriptionSpend: number; // Recurring

  // --- NEW CONNECTIONS DATA ---
  // Health Connections
  hospitalName?: string;
  hospitalPatientId?: string;
  isConnectedHospital?: boolean;
  billText?: string; // Last uploaded/pasted bill content
  appointments: Appointment[];

  // Money Connections
  bankTotal?: number;
  investmentTotal?: number;
  recurringPayments: RecurringPayment[];
  
  // Medical Debt specific
  medicalDebtTotal?: number;
  medicalDebtInterest?: number;
  medicalDebtMonthly?: number;
}

export interface Recommendation {
  title: string;
  impactHealth: string | null;
  impactMoney: string | null;
}

export interface MetricTrend {
  label: string;
  value: string | number;
  unit: string;
  status: 'improving' | 'stable' | 'worsening';
  diff?: string;
}

export interface Insight {
  title: string;
  description: string;
  level: 'info' | 'caution' | 'warning';
  category: string;
}

export interface SimulationResult {
  scores: {
    bodyTwin: number | null;
    moneyTwin: number | null;
    lifeTwin: number | null;
  };
  forecast: {
    months: number[];
    weightBaseline: (number | null)[];
    weightImproved: (number | null)[];
    savingsBaseline: (number | null)[];
    savingsImproved: (number | null)[];
    // Health Projections
    hba1cBaseline: (number | null)[];
    hba1cImproved: (number | null)[];
    ldlBaseline: (number | null)[];
    ldlImproved: (number | null)[];
    sleepBaseline: (number | null)[];
    sleepImproved: (number | null)[];
    rhrBaseline: (number | null)[];
    rhrImproved: (number | null)[];
    // Diabetic Daily Tracking Projections
    mealsCostBaseline: (number | null)[];
    mealsCostImproved: (number | null)[];
    exerciseBaseline: (number | null)[];
    exerciseImproved: (number | null)[];
    // Money Projections
    netWorthBaseline: (number | null)[];
    netWorthImproved: (number | null)[];
    junkSpendBaseline: (number | null)[];
    junkSpendImproved: (number | null)[];
    healthSpendBaseline: (number | null)[];
    healthSpendImproved: (number | null)[];
  };
  recommendations: Recommendation[];
  patterns: {
    category: 'Health' | 'Money' | 'Life';
    text: string;
    trend: 'positive' | 'negative' | 'neutral';
  }[];
  // Trends for dashboard
  healthTrends: MetricTrend[];
  moneyTrends: MetricTrend[];
  // Insights
  healthInsights: Insight[];
  financialInsights: Insight[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}
