import { useCallback, useEffect, useMemo, useState } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createDarkTerminalStyle } from './map-style';
import { DETROIT_CENTER, DETROIT_BOUNDS } from './types';
import type { MapViewState } from './types';

const TILE_SOURCE = import.meta.env.VITE_TILE_SOURCE
  || 'https://tiles.openfreemap.org/styles/liberty';

const NEIGHBORHOODS_DATA = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature' as const, properties: { id: 'brightmoor', name: 'Brightmoor' }, geometry: { type: 'Polygon' as const, coordinates: [[[-83.2700,42.3800],[-83.2450,42.3800],[-83.2450,42.3950],[-83.2700,42.3950],[-83.2700,42.3800]]] } },
    { type: 'Feature' as const, properties: { id: 'corktown', name: 'Corktown' }, geometry: { type: 'Polygon' as const, coordinates: [[[-83.0750,42.3250],[-83.0550,42.3250],[-83.0550,42.3400],[-83.0750,42.3400],[-83.0750,42.3250]]] } },
    { type: 'Feature' as const, properties: { id: 'eastern-market', name: 'Eastern Market' }, geometry: { type: 'Polygon' as const, coordinates: [[[-83.0500,42.3450],[-83.0350,42.3450],[-83.0350,42.3550],[-83.0500,42.3550],[-83.0500,42.3450]]] } },
    { type: 'Feature' as const, properties: { id: 'southwest-detroit', name: 'Southwest Detroit' }, geometry: { type: 'Polygon' as const, coordinates: [[[-83.1200,42.2950],[-83.0750,42.2950],[-83.0750,42.3250],[-83.1200,42.3250],[-83.1200,42.2950]]] } },
    { type: 'Feature' as const, properties: { id: 'indian-village', name: 'Indian Village' }, geometry: { type: 'Polygon' as const, coordinates: [[[-83.0150,42.3500],[-82.9950,42.3500],[-82.9950,42.3650],[-83.0150,42.3650],[-83.0150,42.3500]]] } },
    { type: 'Feature' as const, properties: { id: 'hamtramck', name: 'Hamtramck' }, geometry: { type: 'Polygon' as const, coordinates: [[[-83.0700,42.3850],[-83.0400,42.3850],[-83.0400,42.4050],[-83.0700,42.4050],[-83.0700,42.3850]]] } },
    { type: 'Feature' as const, properties: { id: 'north-end', name: 'North End' }, geometry: { type: 'Polygon' as const, coordinates: [[[-83.0850,42.3650],[-83.0550,42.3650],[-83.0550,42.3850],[-83.0850,42.3850],[-83.0850,42.3650]]] } },
  ],
};

interface MapPanelProps {
  onSelectTile: (tileId: string) => void;
  selectedTileId: string | null;
  tileHealthMap?: Record<string, number>;
}

export default function MapPanel({ onSelectTile, selectedTileId, tileHealthMap = {} }: MapPanelProps) {
  const [viewState, setViewState] = useState<MapViewState>(DETROIT_CENTER);
  const [blocksData, setBlocksData] = useState<object | null>(null);

  const mapStyle = useMemo(() => createDarkTerminalStyle(TILE_SOURCE), []);

  useEffect(() => {
    fetch('/data/detroit-blocks.geojson')
      .then(res => { if (res.ok) return res.json(); return null; })
      .then(data => { if (data) setBlocksData(data); })
      .catch(() => {});
  }, []);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.properties?.id) {
      onSelectTile(feature.properties.id);
    }
  }, [onSelectTile]);

  const neighborhoodFillPaint = useMemo(() => {
    const stops: string[] = [];
    for (const [id, health] of Object.entries(tileHealthMap)) {
      const r = Math.round(255 * (1 - health / 100));
      const g = Math.round(255 * (health / 100));
      stops.push(id, `rgba(${r}, ${g}, 50, 0.15)`);
    }
    if (stops.length === 0) {
      return { 'fill-color': 'rgba(0, 255, 65, 0.05)', 'fill-opacity': 0.5 };
    }
    return {
      'fill-color': ['match', ['get', 'id'], ...stops, 'rgba(0, 255, 65, 0.05)'],
      'fill-opacity': 0.5,
    };
  }, [tileHealthMap]);

  const selectedFilter = useMemo(
    () => selectedTileId ? ['==', ['get', 'id'], selectedTileId] : ['==', 1, 0],
    [selectedTileId],
  );

  return (
    <div className="map-panel" data-testid="map-panel">
      <div className="map-panel__header">
        <span className="map-panel__title">CITY MAP</span>
        <span className="map-panel__coords">
          {viewState.latitude.toFixed(4)}, {viewState.longitude.toFixed(4)}
        </span>
      </div>
      <Map
        initialViewState={DETROIT_CENTER}
        onMove={e => setViewState(e.viewState)}
        mapStyle={mapStyle}
        maxBounds={DETROIT_BOUNDS}
        interactiveLayerIds={['neighborhood-fill']}
        onClick={handleClick}
        style={{ width: '100%', height: '100%' }}
        cursor="pointer"
      >
        <NavigationControl position="top-right" />

        <Source id="neighborhoods" type="geojson" data={NEIGHBORHOODS_DATA as any}>
          <Layer
            id="neighborhood-fill"
            type="fill"
            paint={neighborhoodFillPaint as any}
          />
          <Layer
            id="neighborhood-borders"
            type="line"
            paint={{ 'line-color': '#00ff41', 'line-width': 1.5, 'line-opacity': 0.6 }}
          />
          <Layer
            id="neighborhood-selected"
            type="line"
            filter={selectedFilter as any}
            paint={{ 'line-color': '#f0c040', 'line-width': 3, 'line-opacity': 1 }}
          />
          <Layer
            id="neighborhood-labels"
            type="symbol"
            layout={{ 'text-field': ['upcase', ['get', 'name']], 'text-size': 12 }}
            paint={{ 'text-color': '#2ea043', 'text-halo-color': '#0a0a0a', 'text-halo-width': 2 }}
          />
        </Source>

        {blocksData && (
          <Source id="blocks" type="geojson" data={blocksData as any}>
            <Layer
              id="block-fills"
              type="fill"
              paint={{ 'fill-color': 'rgba(0, 255, 65, 0.03)', 'fill-opacity': 0.5 }}
              minzoom={14}
            />
            <Layer
              id="block-outlines"
              type="line"
              paint={{ 'line-color': '#00ff41', 'line-width': 0.3, 'line-opacity': 0.3 }}
              minzoom={14}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
