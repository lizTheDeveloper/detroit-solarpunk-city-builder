import { useState } from 'react';
import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { canStartProject } from '@/systems/projects';
import { calculateBlockModifiers } from '@/systems/block-modifiers';
import { formatCost as fmtBudget } from '@/ui/format';
import type { ProjectMode, ProjectDefinition } from '@/state/types';
import type { BlockData } from '@/map/block-layer';

interface ProjectSelectPanelProps {
  tileId: string;
  blockId?: string;
  onBack: () => void;
}


function ProjectRow({
  def,
  mode,
  canStart,
  reason,
  onStart,
  block,
}: {
  def: ProjectDefinition;
  mode: ProjectMode;
  canStart: boolean;
  reason?: string;
  onStart: () => void;
  block?: BlockData;
}) {
  const blockMods = block ? calculateBlockModifiers(block, def) : null;
  const effectiveCostMult = (blockMods?.costMultiplier ?? 1) * (mode === 'community-led' ? 1.3 : 1.0);
  const effectiveDurMult = blockMods?.durationMultiplier ?? 1;
  const hasBlockEffect = blockMods && (
    Math.abs(blockMods.costMultiplier - 1) > 0.01 ||
    Math.abs(blockMods.durationMultiplier - 1) > 0.01 ||
    blockMods.ecoBonus > 0 || blockMods.trustBonus > 0 || blockMods.contaminationPenalty > 0
  );

  return (
    <div className={`project-row ${!canStart ? 'project-row--disabled' : ''}`}>
      <div className="project-row-header">
        <span className="project-name">{def.name}</span>
        <span className={`project-category project-category--${def.category}`}>{def.category}</span>
        {blockMods && (
          <span className="project-suitability" title="Block suitability">
            {blockMods.suitabilityScore}
          </span>
        )}
      </div>
      <div className="project-row-stats">
        <span>Cost: {fmtBudget(def.baseCost * effectiveCostMult)}</span>
        <span>Duration: {Math.max(1, Math.ceil(def.baseDuration * effectiveDurMult))} turns</span>
      </div>
      {hasBlockEffect && (
        <div className="project-row-block-mods">
          {Math.abs(blockMods.costMultiplier - 1) > 0.01 && (
            <span className={`mod-tag ${blockMods.costMultiplier < 1 ? 'mod-tag--good' : 'mod-tag--bad'}`}>
              Block: Cost {blockMods.costMultiplier < 1 ? '' : '+'}{Math.round((blockMods.costMultiplier - 1) * 100)}%
            </span>
          )}
          {Math.abs(blockMods.durationMultiplier - 1) > 0.01 && (
            <span className={`mod-tag ${blockMods.durationMultiplier < 1 ? 'mod-tag--good' : 'mod-tag--bad'}`}>
              Block: Time {blockMods.durationMultiplier < 1 ? '' : '+'}{Math.round((blockMods.durationMultiplier - 1) * 100)}%
            </span>
          )}
          {blockMods.ecoBonus > 0 && <span className="mod-tag mod-tag--good">Block: Eco +{blockMods.ecoBonus}</span>}
          {blockMods.trustBonus > 0 && <span className="mod-tag mod-tag--good">Block: Trust +{blockMods.trustBonus}</span>}
          {blockMods.contaminationPenalty > 0 && <span className="mod-tag mod-tag--bad">Block: Contam +{blockMods.contaminationPenalty}</span>}
        </div>
      )}
      <div className="project-row-effects">
        {def.effects.tileEco !== 0 && <span className="effect-tag">Eco {def.effects.tileEco > 0 ? '+' : ''}{def.effects.tileEco}</span>}
        {def.effects.foodSov !== 0 && <span className="effect-tag">Food {def.effects.foodSov > 0 ? '+' : ''}{def.effects.foodSov}</span>}
        {def.effects.trust !== 0 && <span className="effect-tag">Trust {def.effects.trust > 0 ? '+' : ''}{def.effects.trust}</span>}
        {def.effects.annualRevenue > 0 && <span className="effect-tag">Rev +{fmtBudget(def.effects.annualRevenue)}/yr</span>}
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

export default function ProjectSelectPanel({ tileId, blockId, onBack }: ProjectSelectPanelProps) {
  const { state, dispatch } = useGame();
  const [mode, setMode] = useState<ProjectMode>('player-initiated');

  const tile = state.tiles[tileId];
  if (!tile) return null;

  const block = blockId ? state.blockDataMap[blockId] : undefined;
  const allProjects = Object.values(PROJECT_CATALOG);

  return (
    <div className="panel project-select-panel">
      <div className="panel-header-row">
        <button className="btn btn-secondary btn-sm" onClick={onBack} type="button">
          Back
        </button>
        <h2 className="panel-title">
          Start Project on {tile.name}
          {blockId && <span className="panel-title__block"> / Block {blockId.slice(0, 8).toUpperCase()}</span>}
        </h2>
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
              block={block}
              onStart={() => {
                dispatch({ type: 'START_PROJECT', tileId, projectId: def.id, mode, blockId });
                onBack();
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
