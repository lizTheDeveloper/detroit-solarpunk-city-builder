import { useGame } from '@/state/store';
import { formatBudget } from '@/ui/format';
import type { Season } from '@/state/types';

const SEASON_ICONS: Record<Season, string> = {
  spring: '🌱',
  summer: '☀️',
  fall: '🍂',
  winter: '❄️',
};

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TopBar() {
  const { state } = useGame();

  const activePolicyCount = state.activePolicies.length;
  const activeCoalitionCount = state.coalitions.filter((c) => c.active).length;
  const actionsRemaining = state.narrativeState.actionsRemaining;
  const actionsPerTurn = state.narrativeState.actionsPerTurn;

  return (
    <div className="top-bar">
      <div className="top-bar-season">
        <span className="season-icon">{SEASON_ICONS[state.season]}</span>
        <span className="season-name">{SEASON_LABELS[state.season]}</span>
      </div>
      <div className="top-bar-info">
        Year {state.year} / Turn {state.turn}
      </div>
      <div className="top-bar-stage">
        Stage: {capitalize(state.stage)}
      </div>
      <div className="top-bar-stat top-bar-stat--budget">
        {formatBudget(state.meters.budget)}
      </div>
      <div className="top-bar-stat">
        {actionsRemaining}/{actionsPerTurn} Actions
      </div>
      {activePolicyCount > 0 && (
        <div className="top-bar-stat top-bar-stat--policy">
          {activePolicyCount} Policies
        </div>
      )}
      {activeCoalitionCount > 0 && (
        <div className="top-bar-stat top-bar-stat--coalition">
          {activeCoalitionCount} Coalitions
        </div>
      )}
      <div className="top-bar-stat top-bar-stat--climate">
        Climate: {state.meters.climatePressure.toFixed(0)}%
      </div>
      <div className="top-bar-capacity">
        {state.maxConcurrentProjects} Projects Max
      </div>
    </div>
  );
}
