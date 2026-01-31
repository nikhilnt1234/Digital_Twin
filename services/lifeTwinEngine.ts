import { TwinType, UserInputs, SimulationResult, Recommendation, MetricTrend, Insight } from '../types';
import { SIM_CONFIG } from './SimulationConfig';

/**
 * The LifeTwin Engine implementation.
 */

const calculateBodyScore = (inputs: UserInputs): number | null => {
  if (!inputs.heightCm || !inputs.weightKg || inputs.heightCm <= 0) return null;

  let score = SIM_CONFIG.scoring.baseScore;
  const heightM = inputs.heightCm / 100;
  const bmi = inputs.weightKg / (heightM * heightM);

  // BMI Rules
  if (bmi >= SIM_CONFIG.scoring.bmi.underweight && bmi <= SIM_CONFIG.scoring.bmi.normal) score += SIM_CONFIG.scoring.bmi.points.normal;
  else if (bmi >= SIM_CONFIG.scoring.bmi.normal && bmi <= SIM_CONFIG.scoring.bmi.overweight) score += SIM_CONFIG.scoring.bmi.points.overweight;
  else if (bmi >= 30) score += SIM_CONFIG.scoring.bmi.points.obese;

  // Steps Rules
  if (inputs.stepsPerDay >= SIM_CONFIG.scoring.steps.high) score += SIM_CONFIG.scoring.steps.points.high;
  else if (inputs.stepsPerDay >= SIM_CONFIG.scoring.steps.medium) score += SIM_CONFIG.scoring.steps.points.medium;
  else score += SIM_CONFIG.scoring.steps.points.low;

  // Workouts Rules
  if (inputs.workoutsPerWeek >= SIM_CONFIG.scoring.workouts.high) score += SIM_CONFIG.scoring.workouts.points.high;
  else if (inputs.workoutsPerWeek >= SIM_CONFIG.scoring.workouts.medium) score += SIM_CONFIG.scoring.workouts.points.medium;
  else score += SIM_CONFIG.scoring.workouts.points.none;

  // Heart Rate (Wearable Data)
  if (inputs.restingHeartRate > 0) {
    if (inputs.restingHeartRate < SIM_CONFIG.scoring.heartRate.athlete) score += SIM_CONFIG.scoring.heartRate.points.athlete; // Athlete
    else if (inputs.restingHeartRate <= SIM_CONFIG.scoring.heartRate.normal) score += SIM_CONFIG.scoring.heartRate.points.normal; // Healthy
    else if (inputs.restingHeartRate > SIM_CONFIG.scoring.heartRate.poor) score += SIM_CONFIG.scoring.heartRate.points.poor; // Poor
  }

  // Blood Pressure Risk
  if (inputs.bloodPressureSys > 0) {
      if (inputs.bloodPressureSys < SIM_CONFIG.scoring.bloodPressure.systolicNormal && inputs.bloodPressureDia < SIM_CONFIG.scoring.bloodPressure.diastolicNormal) score += SIM_CONFIG.scoring.bloodPressure.points.optimal;
      else if (inputs.bloodPressureSys > SIM_CONFIG.scoring.bloodPressure.systolicHigh || inputs.bloodPressureDia > SIM_CONFIG.scoring.bloodPressure.diastolicHigh) score += SIM_CONFIG.scoring.bloodPressure.points.high;
  }

  // Labs (Basic Score Impact)
  if (inputs.hba1c > 0) {
      if (inputs.hba1c < SIM_CONFIG.scoring.labs.hba1c.normal) score += SIM_CONFIG.scoring.labs.hba1c.points.normal;
      else if (inputs.hba1c > SIM_CONFIG.scoring.labs.hba1c.high) score += SIM_CONFIG.scoring.labs.hba1c.points.high;
  }
  if (inputs.ldlCholesterol > 0) {
      if (inputs.ldlCholesterol < SIM_CONFIG.scoring.labs.ldl.optimal) score += SIM_CONFIG.scoring.labs.ldl.points.optimal;
      else if (inputs.ldlCholesterol > SIM_CONFIG.scoring.labs.ldl.high) score += SIM_CONFIG.scoring.labs.ldl.points.high;
  }
  if (inputs.eGFR > 0) {
      if (inputs.eGFR > SIM_CONFIG.scoring.labs.eGFR.healthy) score += SIM_CONFIG.scoring.labs.eGFR.points.healthy;
      else if (inputs.eGFR < SIM_CONFIG.scoring.labs.eGFR.low) score += SIM_CONFIG.scoring.labs.eGFR.points.low;
  }

  // Sleep (Wearable Data)
  if (inputs.averageSleep > 0) {
    if (inputs.averageSleep >= SIM_CONFIG.scoring.sleep.min && inputs.averageSleep <= SIM_CONFIG.scoring.sleep.max) score += SIM_CONFIG.scoring.sleep.points.good;
    else if (inputs.averageSleep < SIM_CONFIG.scoring.sleep.poor) score += SIM_CONFIG.scoring.sleep.points.poor;
  }

  return Math.max(0, Math.min(100, score));
};

const calculateMoneyScore = (inputs: UserInputs): number | null => {
  if (inputs.monthlyIncome <= 0) return null;

  let score = SIM_CONFIG.scoring.baseScore;
  const totalExpenses = inputs.fixedCosts + inputs.lifestyleSpend + inputs.eatingOutSpend + inputs.groceriesSpend + inputs.alcoholSpend + inputs.gymSpend + inputs.wellnessSpend + inputs.pharmacySpend + inputs.subscriptionSpend;
  
  const savings = inputs.monthlyIncome - totalExpenses;
  const savingsRate = savings / inputs.monthlyIncome;

  // Savings Rate Rules
  if (savingsRate >= SIM_CONFIG.scoring.savingsRate.high) score += SIM_CONFIG.scoring.savingsRate.points.high;
  else if (savingsRate >= SIM_CONFIG.scoring.savingsRate.medium) score += SIM_CONFIG.scoring.savingsRate.points.medium;
  else if (savingsRate >= 0) score += SIM_CONFIG.scoring.savingsRate.points.positive;
  else score += SIM_CONFIG.scoring.savingsRate.points.negative;

  // Runway Rules
  if (inputs.currentSavings > 0 && totalExpenses > 0) {
    const runway = inputs.currentSavings / totalExpenses;
    if (runway >= SIM_CONFIG.scoring.runway.safe) score += SIM_CONFIG.scoring.runway.points.safe;
    else if (runway >= SIM_CONFIG.scoring.runway.warning) score += SIM_CONFIG.scoring.runway.points.warning;
    else if (runway >= SIM_CONFIG.scoring.runway.danger) score += SIM_CONFIG.scoring.runway.points.danger;
    else score += SIM_CONFIG.scoring.runway.points.critical;
  }

  // Debt Rules
  if (inputs.totalDebt > 0) {
     if (inputs.totalDebt > inputs.monthlyIncome * SIM_CONFIG.scoring.debt.criticalRatio) score += SIM_CONFIG.scoring.debt.points.critical;
     else if (inputs.totalDebt > inputs.monthlyIncome) score += SIM_CONFIG.scoring.debt.points.warning;
  }

  // Bad Habits Penalties (Bank Data)
  if (inputs.eatingOutSpend + inputs.alcoholSpend + inputs.lateNightFoodSpend > SIM_CONFIG.scoring.spending.badHabitsThreshold) score += SIM_CONFIG.scoring.spending.points.badHabits;
  if (inputs.subscriptionSpend > SIM_CONFIG.scoring.spending.subsThreshold) score += SIM_CONFIG.scoring.spending.points.subs;

  return Math.max(0, Math.min(100, score));
};

export const runSimulation = (inputs: UserInputs): SimulationResult => {
  const isBody = inputs.twinType === TwinType.BodyTwin || inputs.twinType === TwinType.LifeTwin;
  const isMoney = inputs.twinType === TwinType.MoneyTwin || inputs.twinType === TwinType.LifeTwin;

  const bodyScore = isBody ? calculateBodyScore(inputs) : null;
  const moneyScore = isMoney ? calculateMoneyScore(inputs) : null;

  let lifeScore: number | null = null;
  if (inputs.twinType === TwinType.LifeTwin && bodyScore !== null && moneyScore !== null) {
    lifeScore = Math.round((bodyScore + moneyScore) / 2);
  } else if (inputs.twinType === TwinType.BodyTwin) {
    lifeScore = bodyScore;
  } else if (inputs.twinType === TwinType.MoneyTwin) {
    lifeScore = moneyScore;
  }

  // --- Simulations ---
  const months = Array.from({ length: 13 }, (_, i) => i);
  const weightBaseline: (number | null)[] = [];
  const weightImproved: (number | null)[] = [];
  const savingsBaseline: (number | null)[] = [];
  const savingsImproved: (number | null)[] = [];
  const netWorthBaseline: (number | null)[] = [];
  const netWorthImproved: (number | null)[] = [];
  
  const hba1cBaseline: (number | null)[] = [];
  const hba1cImproved: (number | null)[] = [];
  const ldlBaseline: (number | null)[] = [];
  const ldlImproved: (number | null)[] = [];

  // New Projections
  const sleepBaseline: (number | null)[] = [];
  const sleepImproved: (number | null)[] = [];
  const rhrBaseline: (number | null)[] = [];
  const rhrImproved: (number | null)[] = [];
  const junkSpendBaseline: (number | null)[] = [];
  const junkSpendImproved: (number | null)[] = [];
  const healthSpendBaseline: (number | null)[] = [];
  const healthSpendImproved: (number | null)[] = [];
  
  // Diabetic Daily Tracking Projections
  const mealsCostBaseline: (number | null)[] = [];
  const mealsCostImproved: (number | null)[] = [];
  const exerciseBaseline: (number | null)[] = [];
  const exerciseImproved: (number | null)[] = [];


  // Health Sim: Weight
  if (isBody && inputs.weightKg > 0) {
    let baselineChange = SIM_CONFIG.simulation.weight.baseMonthlyChange;
    // Factor in "Bad Food" spend into weight gain if available
    const badFoodSpend = inputs.eatingOutSpend + inputs.lateNightFoodSpend + inputs.alcoholSpend;
    if (badFoodSpend > SIM_CONFIG.simulation.weight.badFoodSpendThreshold) baselineChange += SIM_CONFIG.simulation.weight.badFoodPenalty;

    if (inputs.workoutsPerWeek >= SIM_CONFIG.scoring.workouts.high && inputs.stepsPerDay >= SIM_CONFIG.scoring.steps.high) baselineChange -= SIM_CONFIG.simulation.weight.activeBonus;
    else if (inputs.workoutsPerWeek >= SIM_CONFIG.scoring.workouts.medium && inputs.stepsPerDay >= SIM_CONFIG.scoring.steps.medium) baselineChange -= SIM_CONFIG.simulation.weight.moderateBonus;

    const improvedChange = Math.max(SIM_CONFIG.simulation.weight.maxMonthlyImprovement, baselineChange - SIM_CONFIG.simulation.weight.activeBonus);

    for (let m = 0; m <= 12; m++) {
      weightBaseline.push(Number((inputs.weightKg + baselineChange * m).toFixed(1)));
      weightImproved.push(Number((inputs.weightKg + improvedChange * m).toFixed(1)));
    }
  } else {
    months.forEach(() => { weightBaseline.push(null); weightImproved.push(null); });
  }

  // Health Sim: HbA1c (Metabolic)
  if (isBody && inputs.hba1c > 0) {
      const junkSpend = inputs.eatingOutSpend + inputs.lateNightFoodSpend;
      const alcSpend = inputs.alcoholSpend;
      
      let baseSlope = 0;
      if (junkSpend > SIM_CONFIG.simulation.hba1c.junkSpendHigh) baseSlope += SIM_CONFIG.simulation.hba1c.slopes.junkHigh; 
      else if (junkSpend > SIM_CONFIG.simulation.hba1c.junkSpendMed) baseSlope += SIM_CONFIG.simulation.hba1c.slopes.junkMed; 
      
      if (alcSpend > SIM_CONFIG.simulation.hba1c.alcoholHigh) baseSlope += SIM_CONFIG.simulation.hba1c.slopes.alcHigh;

      if (inputs.stepsPerDay < SIM_CONFIG.simulation.hba1c.stepsSedentary) baseSlope += SIM_CONFIG.simulation.hba1c.slopes.sedentary; 
      
      // Improved
      let improvedSlope = baseSlope - 0.05; // Base improvement
      if (improvedSlope < -0.1) improvedSlope = -0.1;

      for (let m = 0; m <= 12; m++) {
          const baseVal = inputs.hba1c + (baseSlope * m);
          const impVal = inputs.hba1c + (improvedSlope * m);
          hba1cBaseline.push(Number(Math.min(SIM_CONFIG.simulation.hba1c.bounds.max, Math.max(SIM_CONFIG.simulation.hba1c.bounds.min, baseVal)).toFixed(2)));
          hba1cImproved.push(Number(Math.min(SIM_CONFIG.simulation.hba1c.bounds.max, Math.max(4.5, impVal)).toFixed(2))); 
      }
  } else {
      months.forEach(() => { hba1cBaseline.push(null); hba1cImproved.push(null); });
  }

  // Health Sim: Sleep & RHR
  if (isBody) {
     // Sleep Logic
     const currentSleep = inputs.averageSleep || 7;
     const targetSleep = 7.5;
     const sleepBaseDelta = (Math.random() * 0.2) - 0.1; // Fluctuation
     const sleepImpDelta = (targetSleep - currentSleep) / 6; // Reach target in 6 months

     // RHR Logic
     const currentRhr = inputs.restingHeartRate || 70;
     const rhrBaseSlope = inputs.workoutsPerWeek === 0 ? 0.2 : 0;
     const rhrImpSlope = -0.5; // Improve by 0.5bpm/mo with cardio

     for (let m = 0; m <= 12; m++) {
         // Sleep
         sleepBaseline.push(Number((currentSleep + (sleepBaseDelta * (m%3))).toFixed(1)));
         const sImp = currentSleep + (sleepImpDelta * Math.min(m, 6));
         sleepImproved.push(Number(sImp.toFixed(1)));

         // RHR
         rhrBaseline.push(Math.round(currentRhr + (rhrBaseSlope * m)));
         rhrImproved.push(Math.round(Math.max(48, currentRhr + (rhrImpSlope * m))));
     }
  } else {
      months.forEach(() => { 
          sleepBaseline.push(null); sleepImproved.push(null); 
          rhrBaseline.push(null); rhrImproved.push(null);
      });
  }

  // Health Sim: Meals Cost (for diabetic tracking)
  if (isBody) {
    // Current daily food cost estimate from spending data
    const dailyFoodCost = ((inputs.groceriesSpend || 0) + (inputs.eatingOutSpend || 0) + (inputs.lateNightFoodSpend || 0)) / 30;
    const currentMealsCost = dailyFoodCost > 0 ? dailyFoodCost : 25; // Default $25/day
    
    // Baseline: eating out increases costs over time (lifestyle creep)
    const mealsCostBaseSlope = 0.5; // $0.50 more per day each month
    // Improved: cooking more at home reduces costs
    const mealsCostImpSlope = -1.0; // Save $1/day each month by cooking
    
    for (let m = 0; m <= 12; m++) {
      const baseCost = currentMealsCost + (mealsCostBaseSlope * m);
      const impCost = Math.max(15, currentMealsCost + (mealsCostImpSlope * m)); // Min $15/day
      mealsCostBaseline.push(Math.round(baseCost));
      mealsCostImproved.push(Math.round(impCost));
    }
  } else {
    months.forEach(() => { mealsCostBaseline.push(null); mealsCostImproved.push(null); });
  }

  // Health Sim: Exercise (minutes per day)
  if (isBody) {
    // Current exercise estimate from workouts
    const workoutMinutesPerWeek = (inputs.workoutsPerWeek || 0) * 45; // 45 min per workout
    const stepsExerciseMinutes = Math.min(30, (inputs.stepsPerDay || 0) / 300); // ~300 steps = 1 min walking
    const currentExercise = Math.round((workoutMinutesPerWeek / 7) + stepsExerciseMinutes);
    const baseExercise = currentExercise > 0 ? currentExercise : 15; // Default 15 min/day
    
    // Baseline: sedentary lifestyle, exercise decreases slightly
    const exerciseBaseSlope = inputs.workoutsPerWeek === 0 ? -0.5 : 0;
    // Improved: gradual increase to target 45 min/day
    const targetExercise = 45;
    const exerciseImpSlope = (targetExercise - baseExercise) / 12;
    
    for (let m = 0; m <= 12; m++) {
      const baseMin = Math.max(5, baseExercise + (exerciseBaseSlope * m));
      const impMin = Math.min(60, baseExercise + (exerciseImpSlope * m));
      exerciseBaseline.push(Math.round(baseMin));
      exerciseImproved.push(Math.round(impMin));
    }
  } else {
    months.forEach(() => { exerciseBaseline.push(null); exerciseImproved.push(null); });
  }

  // Health Sim: LDL (Heart)
  if (isBody && inputs.ldlCholesterol > 0) {
      const badFatSpend = inputs.eatingOutSpend + inputs.lateNightFoodSpend;
      let baseSlope = 0;
      if (badFatSpend > 400) baseSlope += 1.5;
      
      const improvedSlope = baseSlope - 3.0; 

      for (let m = 0; m <= 12; m++) {
          const baseVal = inputs.ldlCholesterol + (baseSlope * m);
          const impVal = inputs.ldlCholesterol + (improvedSlope * m);
          ldlBaseline.push(Math.round(Math.max(40, baseVal)));
          ldlImproved.push(Math.round(Math.max(40, impVal))); 
      }
  } else {
      months.forEach(() => { ldlBaseline.push(null); ldlImproved.push(null); });
  }

  // Money Sim
  if (isMoney && inputs.monthlyIncome > 0) {
    const discretionaryTotal = inputs.lifestyleSpend + inputs.eatingOutSpend + inputs.alcoholSpend + inputs.lateNightFoodSpend + inputs.subscriptionSpend;
    const totalExpenses = inputs.fixedCosts + inputs.groceriesSpend + inputs.gymSpend + inputs.wellnessSpend + inputs.pharmacySpend + discretionaryTotal;
    
    const baselineSavingsPerMonth = inputs.monthlyIncome - totalExpenses;
    
    // Spending Categories
    const junkMonthly = inputs.eatingOutSpend + inputs.alcoholSpend + inputs.lateNightFoodSpend;
    const healthMonthly = inputs.groceriesSpend + inputs.gymSpend + inputs.wellnessSpend + inputs.pharmacySpend;

    // Improvement logic
    const badHabitSavings = (inputs.eatingOutSpend * 0.5) + (inputs.alcoholSpend * 0.5) + (inputs.lateNightFoodSpend * 0.8) + (inputs.subscriptionSpend * 0.5);
    const generalCut = discretionaryTotal * 0.1;
    const totalCut = Math.max(generalCut, badHabitSavings);

    const improvedSavingsPerMonth = baselineSavingsPerMonth + totalCut;

    // Debt
    const monthlyRate = (inputs.debtInterestRate || 0) / 100 / 12;
    let currentDebtBase = inputs.totalDebt || 0;
    let currentDebtImp = inputs.totalDebt || 0;

    for (let m = 0; m <= 12; m++) {
      // Savings
      const svBase = inputs.currentSavings + baselineSavingsPerMonth * m;
      savingsBaseline.push(Math.round(svBase));
      const svImp = inputs.currentSavings + improvedSavingsPerMonth * m;
      savingsImproved.push(Math.round(svImp));

      // Debt
      if (baselineSavingsPerMonth < 0 && m > 0) currentDebtBase += Math.abs(baselineSavingsPerMonth);
      if (currentDebtBase > 0) currentDebtBase *= (1 + monthlyRate);

      if (currentDebtImp > 0 && totalCut > 0 && m > 0) currentDebtImp = Math.max(0, currentDebtImp - totalCut); 
      if (currentDebtImp > 0) currentDebtImp *= (1 + monthlyRate);

      const netWorthBase = svBase - currentDebtBase;
      const accumulatedImprovement = totalCut * m;
      netWorthBaseline.push(Math.round(netWorthBase));
      netWorthImproved.push(Math.round(netWorthBase + accumulatedImprovement + (accumulatedImprovement * 0.05))); 

      // Spending Projections
      junkSpendBaseline.push(junkMonthly);
      junkSpendImproved.push(Math.round(junkMonthly * 0.5)); // 50% cut target
      
      healthSpendBaseline.push(healthMonthly);
      // Health spend INCREASES in the improved model (shifting budget to good food/gym)
      healthSpendImproved.push(Math.round(healthMonthly + (junkMonthly * 0.2))); 
    }
  } else {
    months.forEach(() => { 
        savingsBaseline.push(null); savingsImproved.push(null); 
        netWorthBaseline.push(null); netWorthImproved.push(null);
        junkSpendBaseline.push(null); junkSpendImproved.push(null);
        healthSpendBaseline.push(null); healthSpendImproved.push(null);
    });
  }

  // --- Patterns & Trends & Insights ---
  const patterns: SimulationResult['patterns'] = [];
  const healthTrends: MetricTrend[] = [];
  const moneyTrends: MetricTrend[] = [];
  const healthInsights: Insight[] = [];
  const financialInsights: Insight[] = [];

  // 1. Health Trends & Insights
  if (isBody) {
      // Weight
      if (inputs.previousWeightKg > 0 && inputs.weightKg > 0) {
          const diff = inputs.weightKg - inputs.previousWeightKg;
          healthTrends.push({
              label: 'Weight',
              value: inputs.weightKg,
              unit: 'kg',
              status: diff <= SIM_CONFIG.reporting.trends.weightDiff ? 'improving' : 'worsening',
              diff: diff === 0 ? 'Stable' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}kg`
          });
      }

      // BP
      if (inputs.bloodPressureSys > 0) {
          const isHigh = inputs.bloodPressureSys > SIM_CONFIG.reporting.trends.bpHighSys || inputs.bloodPressureDia > SIM_CONFIG.reporting.trends.bpHighDia;
          const isWarning = inputs.bloodPressureSys > SIM_CONFIG.reporting.trends.bpWarnSys || inputs.bloodPressureDia > SIM_CONFIG.reporting.trends.bpWarnDia;
          
          healthTrends.push({
              label: 'Blood Pressure',
              value: `${inputs.bloodPressureSys}/${inputs.bloodPressureDia}`,
              unit: 'mmHg',
              status: isHigh ? 'worsening' : 'stable',
              diff: isHigh ? 'Elevated' : 'Normal'
          });

          if (isWarning) {
              healthInsights.push({
                  title: "High Blood Pressure detected",
                  description: "Systolic over 140 or Diastolic over 90 suggests increased load on your heart.",
                  level: 'warning',
                  category: 'Heart'
              });
          } else if (isHigh) {
              healthInsights.push({
                  title: "Elevated Blood Pressure",
                  description: "Levels are slightly above optimal. Monitor sodium and stress.",
                  level: 'caution',
                  category: 'Heart'
              });
          }
      }

      // Glucose / HbA1c
      if (inputs.hba1c > 0) {
           healthTrends.push({
              label: 'HbA1c',
              value: inputs.hba1c,
              unit: '%',
              status: inputs.hba1c < SIM_CONFIG.reporting.trends.hba1cCaution ? 'stable' : 'worsening',
              diff: inputs.hba1c < SIM_CONFIG.reporting.trends.hba1cCaution ? 'Normal' : 'Elevated'
          });

          if (inputs.hba1c >= SIM_CONFIG.reporting.trends.hba1cWarn) {
               healthInsights.push({
                  title: "Blood Sugar Warning",
                  description: "HbA1c level suggests significant insulin resistance.",
                  level: 'warning',
                  category: 'Metabolic'
              });
          } else if (inputs.hba1c >= SIM_CONFIG.reporting.trends.hba1cCaution) {
              healthInsights.push({
                  title: "Metabolic Risk",
                  description: "You are in a range often associated with pre-diabetes.",
                  level: 'caution',
                  category: 'Metabolic'
              });
          }
      }

      // LDL
      if (inputs.ldlCholesterol > 0) {
           healthTrends.push({
              label: 'LDL Chol.',
              value: inputs.ldlCholesterol,
              unit: 'mg/dL',
              status: inputs.ldlCholesterol < SIM_CONFIG.reporting.trends.ldlCaution ? 'improving' : 'worsening',
              diff: inputs.ldlCholesterol < SIM_CONFIG.reporting.trends.ldlCaution ? 'Optimal' : 'Needs Action'
          });

          if (inputs.ldlCholesterol > SIM_CONFIG.reporting.trends.ldlWarn) {
              healthInsights.push({
                  title: "High Cholesterol",
                  description: "LDL is significantly high, a key risk factor for arteries.",
                  level: 'warning',
                  category: 'Heart'
              });
          } else if (inputs.ldlCholesterol > SIM_CONFIG.reporting.trends.ldlCaution) {
              healthInsights.push({
                  title: "Cholesterol Watch",
                  description: "LDL is above optimal levels. Consider dietary fats.",
                  level: 'caution',
                  category: 'Heart'
              });
          }
      }

      // New Lab Markers Trends
      if (inputs.hdlCholesterol > 0) {
           healthTrends.push({
              label: 'HDL Chol.',
              value: inputs.hdlCholesterol,
              unit: 'mg/dL',
              status: inputs.hdlCholesterol > SIM_CONFIG.reporting.trends.hdlGood ? 'improving' : inputs.hdlCholesterol < SIM_CONFIG.reporting.trends.hdlBad ? 'worsening' : 'stable',
              diff: inputs.hdlCholesterol > SIM_CONFIG.reporting.trends.hdlGood ? 'Good' : 'Low'
          });
      }

      if (inputs.triglycerides > 0) {
           healthTrends.push({
              label: 'Triglycerides',
              value: inputs.triglycerides,
              unit: 'mg/dL',
              status: inputs.triglycerides < SIM_CONFIG.reporting.trends.trigGood ? 'stable' : 'worsening',
              diff: inputs.triglycerides < SIM_CONFIG.reporting.trends.trigGood ? 'Normal' : 'High'
          });
          
          if (inputs.triglycerides > SIM_CONFIG.reporting.trends.trigWarn) {
               healthInsights.push({
                  title: "High Triglycerides",
                  description: "Linked to sugar/alcohol intake. Can harden arteries.",
                  level: 'warning',
                  category: 'Metabolic'
              });
          }
      }

      if (inputs.alt > 0) {
           healthTrends.push({
              label: 'ALT (Liver)',
              value: inputs.alt,
              unit: 'u/L',
              status: inputs.alt < SIM_CONFIG.reporting.trends.altGood ? 'stable' : 'worsening',
              diff: inputs.alt < SIM_CONFIG.reporting.trends.altGood ? 'Normal' : 'High'
          });
          
          if (inputs.alt > SIM_CONFIG.reporting.trends.altWarn && inputs.alcoholSpend > SIM_CONFIG.reporting.trends.alcoholTrigger) {
               healthInsights.push({
                  title: "Liver Stress Detected",
                  description: "Elevated ALT combined with regular alcohol spend suggests liver strain.",
                  level: 'warning',
                  category: 'Liver'
              });
          }
      }
      
      if (inputs.creatinine > 0) {
           healthTrends.push({
              label: 'Creatinine',
              value: inputs.creatinine,
              unit: 'mg/dL',
              status: inputs.creatinine < SIM_CONFIG.reporting.trends.creatinineGood ? 'stable' : 'worsening',
              diff: inputs.creatinine < SIM_CONFIG.reporting.trends.creatinineGood ? 'Normal' : 'High'
          });
      }

      // Kidney eGFR
      if (inputs.eGFR > 0) {
          healthTrends.push({
              label: 'eGFR',
              value: inputs.eGFR,
              unit: '',
              status: inputs.eGFR > SIM_CONFIG.reporting.trends.eGFRGood ? 'stable' : 'worsening',
              diff: 'Kidney Func'
          });
          if (inputs.eGFR < SIM_CONFIG.reporting.trends.eGFRBad) {
               healthInsights.push({
                  title: "Kidney Function Alert",
                  description: "eGFR below 60 may indicate reduced kidney filtration.",
                  level: 'warning',
                  category: 'Renal'
              });
          }
      }
      
      // Heart Rate
      if (inputs.restingHeartRate > 0) {
           healthTrends.push({
              label: 'Resting HR',
              value: inputs.restingHeartRate,
              unit: 'bpm',
              status: inputs.restingHeartRate < SIM_CONFIG.reporting.trends.hrGood ? 'improving' : 'stable',
              diff: 'Last 7 days'
          });
      }

      // General Lifestyle Risks
      if (inputs.averageSleep > 0 && inputs.averageSleep < SIM_CONFIG.reporting.trends.sleepPoor) {
          healthInsights.push({
              title: "Sleep Deprivation",
              description: "Consistently getting <6 hours impacts recovery and metabolism.",
              level: 'warning',
              category: 'Lifestyle'
          });
      }
  }

  // 2. Money Trends & Insights
  if (isMoney) {
      const allDiscretionary = inputs.eatingOutSpend + inputs.alcoholSpend + inputs.lateNightFoodSpend + inputs.lifestyleSpend;
      const totalSpend = inputs.fixedCosts + allDiscretionary + inputs.groceriesSpend + inputs.gymSpend + inputs.wellnessSpend + inputs.pharmacySpend + inputs.subscriptionSpend;
      
      const savingsRate = inputs.monthlyIncome > 0 ? ((inputs.monthlyIncome - totalSpend) / inputs.monthlyIncome) * 100 : 0;
      
      moneyTrends.push({
          label: 'Savings Rate',
          value: savingsRate.toFixed(1),
          unit: '%',
          status: savingsRate > SIM_CONFIG.reporting.money.savingsRateHigh ? 'improving' : savingsRate > SIM_CONFIG.reporting.money.savingsRateMed ? 'stable' : 'worsening',
          diff: 'Monthly Avg'
      });

      const runway = totalSpend > 0 ? (inputs.currentSavings / totalSpend).toFixed(1) : '0';
      moneyTrends.push({
          label: 'Runway',
          value: runway,
          unit: 'Months',
          status: Number(runway) > SIM_CONFIG.reporting.money.runwaySafe ? 'stable' : 'worsening',
          diff: 'Emergency Fund'
      });

      if (inputs.eatingOutSpend > 0) {
          moneyTrends.push({
              label: 'Eating Out',
              value: inputs.eatingOutSpend,
              unit: '$',
              status: inputs.eatingOutSpend > SIM_CONFIG.reporting.money.eatingOutHigh ? 'worsening' : 'stable',
              diff: inputs.eatingOutSpend > SIM_CONFIG.reporting.money.eatingOutHigh ? 'High' : 'Normal'
          });
      }
      
      // Financial Insights Engine
      
      // 1. Liquidity Risk
      if (Number(runway) < SIM_CONFIG.reporting.money.runwayCritical) {
          financialInsights.push({
              title: "Critical Liquidity Risk",
              description: "You have less than 1 month of expenses saved. High vulnerability to income loss.",
              level: 'warning',
              category: 'Safety'
          });
      } else if (Number(runway) < SIM_CONFIG.reporting.money.runwaySafe) {
          financialInsights.push({
              title: "Low Runway",
              description: "Emergency fund covers less than 3 months. Recommended target is 3-6 months.",
              level: 'caution',
              category: 'Safety'
          });
      }

      // 2. Overhead Risk
      if (inputs.monthlyIncome > 0) {
          const fixedRatio = inputs.fixedCosts / inputs.monthlyIncome;
          if (fixedRatio > SIM_CONFIG.reporting.money.fixedOverheadRatio) {
              financialInsights.push({
                  title: "High Fixed Overhead",
                  description: `Fixed costs consume ${Math.round(fixedRatio * 100)}% of income, leaving little room for savings or shocks.`,
                  level: 'warning',
                  category: 'Budget'
              });
          }
      }

      // 3. Debt Risk
      if (inputs.totalDebt > 0 && inputs.monthlyIncome > 0) {
          const debtRatio = inputs.totalDebt / inputs.monthlyIncome;
          if (debtRatio > SIM_CONFIG.reporting.money.debtIncomeRatio) {
               financialInsights.push({
                  title: "High Debt Load",
                  description: "Total debt exceeds 3x monthly income.",
                  level: 'warning',
                  category: 'Debt'
              });
          }
          if (inputs.debtInterestRate > SIM_CONFIG.reporting.money.debtInterestHigh) {
               financialInsights.push({
                  title: "High Interest Debt",
                  description: `Paying ${inputs.debtInterestRate}% APR is actively eroding your future wealth.`,
                  level: 'caution',
                  category: 'Debt'
              });
          }
      }

      // 4. Lifestyle Creep
      const lifestyleRatio = allDiscretionary / inputs.monthlyIncome;
      if (lifestyleRatio > SIM_CONFIG.reporting.money.lifestyleRatio) {
           financialInsights.push({
                  title: "High Discretionary Spend",
                  description: "Over 30% of income goes to non-essentials. This is the easiest lever to pull for savings.",
                  level: 'info',
                  category: 'Spending'
              });
      }
  }

  // Cross-Domain Recommendation
  const recommendations: Recommendation[] = [];

  const badFoodSpend = (inputs.eatingOutSpend || 0) + (inputs.lateNightFoodSpend || 0);

  if (isMoney && isBody && badFoodSpend > 150) {
      recommendations.push({
          title: "Swap take-out for home cooking",
          impactHealth: "Controls glucose & sodium",
          impactMoney: `Saves approx $${Math.round(badFoodSpend * 0.6)}/mo`
      });
  }
  
  if (isMoney && isBody && (inputs.alcoholSpend || 0) > 80) {
       recommendations.push({
          title: "Limit alcohol to weekends",
          impactHealth: "Improves sleep & liver health",
          impactMoney: `Saves approx $${Math.round(inputs.alcoholSpend * 0.5)}/mo`
      });
  }

  if (isBody && inputs.weightKg > 0 && inputs.stepsPerDay < SIM_CONFIG.scoring.steps.high) {
        recommendations.push({
            title: "Increase daily steps to 8,000+",
            impactHealth: "Shifts weight trend by ~0.3kg/month",
            impactMoney: null
        });
  }

  if (isMoney && inputs.monthlyIncome > 0) {
      const savingsDiff = (savingsImproved[12] || 0) - (savingsBaseline[12] || 0);
      if (savingsDiff > 500) {
           recommendations.push({
            title: "Apply Smart Spending Cuts",
            impactHealth: null,
            impactMoney: `Adds +$${savingsDiff.toLocaleString()} to yearly savings`
        });
      }
  }

  return {
    scores: {
      bodyTwin: bodyScore,
      moneyTwin: moneyScore,
      lifeTwin: lifeScore,
    },
    forecast: {
      months,
      weightBaseline,
      weightImproved,
      savingsBaseline,
      savingsImproved,
      netWorthBaseline,
      netWorthImproved,
      hba1cBaseline,
      hba1cImproved,
      ldlBaseline,
      ldlImproved,
      sleepBaseline,
      sleepImproved,
      rhrBaseline,
      rhrImproved,
      mealsCostBaseline,
      mealsCostImproved,
      exerciseBaseline,
      exerciseImproved,
      junkSpendBaseline,
      junkSpendImproved,
      healthSpendBaseline,
      healthSpendImproved
    },
    recommendations: recommendations.slice(0, 4),
    patterns,
    healthTrends,
    moneyTrends,
    healthInsights,
    financialInsights
  };
};