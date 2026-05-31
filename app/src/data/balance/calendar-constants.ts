export const CALENDAR_CONSTANTS = {
  TOTAL_SLOTS: 60,
  BASE_FIXED_SLOTS: 38,
  MIN_FIXED_SLOTS: 15,
  OVERSCHEDULE_LIMIT: 5,
  BURNOUT_BUFFER_START: 15,
  BURNOUT_BUFFER_MAX: 20,
  OVERSCHEDULE_NEXT_MONTH_PENALTY: 2,
  REST_DAY_BUFFER_GAIN: 3,
  MENTOR_MEETING_BUFFER_GAIN: 3,
  NO_RECOVERY_PASSIVE_DRAIN: 2,
  HEAVY_CRISIS_BUFFER_DRAIN: 1,
  HEAVY_CRISIS_THRESHOLD: 4,
  // Election equity calculation tuning
  neglectThreshold: 0.05,
  neglectPenalty: 0.05,
  equitableDistributionBonus: 0.1,
  // Burnout "forgotten commitment" penalties
  forgottenTrustPenalty: 10,
  bufferDrainForgotten: 2,
} as const;
