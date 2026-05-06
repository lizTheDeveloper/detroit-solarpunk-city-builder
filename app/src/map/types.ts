import type { Feature, Polygon, FeatureCollection } from 'geojson';

export interface BlockProperties {
  blockId: string;
  neighborhoodId: string;
  terrain: string;
  area: number;
}

export type BlockFeature = Feature<Polygon, BlockProperties>;
export type BlockCollection = FeatureCollection<Polygon, BlockProperties>;

export interface NeighborhoodProperties {
  id: string;
  name: string;
}

export type NeighborhoodFeature = Feature<Polygon, NeighborhoodProperties>;
export type NeighborhoodCollection = FeatureCollection<Polygon, NeighborhoodProperties>;

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface MapSelection {
  type: 'neighborhood' | 'block';
  id: string;
}

export const DETROIT_CENTER: MapViewState = {
  longitude: -83.0458,
  latitude: 42.3314,
  zoom: 11.5,
};

export const DETROIT_BOUNDS: [[number, number], [number, number]] = [
  [-83.29, 42.25],
  [-82.91, 42.45],
];
