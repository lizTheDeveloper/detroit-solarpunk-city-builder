import { describe, it, expect } from 'vitest';
import { calculateBlockModifiers, scoreBlockSuitability } from './block-modifiers';
import type { BlockData } from '../map/block-layer';
import type { ProjectDefinition } from '../state/types';

function makeBlock(overrides: Partial<BlockData> = {}): BlockData {
  return {
    blockId: 'block_001',
    neighborhoodId: 'brightmoor',
    epaSites: [],
    transitStops: [],
    communityAssets: [],
    dataGaps: [],
    ...overrides,
  };
}

function makeProject(overrides: Partial<ProjectDefinition> = {}): ProjectDefinition {
  return {
    id: 'test_project',
    name: 'Test Project',
    description: '',
    category: 'ecology',
    growthCategory: 'neither',
    baseCost: 1.0,
    baseDuration: 6,
    maintenanceCost: 0,
    effects: {
      tileEco: 10,
      foodSov: 5,
      trust: 2,
      annualRevenue: 0.01,
      contaminationReduction: 0,
      gentrificationChange: 0,
      other: [],
    },
    maxContamination: null,
    stageRequired: 'awakening',
    terrainRequired: null,
    produces: [],
    consumes: [],
    ...overrides,
  };
}

describe('calculateBlockModifiers', () => {
  it('returns defaults when no block data', () => {
    const result = calculateBlockModifiers(undefined, makeProject());
    expect(result.costMultiplier).toBe(1);
    expect(result.durationMultiplier).toBe(1);
    expect(result.ecoBonus).toBe(0);
    expect(result.flags).toEqual([]);
  });

  it('returns defaults for clean block', () => {
    const result = calculateBlockModifiers(makeBlock(), makeProject());
    expect(result.costMultiplier).toBe(1);
    expect(result.durationMultiplier).toBe(1);
    expect(result.contaminationPenalty).toBe(0);
    expect(result.flags).toEqual([]);
  });

  describe('EPA brownfield modifiers', () => {
    const epaBlock = makeBlock({
      epaSites: [{ name: 'Old Factory', type: 'brownfield', status: 'active' }],
    });

    it('penalizes ecology projects on contaminated blocks', () => {
      const result = calculateBlockModifiers(epaBlock, makeProject({ category: 'ecology' }));
      expect(result.costMultiplier).toBeGreaterThan(1);
      expect(result.durationMultiplier).toBeGreaterThan(1);
      expect(result.contaminationPenalty).toBe(10);
      expect(result.flags).toContain('epa_brownfield');
    });

    it('penalizes food projects on contaminated blocks', () => {
      const result = calculateBlockModifiers(
        epaBlock,
        makeProject({ effects: { tileEco: 0, foodSov: 8, trust: 0, annualRevenue: 0, contaminationReduction: 0, gentrificationChange: 0, other: [] } }),
      );
      expect(result.durationMultiplier).toBeGreaterThan(1);
    });

    it('bonuses soil remediation on contaminated blocks', () => {
      const result = calculateBlockModifiers(epaBlock, makeProject({ id: 'soil_remediation' }));
      expect(result.ecoBonus).toBeGreaterThan(0);
      expect(result.trustBonus).toBeGreaterThan(0);
    });

    it('caps contamination penalty at 30', () => {
      const heavyEpa = makeBlock({
        epaSites: [
          { name: 'Site A', type: 'brownfield', status: 'active' },
          { name: 'Site B', type: 'brownfield', status: 'active' },
          { name: 'Site C', type: 'brownfield', status: 'active' },
          { name: 'Site D', type: 'brownfield', status: 'active' },
        ],
      });
      const result = calculateBlockModifiers(heavyEpa, makeProject());
      expect(result.contaminationPenalty).toBe(30);
    });
  });

  describe('flood zone modifiers', () => {
    const floodBlock = makeBlock({ floodZone: 'AE' });

    it('penalizes infrastructure projects in flood zones', () => {
      const result = calculateBlockModifiers(floodBlock, makeProject({ category: 'infrastructure' }));
      expect(result.costMultiplier).toBeGreaterThan(1);
      expect(result.durationMultiplier).toBeGreaterThan(1);
      expect(result.flags).toContain('flood_zone');
    });

    it('bonuses rain gardens in flood zones', () => {
      const result = calculateBlockModifiers(floodBlock, makeProject({ id: 'rain_garden' }));
      expect(result.ecoBonus).toBe(8);
      expect(result.costMultiplier).toBeLessThan(1);
    });
  });

  describe('vacancy modifiers', () => {
    const vacantBlock = makeBlock({
      censusData: { population: 200, medianIncome: 25000, vacancyRate: 0.5 },
    });

    it('reduces costs on high-vacancy blocks', () => {
      const result = calculateBlockModifiers(vacantBlock, makeProject());
      expect(result.costMultiplier).toBeLessThan(1);
      expect(result.flags).toContain('high_vacancy');
    });

    it('extra bonus for de-growth projects on vacant blocks', () => {
      const result = calculateBlockModifiers(
        vacantBlock,
        makeProject({ growthCategory: 'de-growth' }),
      );
      expect(result.costMultiplier).toBeLessThan(0.8);
      expect(result.ecoBonus).toBeGreaterThan(0);
    });
  });

  describe('transit adjacency modifiers', () => {
    const transitBlock = makeBlock({
      transitStops: [{ name: 'Route 53', routes: ['53'] }],
    });

    it('bonuses community projects near transit', () => {
      const result = calculateBlockModifiers(
        transitBlock,
        makeProject({ category: 'community' }),
      );
      expect(result.trustBonus).toBeGreaterThan(0);
      expect(result.revenueBonus).toBeGreaterThan(0);
      expect(result.flags).toContain('transit_adjacent');
    });

    it('bonuses infrastructure projects near transit', () => {
      const result = calculateBlockModifiers(
        transitBlock,
        makeProject({ category: 'infrastructure' }),
      );
      expect(result.trustBonus).toBeGreaterThan(0);
    });

    it('no transit bonus for ecology projects', () => {
      const result = calculateBlockModifiers(
        transitBlock,
        makeProject({ category: 'ecology' }),
      );
      expect(result.trustBonus).toBe(0);
      expect(result.revenueBonus).toBe(0);
    });
  });

  describe('community assets modifiers', () => {
    const communityBlock = makeBlock({
      communityAssets: [{ name: 'Community Center', type: 'center' }],
    });

    it('bonuses community projects near assets', () => {
      const result = calculateBlockModifiers(
        communityBlock,
        makeProject({ category: 'community' }),
      );
      expect(result.trustBonus).toBe(3);
      expect(result.durationMultiplier).toBeLessThan(1);
      expect(result.flags).toContain('community_assets');
    });
  });

  it('stacks multiple modifiers', () => {
    const richBlock = makeBlock({
      epaSites: [{ name: 'Brownfield', type: 'brownfield', status: 'active' }],
      censusData: { population: 100, medianIncome: 20000, vacancyRate: 0.6 },
      transitStops: [{ name: 'Bus', routes: ['1'] }],
      communityAssets: [{ name: 'Church', type: 'church' }],
    });
    const result = calculateBlockModifiers(
      richBlock,
      makeProject({ category: 'community' }),
    );
    expect(result.flags).toContain('epa_brownfield');
    expect(result.flags).toContain('high_vacancy');
    expect(result.flags).toContain('transit_adjacent');
    expect(result.flags).toContain('community_assets');
  });

  it('floors cost multiplier at 0.5', () => {
    const cheapBlock = makeBlock({
      censusData: { population: 50, medianIncome: 15000, vacancyRate: 0.9 },
      communityAssets: [{ name: 'A', type: 'x' }, { name: 'B', type: 'y' }],
    });
    const result = calculateBlockModifiers(
      cheapBlock,
      makeProject({ category: 'community', growthCategory: 'de-growth' }),
    );
    expect(result.costMultiplier).toBeGreaterThanOrEqual(0.5);
  });
});

describe('scoreBlockSuitability', () => {
  it('returns 50 for neutral block', () => {
    const score = scoreBlockSuitability(makeBlock(), makeProject());
    expect(score).toBe(50);
  });

  it('scores soil remediation high on EPA blocks', () => {
    const epaBlock = makeBlock({
      epaSites: [{ name: 'Site', type: 'brownfield', status: 'active' }],
    });
    const score = scoreBlockSuitability(epaBlock, makeProject({ id: 'soil_remediation' }));
    expect(score).toBeGreaterThan(70);
  });

  it('scores ecology low on EPA blocks', () => {
    const epaBlock = makeBlock({
      epaSites: [{ name: 'Site', type: 'brownfield', status: 'active' }],
    });
    const score = scoreBlockSuitability(epaBlock, makeProject({ category: 'ecology' }));
    expect(score).toBeLessThan(50);
  });

  it('scores rain garden high in flood zones', () => {
    const floodBlock = makeBlock({ floodZone: 'AE' });
    const score = scoreBlockSuitability(floodBlock, makeProject({ id: 'rain_garden' }));
    expect(score).toBeGreaterThan(60);
  });

  it('scores infrastructure low in flood zones', () => {
    const floodBlock = makeBlock({ floodZone: 'AE' });
    const score = scoreBlockSuitability(floodBlock, makeProject({ category: 'infrastructure' }));
    expect(score).toBeLessThan(50);
  });

  it('clamps to 0-100 range', () => {
    const bestBlock = makeBlock({
      censusData: { population: 50, medianIncome: 15000, vacancyRate: 0.9 },
      transitStops: [{ name: 'A', routes: ['1'] }],
      communityAssets: [{ name: 'B', type: 'center' }],
    });
    const score = scoreBlockSuitability(bestBlock, makeProject({ category: 'community' }));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
