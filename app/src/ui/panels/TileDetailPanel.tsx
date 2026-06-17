import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { SLOT_COSTS, getAvailableSlots, canAffordAction } from '@/systems/calendar-slots';
import { getRelationshipLevel } from '@/systems/relationships';
import type { Tile, Proposal, ProposalResponse, CalendarActionType } from '@/state/types';
import { formatCost } from '@/ui/format';
import { InlineActions, type InlineAction } from '@/ui/components/InlineActions';
import PowerStructurePanel from './PowerStructurePanel';

interface TileDetailPanelProps {
  tileId: string;
  onStartProjectClick: () => void;
  onConversation?: (characterId: string, interactionType: string, proposalId?: string) => void;
}

function ProgressBar({ progress, duration }: { progress: number; duration: number }) {
  const pct = duration > 0 ? Math.round((progress / duration) * 100) : 0;
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

function TileProposalCard({ proposal, onConversation }: { proposal: Proposal; onConversation?: (characterId: string, interactionType: string, proposalId?: string) => void }) {
  const { state, dispatch } = useGame();
  const leader = state.leaders[proposal.leaderId];
  const def = PROJECT_CATALOG[proposal.projectDefinitionId];
  if (!leader || !def) return null;

  const neg = proposal.negotiation;
  const acceptCostMult = neg ? neg.costMultiplier : 0.85;
  const leaderContrib = neg ? neg.leaderContribution : 0;
  const durationMod = neg ? neg.durationModifier : 0;
  const grossAcceptCost = def.baseCost * acceptCostMult;
  const netAcceptCost = Math.max(0, grossAcceptCost - leaderContrib);
  const finalDuration = Math.max(1, def.baseDuration + durationMod);
  const canAffordAccept = state.meters.budget >= netAcceptCost;
  const level = getRelationshipLevel(leader.trust);

  function handleResponse(response: ProposalResponse) {
    dispatch({ type: 'RESPOND_PROPOSAL', proposalId: proposal.id, response });
    if (onConversation) {
      const interactionType = response === 'accept' ? 'proposal_accepted'
        : response === 'reject' ? 'proposal_rejected'
        : 'proposal_modified';
      onConversation(proposal.leaderId, interactionType, proposal.id);
    }
  }

  const turnsLeft = proposal.expirationTurn - state.turn;
  const pressureColor = proposal.pressureLevel >= 3 ? '#ef4444'
    : proposal.pressureLevel >= 2 ? '#f97316'
    : proposal.pressureLevel >= 1 ? '#eab308'
    : '#22c55e';

  const isExpiring = turnsLeft <= 1;
  const cardClass = `tile-proposal-card${isExpiring ? ' tile-proposal-card--expiring' : ''}`;

  return (
    <div className={cardClass}>
      <div className="proposal-pressure-bar" style={{ background: pressureColor, height: 3, borderRadius: 2, marginBottom: 4 }} />
      <div className="tile-proposal-header">
        <span className="tile-proposal-leader">{leader.name}</span>
        <span className={`leader-level-badge leader-level-badge--${level}`}>{level}</span>
        <span className="proposal-timer" style={{ color: pressureColor, fontSize: '0.85em' }}>
          {turnsLeft > 0 ? `${turnsLeft} turns left` : 'Expiring'}
        </span>
      </div>
      <div className="tile-proposal-project">
        <strong>{def.name}</strong>
        <span className="tile-proposal-meta">
          {formatCost(netAcceptCost)} · {finalDuration} turns
        </span>
      </div>
      <div className="proposal-project-effects">
        {def.effects.tileEco !== 0 && <span className="effect-tag">Eco {def.effects.tileEco > 0 ? '+' : ''}{def.effects.tileEco}</span>}
        {def.effects.foodSov !== 0 && <span className="effect-tag">Food {def.effects.foodSov > 0 ? '+' : ''}{def.effects.foodSov}</span>}
        {def.effects.trust !== 0 && <span className="effect-tag">Trust {def.effects.trust > 0 ? '+' : ''}{def.effects.trust}</span>}
        {def.effects.contaminationReduction > 0 && <span className="effect-tag">Contam -{def.effects.contaminationReduction}%</span>}
      </div>
      <div className="tile-proposal-actions">
        <button className="btn btn-sm btn-discuss" onClick={() => {
          if (!canAffordAction(state.calendarState, 'deep_conversation')) return;
          dispatch({ type: 'CALENDAR_ACTION', actionType: 'deep_conversation' as CalendarActionType, targetId: proposal.leaderId, tileId: proposal.tileId });
          onConversation?.(proposal.leaderId, 'direct_engagement', proposal.id);
        }} disabled={!canAffordAction(state.calendarState, 'deep_conversation')} type="button">Discuss ({SLOT_COSTS.deep_conversation} slots)</button>
        <button className="btn btn-sm btn-accept" onClick={() => handleResponse('accept')} disabled={!canAffordAccept} type="button">
          Fund ({formatCost(netAcceptCost)})
        </button>
        <button className="btn btn-sm btn-reject" onClick={() => handleResponse('reject')} type="button">Reject</button>
      </div>
    </div>
  );
}

const NEIGHBORHOOD_ACTIONS: { actionType: CalendarActionType; label: string }[] = [
  { actionType: 'community_meeting', label: 'Community Meeting' },
  { actionType: 'public_event', label: 'Public Event' },
  { actionType: 'quick_check_in', label: 'Quick Check-in' },
];

export default function TileDetailPanel({ tileId, onStartProjectClick, onConversation }: TileDetailPanelProps) {
  const { state, dispatch } = useGame();
  const tile: Tile | undefined = state.tiles[tileId];

  if (!tile) {
    return <div className="panel">Tile not found</div>;
  }

  const cal = state.calendarState;
  const available = getAvailableSlots(cal);
  const tileProposals = state.activeProposals.filter((p) => p.tileId === tileId);

  const inlineActions: InlineAction[] = NEIGHBORHOOD_ACTIONS.map(({ actionType, label }) => ({
    id: `${actionType}-${tileId}`,
    label,
    slotCost: SLOT_COSTS[actionType],
    actionType,
    tileId,
    disabled: !canAffordAction(cal, actionType),
    disabledReason: !canAffordAction(cal, actionType) ? 'Not enough calendar slots' : undefined,
  }));

  function handleAction(action: InlineAction) {
    dispatch({
      type: 'CALENDAR_ACTION',
      actionType: action.actionType as CalendarActionType,
      targetId: action.targetId,
      tileId: action.tileId,
    });
  }

  return (
    <div className="panel tile-detail-panel">
      <h2 className="panel-title">{tile.name}</h2>
      <div className="panel-subtitle">{tile.terrain} terrain</div>

      <InlineActions
        actions={inlineActions}
        availableSlots={available}
        overscheduleLimit={cal.overscheduleLimit}
        overscheduleUsed={cal.overscheduleAmount}
        burnoutState={cal.burnoutState}
        onAction={handleAction}
      />

      {tileProposals.length > 0 && (
        <div className="tile-section">
          <h3 className="tile-section-title">Proposals for {tile.name}</h3>
          {tileProposals.map((p) => (
            <TileProposalCard key={p.id} proposal={p} onConversation={onConversation} />
          ))}
        </div>
      )}

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
          {tile.activeProjects.map((proj, index) => {
            const def = PROJECT_CATALOG[proj.definitionId];
            return (
              <div key={`${proj.definitionId}-${proj.tileId}-${index}`} className="active-project-item">
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

      <PowerStructurePanel neighborhoodId={tileId} />

      <button className="btn btn-primary start-project-btn" onClick={onStartProjectClick} type="button">
        Start Project
      </button>
    </div>
  );
}
