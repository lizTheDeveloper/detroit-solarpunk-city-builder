import { describe, it, expect } from 'vitest';
import { validateCityPackage, loadCityPackage } from './loader';
import type { CityPackage } from './types';

function makeMinimalPackage(overrides?: Partial<CityPackage>): CityPackage {
  return {
    meta: {
      cityName: 'TestCity',
      state: 'TS',
      center: [-83.0, 42.3],
      zoomBounds: { min: 10, max: 18 },
      generatedAt: '2026-01-01',
      version: 1,
    },
    geography: {
      neighborhoodBoundaries: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { id: 'n1', name: 'Northside' },
            geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
          },
        ],
      },
      blockPolygons: { type: 'FeatureCollection', features: [] },
    },
    dataLayers: {},
    newsSources: [
      {
        id: 'test_news',
        name: 'Test News',
        url: 'https://example.com',
        feedUrl: 'https://example.com/feed',
        feedType: 'rss',
        locality: 'city',
        topics: ['civic'],
        validated: true,
        lastChecked: '2026-01-01',
      },
    ],
    characters: [],
    powerStructure: {
      mayor: { name: 'Test Mayor', contact: 'https://example.com', since: '2020' },
      council: [],
      agencies: [],
      utilityCompanies: [],
    },
    crisisArcs: [],
    calibration: {
      cityBudget: { real: 1000000, game: 1.0, source: 'Test' },
      medianIncome: { value: 40000, source: 'Test' },
      vacancyRate: { value: 0.15, source: 'Test' },
      treeCanopy: { current: 30, target: 40, source: 'Test' },
      foodAccess: { percentLacking: 20, source: 'Test' },
      population: { value: 500000, source: 'Test' },
    },
    sourceRegistry: [],
    ...overrides,
  };
}

describe('City Package Loader', () => {
  describe('validateCityPackage', () => {
    it('returns no errors for a valid package', () => {
      const pkg = makeMinimalPackage();
      expect(validateCityPackage(pkg)).toEqual([]);
    });

    it('reports missing cityName', () => {
      const pkg = makeMinimalPackage({
        meta: {
          cityName: '',
          state: 'TS',
          center: [-83.0, 42.3],
          zoomBounds: { min: 10, max: 18 },
          generatedAt: '2026-01-01',
          version: 1,
        },
      });
      const errors = validateCityPackage(pkg);
      expect(errors).toContain('meta.cityName is required');
    });

    it('reports missing mayor', () => {
      const pkg = makeMinimalPackage({
        powerStructure: {
          mayor: undefined as any,
          council: [],
          agencies: [],
          utilityCompanies: [],
        },
      });
      const errors = validateCityPackage(pkg);
      expect(errors).toContain('powerStructure.mayor required');
    });

    it('reports missing calibration.cityBudget', () => {
      const pkg = makeMinimalPackage({
        calibration: {
          cityBudget: undefined as any,
          medianIncome: { value: 40000, source: 'Test' },
          vacancyRate: { value: 0.15, source: 'Test' },
          treeCanopy: { current: 30, target: 40, source: 'Test' },
          foodAccess: { percentLacking: 20, source: 'Test' },
          population: { value: 500000, source: 'Test' },
        },
      });
      const errors = validateCityPackage(pkg);
      expect(errors).toContain('calibration.cityBudget required');
    });
  });

  describe('loadCityPackage', () => {
    it('extracts correct fields from a valid package', () => {
      const pkg = makeMinimalPackage();
      const result = loadCityPackage(pkg);
      expect(result.cityName).toBe('TestCity');
      expect(result.state).toBe('TS');
      expect(result.mapCenter).toEqual([-83.0, 42.3]);
      expect(result.startingBudget).toBe(1.0);
      expect(result.treeCanopy).toBe(30);
      expect(result.foodAccess).toBe(80); // 100 - 20
      expect(result.vacancyRate).toBe(0.15);
      expect(result.population).toBe(500000);
      expect(result.neighborhoods).toEqual([{ id: 'n1', name: 'Northside' }]);
      expect(result.newsSources).toHaveLength(1);
      expect(result.powerStructure.mayor.name).toBe('Test Mayor');
    });

    it('throws on invalid package', () => {
      const pkg = makeMinimalPackage({
        meta: {
          cityName: '',
          state: 'TS',
          center: [-83.0, 42.3],
          zoomBounds: { min: 10, max: 18 },
          generatedAt: '2026-01-01',
          version: 1,
        },
      });
      expect(() => loadCityPackage(pkg)).toThrow('Invalid city package');
    });
  });
});
