import type { CensusBlockGroup } from './types';

const CENSUS_BASE = 'https://api.census.gov/data/2023/acs/acs5';
const VARIABLES = 'B01003_001E,B19013_001E,B25002_003E,B25001_001E';

export function parseCensusResponse(raw: any[][]): CensusBlockGroup[] {
  const [_header, ...rows] = raw;
  return rows.map(row => {
    const population = parseInt(row[0]) || 0;
    const medianIncome = parseInt(row[1]) || 0;
    const vacantUnits = parseInt(row[2]) || 0;
    const totalUnits = parseInt(row[3]) || 1;
    const state = row[4];
    const county = row[5];
    const tract = row[6];
    const blockGroup = row[7];

    return {
      geoid: `${state}${county}${tract}${blockGroup}`,
      population,
      medianIncome,
      vacancyRate: vacantUnits / totalUnits,
      povertyRate: 0,
    };
  });
}

export async function fetchCensusData(
  stateFips: string,
  countyFips: string
): Promise<CensusBlockGroup[]> {
  const url = `${CENSUS_BASE}?get=${VARIABLES}&for=block+group:*&in=state:${stateFips}&in=county:${countyFips}&in=tract:*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census API error: ${res.status}`);
  const data = await res.json();
  return parseCensusResponse(data);
}

export async function fetchDetroitCensus(): Promise<CensusBlockGroup[]> {
  return fetchCensusData('26', '163');
}
