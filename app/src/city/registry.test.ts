import { describe, expect, it } from 'vitest';
import { getCity, hasCity, listCities } from './registry';

describe('registry', () => {
  describe('getCity', () => {
    it('returns Detroit package for "detroit" slug', () => {
      const detroit = getCity('detroit');
      expect(detroit).toBeDefined();
      expect(detroit!.meta.cityName).toBe('Detroit');
      expect(detroit!.meta.state).toBe('MI');
    });

    it('returns undefined for unknown city', () => {
      const minneapolis = getCity('minneapolis');
      expect(minneapolis).toBeUndefined();
    });
  });

  describe('listCities', () => {
    it('returns array of available city slugs', () => {
      const cities = listCities();
      expect(Array.isArray(cities)).toBe(true);
      expect(cities).toContain('detroit');
    });

    it('includes all expected cities', () => {
      const cities = listCities();
      expect(cities.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('hasCity', () => {
    it('returns true for Detroit', () => {
      expect(hasCity('detroit')).toBe(true);
    });

    it('returns false for unknown city', () => {
      expect(hasCity('minneapolis')).toBe(false);
      expect(hasCity('chicago')).toBe(false);
    });
  });
});
