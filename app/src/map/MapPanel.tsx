import { useState, useCallback, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

import { createDarkTerminalStyle } from './map-style';
import { DETROIT_CENTER, DETROIT_BOUNDS } from './types';
import type { MapViewState } from './types';

// ── Inline neighborhoods GeoJSON (tiny dataset) ──────────────────
const NEIGHBORHOODS_GEOJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'brightmoor', name: 'Brightmoor' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-83.2700, 42.3800], [-83.2450, 42.3800],
          [-83.2450, 42.3950], [-83.2700, 42.3950],
          [-83.2700, 42.3800],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'corktown', name: 'Corktown' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-83.0750, 42.3250], [-83.0550, 42.3250],
          [-83.0550, 42.3400], [-83.0750, 42.3400],
          [-83.0750, 42.3250],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'eastern-market', name: 'Eastern Market' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-83.0500, 42.3450], [-83.0350, 42.3450],
          [-83.0350, 42.3550], [-83.0500, 42.3550],
          [-83.0500, 42.3450],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'southwest-detroit', name: 'Southwest Detroit' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-83.1200, 42.2950], [-83.0750, 42.2950],
          [-83.0750, 42.3250], [-83.1200, 42.3250],
          [-83.1200, 42.2950],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'indian-village', name: 'Indian Village' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-83.0150, 42.3500], [-82.9950, 42.3500],
          [-82.9950, 42.3650], [-83.0150, 42.3650],
          [-83.0150, 42.3500],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'hamtramck', name: 'Hamtramck' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-83.0700, 42.3850], [-83.0400, 42.3850],
          [-83.0400, 42.4050], [-83.0700, 42.4050],
          [-83.0700, 42.3850],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'north-end', name: 'North End' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-83.0850, 42.3650], [-83.0550, 42.3650],
          [-83.0550, 42.3850], [-83.0850, 42.3850],
          [-83.0850, 42.3650],
        ]],
      },
    },
  ],
};

interface MapPanelProps {
  onSelectTile: (tileId: string) => void;
  selectedTileId: string | null;
  tileHealthMap?: Record<string, number>;
}

const TILE_SOURCE_URL =
  import.meta.env.VITE_TILE_SOURCE || 'https://tiles.openfreemap.org/styles/liberty';

export default function MapPanel({ onSelectTile, selectedTileId, tileHealthMap }: MapPanelProps) {
  const [viewState, setViewState] = useState<MapViewState>(DETROIT_CENTER);
  const [blocksData, setBlocksData] = useState<FeatureCollection | null>(null);

  // Lazy-load blocks GeoJSON
  useEffect(() => {
    fetch('/data/detroit-blocks.geojson')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data) setBlocksData(data as FeatureCollection);
      })
      .catch(() => {
        // Blocks data is optional; silent fail
      });
  }, []);

  // Build neighborhood fill colors from tileHealthMap
  const neighborhoodFillData: FeatureCollection = {
    ...NEIGHBORHOODS_GEOJSON,
    features: NEIGHBORHOODS_GEOJSON.features.map((f) => {
      const id = f.properties?.id as string;
      const health = tileHealthMap?.[id] ?? 50;
      return {
        ...f,
        properties: {
          ...f.properties,
          health,
          selected: id === selectedTileId ? 1 : 0,
        },
      };
    }),
  };

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        onSelectTile(feature.properties.id as string);
      }
    },
    [onSelectTile],
  );

  const mapStyle = createDarkTerminalStyle(TILE_SOURCE_URL);

  return (
    <div className="map-panel" data-testid="map-panel">
      <div className="map-panel__header">
        <span className="map-panel__title">CITY MAP</span>
        <span className="map-panel__coords">
          {viewState.latitude.toFixed(4)}, {viewState.longitude.toFixed(4)} z{viewState.zoom.toFixed(1)}
        </span>
      </div>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', flex: 1 }}
        mapStyle={mapStyle}
        maxBounds={DETROIT_BOUNDS}
        interactiveLayerIds={['neighborhood-fill']}
        onClick={handleClick}
        data-testid="map-container"
      >
        <NavigationControl position="top-right" />

        {/* Neighborhood polygons */}
        <Source id="neighborhoods" type="geojson" data={neighborhoodFillData}>
          {/* Fill layer colored by health */}
          <Layer
            id="neighborhood-fill"
            type="fill"
            paint={{
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'health'],
                0, 'rgba(248, 113, 113, 0.25)',
                50, 'rgba(251, 191, 36, 0.15)',
                100, 'rgba(0, 255, 65, 0.2)',
              ],
              'fill-opacity': 0.6,
            }}
          />
          {/* Border line */}
          <Layer
            id="neighborhood-border"
            type="line"
            paint={{
              'line-color': [
                'case',
                ['==', ['get', 'selected'], 1],
                '#fbbf24',
                '#00ff41',
              ],
              'line-width': [
                'case',
                ['==', ['get', 'selected'], 1],
                3,
                1.5,
              ],
              'line-opacity': 0.8,
            }}
          />
          {/* Labels */}
          <Layer
            id="neighborhood-labels"
            type="symbol"
            layout={{
              'text-field': ['get', 'name'],
              'text-font': ['Open Sans Regular'],
              'text-size': 12,
              'text-anchor': 'center',
            }}
            paint={{
              'text-color': '#00ff41',
              'text-halo-color': '#0a0a0a',
              'text-halo-width': 1,
            }}
          />
        </Source>

        {/* Block polygons (lazily loaded, visible at high zoom) */}
        {blocksData && (
          <Source id="blocks" type="geojson" data={blocksData}>
            <Layer
              id="block-outlines"
              type="line"
              minzoom={14}
              paint={{
                'line-color': '#00ff41',
                'line-opacity': 0.3,
                'line-width': 0.5,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
