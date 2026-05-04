import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import type { Tile } from '@/state/types';

interface TileDetailPanelProps {
  tileId: string;
  onStartProjectClick: () => void;
}

function ProgressBar({ progress, duration }: { progress: number; duration: number }) {
  const pct = Math.round((progress / duration) * 100);
  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      <span className="progress-bar-label">{progress}/{duration} turns ({pct}%)</span>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="property-row">
      <span className="property-label">{label}</span>
      <span className="property-value">{value}</span>
    </div>
  );
}

export default function TileDetailPanel({ tileId, onStartProjectClick }: TileDetailPanelProps) {
  const { state } = useGame();
  const tile: Tile | undefined = state.tiles[tileId];

  if (!tile) {
    return <div className="panel">Tile not found</div>;
  }

  return (
    <div className="panel tile-detail-panel">
      <h2 className="panel-title">{tile.name}</h2>
      <div className="panel-subtitle">{tile.terrain} terrain</div>

      <div className="tile-properties">
        <PropertyRow label="Eco Health" value={`${Math.round(tile.ecologicalHealth)}%`} />
        <PropertyRow label="Contamination" value={`${Math.round(tile.contamination)}%`} />
        <PropertyRow label="Gentrification" value={`${Math.round(tile.gentrificationPressure)}%`} />
        <PropertyRow label="Vacancy" value={`${Math.round(tile.vacancyRate)}%`} />
        <PropertyRow label="Visual Stage" value={tile.visualStage} />
        <PropertyRow label="Community Owned" value={tile.communityOwned ? 'Yes' : 'No'} />
        <PropertyRow label="Power Tokens" value={tile.communityPowerTokens} />
      </div>

      {tile.existingUses.length > 0 && (
        <div className="tile-section">
          <h3 className="tile-section-title">Existing Uses</h3>
          <div className="tag-list">
            {tile.existingUses.map((use) => (
              <span key={use} className="tag">{use.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </div>
      )}

      {tile.neighborhoodTraits.length > 0 && (
        <div className="tile-section">
          <h3 className="tile-section-title">Traits</h3>
          <div className="tag-list">
            {tile.neighborhoodTraits.map((trait) => (
              <span key={trait} className="tag tag--trait">{trait.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </div>
      )}

      {tile.activeProjects.length > 0 && (
        <div className="tile-section">
          <h3 className="tile-section-title">Active Projects</h3>
          {tile.activeProjects.map((proj) => {
            const def = PROJECT_CATALOG[proj.definitionId];
            return (
              <div key={`${proj.definitionId}-${proj.tileId}`} className="active-project-item">
                <div className="active-project-header">
                  <span className="active-project-name">{def?.name ?? proj.definitionId}</span>
                  <span className={`mode-badge mode-badge--${proj.mode}`}>
                    {proj.mode === 'community-led' ? 'Community' : 'Player'}
                  </span>
                </div>
                <ProgressBar progress={proj.progress} duration={proj.duration} />
              </div>
            );
          })}
        </div>
      )}

      {tile.completedProjects.length > 0 && (
        <div className="tile-section">
          <h3 className="tile-section-title">Completed</h3>
          <div className="tag-list">
            {tile.completedProjects.map((pid, i) => {
              const def = PROJECT_CATALOG[pid];
              return (
                <span key={`${pid}-${i}`} className="tag tag--completed">
                  {def?.name ?? pid}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <button className="btn btn-primary start-project-btn" onClick={onStartProjectClick} type="button">
        Start Project
      </button>
    </div>
  );
}
