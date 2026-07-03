// Discovered cities storage
// Persist discovered city slugs and basic info in localStorage

export interface DiscoveredCity {
  slug: string;
  cityName: string;
  state: string;
  movements: string[];
  discoveredAt: string;
}

const STORAGE_KEY = 'solarpunk_discovered_cities';

export function getDiscoveredCities(): DiscoveredCity[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addDiscoveredCity(city: DiscoveredCity): void {
  const cities = getDiscoveredCities();
  const existing = cities.findIndex(c => c.slug === city.slug);
  if (existing >= 0) {
    cities[existing] = city;
  } else {
    cities.push(city);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
}

export function isCityDiscovered(slug: string): boolean {
  return getDiscoveredCities().some(c => c.slug === slug);
}
