import type { Antagonist } from '../../state/types';

export const ANTAGONIST_DEFINITIONS: Record<string, Antagonist> = {
  sterling_cross: {
    id: 'sterling_cross',
    name: 'Sterling Cross',
    role: 'Corporate Developer',
    activationCondition: 'player_reclaims_vacant_land',
    escalationLevel: 0,
    escalationInterval: 4,
    active: false,
    lastEscalationTurn: 0,
    tileTargets: [],
  },
  senator_voss: {
    id: 'senator_voss',
    name: 'Senator Voss',
    role: 'State-Level Politician',
    activationCondition: 'community_trust_exceeds_55',
    escalationLevel: 0,
    escalationInterval: 3,
    active: false,
    lastEscalationTurn: 0,
    tileTargets: [],
  },
  marcus_webb: {
    id: 'marcus_webb',
    name: 'Marcus Webb',
    role: 'Media Figure',
    activationCondition: 'turn_1',
    escalationLevel: 0,
    // Marcus does NOT use the generic interval timer — his arc is driven by
    // evaluateMarcusPhaseTransition() in marcus-arc.ts. We give him a nonzero
    // sentinel interval (per phase) so any legacy interval check stays sane,
    // but the phase state machine is what actually governs his behavior.
    escalationInterval: 1,
    active: false,
    lastEscalationTurn: 0,
    // Marcus's childhood neighborhood (motivation layer, spec 4.6). North End is
    // a high-vacancy east-side tile led by Tamika Jefferson; when it falls into
    // distress (eco < 30% or vacancy > 50%) his Phase 2+ events reveal that he
    // grew up there and offer the player a chance to address it directly.
    tileTargets: ['north_end'],
    // --- Flat arc fields (canonical for the marcus-arc.ts system) ---
    arcPhase: 1,
    responseHistory: [],
    phaseEventCount: 0,
    motivationRevealed: false,
    // --- Legacy sub-object (kept in sync; consumed by events.ts builders) ---
    arcState: {
      phase: 1,
      phaseEventsFired: 0,
      confrontations: 0,
      ignores: 0,
      coOpted: false,
      resolutionType: null,
      sterlingConnectionRevealed: false,
    },
  },
  amanda_chen: {
    id: 'amanda_chen',
    name: 'Amanda Chen',
    role: 'Green Capitalist',
    activationCondition: 'stage_transition',
    escalationLevel: 0,
    escalationInterval: 4,
    active: false,
    lastEscalationTurn: 0,
    tileTargets: [],
  },
};
