import { useMemo } from 'react';
import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { scoreBlockSuitability, calculateBlockModifiers } from '@/systems/block-modifiers';
import type { BlockData } from '@/map/block-layer';
import type { ProjectDefinition } from '@/state/types';

interface BlockDetailPanelProps {
  blockId: string;
  onStartProject: () => void;
  onBack: () => void;
}

function flagLabel(flag: string): string {
  switch (flag) {
    case 'epa_brownfield': return 'EPA Brownfield';
    case 'flood_zone': return 'Flood Zone';
    case 'high_vacancy': return 'High Vacancy';
    case 'transit_adjacent': return 'Transit Adjacent';
    case 'community_assets': return 'Community Assets';
    case 'data_gaps': return 'Data Gaps';
    default: return flag;
  }
}

function flagColor(flag: string): string {
  switch (flag) {
    case 'epa_brownfield': return '#ef4444';
    case 'flood_zone': return '#3b82f6';
    case 'high_vacancy': return '#a855f7';
    case 'transit_adjacent': return '#22c55e';
    case 'community_assets': return '#f59e0b';
    case 'data_gaps': return '#6b7280';
    default: return '#6b7280';
  }
}

function SuitabilityBar({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="suitability-bar">
      <div className="suitability-bar__track">
        <div className="suitability-bar__fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="suitability-bar__label">{score}</span>
    </div>
  );
}

function ProjectSuitabilityRow({ def, block }: { def: ProjectDefinition; block: BlockData }) {
  const score = scoreBlockSuitability(block, def);
  const mods = calculateBlockModifiers(block, def);
  const costChanged = Math.abs(mods.costMultiplier - 1) > 0.01;
  const durationChanged = Math.abs(mods.durationMultiplier - 1) > 0.01;

  return (
    <div className="block-suitability-row">
      <div className="block-suitability-row__header">
        <span className="block-suitability-row__name">{def.name}</span>
        <SuitabilityBar score={score} />
      </div>
      {(costChanged || durationChanged || mods.ecoBonus > 0 || mods.trustBonus > 0) && (
        <div className="block-suitability-row__mods">
          {costChanged && (
            <span className={`mod-tag ${mods.costMultiplier < 1 ? 'mod-tag--good' : 'mod-tag--bad'}`}>
              Cost {mods.costMultiplier < 1 ? '' : '+'}{Math.round((mods.costMultiplier - 1) * 100)}%
            </span>
          )}
          {durationChanged && (
            <span className={`mod-tag ${mods.durationMultiplier < 1 ? 'mod-tag--good' : 'mod-tag--bad'}`}>
              Time {mods.durationMultiplier < 1 ? '' : '+'}{Math.round((mods.durationMultiplier - 1) * 100)}%
            </span>
          )}
          {mods.ecoBonus > 0 && <span className="mod-tag mod-tag--good">Eco +{mods.ecoBonus}</span>}
          {mods.trustBonus > 0 && <span className="mod-tag mod-tag--good">Trust +{mods.trustBonus}</span>}
          {mods.contaminationPenalty > 0 && <span className="mod-tag mod-tag--bad">Contam +{mods.contaminationPenalty}</span>}
        </div>
      )}
    </div>
  );
}

export default function BlockDetailPanel({ blockId, onStartProject, onBack }: BlockDetailPanelProps) {
  const { state } = useGame();
  const block = state.blockDataMap[blockId];

  const topProjects = useMemo(() => {
    if (!block) return [];
    const defs = Object.values(PROJECT_CATALOG);
    return defs
      .map(def => ({ def, score: scoreBlockSuitability(block, def) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [block]);

  if (!block) {
    return (
      <div className="panel block-detail-panel">
        <div className="panel-header-row">
          <button className="btn btn-secondary btn-sm" onClick={onBack} type="button">Back</button>
          <h2 className="panel-title">Block {blockId.toUpperCase()}</h2>
        </div>
        <p className="block-detail-panel__empty">No block data available. Block-level data loads from CityPackage.</p>
      </div>
    );
  }

  const flags = calculateBlockModifiers(block, Object.values(PROJECT_CATALOG)[0]).flags;

  return (
    <div className="panel block-detail-panel">
      <div className="panel-header-row">
        <button className="btn btn-secondary btn-sm" onClick={onBack} type="button">Back</button>
        <h2 className="panel-title">Block {blockId.slice(0, 8).toUpperCase()}</h2>
      </div>

      {flags.length > 0 && (
        <div className="block-flags">
          {flags.map(f => (
            <span key={f} className="block-flag" style={{ borderColor: flagColor(f), color: flagColor(f) }}>
              {flagLabel(f)}
            </span>
          ))}
        </div>
      )}

      {block.censusData && (
        <div className="block-section">
          <h3 className="block-section__title">CENSUS</h3>
          <div className="block-stats">
            <div className="block-stat">
              <span className="block-stat__label">Population</span>
              <span className="block-stat__value">{block.censusData.population.toLocaleString()}</span>
            </div>
            <div className="block-stat">
              <span className="block-stat__label">Median Income</span>
              <span className="block-stat__value">${block.censusData.medianIncome.toLocaleString()}</span>
            </div>
            <div className="block-stat">
              <span className="block-stat__label">Vacancy</span>
              <span className="block-stat__value">{(block.censusData.vacancyRate * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {block.epaSites.length > 0 && (
        <div className="block-section block-section--warning">
          <h3 className="block-section__title">EPA SITES</h3>
          {block.epaSites.map((s, i) => (
            <div key={i} className="block-epa-site">
              <span className="block-epa-site__name">{s.name}</span>
              <span className="block-epa-site__meta">{s.type} — {s.status}</span>
            </div>
          ))}
        </div>
      )}

      {block.transitStops.length > 0 && (
        <div className="block-section">
          <h3 className="block-section__title">TRANSIT</h3>
          {block.transitStops.map((s, i) => (
            <div key={i} className="block-transit-stop">
              {s.name}: {s.routes.join(', ')}
            </div>
          ))}
        </div>
      )}

      {block.communityAssets.length > 0 && (
        <div className="block-section">
          <h3 className="block-section__title">COMMUNITY</h3>
          {block.communityAssets.map((a, i) => (
            <div key={i} className="block-community-asset">
              {a.name} <span className="block-community-asset__type">({a.type})</span>
            </div>
          ))}
        </div>
      )}

      {block.dataGaps.length > 0 && (
        <div className="block-section block-section--gap">
          <h3 className="block-section__title">DATA GAPS</h3>
          {block.dataGaps.map((g, i) => (
            <div key={i} className="block-data-gap">
              <div className="block-data-gap__layer">{g.layer.toUpperCase()}: {g.reason}</div>
              {g.advocacyTarget && (
                <div className="block-data-gap__advocacy">DEMAND TRANSPARENCY → {g.advocacyTarget}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="block-section">
        <h3 className="block-section__title">PROJECT SUITABILITY</h3>
        {topProjects.map(({ def }) => (
          <ProjectSuitabilityRow key={def.id} def={def} block={block} />
        ))}
      </div>

      <button className="btn btn-primary start-project-btn" onClick={onStartProject} type="button">
        Place Project Here
      </button>
    </div>
  );
}
