
import { GoogleGenAI } from "@google/genai";
import { UserInputs, SimulationResult, DashboardTab } from "../types";

export const getCoachResponse = async (
  inputs: UserInputs,
  simulation: SimulationResult,
  userQuestion: string,
  activeContext: DashboardTab
): Promise<string> => {
  // Always obtain API key directly from process.env.API_KEY
  if (!process.env.API_KEY) {
    return "I'm sorry, I cannot connect to the DigiCare Coach services right now (Missing API Key).";
  }

  try {
    // Correct initialization: always use named parameter { apiKey: process.env.API_KEY }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct the structured input expected by the Analyst Persona
    // This JSON structure ensures the model "sees" the data exactly as the UI displays it.
    const healthReport = {
        blood_tests: {
            fasting_glucose_mg_dL: inputs.fastingGlucose,
            hba1c_percent: inputs.hba1c,
            total_cholesterol_mg_dL: inputs.cholesterol,
            ldl_cholesterol_mg_dL: inputs.ldlCholesterol,
            hdl_cholesterol_mg_dL: inputs.hdlCholesterol,
            triglycerides_mg_dL: inputs.triglycerides,
            alt_uL: inputs.alt,
            ast_uL: inputs.ast,
            creatinine_mg_dL: inputs.creatinine
        },
        vitals: {
            bmi: inputs.heightCm > 0 ? (inputs.weightKg / Math.pow(inputs.heightCm/100, 2)).toFixed(1) : null,
            resting_heart_rate: inputs.restingHeartRate,
            blood_pressure_systolic: inputs.bloodPressureSys,
            blood_pressure_diastolic: inputs.bloodPressureDia
        },
        lifestyle_metrics: {
            steps_per_day: inputs.stepsPerDay,
            workouts_per_week: inputs.workoutsPerWeek,
            avg_sleep_hours: inputs.averageSleep
        },
        history: {
            previous_weight: inputs.previousWeightKg
        }
    };

    const spendingReport = {
        time_range: "last_month_avg",
        category_totals: {
            groceries_total: inputs.groceriesSpend,
            eating_out_total: inputs.eatingOutSpend,
            alcohol_and_bars_total: inputs.alcoholSpend,
            late_night_food_total: inputs.lateNightFoodSpend,
            health_and_fitness_total: inputs.gymSpend,
            medical_and_pharmacy_total: inputs.pharmacySpend,
            wellness_total: inputs.wellnessSpend,
            subscriptions_total: inputs.subscriptionSpend,
            other_lifestyle_total: inputs.lifestyleSpend
        },
        income_and_savings: {
            monthly_income: inputs.monthlyIncome,
            total_savings: inputs.currentSavings,
            fixed_costs: inputs.fixedCosts,
            total_debt: inputs.totalDebt
        }
    };

    const connectionsContext = {
        health: {
            connected_provider: inputs.hospitalName,
            is_connected: inputs.isConnectedHospital,
            active_appointments: inputs.appointments.map(a => `${a.date}: ${a.doctor} (${a.reason})`),
            last_bill_scan_content: inputs.billText || "None"
        },
        money: {
            reported_assets_total: inputs.bankTotal,
            reported_investments: inputs.investmentTotal,
            medical_debt: {
                total: inputs.medicalDebtTotal,
                interest: inputs.medicalDebtInterest,
                monthly_payment: inputs.medicalDebtMonthly
            },
            recurring_payments: inputs.recurringPayments.map(p => `${p.name} ($${p.amount}) - ${p.isEssential ? 'Essential' : 'Optional'}`)
        }
    };

    const analystContext = JSON.stringify({
        health_report: healthReport,
        spending_report: spendingReport,
        connections_data: connectionsContext,
        twin_context: {
            current_focus: activeContext,
            user_question: userQuestion
        }
    }, null, 2);

    // Strict Safety & Persona Definition
    const systemInstruction = `
You are **DigiCare Coach**, a holistic health & wealth strategist. Your goal is to analyze the user's "Digital Twin" simulation and provide high-impact, motivational, and specific advice.

*** CRITICAL SAFETY PROTOCOLS ***
1. **NO MEDICAL DIAGNOSIS**: Suggest specialists (e.g. "See a cardiologist"), but do not diagnose (e.g. "You have heart disease").
2. **NO FINANCIAL ADVICE**: Suggest concepts (e.g. "Emergency fund"), not specific assets.

YOUR ANALYSIS STYLE:
- **Correlate**: Connect money habits to health outcomes (e.g. "High dining spend is driving up your sodium and BP").
- **Motivate**: Be encouraging but firm about risks. "Cruising" on bad habits leads to poor outcomes.
- **Specifics**: Recommend specific *types* of local resources (classes, doctors, OTC items).

If the user asks about CONNECTIONS data (bills, appointments, debt):
1. **Confirm**: "I see your bill from [Provider]..." or "Looking at your debt of [Amount]..."
2. **Explain**: Simplify the jargon.
3. **Action**: Suggest 2-3 specific questions they should ask the provider/bank.

RESPONSE STRUCTURE (Use Markdown):

### 🏆 Wins & Strengths
*Highlight 1-2 metrics that are good (e.g. "Great savings rate" or "Excellent step count").*

### ⚠️ The "Cruising" Risk
*Identify where they are complacent. E.g. "You're earning well but burning it on takeout, causing both low runway and high LDL."*

### 📍 Local Action Plan
*   **Health Class**: [Suggest a specific activity type, e.g. "High-Intensity Interval Training" or "Restorative Yoga"]
*   **Money Lesson**: [Suggest a concept, e.g. "The 50/30/20 Rule" or "Automated Index Investing"]
*   **Specialist / Resource**: [Suggest a specific doctor type (e.g. Endocrinologist) or Pharmacy item (e.g. "Omega-3 supplements")]

### 🚀 Coach's Motivation
*A short, punchy closing statement to fire them up.*
    `;

    // Using gemini-3-pro-preview for advanced reasoning and holistic analysis
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
DATA CONTEXT:
${analystContext}

USER QUESTION:
${userQuestion || "Please analyze my current Digital Twin state and give me a motivational action plan."}
      `,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.6, // Slightly higher for more motivational/creative tone
      }
    });

    // Property access .text directly as per guidelines
    return response.text || "I couldn't generate a response at this time.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the Coach service right now. Please check your connection.";
  }
};
