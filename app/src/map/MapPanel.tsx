import { useCallback, useEffect, useMemo, useState } from 'react';
import MapGL, { Source, Layer, NavigationControl, Popup } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createDarkTerminalStyle } from './map-style';
import { DETROIT_CENTER, DETROIT_BOUNDS } from './types';
import type { MapViewState } from './types';
import type { Headline } from '@/hooks/useHeadlines';

const TILE_SOURCE = import.meta.env.VITE_TILE_SOURCE
  || 'https://tiles.openfreemap.org/planet';

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as any[] };

interface HeadlinePin {
  neighborhoodId: string;
  lng: number;
  lat: number;
  count: number;
  maxSeverity: number;
  headlines: Headline[];
}

function computeCentroids(features: any[]): Record<string, [number, number]> {
  const centroids: Record<string, [number, number]> = {};
  for (const f of features) {
    const geom = f.geometry;
    const ring = geom.type === 'MultiPolygon' ? geom.coordinates[0][0] : geom.coordinates[0];
    if (!ring || ring.length === 0) continue;
    let lngSum = 0, latSum = 0;
    for (const [lng, lat] of ring) {
      lngSum += lng;
      latSum += lat;
    }
    centroids[f.properties.id] = [lngSum / ring.length, latSum / ring.length];
  }
  return centroids;
}

function buildHeadlinePins(headlines: Headline[], centroids: Record<string, [number, number]>): HeadlinePin[] {
  const byHood = new Map<string, Headline[]>();
  for (const h of headlines) {
    if (!h.neighborhoodTag) continue;
    const tag = h.neighborhoodTag.replace(/_/g, '-');
    if (!centroids[tag]) continue;
    if (!byHood.has(tag)) byHood.set(tag, []);
    byHood.get(tag)!.push(h);
  }
  const pins: HeadlinePin[] = [];
  for (const [id, hList] of byHood) {
    const [lng, lat] = centroids[id];
    pins.push({
      neighborhoodId: id,
      lng, lat,
      count: hList.length,
      maxSeverity: Math.max(...hList.map(h => h.severity)),
      headlines: hList,
    });
  }
  return pins;
}

interface MapPanelProps {
  onSelectTile: (tileId: string) => void;
  onSelectBlock?: (blockId: string, neighborhoodId: string) => void;
  selectedTileId: string | null;
  selectedBlockId?: string | null;
  tileHealthMap?: Record<string, number>;
  headlines?: Headline[];
}

export default function MapPanel({ onSelectTile, onSelectBlock, selectedTileId, selectedBlockId, tileHealthMap = {}, headlines = [] }: MapPanelProps) {
  const [viewState, setViewState] = useState<MapViewState>(DETROIT_CENTER);
  const [neighborhoodsData, setNeighborhoodsData] = useState<any>(EMPTY_FC);
  const [blocksData, setBlocksData] = useState<object | null>(null);
  const [tileUrls, setTileUrls] = useState<string[] | null>(null);
  const [activePin, setActivePin] = useState<HeadlinePin | null>(null);

  useEffect(() => {
    fetch(TILE_SOURCE)
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (json?.tiles) setTileUrls(json.tiles); })
      .catch(() => {});
  }, []);

  const mapStyle = useMemo(
    () => createDarkTerminalStyle(tileUrls ?? TILE_SOURCE),
    [tileUrls],
  );

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/detroit-neighborhoods.geojson`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setNeighborhoodsData(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/detroit-blocks.geojson`)
      .then(res => { if (res.ok) return res.json(); return null; })
      .then(data => { if (data) setBlocksData(data); })
      .catch(() => {});
  }, []);

  const centroids = useMemo(() => computeCentroids(neighborhoodsData.features), [neighborhoodsData]);
  const headlinePins = useMemo(() => buildHeadlinePins(headlines, centroids), [headlines, centroids]);

  const headlinePinsGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: headlinePins.map(pin => ({
      type: 'Feature' as const,
      properties: {
        neighborhoodId: pin.neighborhoodId,
        count: pin.count,
        maxSeverity: pin.maxSeverity,
        label: String(pin.count),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [pin.lng, pin.lat],
      },
    })),
  }), [headlinePins]);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature?.properties) return;

    if (feature.layer?.id === 'headline-pins') {
      const nId = feature.properties.neighborhoodId;
      const pin = headlinePins.find(p => p.neighborhoodId === nId);
      if (pin) {
        setActivePin(prev => prev?.neighborhoodId === nId ? null : pin);
      }
      return;
    }

    setActivePin(null);

    if (feature.layer?.id === 'block-fills' && feature.properties.blockId && onSelectBlock) {
      onSelectBlock(feature.properties.blockId, feature.properties.neighborhoodId ?? '');
      return;
    }

    if (feature.properties.id) {
      onSelectTile(feature.properties.id);
    }
  }, [onSelectTile, onSelectBlock, headlinePins]);

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
    () => selectedTileId ? ['==', ['get', 'id'], selectedTileId] : ['==', ['get', 'id'], ''],
    [selectedTileId],
  );

  const selectedBlockFilter = useMemo(
    () => selectedBlockId ? ['==', ['get', 'blockId'], selectedBlockId] : ['==', ['get', 'blockId'], ''],
    [selectedBlockId],
  );

  return (
    <div className="map-panel" data-testid="map-panel">
      <div className="map-panel__header">
        <span className="map-panel__title">CITY MAP</span>
        <span className="map-panel__coords">
          {viewState.latitude.toFixed(4)}, {viewState.longitude.toFixed(4)}
        </span>
      </div>
      <MapGL
        initialViewState={DETROIT_CENTER}
        onMove={e => setViewState(e.viewState)}
        mapStyle={mapStyle}
        maxBounds={DETROIT_BOUNDS}
        interactiveLayerIds={['neighborhood-fill', 'block-fills', 'headline-pins']}
        onClick={handleClick}
        style={{ width: '100%', height: '100%' }}
        cursor="pointer"
      >
        <NavigationControl position="top-right" />

        <Source id="neighborhoods" type="geojson" data={neighborhoodsData}>
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
            layout={{ 'text-field': ['upcase', ['get', 'name']], 'text-font': ['Open Sans Regular'], 'text-size': 12 }}
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
            <Layer
              id="block-selected"
              type="line"
              filter={selectedBlockFilter as any}
              paint={{ 'line-color': '#f0c040', 'line-width': 2.5, 'line-opacity': 1 }}
              minzoom={14}
            />
          </Source>
        )}

        {headlinePinsGeoJson.features.length > 0 && (
          <Source id="headline-pins-source" type="geojson" data={headlinePinsGeoJson as any}>
            <Layer
              id="headline-pins-glow"
              type="circle"
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 14, 5, 22],
                'circle-color': ['match', ['get', 'maxSeverity'],
                  3, 'rgba(248, 113, 113, 0.2)',
                  2, 'rgba(251, 191, 36, 0.2)',
                  'rgba(96, 165, 250, 0.15)',
                ],
                'circle-blur': 0.8,
              }}
            />
            <Layer
              id="headline-pins"
              type="circle"
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 7, 5, 13],
                'circle-color': ['match', ['get', 'maxSeverity'],
                  3, '#f87171',
                  2, '#fbbf24',
                  1, '#60a5fa',
                  '#60a5fa',
                ],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#0a0a0a',
              }}
            />
            <Layer
              id="headline-pin-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'label'],
                'text-font': ['Open Sans Regular'],
                'text-size': 11,
                'text-allow-overlap': true,
              }}
              paint={{
                'text-color': '#0a0a0a',
              }}
            />
          </Source>
        )}

        {activePin && (
          <Popup
            longitude={activePin.lng}
            latitude={activePin.lat}
            closeOnClick={false}
            onClose={() => setActivePin(null)}
            className="headline-popup"
            maxWidth="280px"
          >
            <div className="headline-popup__inner">
              <div className="headline-popup__header">
                {neighborhoodsData.features.find((f: any) => f.properties.id === activePin.neighborhoodId)?.properties.name ?? activePin.neighborhoodId}
              </div>
              <ul className="headline-popup__list">
                {activePin.headlines.map(h => (
                  <li key={h.id} className={`headline-popup__item headline-popup__item--sev${h.severity}`}>
                    <a href={h.url} target="_blank" rel="noopener noreferrer">{h.headline}</a>
                    <div className="headline-popup__meta">
                      {h.arcs.length > 0 && <span className="headline-popup__arcs">{h.arcs.join(', ')}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
