import { useState } from 'react';
import { useGame } from '@/state/store';
import { getBaseActionValues, calculateCompoundingBonus } from '@/systems/narrative';
import type { NarrativeActionType, PublicOpinion } from '@/state/types';

const ACTION_TYPES: { type: NarrativeActionType; label: string; desc: string }[] = [
  { type: 'community_meeting', label: 'Community Meeting', desc: 'Builds trust and political will in a neighborhood' },
  { type: 'media_campaign', label: 'Media Campaign', desc: 'Generates political will and reduces policy thresholds' },
  { type: 'education_program', label: 'Education Program', desc: 'Shifts public opinion on a topic' },
  { type: 'cultural_event', label: 'Cultural Event', desc: 'Builds trust and political will through community celebration' },
  { type: 'demonstration', label: 'Demonstration', desc: 'Strong political will gain but risks trust loss' },
  { type: 'direct_engagement', label: 'Direct Engagement', desc: 'Personal outreach to leaders and council members' },
  { type: 'lobbying', label: 'Lobbying', desc: 'Influence council members directly' },
];

const TOPICS: { key: keyof PublicOpinion; label: string }[] = [
  { key: 'foodSovereignty', label: 'Food Sovereignty' },
  { key: 'waterCommons', label: 'Water Commons' },
  { key: 'landReform', label: 'Land Reform' },
  { key: 'ecologicalRestoration', label: 'Ecological Restoration' },
  { key: 'cooperativeEconomics', label: 'Cooperative Economics' },
];

export default function NarrativePanel() {
  const { state, dispatch } = useGame();
  const { narrativeState } = state;
  const [selectedAction, setSelectedAction] = useState<NarrativeActionType | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<keyof PublicOpinion>('foodSovereignty');
  const [selectedTarget, setSelectedTarget] = useState<string>(
    Object.keys(state.tiles)[0] ?? '',
  );

  const actionsRemaining = narrativeState.actionsRemaining;
  const actionsPerTurn = narrativeState.actionsPerTurn;

  // Show compounding bonus for selected topic
  const consecutive = narrativeState.consecutiveTurns[selectedTopic] ?? 0;
  const bonus = calculateCompoundingBonus(consecutive);

  function handleTakeAction() {
    if (!selectedAction) return;
    dispatch({
      type: 'NARRATIVE_ACTION',
      actionType: selectedAction,
      topic: selectedTopic,
      target: selectedTarget,
    });
  }

  return (
    <div className="panel narrative-panel">
      <h2 className="panel-title">Political Actions</h2>
      <p className="panel-subtitle">
        Your per-turn political activity. These cost action points, not budget.
      </p>
      <div className="narrative-actions-counter">
        <span className="narrative-actions-remaining">
          {actionsRemaining}/{actionsPerTurn} Actions Remaining This Turn
        </span>
        {bonus > 0 && (
          <span className="narrative-bonus">
            +{(bonus * 100).toFixed(0)}% compounding bonus on "{TOPICS.find(t => t.key === selectedTopic)?.label}"
          </span>
        )}
      </div>

      <div className="narrative-section">
        <h3 className="narrative-section-title">Action Type</h3>
        <div className="narrative-action-list">
          {ACTION_TYPES.map(({ type, label, desc }) => {
            const base = getBaseActionValues(type);
            return (
              <button
                key={type}
                className={`narrative-action-btn ${selectedAction === type ? 'narrative-action-btn--selected' : ''}`}
                onClick={() => setSelectedAction(type)}
                type="button"
              >
                <span className="narrative-action-label">{label}</span>
                <span className="narrative-action-desc">{desc}</span>
                <span className="narrative-action-effects">
                  {base.willGain > 0 && <span className="effect-tag">Will +{(base.willGain * 100).toFixed(1)}%</span>}
                  {base.trustGain > 0 && <span className="effect-tag">Trust +{(base.trustGain * 100).toFixed(1)}%</span>}
                  {base.trustGain < 0 && <span className="effect-tag" style={{ color: 'var(--color-negative)' }}>Trust {(base.trustGain * 100).toFixed(1)}%</span>}
                  {base.policyThresholdReduction > 0 && <span className="effect-tag">Threshold -{(base.policyThresholdReduction * 100).toFixed(1)}%</span>}
                  {base.opinionGain > 0 && <span className="effect-tag">Opinion +{(base.opinionGain * 100).toFixed(1)}%</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="narrative-section">
        <h3 className="narrative-section-title">Topic</h3>
        <div className="narrative-topic-buttons">
          {TOPICS.map(({ key, label }) => (
            <button
              key={key}
              className={`mode-toggle-btn ${selectedTopic === key ? 'mode-toggle-btn--active' : ''}`}
              onClick={() => setSelectedTopic(key)}
              type="button"
            >
              {label}
              <span className="narrative-topic-value">
                {state.publicOpinion[key].toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="narrative-section">
        <h3 className="narrative-section-title">Target Neighborhood</h3>
        <select
          className="narrative-target-select"
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value)}
        >
          {Object.values(state.tiles).map((tile) => (
            <option key={tile.id} value={tile.id}>
              {tile.name}
            </option>
          ))}
        </select>
      </div>

      <button
        className="btn btn-primary narrative-take-action-btn"
        disabled={!selectedAction || actionsRemaining <= 0}
        onClick={handleTakeAction}
        type="button"
      >
        {actionsRemaining <= 0
          ? 'No Actions Remaining'
          : !selectedAction
            ? 'Select an Action'
            : 'Take Action'}
      </button>
    </div>
  );
}
