import type { CityPackage, NewsSource, CityCharacter, CityPowerStructure, CityCrisisArc } from './types';

export interface CityInitParams {
  cityName: string;
  state: string;
  mapCenter: [number, number];
  zoomBounds: { min: number; max: number };
  startingBudget: number;
  treeCanopy: number;
  foodAccess: number;
  vacancyRate: number;
  population: number;
  neighborhoods: Array<{ id: string; name: string }>;
  newsSources: NewsSource[];
  characters: CityCharacter[];
  powerStructure: CityPowerStructure;
  crisisArcs: CityCrisisArc[];
}

export function validateCityPackage(pkg: CityPackage): string[] {
  const errors: string[] = [];
  if (!pkg.meta?.cityName) errors.push('meta.cityName is required');
  if (!pkg.meta?.center || pkg.meta.center.length !== 2) errors.push('meta.center must be [lon, lat]');
  if (!pkg.geography?.neighborhoodBoundaries) errors.push('geography.neighborhoodBoundaries required');
  if (!pkg.geography?.blockPolygons) errors.push('geography.blockPolygons required');
  if (!pkg.calibration?.cityBudget) errors.push('calibration.cityBudget required');
  if (!pkg.powerStructure?.mayor) errors.push('powerStructure.mayor required');
  return errors;
}

export function loadCityPackage(pkg: CityPackage): CityInitParams {
  const errors = validateCityPackage(pkg);
  if (errors.length > 0) {
    throw new Error(`Invalid city package: ${errors.join(', ')}`);
  }
  const neighborhoods = pkg.geography.neighborhoodBoundaries.features.map((f) => ({
    id: (f.properties as Record<string, string>)?.id || f.id?.toString() || '',
    name: (f.properties as Record<string, string>)?.name || '',
  }));
  return {
    cityName: pkg.meta.cityName,
    state: pkg.meta.state,
    mapCenter: pkg.meta.center,
    zoomBounds: pkg.meta.zoomBounds,
    startingBudget: pkg.calibration.cityBudget.game,
    treeCanopy: pkg.calibration.treeCanopy.current,
    foodAccess: 100 - pkg.calibration.foodAccess.percentLacking,
    vacancyRate: pkg.calibration.vacancyRate.value,
    population: pkg.calibration.population.value,
    neighborhoods,
    newsSources: pkg.newsSources,
    characters: pkg.characters,
    powerStructure: pkg.powerStructure,
    crisisArcs: pkg.crisisArcs,
  };
}
