// app/src/city/types.ts
import type { FeatureCollection, Polygon } from 'geojson';

export interface CityMeta {
  cityName: string;
  state: string;
  center: [number, number]; // [lon, lat]
  zoomBounds: { min: number; max: number };
  generatedAt: string;
  version: number;
}

export interface DataLayerEntry {
  data: any;
  source: string;
  sourceUrl: string;
  license: string;
  fetchedAt: string;
  ttl: string;
  available: boolean;
  gapReason?: string;
  advocacyTarget?: {
    name: string;
    title: string;
    agency: string;
    contact?: string;
  };
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  feedUrl: string;
  feedType: 'rss' | 'json' | 'scrape';
  locality: 'neighborhood' | 'city' | 'metro' | 'state' | 'national';
  topics: string[];
  validated: boolean;
  lastChecked: string;
  neighborhoodFocus?: string;
}

export interface CityCharacter {
  id: string;
  name: string;
  role: string;
  organizationInspiredBy: string;
  organizationUrl: string;
  neighborhood: string;
  issues: string[];
  personality: Record<string, any>;
  backstory: string;
  pedagogicalIntent: string;
}

export interface PowerStructureEntry {
  name: string;
  title?: string;
  district?: string;
  neighborhoods?: string[];
  contact?: string;
  committees?: string[];
  responsibility?: string;
  relevantArcs?: string[];
  type?: 'electric' | 'gas' | 'water' | 'telecom';
  ownership?: 'public' | 'private' | 'cooperative';
  pedagogicalNote: string;
}

export interface CityPowerStructure {
  mayor: { name: string; contact?: string; since?: string };
  council: PowerStructureEntry[];
  agencies: PowerStructureEntry[];
  utilityCompanies: PowerStructureEntry[];
}

export interface CityCrisisArc {
  id: string;
  name: string;
  localDescription: string;
  keywords: string[];
  escalationThreshold: number;
  localities: string[];
  connectedArcs: string[];
  pedagogicalChain: string;
  realExamples: string[];
}

export interface CityCalibration {
  cityBudget: { real: number; game: number; source: string };
  medianIncome: { value: number; source: string };
  vacancyRate: { value: number; source: string };
  treeCanopy: { current: number; target: number; source: string };
  foodAccess: { percentLacking: number; source: string };
  population: { value: number; source: string };
}

export interface SourceRegistryEntry {
  key: string;
  name: string;
  url: string;
  fetchDate: string;
  license: string;
  notes: string;
}

export interface CityPackage {
  meta: CityMeta;
  geography: {
    neighborhoodBoundaries: FeatureCollection<Polygon>;
    blockPolygons: FeatureCollection<Polygon>;
    buildingFootprints?: FeatureCollection<Polygon>;
  };
  dataLayers: Record<string, DataLayerEntry>;
  newsSources: NewsSource[];
  characters: CityCharacter[];
  powerStructure: CityPowerStructure;
  crisisArcs: CityCrisisArc[];
  calibration: CityCalibration;
  sourceRegistry: SourceRegistryEntry[];
}
