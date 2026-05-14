import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame } from './create-game';
import type { GameState } from './types';

describe('createNewGame', () => {
  let state: GameState;

  beforeEach(() => {
    state = createNewGame();
  });

  describe('top-level fields', () => {
    it('returns version 2', () => {
      expect(state.version).toBe(2);
    });

    it('starts at turn 1', () => {
      expect(state.turn).toBe(1);
    });

    it('starts in spring', () => {
      expect(state.season).toBe('spring');
    });

    it('starts in year 1', () => {
      expect(state.year).toBe(1);
    });

    it('starts in player-actions phase', () => {
      expect(state.phase).toBe('player-actions');
    });

    it('starts in awakening stage', () => {
      expect(state.stage).toBe('awakening');
    });

    it('starts with null path', () => {
      expect(state.path).toBeNull();
    });

    it('starts with maxConcurrentProjects = floor(2 + 50/25) = 4', () => {
      expect(state.maxConcurrentProjects).toBe(4);
    });

    it('starts with empty activeProposals', () => {
      expect(state.activeProposals).toEqual([]);
    });

    it('starts with empty pendingProposals', () => {
      expect(state.pendingProposals).toEqual([]);
    });

    it('starts with null turnSummary', () => {
      expect(state.turnSummary).toBeNull();
    });

    it('starts with empty turnHistory', () => {
      expect(state.turnHistory).toEqual([]);
    });
  });

  describe('meters', () => {
    it('communityTrust starts at 50', () => {
      expect(state.meters.communityTrust).toBe(50);
    });

    it('ecologicalHealth starts at 20', () => {
      expect(state.meters.ecologicalHealth).toBe(20);
    });

    it('foodSovereignty starts at 12', () => {
      expect(state.meters.foodSovereignty).toBe(12);
    });

    it('politicalWill starts at 25', () => {
      expect(state.meters.politicalWill).toBe(25);
    });

    it('budget starts at 1.5', () => {
      expect(state.meters.budget).toBe(1.5);
    });

    it('climatePressure starts at 30', () => {
      expect(state.meters.climatePressure).toBe(30);
    });
  });

  describe('starter tiles', () => {
    it('has 19 tiles (8 original + 11 expansion)', () => {
      expect(Object.keys(state.tiles)).toHaveLength(19);
    });

    it('has brightmoor, corktown, eastern_market', () => {
      expect(state.tiles).toHaveProperty('brightmoor');
      expect(state.tiles).toHaveProperty('corktown');
      expect(state.tiles).toHaveProperty('eastern_market');
    });

    describe('Brightmoor', () => {
      it('has correct base properties', () => {
        const tile = state.tiles['brightmoor'];
        expect(tile.id).toBe('brightmoor');
        expect(tile.name).toBe('Brightmoor');
        expect(tile.terrain).toBe('vacant');
        expect(tile.vacancyRate).toBe(70);
        expect(tile.ecologicalHealth).toBe(8);
        expect(tile.contamination).toBe(20);
        expect(tile.gentrificationPressure).toBe(0);
      });

      it('has correct existingUses', () => {
        expect(state.tiles['brightmoor'].existingUses).toEqual(['vacant_lot']);
      });

      it('has correct neighborhoodTraits', () => {
        expect(state.tiles['brightmoor'].neighborhoodTraits).toEqual([
          'high_vacancy',
          'strong_community_networks',
        ]);
      });

      it('is adjacent to grandmont_rosedale, rouge_park, warrendale', () => {
        expect(state.tiles['brightmoor'].adjacentTileIds).toContain('grandmont_rosedale');
        expect(state.tiles['brightmoor'].adjacentTileIds).toContain('rouge_park');
        expect(state.tiles['brightmoor'].adjacentTileIds).toContain('warrendale');
      });

      it('starts with empty projects', () => {
        expect(state.tiles['brightmoor'].activeProjects).toEqual([]);
        expect(state.tiles['brightmoor'].completedProjects).toEqual([]);
      });

      it('starts with dystopia visual stage', () => {
        expect(state.tiles['brightmoor'].visualStage).toBe('dystopia');
      });

      it('starts not community owned with 0 power tokens', () => {
        expect(state.tiles['brightmoor'].communityOwned).toBe(false);
        expect(state.tiles['brightmoor'].communityPowerTokens).toBe(0);
      });
    });

    describe('Corktown', () => {
      it('has correct base properties', () => {
        const tile = state.tiles['corktown'];
        expect(tile.id).toBe('corktown');
        expect(tile.name).toBe('Corktown');
        expect(tile.terrain).toBe('urban-sparse');
        expect(tile.vacancyRate).toBe(25);
        expect(tile.ecologicalHealth).toBe(12);
        expect(tile.contamination).toBe(10);
        expect(tile.gentrificationPressure).toBe(45);
      });

      it('has correct existingUses', () => {
        expect(state.tiles['corktown'].existingUses).toEqual([
          'small_businesses',
          'occupied_housing',
        ]);
      });

      it('has correct neighborhoodTraits', () => {
        expect(state.tiles['corktown'].neighborhoodTraits).toEqual([
          'ford_development',
          'rapid_change',
          'transit_adjacent',
        ]);
      });

      it('is adjacent to eastern_market', () => {
        expect(state.tiles['corktown'].adjacentTileIds).toContain('eastern_market');
      });
    });

    describe('Eastern Market', () => {
      it('has correct base properties', () => {
        const tile = state.tiles['eastern_market'];
        expect(tile.id).toBe('eastern_market');
        expect(tile.name).toBe('Eastern Market');
        expect(tile.terrain).toBe('urban-sparse');
        expect(tile.vacancyRate).toBe(15);
        expect(tile.ecologicalHealth).toBe(14);
        expect(tile.contamination).toBe(5);
        expect(tile.gentrificationPressure).toBe(10);
      });

      it('has correct existingUses', () => {
        expect(state.tiles['eastern_market'].existingUses).toEqual([
          'small_businesses',
          'historic_site',
        ]);
      });

      it('has correct neighborhoodTraits', () => {
        expect(state.tiles['eastern_market'].neighborhoodTraits).toEqual([
          'food_heritage',
          'small_business_dense',
          'historic_site',
        ]);
      });

      it('is adjacent to corktown', () => {
        expect(state.tiles['eastern_market'].adjacentTileIds).toContain('corktown');
      });
    });
  });

  describe('community leaders', () => {
    it('has 13 leaders (8 original + 5 expansion)', () => {
      expect(Object.keys(state.leaders)).toHaveLength(13);
    });

    it('has grace, kez, darius', () => {
      expect(state.leaders).toHaveProperty('grace');
      expect(state.leaders).toHaveProperty('kez');
      expect(state.leaders).toHaveProperty('darius');
    });

    describe('Grace', () => {
      it('has correct id, trust, and advocacyPower', () => {
        const grace = state.leaders['grace'];
        expect(grace.id).toBe('grace');
        expect(grace.trust).toBe(30);
        expect(grace.advocacyPower).toBe(4);
      });

      it('starts with 0 consecutiveDeferrals and 0 proposalCooldown', () => {
        expect(state.leaders['grace'].consecutiveDeferrals).toBe(0);
        expect(state.leaders['grace'].proposalCooldown).toBe(0);
      });
    });

    describe('Kez', () => {
      it('has correct id, trust, and advocacyPower', () => {
        const kez = state.leaders['kez'];
        expect(kez.id).toBe('kez');
        expect(kez.trust).toBe(10);
        expect(kez.advocacyPower).toBe(3);
      });
    });

    describe('Darius', () => {
      it('has correct id, trust, and advocacyPower', () => {
        const darius = state.leaders['darius'];
        expect(darius.id).toBe('darius');
        expect(darius.trust).toBe(20);
        expect(darius.advocacyPower).toBe(3);
      });
    });
  });

  describe('immutability', () => {
    it('returns a new object each time', () => {
      const state2 = createNewGame();
      expect(state).not.toBe(state2);
      expect(state).toEqual(state2);
    });
  });
});
