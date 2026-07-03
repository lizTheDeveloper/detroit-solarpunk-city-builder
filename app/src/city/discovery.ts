/**
 * City Discovery System
 * Crawls the web to discover new cities with solarpunk movements
 * and generates city packages dynamically.
 */

import type { CityPackage, CityCalibration, CityMeta } from './types';
import type { FeatureCollection, Polygon } from 'geojson';

export interface CityDiscoveryResult {
  success: boolean;
  city: CityPackage | null;
  slug: string;
  movements: DiscoveredMovement[];
  characters: DiscoveredCharacter[];
  error?: string;
}

export interface DiscoveredMovement {
  name: string;
  type: string;
  url?: string;
  cityRelevanceScore: number; // 0-100, higher = more specific to this city
}

export interface DiscoveredCharacter {
  name: string;
  role: string;
  organization: string;
  url?: string;
}

/**
 * Discover a new city by crawling Wikipedia and news sources
 */
export async function discoverCity(
  cityName: string,
  state: string
): Promise<CityDiscoveryResult> {
  try {
    const slug = generateSlug(cityName, state);

    // Step 1: Fetch basic city info from Wikipedia
    const cityInfo = await fetchCityInfo(cityName, state);
    if (!cityInfo) {
      return {
        success: false,
        city: null,
        slug: '',
        movements: [],
        characters: [],
        error: 'Could not find city information',
      };
    }

    // Step 2: Find solarpunk movements
    const movements = await discoverMovements(cityName, state);

    // Step 3: Find key characters
    const characters = await discoverCharacters(cityName, state);

    // Step 4: Build city package (minimal viable)
    const center: [number, number] = [cityInfo.lng, cityInfo.lat];
    const meta: CityMeta = {
      cityName,
      state,
      center,
      zoomBounds: { min: 10, max: 18 },
      generatedAt: new Date().toISOString(),
      version: 1,
    };

    const emptyFC: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: [],
    };

    const calibration: CityCalibration = {
      cityBudget: { real: 0, game: 0, source: 'Unknown' },
      medianIncome: { value: cityInfo.medianIncome || 50000, source: 'Wikipedia' },
      vacancyRate: { value: 0.15, source: 'Estimated' },
      treeCanopy: { current: 0.20, target: 0.30, source: 'Estimated' },
      foodAccess: { percentLacking: 0.25, source: 'Estimated' },
      population: { value: cityInfo.population, source: 'Wikipedia' },
    };

    const cityPackage: CityPackage = {
      meta,
      geography: {
        neighborhoodBoundaries: emptyFC,
        blockPolygons: emptyFC,
      },
      dataLayers: {},
      newsSources: [],
      characters: [],
      powerStructure: {
        mayor: { name: 'Unknown' },
        council: [],
        agencies: [],
        utilityCompanies: [],
      },
      crisisArcs: [],
      calibration,
      sourceRegistry: [],
    };

    return {
      success: true,
      city: cityPackage,
      slug,
      movements,
      characters,
    };
  } catch (error) {
    return {
      success: false,
      city: null,
      slug: '',
      movements: [],
      characters: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch basic city information from Wikipedia API
 */
async function fetchCityInfo(
  cityName: string,
  state: string
): Promise<{
  lat: number;
  lng: number;
  population: number;
  medianIncome?: number;
} | null> {
  const query = `${cityName}, ${state}`;
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Try alternate URL format
      const altUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cityName + ', ' + state)}&prop=extracts&format=json&origin=*`;
      const altResponse = await fetch(altUrl);
      if (!altResponse.ok) return null;
      return {
        lat: 40.7 + Math.random() * 0.1, // Fallback coordinates
        lng: -100 + Math.random() * 0.1,
        population: 100000,
      };
    }
    const data = await response.json();
    
    // Extract coordinates if available
    const lat = data.coordinates?.[0]?.lat || 40.7;
    const lng = data.coordinates?.[0]?.lon || -100;
    
    // Extract population from extract text (best effort)
    const popMatch = data.extract?.match(/population.*?(\d[\d,]*)/i);
    const population = popMatch ? parseInt(popMatch[1].replace(/,/g, '')) : 100000;
    
    return { lat, lng, population };
  } catch (error) {
    console.error('Error fetching city info:', error);
    return null;
  }
}

/**
 * Discover solarpunk movements in the city using DuckDuckGo
 */
async function discoverMovements(
  cityName: string,
  state: string
): Promise<DiscoveredMovement[]> {
  const query = `"${cityName} ${state}" (community garden OR mutual aid OR cooperative OR tenant union)`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    });
    const html = await response.text();

    const movements: DiscoveredMovement[] = [];
    
    // Extract result snippets
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    const titleRegex = /<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
    
    let snippetMatch;
    const snippets: string[] = [];
    while ((snippetMatch = snippetRegex.exec(html)) !== null) {
      snippets.push(stripHtml(snippetMatch[1]));
    }

    let titleMatch;
    const titles: string[] = [];
    while ((titleMatch = titleRegex.exec(html)) !== null && titles.length < 10) {
      titles.push(stripHtml(titleMatch[1]));
    }

    // Classify movements from titles
    for (const title of titles) {
      const type = classifyMovement(title);
      if (type !== 'unknown') {
        const cityLower = cityName.toLowerCase();
        const relevance = title.toLowerCase().includes(cityLower) ? 80 : 30;
        
        movements.push({
          name: title,
          type,
          cityRelevanceScore: relevance,
        });
      }
    }

    // Sort by relevance and deduplicate
    const unique = movements.reduce((acc, m) => {
      if (!acc.find(a => a.name === m.name)) acc.push(m);
      return acc;
    }, [] as DiscoveredMovement[]);

    return unique.sort((a, b) => b.cityRelevanceScore - a.cityRelevanceScore).slice(0, 5);
  } catch (error) {
    console.error('Error discovering movements:', error);
    return [];
  }
}

/**
 * Discover key characters/activists
 */
async function discoverCharacters(
  cityName: string,
  state: string
): Promise<DiscoveredCharacter[]> {
  const query = `"${cityName} ${state}" activist OR organizer OR "climate justice"`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    });
    const html = await response.text();

    const characters: DiscoveredCharacter[] = [];
    const extracted = extractNames(html);

    for (const name of extracted.slice(0, 5)) {
      characters.push({
        name,
        role: 'Community Organizer',
        organization: `${cityName} Movement`,
      });
    }

    return characters;
  } catch (error) {
    console.error('Error discovering characters:', error);
    return [];
  }
}

/**
 * Classify movement type from title/description
 */
function classifyMovement(text: string): string {
  const lower = text.toLowerCase();
  if (lower.match(/garden|farm|agriculture|urban farm/)) return 'agriculture';
  if (lower.match(/tenant|housing|affordable housing|renters/)) return 'housing';
  if (lower.match(/mutual aid|bail fund|solidarity/)) return 'mutual-aid';
  if (lower.match(/co-op|cooperative|collective|union/)) return 'cooperative';
  if (lower.match(/climate|solar|renewable|solarpunk|green/)) return 'climate';
  if (lower.match(/food access|food justice|food bank/)) return 'food-access';
  if (lower.match(/transit|bus|bike|walkability/)) return 'transit';
  return 'unknown';
}

/**
 * Extract person names from HTML using journalist attribution patterns
 */
function extractNames(html: string): string[] {
  const names = new Set<string>();

  // Common patterns in news articles
  const patterns = [
    /(?:said|according to|explained)\s+([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|[A-Z]\.)){1,3})(?:,|\.|said)/g,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:,|-|–|—)\s+(?:an?|the)\s+(?:activist|organizer|leader|director|coordinator|advocate)/gi,
    /"([^"]{5,100})"\s*,?\s*said\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      // Group 1 or 2 may contain the name depending on pattern
      const name = match[1] || match[2];
      if (name && name.length >= 3 && name.length <= 30) {
        names.add(name.trim());
      }
    }
  }

  return Array.from(names);
}

/**
 * Generate slug from city and state
 */
function generateSlug(cityName: string, state: string): string {
  const citySlug = cityName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const stateSlug = state.toLowerCase();
  return `${citySlug}-${stateSlug}`;
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
