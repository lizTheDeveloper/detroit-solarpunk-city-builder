import { useGame } from '@/state/store';
import type { Tile, VisualStage } from '@/state/types';

const STAGE_COLORS: Record<VisualStage, string> = {
  dystopia: '#6b7280',
  transition: '#4ade80',
  restoration: '#22c55e',
  beyond: '#10b981',
};

const TERRAIN_LABELS: Record<string, string> = {
  'urban-dense': 'Urban Dense',
  'urban-sparse': 'Urban Sparse',
  vacant: 'Vacant',
  industrial: 'Industrial',
  waterfront: 'Waterfront',
  park: 'Park',
  water: 'Water',
};

interface TileListProps {
  selectedTileId: string | null;
  onSelectTile: (tileId: string) => void;
}

function TileCard({ tile, selected, onSelect }: { tile: Tile; selected: boolean; onSelect: () => void }) {
  const activeCount = tile.activeProjects.length;

  return (
    <button
      className={`tile-card ${selected ? 'tile-card--selected' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <div className="tile-card-header">
        <span
          className="tile-stage-dot"
          style={{ backgroundColor: STAGE_COLORS[tile.visualStage] }}
          title={tile.visualStage}
        />
        <span className="tile-name">{tile.name}</span>
        <span className="tile-terrain-badge">{TERRAIN_LABELS[tile.terrain] ?? tile.terrain}</span>
      </div>
      <div className="tile-card-stats">
        <div className="tile-eco-bar-wrapper">
          <div className="tile-eco-bar">
            <div
              className="tile-eco-bar-fill"
              style={{ width: `${Math.min(100, tile.ecologicalHealth)}%` }}
            />
          </div>
          <span className="tile-eco-label">Eco {Math.round(tile.ecologicalHealth)}%</span>
        </div>
        {tile.gentrificationPressure > 0 && (
          <span className="tile-gent-indicator" title="Gentrification Pressure">
            Gent {Math.round(tile.gentrificationPressure)}%
          </span>
        )}
        {activeCount > 0 && (
          <span className="tile-project-count">
            {activeCount} project{activeCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  );
}

export default function TileList({ selectedTileId, onSelectTile }: TileListProps) {
  const { state } = useGame();
  const tiles = Object.values(state.tiles);

  return (
    <div className="tile-list">
      <h2 className="tile-list-title">Neighborhoods</h2>
      {tiles.map((tile) => (
        <TileCard
          key={tile.id}
          tile={tile}
          selected={tile.id === selectedTileId}
          onSelect={() => onSelectTile(tile.id)}
        />
      ))}
    </div>
  );
}
