import { describe, it, expect } from 'vitest';
import { PROJECT_CATALOG } from './project-catalog';

describe('PROJECT_CATALOG', () => {
  it('contains exactly 13 projects', () => {
    expect(Object.keys(PROJECT_CATALOG)).toHaveLength(13);
  });

  const allIds = [
    'food_forest',
    'soil_remediation',
    'rain_garden',
    'native_planting',
    'solar_grid',
    'greenway',
    'water_transit',
    'maker_space',
    'community_kitchen',
    'land_trust',
    'wetland_restoration',
    'wildlife_corridor',
    'regional_collab',
  ];

  it.each(allIds)('contains project "%s"', (id) => {
    expect(PROJECT_CATALOG).toHaveProperty(id);
    expect(PROJECT_CATALOG[id].id).toBe(id);
  });

  describe('Ecology projects (awakening)', () => {
    it('food_forest has correct values', () => {
      const p = PROJECT_CATALOG['food_forest'];
      expect(p.name).toBe('Food Forest');
      expect(p.category).toBe('ecology');
      expect(p.baseCost).toBe(0.75);
      expect(p.baseDuration).toBe(3);
      expect(p.effects.tileEco).toBe(10);
      expect(p.effects.foodSov).toBe(3);
      expect(p.effects.trust).toBe(1.5);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBe(50);
      expect(p.stageRequired).toBe('awakening');
    });

    it('soil_remediation has correct values', () => {
      const p = PROJECT_CATALOG['soil_remediation'];
      expect(p.name).toBe('Soil Remediation');
      expect(p.category).toBe('ecology');
      expect(p.baseCost).toBe(1.0);
      expect(p.baseDuration).toBe(4);
      expect(p.effects.tileEco).toBe(7);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(0);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBeNull();
      expect(p.effects.contaminationReduction).toBe(60);
      expect(p.stageRequired).toBe('awakening');
    });

    it('rain_garden has correct values', () => {
      const p = PROJECT_CATALOG['rain_garden'];
      expect(p.name).toBe('Rain Garden');
      expect(p.category).toBe('ecology');
      expect(p.baseCost).toBe(0.4);
      expect(p.baseDuration).toBe(2);
      expect(p.effects.tileEco).toBe(7);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(0);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBeNull();
      expect(p.stageRequired).toBe('awakening');
    });

    it('native_planting has correct values', () => {
      const p = PROJECT_CATALOG['native_planting'];
      expect(p.name).toBe('Native Planting');
      expect(p.category).toBe('ecology');
      expect(p.baseCost).toBe(0.8);
      expect(p.baseDuration).toBe(3);
      expect(p.effects.tileEco).toBe(8);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(0);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBeNull();
      expect(p.stageRequired).toBe('awakening');
    });
  });

  describe('Infrastructure projects (awakening)', () => {
    it('solar_grid has correct values', () => {
      const p = PROJECT_CATALOG['solar_grid'];
      expect(p.name).toBe('Solar Grid');
      expect(p.category).toBe('infrastructure');
      expect(p.baseCost).toBe(1.5);
      expect(p.baseDuration).toBe(4);
      expect(p.effects.tileEco).toBe(3.5);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(0);
      expect(p.effects.annualRevenue).toBe(0.2);
      expect(p.maxContamination).toBeNull();
      expect(p.stageRequired).toBe('awakening');
    });

    it('greenway has correct values', () => {
      const p = PROJECT_CATALOG['greenway'];
      expect(p.name).toBe('Greenway');
      expect(p.category).toBe('infrastructure');
      expect(p.baseCost).toBe(1.0);
      expect(p.baseDuration).toBe(3);
      expect(p.effects.tileEco).toBe(5.5);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(0);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBeNull();
      expect(p.stageRequired).toBe('awakening');
    });

    it('water_transit has correct values', () => {
      const p = PROJECT_CATALOG['water_transit'];
      expect(p.name).toBe('Water Transit Route');
      expect(p.category).toBe('infrastructure');
      expect(p.baseCost).toBe(2.5);
      expect(p.baseDuration).toBe(6);
      expect(p.effects.tileEco).toBe(0);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(3.5);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBeNull();
      expect(p.terrainRequired).toEqual(['waterfront']);
      expect(p.stageRequired).toBe('awakening');
    });
  });

  describe('Community projects (awakening)', () => {
    it('maker_space has correct values', () => {
      const p = PROJECT_CATALOG['maker_space'];
      expect(p.name).toBe('Maker Space');
      expect(p.category).toBe('community');
      expect(p.baseCost).toBe(0.6);
      expect(p.baseDuration).toBe(2);
      expect(p.effects.tileEco).toBe(0);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(3);
      expect(p.effects.annualRevenue).toBe(0.1);
      expect(p.maxContamination).toBeNull();
      expect(p.stageRequired).toBe('awakening');
    });

    it('community_kitchen has correct values', () => {
      const p = PROJECT_CATALOG['community_kitchen'];
      expect(p.name).toBe('Community Kitchen');
      expect(p.category).toBe('community');
      expect(p.baseCost).toBe(0.5);
      expect(p.baseDuration).toBe(2);
      expect(p.effects.tileEco).toBe(0);
      expect(p.effects.foodSov).toBe(3.5);
      expect(p.effects.trust).toBe(2);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBe(50);
      expect(p.stageRequired).toBe('awakening');
    });

    it('land_trust has correct values', () => {
      const p = PROJECT_CATALOG['land_trust'];
      expect(p.name).toBe('Land Trust');
      expect(p.category).toBe('community');
      expect(p.baseCost).toBe(1.2);
      expect(p.baseDuration).toBe(3);
      expect(p.effects.tileEco).toBe(0);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(3.5);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBeNull();
      expect(p.stageRequired).toBe('awakening');
    });
  });

  describe('Restoration projects (transition)', () => {
    it('wetland_restoration has correct values', () => {
      const p = PROJECT_CATALOG['wetland_restoration'];
      expect(p.name).toBe('Wetland Restoration');
      expect(p.category).toBe('restoration');
      expect(p.baseCost).toBe(2.0);
      expect(p.baseDuration).toBe(5);
      expect(p.effects.tileEco).toBe(14);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(0);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBeNull();
      expect(p.stageRequired).toBe('transition');
    });

    it('wildlife_corridor has correct values', () => {
      const p = PROJECT_CATALOG['wildlife_corridor'];
      expect(p.name).toBe('Wildlife Corridor');
      expect(p.category).toBe('restoration');
      expect(p.baseCost).toBe(3.0);
      expect(p.baseDuration).toBe(8);
      expect(p.effects.tileEco).toBe(10);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(0);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBeNull();
      expect(p.stageRequired).toBe('transition');
    });

    it('regional_collab has correct values', () => {
      const p = PROJECT_CATALOG['regional_collab'];
      expect(p.name).toBe('Regional Collaboration');
      expect(p.category).toBe('restoration');
      expect(p.baseCost).toBe(2.0);
      expect(p.baseDuration).toBe(6);
      expect(p.effects.tileEco).toBe(0);
      expect(p.effects.foodSov).toBe(0);
      expect(p.effects.trust).toBe(2);
      expect(p.effects.annualRevenue).toBe(0);
      expect(p.maxContamination).toBeNull();
      expect(p.stageRequired).toBe('transition');
    });
  });

  describe('growth categorization', () => {
    it('solar_grid is growth', () => {
      expect(PROJECT_CATALOG['solar_grid'].growthCategory).toBe('growth');
    });

    it('maker_space is growth', () => {
      expect(PROJECT_CATALOG['maker_space'].growthCategory).toBe('growth');
    });

    const deGrowthIds = [
      'food_forest',
      'rain_garden',
      'native_planting',
      'wetland_restoration',
      'wildlife_corridor',
    ];

    it.each(deGrowthIds)('%s is de-growth', (id) => {
      expect(PROJECT_CATALOG[id].growthCategory).toBe('de-growth');
    });

    const neitherIds = [
      'soil_remediation',
      'greenway',
      'water_transit',
      'community_kitchen',
      'land_trust',
      'regional_collab',
    ];

    it.each(neitherIds)('%s is neither growth nor de-growth', (id) => {
      expect(PROJECT_CATALOG[id].growthCategory).toBe('neither');
    });
  });
});
