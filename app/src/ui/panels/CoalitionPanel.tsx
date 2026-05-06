import { useState } from 'react';
import { useGame } from '@/state/store';
import { canFormCoalition } from '@/systems/relationships';
import type { CommunityLeader, PublicOpinion } from '@/state/types';

const TOPIC_LABELS: Record<keyof PublicOpinion, string> = {
  foodSovereignty: 'Food Sovereignty',
  waterCommons: 'Water Commons',
  landReform: 'Land Reform',
  ecologicalRestoration: 'Ecological Restoration',
  cooperativeEconomics: 'Cooperative Economics',
};

const TOPICS = Object.keys(TOPIC_LABELS) as (keyof PublicOpinion)[];

function EligibleLeaderCheckbox({
  leader,
  selected,
  onToggle,
}: {
  leader: CommunityLeader;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="coalition-leader-row">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="coalition-leader-checkbox"
      />
      <span className="coalition-leader-name">{leader.name}</span>
      <span className="coalition-leader-neighborhood">{leader.neighborhood}</span>
      <span className="coalition-leader-trust">Trust: {Math.round(leader.trust)}</span>
    </label>
  );
}

export default function CoalitionPanel() {
  const { state, dispatch } = useGame();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<keyof PublicOpinion>('foodSovereignty');
  const [coalitionName, setCoalitionName] = useState('');

  const leaders = Object.values(state.leaders);
  const eligibleLeaders = leaders.filter((l) => l.trust >= 40);
  const activeCoalitions = state.coalitions.filter((c) => c.active);

  const toggleLeader = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const check = canFormCoalition(state, selectedIds, selectedTopic);

  const handleForm = () => {
    if (!check.allowed) return;
    const name = coalitionName.trim() || `${TOPIC_LABELS[selectedTopic]} Coalition`;
    dispatch({
      type: 'FORM_COALITION',
      name,
      memberIds: selectedIds,
      topic: selectedTopic,
    });
    setSelectedIds([]);
    setCoalitionName('');
  };

  return (
    <div className="panel coalition-panel">
      <h2 className="panel-title">Coalitions</h2>
      <p className="panel-subtitle">
        Form coalitions of 3+ trusted leaders around shared topics.
        Required for the Beyond stage. Max 2 active coalitions.
      </p>

      {/* Active Coalitions */}
      {activeCoalitions.length > 0 && (
        <div className="coalition-active-section">
          <h3 className="coalition-section-title">Active Coalitions</h3>
          {activeCoalitions.map((c) => (
            <div key={c.id} className="coalition-card coalition-card--active">
              <div className="coalition-card-header">
                <span className="coalition-card-name">{c.name}</span>
                <span className="coalition-card-topic">{TOPIC_LABELS[c.topic as keyof PublicOpinion] || c.topic}</span>
              </div>
              <div className="coalition-card-members">
                {c.memberIds.map((id) => {
                  const leader = state.leaders[id];
                  return leader ? (
                    <span key={id} className="tag tag--trait">{leader.name}</span>
                  ) : null;
                })}
              </div>
              <div className="coalition-card-formed">
                Formed turn {c.formedTurn}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form New Coalition */}
      {activeCoalitions.length < 2 && (
        <div className="coalition-form-section">
          <h3 className="coalition-section-title">Form New Coalition</h3>

          {eligibleLeaders.length < 3 ? (
            <div className="coalition-warning">
              Not enough eligible leaders. Need 3+ leaders with trust at least 40.
              Currently eligible: {eligibleLeaders.length}
            </div>
          ) : (
            <>
              {/* Topic selection */}
              <div className="coalition-field">
                <label className="coalition-field-label">Topic</label>
                <select
                  className="coalition-select"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value as keyof PublicOpinion)}
                >
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>{TOPIC_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* Coalition name */}
              <div className="coalition-field">
                <label className="coalition-field-label">Name (optional)</label>
                <input
                  type="text"
                  className="coalition-input"
                  value={coalitionName}
                  onChange={(e) => setCoalitionName(e.target.value)}
                  placeholder={`${TOPIC_LABELS[selectedTopic]} Coalition`}
                />
              </div>

              {/* Leader selection */}
              <div className="coalition-field">
                <label className="coalition-field-label">
                  Select Leaders ({selectedIds.length} selected, need 3+)
                </label>
                <div className="coalition-leader-list">
                  {eligibleLeaders.map((l) => (
                    <EligibleLeaderCheckbox
                      key={l.id}
                      leader={l}
                      selected={selectedIds.includes(l.id)}
                      onToggle={() => toggleLeader(l.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Validation message */}
              {!check.allowed && selectedIds.length > 0 && (
                <div className="coalition-warning">{check.reason}</div>
              )}

              {/* Form button */}
              <button
                className="btn btn-primary"
                disabled={!check.allowed}
                onClick={handleForm}
                type="button"
              >
                Form Coalition
              </button>
            </>
          )}
        </div>
      )}

      {activeCoalitions.length >= 2 && (
        <div className="coalition-warning">
          Maximum of 2 active coalitions reached.
        </div>
      )}

      {/* Ineligible leaders info */}
      {leaders.length > eligibleLeaders.length && (
        <div className="coalition-ineligible-section">
          <h3 className="coalition-section-title">Not Yet Eligible</h3>
          <p className="coalition-ineligible-hint">Leaders need trust at least 40 to join a coalition.</p>
          <div className="coalition-ineligible-list">
            {leaders
              .filter((l) => l.trust < 40)
              .map((l) => (
                <div key={l.id} className="coalition-ineligible-row">
                  <span className="coalition-leader-name">{l.name}</span>
                  <span className="coalition-leader-trust coalition-leader-trust--low">
                    Trust: {Math.round(l.trust)} (need 40)
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
