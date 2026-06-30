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

    it('returns Minneapolis package for "minneapolis" slug', () => {
      const minneapolis = getCity('minneapolis');
      expect(minneapolis).toBeDefined();
      expect(minneapolis!.meta.cityName).toBe('Minneapolis');
      expect(minneapolis!.meta.state).toBe('MN');
    });

    it('returns undefined for unknown city', () => {
      const chicago = getCity('chicago');
      expect(chicago).toBeUndefined();
    });
  });

  describe('listCities', () => {
    it('returns array of available city slugs', () => {
      const cities = listCities();
      expect(Array.isArray(cities)).toBe(true);
      expect(cities).toContain('detroit');
      expect(cities).toContain('minneapolis');
    });

    it('includes all expected cities', () => {
      const cities = listCities();
      expect(cities.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('hasCity', () => {
    it('returns true for Detroit', () => {
      expect(hasCity('detroit')).toBe(true);
    });

    it('returns true for Minneapolis', () => {
      expect(hasCity('minneapolis')).toBe(true);
    });

    it('returns false for unknown city', () => {
      expect(hasCity('chicago')).toBe(false);
      expect(hasCity('portland')).toBe(false);
    });
  });
});
