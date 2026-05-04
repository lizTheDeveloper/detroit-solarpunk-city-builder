import { useState } from 'react';
import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { canStartProject } from '@/systems/projects';
import type { ProjectMode, ProjectDefinition } from '@/state/types';

interface ProjectSelectPanelProps {
  tileId: string;
  onBack: () => void;
}

function formatCost(baseCost: number, mode: ProjectMode): string {
  const multiplier = mode === 'community-led' ? 1.3 : 1.0;
  return `$${(baseCost * multiplier).toFixed(2)}M`;
}

function formatDuration(baseDuration: number, mode: ProjectMode): string {
  if (mode === 'community-led') {
    const dur = Math.max(Math.ceil(baseDuration * 1.5), baseDuration + 1);
    return `${dur} turns`;
  }
  return `${baseDuration} turns`;
}

function ProjectRow({
  def,
  mode,
  canStart,
  reason,
  onStart,
}: {
  def: ProjectDefinition;
  mode: ProjectMode;
  canStart: boolean;
  reason?: string;
  onStart: () => void;
}) {
  return (
    <div className={`project-row ${!canStart ? 'project-row--disabled' : ''}`}>
      <div className="project-row-header">
        <span className="project-name">{def.name}</span>
        <span className={`project-category project-category--${def.category}`}>{def.category}</span>
      </div>
      <div className="project-row-stats">
        <span>Cost: {formatCost(def.baseCost, mode)}</span>
        <span>Duration: {formatDuration(def.baseDuration, mode)}</span>
      </div>
      <div className="project-row-effects">
        {def.effects.tileEco !== 0 && <span className="effect-tag">Eco +{def.effects.tileEco}</span>}
        {def.effects.foodSov !== 0 && <span className="effect-tag">Food +{def.effects.foodSov}</span>}
        {def.effects.trust !== 0 && <span className="effect-tag">Trust +{def.effects.trust}</span>}
        {def.effects.annualRevenue > 0 && <span className="effect-tag">Rev +${def.effects.annualRevenue.toFixed(1)}M</span>}
        {def.effects.contaminationReduction > 0 && <span className="effect-tag">Contam -{def.effects.contaminationReduction}%</span>}
        {def.effects.other.map((o) => <span key={o} className="effect-tag">{o}</span>)}
      </div>
      {!canStart && reason && (
        <div className="project-row-warning">{reason}</div>
      )}
      <button
        className="btn btn-primary btn-sm"
        disabled={!canStart}
        onClick={onStart}
        type="button"
      >
        Start
      </button>
    </div>
  );
}

export default function ProjectSelectPanel({ tileId, onBack }: ProjectSelectPanelProps) {
  const { state, dispatch } = useGame();
  const [mode, setMode] = useState<ProjectMode>('player-initiated');

  const tile = state.tiles[tileId];
  if (!tile) return null;

  const allProjects = Object.values(PROJECT_CATALOG);

  return (
    <div className="panel project-select-panel">
      <div className="panel-header-row">
        <button className="btn btn-secondary btn-sm" onClick={onBack} type="button">
          Back
        </button>
        <h2 className="panel-title">Start Project on {tile.name}</h2>
      </div>

      <div className="mode-toggle">
        <button
          className={`mode-toggle-btn ${mode === 'player-initiated' ? 'mode-toggle-btn--active' : ''}`}
          onClick={() => setMode('player-initiated')}
          type="button"
        >
          Player-Initiated
        </button>
        <button
          className={`mode-toggle-btn ${mode === 'community-led' ? 'mode-toggle-btn--active' : ''}`}
          onClick={() => setMode('community-led')}
          type="button"
        >
          Community-Led (1.3x cost, 1.5x time)
        </button>
      </div>

      <div className="project-list">
        {allProjects.map((def) => {
          const check = canStartProject(state, tileId, def.id, mode);
          return (
            <ProjectRow
              key={def.id}
              def={def}
              mode={mode}
              canStart={check.allowed}
              reason={check.reason}
              onStart={() => {
                dispatch({ type: 'START_PROJECT', tileId, projectId: def.id, mode });
                onBack();
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
