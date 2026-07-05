import { useGame } from '@/state/store';
import { formatBudget } from '@/ui/format';
import { totalAnnualExpenses, totalAnnualRevenue } from '@/data/content/budget-lines';
import { calculateElectionScore } from '@/systems/reelection';
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
  const slotsRemaining = state.calendarState.discretionarySlots - state.calendarState.slotsSpent;
  const slotsTotal = state.calendarState.discretionarySlots;

  const monthlyRevenue = totalAnnualRevenue() / 12;
  const monthlyExpenses = totalAnnualExpenses() / 12;
  const projectCosts = Object.values(state.tiles)
    .flatMap(t => t.activeProjects)
    .reduce((sum, p) => sum + (p.cost / p.duration), 0);
  const monthlySurplus = monthlyRevenue - monthlyExpenses - projectCosts;

  // Election score & stage requirements
  const electionScore = calculateElectionScore(state);
  const currentStage = state.stage;
  const requirementsMet = currentStage === 'transition'
    ? (state.meters.ecologicalHealth >= 35 ? 1 : 0) +
      (state.meters.foodSovereignty >= 25 ? 1 : 0)
    : currentStage === 'restoration'
      ? (state.meters.ecologicalHealth >= 55 ? 1 : 0) +
        (state.meters.foodSovereignty >= 40 ? 1 : 0) +
        (state.meters.communityTrust >= 50 ? 1 : 0) +
        (state.activePolicies.length >= 2 ? 1 : 0)
      : currentStage === 'beyond'
        ? (state.meters.ecologicalHealth >= 75 ? 1 : 0) +
          (state.meters.foodSovereignty >= 60 ? 1 : 0) +
          (state.meters.communityTrust >= 70 ? 1 : 0) +
          (state.activePolicies.length >= 3 ? 1 : 0)
        : 0;
  const totalRequirements = currentStage === 'transition' ? 2
    : currentStage === 'restoration' ? 4
      : currentStage === 'beyond' ? 4
        : 0;

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
        Stage: {capitalize(currentStage)} {totalRequirements > 0 ? `(${requirementsMet}/${totalRequirements})` : ''}
      </div>
      <div className="top-bar-stat top-bar-stat--budget">
        Discrete: {formatBudget(state.meters.discreteBudget)}
        <span className={`top-bar-surplus ${monthlySurplus >= 0 ? 'top-bar-surplus--positive' : 'top-bar-surplus--negative'}`}>
          {monthlySurplus >= 0 ? '+' : ''}{formatBudget(Math.round(monthlySurplus * 10) / 10)}/mo
        </span>
      </div>
      <div className={`top-bar-stat ${electionScore.score >= 45 ? 'top-bar-stat--good' : 'top-bar-stat--warning'}`}>
        Election: {Math.round(electionScore.score)}/45 {electionScore.score >= 45 ? '✓' : '⚠'}
      </div>
      <div className="top-bar-stat" title={slotsRemaining === 0 ? 'No actions remaining — end turn to rest and recover slots, or take a rest day' : `Spend a slot on proposals, projects, meetings, or lobbying`}>
        {slotsRemaining}/{slotsTotal} Slots
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
