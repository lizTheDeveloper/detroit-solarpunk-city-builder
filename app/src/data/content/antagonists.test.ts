import { describe, it, expect } from 'vitest';
import { ANTAGONIST_DEFINITIONS } from './antagonists';

describe('ANTAGONIST_DEFINITIONS', () => {
  it('contains exactly 4 antagonists', () => {
    expect(Object.keys(ANTAGONIST_DEFINITIONS)).toHaveLength(4);
  });

  it('has all 4 antagonists by key', () => {
    const expectedKeys = [
      'sterling_cross',
      'senator_voss',
      'marcus_webb',
      'amanda_chen',
    ];
    for (const key of expectedKeys) {
      expect(ANTAGONIST_DEFINITIONS).toHaveProperty(key);
    }
  });

  it('every antagonist has required fields', () => {
    for (const antagonist of Object.values(ANTAGONIST_DEFINITIONS)) {
      expect(antagonist.id).toBeTruthy();
      expect(antagonist.name).toBeTruthy();
      expect(antagonist.role).toBeTruthy();
      expect(typeof antagonist.activationCondition).toBe('string');
      expect(typeof antagonist.escalationLevel).toBe('number');
      expect(typeof antagonist.escalationInterval).toBe('number');
      expect(typeof antagonist.active).toBe('boolean');
      expect(typeof antagonist.lastEscalationTurn).toBe('number');
      expect(Array.isArray(antagonist.tileTargets)).toBe(true);
    }
  });

  it('every antagonist id matches its key', () => {
    for (const [key, antagonist] of Object.entries(ANTAGONIST_DEFINITIONS)) {
      expect(antagonist.id).toBe(key);
    }
  });

  it('all antagonists start at escalationLevel 0', () => {
    for (const antagonist of Object.values(ANTAGONIST_DEFINITIONS)) {
      expect(antagonist.escalationLevel).toBe(0);
    }
  });

  it('all antagonists start with lastEscalationTurn 0', () => {
    for (const antagonist of Object.values(ANTAGONIST_DEFINITIONS)) {
      expect(antagonist.lastEscalationTurn).toBe(0);
    }
  });

  describe('Sterling Cross', () => {
    const a = () => ANTAGONIST_DEFINITIONS.sterling_cross;

    it('has correct id and name', () => {
      expect(a().id).toBe('sterling_cross');
      expect(a().name).toBe('Sterling Cross');
    });

    it('has role Corporate Developer', () => {
      expect(a().role).toBe('Corporate Developer');
    });

    it('activates when player reclaims vacant land', () => {
      expect(a().activationCondition).toBe('player_reclaims_vacant_land');
    });

    it('has escalationInterval 4', () => {
      expect(a().escalationInterval).toBe(4);
    });

    it('starts inactive', () => {
      expect(a().active).toBe(false);
    });
  });

  describe('Senator Voss', () => {
    const a = () => ANTAGONIST_DEFINITIONS.senator_voss;

    it('has correct id and name', () => {
      expect(a().id).toBe('senator_voss');
      expect(a().name).toBe('Senator Voss');
    });

    it('has role State-Level Politician', () => {
      expect(a().role).toBe('State-Level Politician');
    });

    it('activates when community trust exceeds 55', () => {
      expect(a().activationCondition).toBe('community_trust_exceeds_55');
    });

    it('has escalationInterval 3', () => {
      expect(a().escalationInterval).toBe(3);
    });

    it('starts inactive', () => {
      expect(a().active).toBe(false);
    });
  });

  describe('Marcus Webb', () => {
    const a = () => ANTAGONIST_DEFINITIONS.marcus_webb;

    it('has correct id and name', () => {
      expect(a().id).toBe('marcus_webb');
      expect(a().name).toBe('Marcus Webb');
    });

    it('has role Media Figure', () => {
      expect(a().role).toBe('Media Figure');
    });

    it('activates on turn 1', () => {
      expect(a().activationCondition).toBe('turn_1');
    });

    it('no longer uses escalationInterval 0 (arc is phase-driven, not interval-driven)', () => {
      // Marcus's behavior is governed by the phase state machine in marcus-arc.ts,
      // not the generic interval timer. The old escalationInterval: 0 (which made
      // him fire the identical event every turn) has been removed.
      expect(a().escalationInterval).not.toBe(0);
    });

    it('starts inactive (activated by game logic on turn 1)', () => {
      expect(a().active).toBe(false);
    });

    it('starts in arc Phase 1 (Gadfly)', () => {
      expect(a().arcPhase).toBe(1);
    });

    it('starts with an empty response history', () => {
      expect(a().responseHistory).toEqual([]);
    });

    it('starts with phaseEventCount 0', () => {
      expect(a().phaseEventCount).toBe(0);
    });

    it('starts with motivationRevealed false', () => {
      expect(a().motivationRevealed).toBe(false);
    });
  });

  describe('Amanda Chen', () => {
    const a = () => ANTAGONIST_DEFINITIONS.amanda_chen;

    it('has correct id and name', () => {
      expect(a().id).toBe('amanda_chen');
      expect(a().name).toBe('Amanda Chen');
    });

    it('has role Green Capitalist', () => {
      expect(a().role).toBe('Green Capitalist');
    });

    it('activates on stage transition', () => {
      expect(a().activationCondition).toBe('stage_transition');
    });

    it('has escalationInterval 4', () => {
      expect(a().escalationInterval).toBe(4);
    });

    it('starts inactive', () => {
      expect(a().active).toBe(false);
    });
  });
});
