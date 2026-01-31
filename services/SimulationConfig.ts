export const SIM_CONFIG = {
  // --- SCORING RULES (0-100) ---
  scoring: {
    baseScore: 50,
    bmi: {
      underweight: 18.5,
      normal: 24.9,
      overweight: 29.9,
      points: { normal: 15, overweight: 5, obese: -10 }
    },
    steps: {
      high: 8000,
      medium: 5000,
      points: { high: 10, medium: 5, low: -5 }
    },
    workouts: {
      high: 3,
      medium: 1,
      points: { high: 10, medium: 5, none: -10 }
    },
    heartRate: {
      athlete: 60,
      normal: 75,
      poor: 90,
      points: { athlete: 10, normal: 5, poor: -10 }
    },
    bloodPressure: {
      systolicNormal: 120,
      diastolicNormal: 80,
      systolicHigh: 140,
      diastolicHigh: 90,
      points: { optimal: 5, high: -15 }
    },
    labs: {
      hba1c: { normal: 5.7, high: 6.4, points: { normal: 5, high: -10 } },
      ldl: { optimal: 100, high: 160, points: { optimal: 5, high: -10 } },
      eGFR: { healthy: 90, low: 60, points: { healthy: 5, low: -15 } }
    },
    sleep: {
      min: 7,
      max: 9,
      poor: 6,
      points: { good: 5, poor: -5 }
    },
    savingsRate: {
      high: 0.20,
      medium: 0.10,
      points: { high: 20, medium: 10, positive: 0, negative: -20 }
    },
    runway: {
      safe: 6,
      warning: 3,
      danger: 1,
      points: { safe: 15, warning: 5, danger: 0, critical: -10 }
    },
    debt: {
      criticalRatio: 3, // Debt > 3x Income
      warningRatio: 1,
      points: { critical: -15, warning: -5 }
    },
    spending: {
      badHabitsThreshold: 400,
      subsThreshold: 100,
      points: { badHabits: -15, subs: -5 }
    }
  },

  // --- SIMULATION PHYSICS ---
  simulation: {
    durationMonths: 12, // +1 for index 0
    weight: {
      baseMonthlyChange: 0.3,
      badFoodSpendThreshold: 400,
      badFoodPenalty: 0.2,
      activeBonus: 0.6, // Workouts >= 3 & Steps >= 8k
      moderateBonus: 0.3,
      maxMonthlyImprovement: -0.8
    },
    hba1c: {
      junkSpendHigh: 600,
      junkSpendMed: 300,
      junkSpendLow: 100,
      alcoholHigh: 200,
      alcoholMed: 100,
      stepsSedentary: 3000,
      stepsActive: 8000,
      stepsAthlete: 10000,
      workoutsNone: 0,
      workoutsHigh: 4,
      sleepPoor: 6,
      slopes: {
        junkHigh: 0.04, junkMed: 0.02, junkLow: -0.01,
        alcHigh: 0.02, alcMed: 0.01,
        sedentary: 0.02, active: -0.02, athlete: -0.03,
        noGym: 0.01, highGym: -0.02,
        poorSleep: 0.01
      },
      improvement: {
        junkCut: 300,
        stepsCut: 5000,
        slopes: { junkHigh: -0.04, junkMed: -0.02, sedentary: -0.03, active: -0.01 },
        maxDrop: -0.15
      },
      bounds: { min: 4.0, max: 14.0 }
    },
    ldl: {
      badFatHigh: 400,
      badFatMed: 200,
      badFatLow: 100,
      alcoholHigh: 150,
      workoutsHigh: 4,
      workoutsMed: 2,
      bmiObese: 30,
      slopes: {
        badFatHigh: 1.5, badFatMed: 0.5, badFatLow: -0.5,
        alcohol: 0.5,
        gymHigh: -1.0, gymMed: -0.5, gymNone: 0.5,
        obese: 0.5
      },
      improvedCardioImpact: 3.0,
      maxDrop: -4.0,
      bounds: { baselineMin: 40, improvedMin: 60 }
    },
    money: {
      reductionFactors: {
        eatingOut: 0.5,
        alcohol: 0.5,
        lateNight: 0.8,
        subscriptions: 0.5,
        generalDiscretionary: 0.1
      },
      investmentMultiplier: 0.05 // 5% extra return on saved cuts
    }
  },

  // --- REPORTING THRESHOLDS ---
  reporting: {
    trends: {
      weightDiff: 0,
      bpHighSys: 130, bpHighDia: 85,
      bpWarnSys: 140, bpWarnDia: 90,
      hba1cWarn: 6.5, hba1cCaution: 5.7,
      ldlWarn: 160, ldlCaution: 100,
      hdlGood: 60, hdlBad: 40,
      trigGood: 150, trigWarn: 200,
      altGood: 40, altWarn: 50, alcoholTrigger: 100,
      creatinineGood: 1.2,
      eGFRGood: 90, eGFRBad: 60,
      hrGood: 70,
      sleepPoor: 6
    },
    money: {
      savingsRateHigh: 15, savingsRateMed: 5,
      runwaySafe: 3, runwayCritical: 1,
      eatingOutHigh: 300,
      fixedOverheadRatio: 0.6,
      debtIncomeRatio: 3,
      debtInterestHigh: 10,
      lifestyleRatio: 0.3
    }
  }
};