export interface DataPoint {
  lat: number;
  lon: number;
  value: any;
  source: string;
  fetchedAt: string;
}

export interface CensusBlockGroup {
  geoid: string;
  population: number;
  medianIncome: number;
  vacancyRate: number;
  povertyRate: number;
}

export interface EpaSite {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'brownfield' | 'superfund' | 'echo_facility';
  status: string;
  contaminants?: string[];
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export const DETROIT_BBOX: BoundingBox = {
  south: 42.25,
  west: -83.30,
  north: 42.45,
  east: -82.91,
};
