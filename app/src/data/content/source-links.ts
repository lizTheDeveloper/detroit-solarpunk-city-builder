/**
 * Source Links — Maps known organization/source names to their real-world URLs.
 * Used by LinkedText component to auto-link citations in the game UI.
 *
 * Entries are ordered longest-first so that "EPA Brownfields Program" matches
 * before a hypothetical shorter substring would.
 */

export interface SourceLink {
  name: string;
  url: string;
}

export const SOURCE_LINKS: SourceLink[] = [
  // Full names first (longer matches take priority)
  { name: 'EPA Brownfields Program', url: 'https://www.epa.gov/brownfields' },
  { name: 'EPA Brownfields', url: 'https://www.epa.gov/brownfields' },
  { name: 'Great Lakes Water Authority', url: 'https://www.glwater.org' },
  { name: 'Greening of Detroit', url: 'https://www.greeningofdetroit.com' },
  { name: 'Friends of the Rouge', url: 'https://therouge.org' },
  { name: 'Storehouse of Hope', url: 'https://www.storehouseofhope.org' },
  { name: 'Keep Growing Detroit', url: 'https://www.keepgrowingdetroit.org' },
  { name: 'Detroit Bird City', url: 'https://detroitaudubon.org' },
  { name: 'D-Town Farm', url: 'https://www.dtownfarm.com' },
  { name: 'Soulardarity', url: 'https://www.soulardarity.com' },
  { name: 'Slow Roll', url: 'https://slowroll.bike' },
  { name: 'Earthworks', url: 'https://www.earthworksurbanfarm.org' },
  { name: 'i3Detroit', url: 'https://www.i3detroit.org' },
  { name: 'SEMCOG', url: 'https://semcog.org' },
  { name: 'GLWA', url: 'https://www.glwater.org' },
  { name: 'UCHC', url: 'https://uchcdetroit.org' },
  { name: 'DWSD', url: 'https://www.detroitmi.gov/departments/water-and-sewerage-department' },
];
