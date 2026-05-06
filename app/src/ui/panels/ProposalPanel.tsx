import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { formatCost, formatBudget } from '@/ui/format';
import type { Proposal, ProposalResponse } from '@/state/types';

function ProposalCard({ proposal, onConversation }: { proposal: Proposal; onConversation?: (characterId: string, interactionType: string) => void }) {
  const { state, dispatch } = useGame();
  const leader = state.leaders[proposal.leaderId];
  const def = PROJECT_CATALOG[proposal.projectDefinitionId];
  const tile = state.tiles[proposal.tileId];

  if (!leader || !def || !tile) return null;

  const acceptCost = def.baseCost * 0.85;
  const modifyCost = def.baseCost;
  const canAffordAccept = state.meters.budget >= acceptCost;
  const canAffordModify = state.meters.budget >= modifyCost;

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

  return (
    <div className="proposal-card">
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
            {formatCost(acceptCost)}
          </span>
          <span>{def.baseDuration} turns</span>
          <span>{tile.name}</span>
        </div>
        <div className="proposal-project-effects">
          {def.effects.tileEco !== 0 && <span className="effect-tag">Eco +{def.effects.tileEco}</span>}
          {def.effects.foodSov !== 0 && <span className="effect-tag">Food +{def.effects.foodSov}</span>}
          {def.effects.trust !== 0 && <span className="effect-tag">Trust +{def.effects.trust}</span>}
          {def.effects.contaminationReduction > 0 && <span className="effect-tag">Contam -{def.effects.contaminationReduction}%</span>}
        </div>
      </div>
      <div className="proposal-responses">
        <button
          className="btn btn-sm btn-accept"
          onClick={() => handleResponse('accept')}
          type="button"
          disabled={!canAffordAccept}
          title={canAffordAccept ? `Fund this project (-${formatCost(acceptCost)}, trust +10)` : `Need ${formatCost(acceptCost)}`}
        >
          Fund ({formatCost(acceptCost)})
        </button>
        <button
          className="btn btn-sm btn-modify"
          onClick={() => handleResponse('modify')}
          type="button"
          disabled={!canAffordModify}
          title={canAffordModify ? `Fund with changes (-${formatCost(modifyCost)}, trust +3)` : `Need ${formatCost(modifyCost)}`}
        >
          Modify ({formatCost(modifyCost)})
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

export default function ProposalPanel({ onConversation }: { onConversation?: (characterId: string, interactionType: string) => void }) {
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
        Leaders want you to fund their projects. Accepting costs budget, not actions.
      </p>
      {state.activeProposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} onConversation={onConversation} />
      ))}
    </div>
  );
}
