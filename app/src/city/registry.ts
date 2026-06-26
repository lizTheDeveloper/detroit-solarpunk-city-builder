import type { CityPackage } from './types';
import { detroitPackage } from './detroit';

/**
 * Registry of all available city packages.
 * Maps city slug → CityPackage.
 *
 * New cities are added by:
 * 1. Creating a new directory under city/ (e.g., city/minneapolis/)
 * 2. Creating a package.ts that exports a CityPackage
 * 3. Importing it here and adding to the registry
 */
const cityRegistry: Record<string, CityPackage> = {
  detroit: detroitPackage,
  // Future cities:
  // minneapolis: minneapolisPackage,
};

/**
 * Get a city package by slug.
 * @param slug - City identifier (e.g., 'detroit', 'minneapolis')
 * @returns CityPackage if found, undefined otherwise
 */
export function getCity(slug: string): CityPackage | undefined {
  return cityRegistry[slug];
}

/**
 * List all available city slugs.
 * @returns Array of city slugs
 */
export function listCities(): string[] {
  return Object.keys(cityRegistry);
}

/**
 * Check if a city exists in the registry.
 * @param slug - City identifier
 * @returns true if city exists
 */
export function hasCity(slug: string): boolean {
  return slug in cityRegistry;
}
