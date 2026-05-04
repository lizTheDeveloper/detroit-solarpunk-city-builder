import { describe, it, expect } from 'vitest';
import { POLICY_CATALOG } from './policy-catalog';

describe('POLICY_CATALOG', () => {
  it('contains exactly 6 policies', () => {
    expect(Object.keys(POLICY_CATALOG)).toHaveLength(6);
  });

  const allIds = [
    'urban_agriculture_zoning',
    'green_infrastructure_grants',
    'cooperative_tax_incentives',
    'participatory_budgeting',
    'community_land_trust',
    'water_commons',
  ];

  it.each(allIds)('contains policy "%s"', (id) => {
    expect(POLICY_CATALOG).toHaveProperty(id);
    expect(POLICY_CATALOG[id].id).toBe(id);
  });

  describe('required fields', () => {
    it.each(allIds)('policy "%s" has all required fields', (id) => {
      const p = POLICY_CATALOG[id];
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('baseThreshold');
      expect(p).toHaveProperty('enactmentCost');
      expect(p).toHaveProperty('ongoingDrain');
      expect(p).toHaveProperty('effects');
      expect(p).toHaveProperty('requiresCouncilVote');

      const e = p.effects;
      expect(e).toHaveProperty('trustBonus');
      expect(e).toHaveProperty('ecoBonus');
      expect(e).toHaveProperty('foodSovBonus');
      expect(e).toHaveProperty('budgetBonus');
      expect(e).toHaveProperty('projectCostModifier');
      expect(e).toHaveProperty('other');
    });
  });

  describe('threshold values match spec', () => {
    it('urban_agriculture_zoning has baseThreshold 0.30', () => {
      expect(POLICY_CATALOG['urban_agriculture_zoning'].baseThreshold).toBe(0.30);
    });
    it('green_infrastructure_grants has baseThreshold 0.40', () => {
      expect(POLICY_CATALOG['green_infrastructure_grants'].baseThreshold).toBe(0.40);
    });
    it('cooperative_tax_incentives has baseThreshold 0.50', () => {
      expect(POLICY_CATALOG['cooperative_tax_incentives'].baseThreshold).toBe(0.50);
    });
    it('participatory_budgeting has baseThreshold 0.55', () => {
      expect(POLICY_CATALOG['participatory_budgeting'].baseThreshold).toBe(0.55);
    });
    it('community_land_trust has baseThreshold 0.45', () => {
      expect(POLICY_CATALOG['community_land_trust'].baseThreshold).toBe(0.45);
    });
    it('water_commons has baseThreshold 0.60', () => {
      expect(POLICY_CATALOG['water_commons'].baseThreshold).toBe(0.60);
    });
  });

  describe('council vote requirements', () => {
    it('urban_agriculture_zoning does NOT require council vote', () => {
      expect(POLICY_CATALOG['urban_agriculture_zoning'].requiresCouncilVote).toBe(false);
    });
    it.each([
      'green_infrastructure_grants',
      'cooperative_tax_incentives',
      'participatory_budgeting',
      'community_land_trust',
      'water_commons',
    ])('%s requires council vote', (id) => {
      expect(POLICY_CATALOG[id].requiresCouncilVote).toBe(true);
    });
  });

  describe('ongoing drain values match spec', () => {
    it('urban_agriculture_zoning drain is 0.003', () => {
      expect(POLICY_CATALOG['urban_agriculture_zoning'].ongoingDrain).toBe(0.003);
    });
    it('green_infrastructure_grants drain is 0.004', () => {
      expect(POLICY_CATALOG['green_infrastructure_grants'].ongoingDrain).toBe(0.004);
    });
    it('cooperative_tax_incentives drain is 0.005', () => {
      expect(POLICY_CATALOG['cooperative_tax_incentives'].ongoingDrain).toBe(0.005);
    });
    it('participatory_budgeting drain is 0.005', () => {
      expect(POLICY_CATALOG['participatory_budgeting'].ongoingDrain).toBe(0.005);
    });
    it('community_land_trust drain is 0.003', () => {
      expect(POLICY_CATALOG['community_land_trust'].ongoingDrain).toBe(0.003);
    });
    it('water_commons drain is 0.005', () => {
      expect(POLICY_CATALOG['water_commons'].ongoingDrain).toBe(0.005);
    });
  });
});
