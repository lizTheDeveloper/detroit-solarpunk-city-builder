import { useGame } from '@/state/store';
import { POLICY_CATALOG } from '@/data/content/policy-catalog';
import { canEnactPolicy, calculateEffectiveThreshold, getPolicyTopicMapping } from '@/systems/policies';
import type { PolicyDefinition, PublicOpinion } from '@/state/types';

function PolicyCard({
  policy,
  isEnacted,
  canEnact,
  reason,
  effectiveThreshold,
  onEnact,
}: {
  policy: PolicyDefinition;
  isEnacted: boolean;
  canEnact: boolean;
  reason?: string;
  effectiveThreshold: number;
  onEnact: () => void;
}) {
  return (
    <div className={`policy-card ${isEnacted ? 'policy-card--enacted' : ''}`}>
      <div className="policy-card-header">
        <span className="policy-card-name">{policy.name}</span>
        {isEnacted && <span className="policy-enacted-badge">Enacted</span>}
        {policy.requiresCouncilVote && !isEnacted && (
          <span className="policy-vote-badge">Council Vote Required</span>
        )}
      </div>
      <div className="policy-card-stats">
        <span>Threshold: {(effectiveThreshold * 100).toFixed(1)}% Will</span>
        <span>Enact Cost: {(policy.enactmentCost * 100).toFixed(1)}% Will</span>
        {isEnacted && (
          <span className="policy-drain">
            Drain: -{(policy.ongoingDrain * 100).toFixed(1)}%/turn
          </span>
        )}
        {!isEnacted && (
          <span>Drain: -{(policy.ongoingDrain * 100).toFixed(1)}%/turn</span>
        )}
      </div>
      <div className="policy-card-effects">
        {policy.effects.other.map((eff, i) => (
          <span key={i} className="effect-tag">{eff}</span>
        ))}
        {policy.effects.trustBonus > 0 && (
          <span className="effect-tag">Trust +{policy.effects.trustBonus}%</span>
        )}
        {policy.effects.foodSovBonus > 0 && (
          <span className="effect-tag">Food Sov +{policy.effects.foodSovBonus}%</span>
        )}
        {policy.effects.budgetBonus > 0 && (
          <span className="effect-tag">Budget +${policy.effects.budgetBonus}M</span>
        )}
      </div>
      {!isEnacted && (
        <>
          {!canEnact && reason && (
            <div className="policy-card-warning">{reason}</div>
          )}
          <button
            className="btn btn-primary btn-sm"
            disabled={!canEnact}
            onClick={onEnact}
            type="button"
          >
            Enact Policy
          </button>
        </>
      )}
    </div>
  );
}

export default function PolicyPanel() {
  const { state, dispatch } = useGame();
  const allPolicies = Object.values(POLICY_CATALOG);

  const enactedIds = new Set(state.activePolicies.map((ap) => ap.definitionId));

  const totalDrain = state.activePolicies.reduce((sum, ap) => {
    const def = POLICY_CATALOG[ap.definitionId];
    return def ? sum + def.ongoingDrain : sum;
  }, 0);

  return (
    <div className="panel policy-panel">
      <h2 className="panel-title">Policies</h2>
      <p className="panel-subtitle">
        Enact policies to unlock bonuses. Active policies drain Political Will each turn.
        {state.activePolicies.length > 0 && (
          <span className="policy-drain-summary">
            {' '}Total drain: -{(Math.min(totalDrain, 0.04) * 100).toFixed(1)}%/turn
          </span>
        )}
      </p>
      <div className="policy-list">
        {allPolicies.map((policy) => {
          const isEnacted = enactedIds.has(policy.id);
          const check = canEnactPolicy(state, policy.id, POLICY_CATALOG, true);
          const topic = getPolicyTopicMapping(policy.id);
          const topicOpinion = topic ? state.publicOpinion[topic] : 0;
          const effectiveThreshold = calculateEffectiveThreshold(policy, topicOpinion);

          return (
            <PolicyCard
              key={policy.id}
              policy={policy}
              isEnacted={isEnacted}
              canEnact={check.allowed}
              reason={check.reason}
              effectiveThreshold={effectiveThreshold}
              onEnact={() => dispatch({ type: 'ENACT_POLICY', policyId: policy.id })}
            />
          );
        })}
      </div>
    </div>
  );
}
