import type { StyleSpecification } from 'maplibre-gl';

export function createDarkTerminalStyle(tileSourceUrl: string): StyleSpecification {
  return {
    version: 8,
    name: 'detroit-terminal',
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: tileSourceUrl,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#0a0a0a',
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: {
          'fill-color': '#0d1117',
        },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        paint: {
          'fill-color': '#0a1a0a',
        },
      },
      {
        id: 'landuse-industrial',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['==', 'class', 'industrial'],
        paint: {
          'fill-color': '#1a0a0a',
        },
      },
      {
        id: 'buildings',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        paint: {
          'fill-color': '#111811',
          'fill-outline-color': '#1a3a1a',
        },
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'minor', 'service', 'path'],
        paint: {
          'line-color': '#00ff41',
          'line-opacity': 0.3,
          'line-width': 0.5,
          'line-blur': 2,
        },
      },
      {
        id: 'roads',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary'],
        paint: {
          'line-color': '#00ff41',
          'line-opacity': 0.6,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 0.5,
            12, 1.5,
            16, 4,
          ] as unknown as number,
          'line-blur': 3,
        },
      },
      {
        id: 'road-labels',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        layout: {
          'text-field': '{name}',
          'text-font': ['Open Sans Regular'],
          'text-size': 11,
          'symbol-placement': 'line',
        },
        paint: {
          'text-color': '#00ff41',
          'text-halo-color': '#0a0a0a',
          'text-halo-width': 1,
        },
      },
      {
        id: 'place-labels',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        layout: {
          'text-field': '{name}',
          'text-font': ['Open Sans Regular'],
          'text-size': 14,
        },
        paint: {
          'text-color': '#2ea043',
          'text-halo-color': '#0a0a0a',
          'text-halo-width': 1,
        },
      },
    ],
  };
}
