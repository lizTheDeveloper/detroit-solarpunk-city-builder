import { useState } from 'react';
import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { formatCost, formatBudget } from '@/ui/format';
import { LinkedText } from '@/ui/components/LinkedText';
import type { Proposal, ProposalResponse, ProjectDefinition, CalendarActionType } from '@/state/types';
import { SLOT_COSTS, canAffordAction } from '@/systems/calendar-slots';

// Plain-language descriptions of what each byproduct actually does for the player
const BYPRODUCT_PLAYER_DESCRIPTIONS: Record<string, string> = {
  compost: 'Compost available for nearby projects (cheaper food forests, faster native plantings)',
  clean_soil: 'Clean soil unlocked for projects that need uncontaminated ground',
  lumber: 'Lumber available for nearby construction projects',
  biomass: 'Biomass feeds soil remediation and wetland projects at reduced cost',
  fabrication_capacity: 'Local fabrication makes solar grids and infrastructure cheaper nearby',
  recycled_materials: 'Recycled materials reduce costs for rain gardens and other builds',
  stormwater_capacity: 'Stormwater capacity boosts eco impact of rain gardens and wetlands nearby',
  community_knowledge: 'Community knowledge speeds up land trusts and boosts food sovereignty projects',
  clean_energy: 'Clean energy reduces costs for maker spaces, kitchens, and boosts solar revenue',
  native_seed_stock: 'Native seeds make future native plantings and corridors 25% cheaper',
  secure_land: 'Secure land bank reduces costs for gardens, rain gardens, prairies, wetlands, and kitchens nearby',
};

// Climate adaptation benefits hardcoded in climate.ts — surface them here
const ADAPTATION_BENEFITS: Record<string, string[]> = {
  rain_garden: ['Flood damage -50% on this tile'],
  greenway: ['Heat damage -40% on this tile'],
  solar_grid: ['Ice storm damage eliminated on this tile'],
  wetland_restoration: ['Flood damage -30% on adjacent tiles'],
  food_forest: ['Provides food security during climate emergencies'],
  native_planting: ['Builds soil carbon, prevents erosion during storms'],
};

// Which other projects in the catalog consume what this project produces
function getSynergies(def: ProjectDefinition): string[] {
  const synergies: string[] = [];
  for (const produced of def.produces) {
    const consumers: string[] = [];
    for (const [id, otherDef] of Object.entries(PROJECT_CATALOG)) {
      if (id === def.id) continue;
      for (const consumed of otherDef.consumes) {
        if (consumed.byproductId === produced.byproductId) {
          const bonus = consumed.bonusType === 'costReduction'
            ? `-${(consumed.bonusValue * 100).toFixed(0)}% cost`
            : consumed.bonusType === 'durationReduction'
            ? `-${consumed.bonusValue} turns`
            : `+${(consumed.bonusValue * 100).toFixed(0)}% effect`;
          consumers.push(`${otherDef.name} (${bonus})`);
        }
      }
    }
    if (consumers.length > 0) {
      synergies.push(`Enables: ${consumers.join(', ')}`);
    }
  }
  return synergies;
}

function ProposalCard({ proposal, onConversation }: { proposal: Proposal; onConversation?: (characterId: string, interactionType: string, proposalId?: string) => void }) {
  const { state, dispatch } = useGame();
  const [expanded, setExpanded] = useState(false);
  const leader = state.leaders[proposal.leaderId];
  const def = PROJECT_CATALOG[proposal.projectDefinitionId];
  const tile = state.tiles[proposal.tileId];

  if (!leader || !def || !tile) return null;

  const neg = proposal.negotiation;
  const acceptCostMult = neg ? neg.costMultiplier : 0.85;
  const leaderContrib = neg ? neg.leaderContribution : 0;
  const durationMod = neg ? neg.durationModifier : 0;

  const grossAcceptCost = def.baseCost * acceptCostMult;
  const netAcceptCost = Math.max(0, grossAcceptCost - leaderContrib);
  const finalDuration = Math.max(1, def.baseDuration + durationMod);

  const canAffordAccept = state.meters.budget >= netAcceptCost;
  const hasNegotiation = neg != null;

  const adaptation = ADAPTATION_BENEFITS[def.id] || [];
  const synergies = getSynergies(def);

  function handleResponse(response: ProposalResponse) {
    dispatch({ type: 'RESPOND_PROPOSAL', proposalId: proposal.id, response });
    if (onConversation) {
      const interactionType = response === 'accept' ? 'proposal_accepted'
        : response === 'reject' ? 'proposal_rejected'
        : 'proposal_modified';
      onConversation(proposal.leaderId, interactionType, proposal.id);
    }
  }

  const canDiscuss = canAffordAction(state.calendarState, 'deep_conversation');

  function handleDiscuss() {
    if (!canDiscuss) return;
    dispatch({ type: 'CALENDAR_ACTION', actionType: 'deep_conversation' as CalendarActionType, targetId: proposal.leaderId, tileId: proposal.tileId });
    if (onConversation) {
      onConversation(proposal.leaderId, 'direct_engagement', proposal.id);
    }
  }

  const turnsLeft = proposal.expirationTurn - state.turn;
  const pressureColor = proposal.pressureLevel >= 3 ? '#ef4444'
    : proposal.pressureLevel >= 2 ? '#f97316'
    : proposal.pressureLevel >= 1 ? '#eab308'
    : '#22c55e';

  return (
    <div className={`proposal-card ${hasNegotiation ? 'proposal-card--negotiated' : ''}`}>
      <div className="proposal-pressure-bar" style={{ background: pressureColor, height: 3, borderRadius: 2, marginBottom: 4 }} />
      <div className="proposal-header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <span className="proposal-leader-name">{leader.name}</span>
        <span className="proposal-neighborhood">{leader.neighborhood}</span>
        <span className="proposal-trust" title="Leader Trust">
          Trust: {leader.trust}
        </span>
        <span className="proposal-timer" style={{ color: pressureColor, fontSize: '0.85em' }}>
          {turnsLeft > 0 ? `${turnsLeft} turns left` : 'Expiring'}
        </span>
        <span className="proposal-expand-icon">{expanded ? '▾' : '▸'}</span>
      </div>
      <div className="proposal-project">
        <div className="proposal-project-name" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
          {def.name}
        </div>
        <div className="proposal-project-details">
          <span className="proposal-cost-highlight">
            {hasNegotiation && leaderContrib > 0 ? (
              <>
                <s style={{ opacity: 0.5 }}>{formatCost(def.baseCost * 0.85)}</s>{' '}
                {formatCost(netAcceptCost)}
              </>
            ) : (
              formatCost(netAcceptCost)
            )}
          </span>
          <span>
            {hasNegotiation && durationMod !== 0 ? (
              <>
                <s style={{ opacity: 0.5 }}>{def.baseDuration}</s> {finalDuration} turns
              </>
            ) : (
              `${finalDuration} turns`
            )}
          </span>
          <span>{tile.name}</span>
          {def.maintenanceCost > 0 && (
            <span className="proposal-detail-maint">maint: {formatCost(def.maintenanceCost)}/mo</span>
          )}
        </div>
        {hasNegotiation && leaderContrib > 0 && (
          <div className="proposal-negotiation-terms">
            {leader.name} contributing {formatCost(leaderContrib)} from community funds
          </div>
        )}

        {/* Primary effects — always visible */}
        <div className="proposal-project-effects">
          {def.effects.tileEco !== 0 && <span className="effect-tag">Eco {def.effects.tileEco > 0 ? '+' : ''}{def.effects.tileEco}</span>}
          {def.effects.foodSov !== 0 && <span className="effect-tag">Food {def.effects.foodSov > 0 ? '+' : ''}{def.effects.foodSov}</span>}
          {def.effects.trust !== 0 && <span className="effect-tag">Trust {def.effects.trust > 0 ? '+' : ''}{def.effects.trust}</span>}
          {def.effects.annualRevenue !== 0 && <span className="effect-tag effect-tag--revenue">Revenue {formatCost(def.effects.annualRevenue)}/yr</span>}
          {def.effects.contaminationReduction > 0 && <span className="effect-tag">Contam -{def.effects.contaminationReduction}%</span>}
          {def.effects.gentrificationChange !== 0 && (
            <span className={`effect-tag ${def.effects.gentrificationChange < 0 ? 'effect-tag--positive' : 'effect-tag--warning'}`}>
              Gentrif. {def.effects.gentrificationChange > 0 ? '+' : ''}{def.effects.gentrificationChange}
            </span>
          )}
        </div>

        {/* Adaptation & resilience — always visible, these are major selling points */}
        {adaptation.length > 0 && (
          <div className="proposal-adaptation">
            {adaptation.map((a) => (
              <span key={a} className="effect-tag effect-tag--adaptation">{a}</span>
            ))}
          </div>
        )}

        {/* Key synergies summary — always visible */}
        {synergies.length > 0 && (
          <div className="proposal-synergies-summary">
            {synergies.map((s) => (
              <div key={s} className="proposal-synergy-line">{s}</div>
            ))}
          </div>
        )}

        {expanded && (
          <div className="proposal-expanded">
            <p className="proposal-description"><LinkedText text={def.description} /></p>

            {def.effects.other.length > 0 && (
              <div className="proposal-other-effects">
                {def.effects.other.map((effect, i) => (
                  <div key={i} className="proposal-other-effect"><LinkedText text={effect} /></div>
                ))}
              </div>
            )}

            {def.produces.length > 0 && (
              <div className="proposal-produces-detail">
                <div className="proposal-section-label">What this creates for the neighborhood:</div>
                {def.produces.map((p) => (
                  <div key={p.byproductId} className="proposal-produce-item">
                    {BYPRODUCT_PLAYER_DESCRIPTIONS[p.byproductId] || p.byproductId}
                  </div>
                ))}
              </div>
            )}

            {def.consumes.length > 0 && (
              <div className="proposal-consumes-detail">
                <div className="proposal-section-label">Cheaper/faster if nearby:</div>
                {def.consumes.map((c) => {
                  const bonus = c.bonusType === 'costReduction' ? `${(c.bonusValue * 100).toFixed(0)}% cheaper`
                    : c.bonusType === 'durationReduction' ? `${c.bonusValue} turns faster`
                    : `${(c.bonusValue * 100).toFixed(0)}% stronger effect`;
                  const label = BYPRODUCT_PLAYER_DESCRIPTIONS[c.byproductId]
                    ? c.byproductId.replace(/_/g, ' ')
                    : c.byproductId;
                  return (
                    <div key={c.byproductId} className="proposal-consume-item">
                      {bonus} with {label} nearby
                    </div>
                  );
                })}
              </div>
            )}

            {def.maxContamination != null && (
              <div className="proposal-requirement">Requires contamination below {def.maxContamination}%</div>
            )}
          </div>
        )}
      </div>
      <div className="proposal-responses">
        <button
          className="btn btn-sm btn-discuss"
          onClick={handleDiscuss}
          type="button"
          disabled={!canDiscuss}
          title={canDiscuss ? 'Discuss terms with this leader before deciding' : 'Not enough calendar slots'}
        >
          Discuss ({SLOT_COSTS.deep_conversation} slots)
        </button>
        <button
          className="btn btn-sm btn-accept"
          onClick={() => handleResponse('accept')}
          type="button"
          disabled={!canAffordAccept}
          title={canAffordAccept ? `Fund this project (-${formatCost(netAcceptCost)}, trust +${hasNegotiation && leaderContrib > 0 ? 8 : 5})` : `Need ${formatCost(netAcceptCost)}`}
        >
          Fund ({formatCost(netAcceptCost)})
        </button>
        <button
          className="btn btn-sm btn-reject"
          onClick={() => handleResponse('reject')}
          type="button"
          title="Decline permanently (trust -15)"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export default function ProposalPanel({ onConversation }: { onConversation?: (characterId: string, interactionType: string, proposalId?: string) => void }) {
  const { state } = useGame();

  if (state.activeProposals.length === 0) return null;

  return (
    <div className="panel proposal-panel">
      <div className="proposal-panel-header">
        <h2 className="panel-title">Community Proposals</h2>
        <span className="budget-indicator">
          Budget: <strong>{formatBudget(state.meters.budget)}</strong>
        </span>
      </div>
      <p className="panel-subtitle">
        Leaders want you to fund their projects. Click to expand full details.
      </p>
      {state.activeProposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} onConversation={onConversation} />
      ))}
    </div>
  );
}
