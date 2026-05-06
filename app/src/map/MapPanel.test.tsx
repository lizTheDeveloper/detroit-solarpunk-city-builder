import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapPanel from './MapPanel';

vi.mock('maplibre-gl', () => ({
  Map: vi.fn(() => ({
    on: vi.fn(),
    remove: vi.fn(),
    addControl: vi.fn(),
    getCanvas: vi.fn(() => ({ style: {} })),
  })),
  NavigationControl: vi.fn(),
}));

vi.mock('react-map-gl/maplibre', () => {
  const MockMap = ({ children, ...props }: any) => (
    <div data-testid="map-container" data-zoom={props.initialViewState?.zoom}>
      {children}
    </div>
  );
  return {
    __esModule: true,
    default: MockMap,
    Source: ({ children, ...props }: any) => <div data-testid={`source-${props.id}`}>{children}</div>,
    Layer: (props: any) => <div data-testid={`layer-${props.id}`} />,
    NavigationControl: () => <div data-testid="nav-control" />,
  };
});

describe('MapPanel', () => {
  it('renders a map panel', () => {
    render(<MapPanel onSelectTile={() => {}} selectedTileId={null} />);
    expect(screen.getByTestId('map-panel')).toBeDefined();
  });

  it('shows CITY MAP header', () => {
    render(<MapPanel onSelectTile={() => {}} selectedTileId={null} />);
    expect(screen.getByText('CITY MAP')).toBeDefined();
  });

  it('renders map container', () => {
    render(<MapPanel onSelectTile={() => {}} selectedTileId={null} />);
    expect(screen.getByTestId('map-container')).toBeDefined();
  });

  it('renders neighborhoods source and layers', () => {
    render(<MapPanel onSelectTile={() => {}} selectedTileId={null} />);
    expect(screen.getByTestId('source-neighborhoods')).toBeDefined();
    expect(screen.getByTestId('layer-neighborhood-fill')).toBeDefined();
    expect(screen.getByTestId('layer-neighborhood-borders')).toBeDefined();
  });

  it('renders navigation control', () => {
    render(<MapPanel onSelectTile={() => {}} selectedTileId={null} />);
    expect(screen.getByTestId('nav-control')).toBeDefined();
  });

  it('displays coordinates', () => {
    render(<MapPanel onSelectTile={() => {}} selectedTileId={null} />);
    expect(screen.getByText('42.3314, -83.0458')).toBeDefined();
  });
});
