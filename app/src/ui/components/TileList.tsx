import { useState } from 'react';
import { useGame } from '@/state/store';
import type { Tile, VisualStage } from '@/state/types';
import { DISTRICTS } from '@/data/content/districts';

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

function DistrictGroup({
  district,
  tiles,
  councilMember,
  selectedTileId,
  onSelectTile,
}: {
  district: typeof DISTRICTS[number];
  tiles: Tile[];
  councilMember: { name: string; disposition: number; leaning: string } | null;
  selectedTileId: string | null;
  onSelectTile: (tileId: string) => void;
}) {
  const hasSelected = tiles.some(t => t.id === selectedTileId);
  const [expanded, setExpanded] = useState(hasSelected);

  const avgEco = tiles.length > 0
    ? Math.round(tiles.reduce((sum, t) => sum + t.ecologicalHealth, 0) / tiles.length)
    : 0;

  const dispositionColor = councilMember
    ? councilMember.disposition > 30 ? '#4ade80'
    : councilMember.disposition > 0 ? '#a3e635'
    : councilMember.disposition > -30 ? '#fbbf24'
    : '#f87171'
    : '#6b7280';

  return (
    <div className={`district-group ${expanded ? 'district-group--expanded' : ''}`}>
      <button
        className="district-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span className="district-expand">{expanded ? '▾' : '▸'}</span>
        <span className="district-label">
          <span className="district-name">{district.name}</span>
          <span className="district-region">{district.region}</span>
        </span>
        {councilMember && (
          <span className="district-council" style={{ color: dispositionColor }}>
            {councilMember.name.split(' ').pop()}
          </span>
        )}
        <span className="district-eco">Eco {avgEco}%</span>
      </button>
      {expanded && (
        <div className="district-tiles">
          {tiles.map((tile) => (
            <TileCard
              key={tile.id}
              tile={tile}
              selected={tile.id === selectedTileId}
              onSelect={() => onSelectTile(tile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TileList({ selectedTileId, onSelectTile }: TileListProps) {
  const { state } = useGame();

  return (
    <div className="tile-list">
      <h2 className="tile-list-title">City Council Districts</h2>
      {DISTRICTS.map((district) => {
        const tiles = district.tileIds
          .map(id => state.tiles[id])
          .filter(Boolean);
        const cm = state.councilMembers[district.councilMemberId] ?? null;
        return (
          <DistrictGroup
            key={district.number}
            district={district}
            tiles={tiles}
            councilMember={cm}
            selectedTileId={selectedTileId}
            onSelectTile={onSelectTile}
          />
        );
      })}
    </div>
  );
}
