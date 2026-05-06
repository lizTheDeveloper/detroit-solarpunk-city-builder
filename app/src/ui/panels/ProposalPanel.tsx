import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { formatCost, formatBudget } from '@/ui/format';
import type { Proposal, ProposalResponse } from '@/state/types';

function ProposalCard({ proposal, onConversation }: { proposal: Proposal; onConversation?: (characterId: string, interactionType: string, proposalId?: string) => void }) {
  const { state, dispatch } = useGame();
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

  function handleResponse(response: ProposalResponse) {
    dispatch({ type: 'RESPOND_PROPOSAL', proposalId: proposal.id, response });
    if (onConversation) {
      const interactionType = response === 'accept' ? 'proposal_accepted'
        : response === 'reject' ? 'proposal_rejected'
        : response === 'defer' ? 'proposal_deferred'
        : 'proposal_modified';
      onConversation(proposal.leaderId, interactionType);
    }
  }

  function handleDiscuss() {
    if (onConversation) {
      onConversation(proposal.leaderId, 'direct_engagement', proposal.id);
    }
  }

  return (
    <div className={`proposal-card ${hasNegotiation ? 'proposal-card--negotiated' : ''}`}>
      <div className="proposal-header">
        <span className="proposal-leader-name">{leader.name}</span>
        <span className="proposal-neighborhood">{leader.neighborhood}</span>
        <span className="proposal-trust" title="Leader Trust">
          Trust: {leader.trust}
        </span>
      </div>
      <div className="proposal-project">
        <div className="proposal-project-name">{def.name}</div>
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
        </div>
        {hasNegotiation && leaderContrib > 0 && (
          <div className="proposal-negotiation-terms">
            {leader.name} contributing {formatCost(leaderContrib)} from community funds
          </div>
        )}
        <div className="proposal-project-effects">
          {def.effects.tileEco !== 0 && <span className="effect-tag">Eco +{def.effects.tileEco}</span>}
          {def.effects.foodSov !== 0 && <span className="effect-tag">Food +{def.effects.foodSov}</span>}
          {def.effects.trust !== 0 && <span className="effect-tag">Trust +{def.effects.trust}</span>}
          {def.effects.contaminationReduction > 0 && <span className="effect-tag">Contam -{def.effects.contaminationReduction}%</span>}
        </div>
      </div>
      <div className="proposal-responses">
        <button
          className="btn btn-sm btn-discuss"
          onClick={handleDiscuss}
          type="button"
          title="Discuss terms with this leader before deciding"
        >
          Discuss
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
          className="btn btn-sm btn-defer"
          onClick={() => handleResponse('defer')}
          type="button"
          title={`Delay to next turn (trust -5${leader.consecutiveDeferrals >= 2 ? ', THIS WILL AUTO-REJECT' : ''})`}
        >
          Defer
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
        Leaders want you to fund their projects. Discuss terms before deciding.
      </p>
      {state.activeProposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} onConversation={onConversation} />
      ))}
    </div>
  );
}
