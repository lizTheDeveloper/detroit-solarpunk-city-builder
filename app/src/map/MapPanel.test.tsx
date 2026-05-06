import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock maplibre-gl before importing the component
vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(),
    NavigationControl: vi.fn(),
  },
  Map: vi.fn(),
  NavigationControl: vi.fn(),
}));

// Mock react-map-gl/maplibre — render children and capture sources
vi.mock('react-map-gl/maplibre', () => {
  const MockMap = ({ children, ...props }: any) => (
    <div data-testid="maplibre-map" data-style={JSON.stringify(props.mapStyle?.name)}>
      {children}
    </div>
  );

  const MockSource = ({ children, id }: any) => (
    <div data-testid={`source-${id}`}>{children}</div>
  );

  const MockLayer = ({ id }: any) => <div data-testid={`layer-${id}`} />;

  const MockNavigationControl = () => <div data-testid="nav-control" />;

  return {
    default: MockMap,
    Source: MockSource,
    Layer: MockLayer,
    NavigationControl: MockNavigationControl,
  };
});

// Mock maplibre-gl CSS import
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

// Mock fetch for blocks data
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
  });
});

import MapPanel from './MapPanel';

describe('MapPanel', () => {
  const defaultProps = {
    onSelectTile: vi.fn(),
    selectedTileId: null,
  };

  it('renders the map panel container', () => {
    render(<MapPanel {...defaultProps} />);
    expect(screen.getByTestId('map-panel')).toBeInTheDocument();
  });

  it('renders the CITY MAP header', () => {
    render(<MapPanel {...defaultProps} />);
    expect(screen.getByText('CITY MAP')).toBeInTheDocument();
  });

  it('renders the maplibre map component', () => {
    render(<MapPanel {...defaultProps} />);
    expect(screen.getByTestId('maplibre-map')).toBeInTheDocument();
  });

  it('renders the neighborhoods source', () => {
    render(<MapPanel {...defaultProps} />);
    expect(screen.getByTestId('source-neighborhoods')).toBeInTheDocument();
  });

  it('renders neighborhood layers', () => {
    render(<MapPanel {...defaultProps} />);
    expect(screen.getByTestId('layer-neighborhood-fill')).toBeInTheDocument();
    expect(screen.getByTestId('layer-neighborhood-border')).toBeInTheDocument();
    expect(screen.getByTestId('layer-neighborhood-labels')).toBeInTheDocument();
  });

  it('renders navigation control', () => {
    render(<MapPanel {...defaultProps} />);
    expect(screen.getByTestId('nav-control')).toBeInTheDocument();
  });

  it('does not render blocks source before fetch completes', () => {
    render(<MapPanel {...defaultProps} />);
    expect(screen.queryByTestId('source-blocks')).not.toBeInTheDocument();
  });

  it('shows current coordinates in header', () => {
    render(<MapPanel {...defaultProps} />);
    // DETROIT_CENTER coords
    expect(screen.getByText(/42\.3314/)).toBeInTheDocument();
    expect(screen.getByText(/-83\.0458/)).toBeInTheDocument();
  });
});
