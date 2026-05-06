import { useGame } from '@/state/store';
import { getRelationshipLevel } from '@/systems/relationships';
import type { CommunityLeader, RelationshipLevel } from '@/state/types';

const LEVEL_LABELS: Record<RelationshipLevel, string> = {
  partner: 'Partner',
  champion: 'Champion',
  advocate: 'Advocate',
  neutral: 'Neutral',
  disillusioned: 'Disillusioned',
  opposition: 'Opposition',
  hostile: 'Hostile',
};

function TrustBar({ value }: { value: number }) {
  const pct = ((value + 100) / 200) * 100;
  const color = value >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';

  return (
    <div className="disposition-bar-track">
      <div className="disposition-bar-center" />
      <div
        className="disposition-bar-fill"
        style={{
          left: value >= 0 ? '50%' : `${pct}%`,
          width: `${Math.abs(value) / 2}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

function AdvocacyDots({ power }: { power: number }) {
  const dots = [];
  for (let i = 0; i < 5; i++) {
    dots.push(
      <span
        key={i}
        className={`advocacy-dot ${i < power ? 'advocacy-dot--filled' : ''}`}
      />
    );
  }
  return <div className="advocacy-dots">{dots}</div>;
}

function LeaderCard({ leader, onTalk }: { leader: CommunityLeader; onTalk?: (id: string) => void }) {
  const level = getRelationshipLevel(leader.trust);

  return (
    <div className="leader-card">
      <div className="leader-card-header">
        <span className="leader-card-name">{leader.name}</span>
        <span className="leader-card-neighborhood">{leader.neighborhood}</span>
      </div>
      <div className="leader-trust-row">
        <TrustBar value={leader.trust} />
        <span className="leader-trust-value">
          {leader.trust > 0 ? '+' : ''}{Math.round(leader.trust)}
        </span>
        <span className={`leader-level-label leader-level-label--${level}`}>
          {LEVEL_LABELS[level]}
        </span>
      </div>
      <div className="leader-advocacy-row">
        <span className="leader-advocacy-label">Advocacy Power</span>
        <AdvocacyDots power={leader.advocacyPower} />
      </div>
      <div className="tag-list">
        {leader.priorities.map((p) => (
          <span key={p} className="tag tag--trait">{p.replace(/_/g, ' ')}</span>
        ))}
      </div>
      {onTalk && (
        <button type="button" className="btn btn-sm leader-talk-btn" onClick={() => onTalk(leader.id)}>
          Talk
        </button>
      )}
    </div>
  );
}

export default function CharacterPanel({ onTalk }: { onTalk?: (characterId: string) => void }) {
  const { state } = useGame();
  const leaders = Object.values(state.leaders);

  return (
    <div className="panel character-panel">
      <h2 className="panel-title">Community Leaders</h2>
      <p className="panel-subtitle">
        Build trust with leaders to unlock coalitions and advocacy.
      </p>
      <div className="leader-grid">
        {leaders.map((l) => (
          <LeaderCard key={l.id} leader={l} onTalk={onTalk} />
        ))}
      </div>
    </div>
  );
}
