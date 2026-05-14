// All tunable calendar system parameters in one place

export const CALENDAR_CONSTANTS = {
  // Slot budget
  totalSlots: 60,
  baseFixedSlots: 38,
  baseDiscretionary: 22,
  overscheduleLimit: 5,
  overschedulePenaltyNextMonth: 2,

  // Burnout buffer
  burnoutBufferMax: 20,
  burnoutBufferStart: 15,
  bufferFromRest: 3,
  bufferFromMentor: 3,
  bufferFromCelebration: 2,
  bufferFromSupport: 1,
  bufferDrainNoRest: 2,
  bufferDrainForgotten: 3,

  // Burnout state thresholds (% of max buffer)
  overextendedThreshold: 0.5,    // below 50% → overextended
  burnoutThreshold: 0.2,         // below 20% → burnout
  recoveryToSustainable: 0.6,    // above 60% for 1 month → sustainable
  recoveryToOverextended: 0.5,   // above 50% for 2 months → overextended

  // Effectiveness modifiers per state
  effectivenessModifiers: {
    sustainable: 1.0,
    overextended: 0.8,
    burnout: 0.5,
    collapse: 0.0,
  } as Record<string, number>,

  // Diminishing returns formula
  // yield = log10(baseMultiplier / meetingCount^2) * depthFactor
  depthFactors: {
    neutral: 0.5,
    supporter: 0.7,
    trusted: 0.85,
    champion: 1.0,
    partner: 1.5,
  } as Record<string, number>,

  // Relationship decay (trust lost per month past threshold)
  decayRates: {
    innerCircle: { frequency: 1, decayPerMonth: 8 },
    keyAlly: { frequency: 2, decayPerMonth: 5 },
    activeNetwork: { frequency: 3, decayPerMonth: 3 },
    knownContact: { frequency: 6, decayPerMonth: 2 },
  },

  // Delegation tiers
  delegation: {
    0: { fixedReduction: 0, managementCost: 0, budgetCost: 0 },
    1: { fixedReduction: 6, managementCost: 2, budgetCost: 50000 },
    2: { fixedReduction: 12, managementCost: 3, budgetCost: 80000 },
    3: { fixedReduction: 20, managementCost: 0, budgetCost: 0 },
    4: { fixedReduction: 23, managementCost: 0, budgetCost: 0 },
  } as Record<number, { fixedReduction: number; managementCost: number; budgetCost: number }>,

  // Forgotten commitments
  forgottenTrustPenalty: 8,
  forgottenMinInteractions: 4, // must have 4+ scheduled to forget one

  // Strategic contacts
  introductionCooldownMonths: 2,
  followUpWindowMonths: 2,
  deepeningInterval: 3,
  deepeningYieldBonus: 0.25,

  // Election weights
  electionCalendarWeight: 0.3,
  electionMeterWeight: 0.5,
  electionNarrativeWeight: 0.2,
  equitableDistributionBonus: 0.05,
  neglectPenalty: 0.15,
  neglectThreshold: 0.05, // less than 5% of total time
} as const;
