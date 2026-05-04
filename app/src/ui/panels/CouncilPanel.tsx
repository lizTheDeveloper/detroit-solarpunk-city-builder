import { useGame } from '@/state/store';
import { getDispositionLevel } from '@/systems/council';
import type { CouncilMember, PoliticalLeaning, DispositionLevel } from '@/state/types';

const LEANING_COLORS: Record<PoliticalLeaning, string> = {
  progressive: '#4ade80',
  moderate: '#60a5fa',
  'moderate-conservative': '#fbbf24',
  conservative: '#f87171',
};

const DISPOSITION_LABELS: Record<DispositionLevel, string> = {
  coalition_partner: 'Coalition Partner',
  ally: 'Ally',
  lean_yes: 'Lean Yes',
  neutral: 'Neutral',
  skeptic: 'Skeptic',
  opponent: 'Opponent',
  adversary: 'Adversary',
};

function DispositionBar({ value }: { value: number }) {
  // Map -100..+100 to 0..100% for display
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

function CouncilMemberCard({ member }: { member: CouncilMember }) {
  const level = getDispositionLevel(member.disposition);
  const leaningColor = LEANING_COLORS[member.leaning];

  return (
    <div className="council-member-card">
      <div className="council-member-header">
        <span className="council-member-name">{member.name}</span>
        <span
          className="council-leaning-badge"
          style={{ borderColor: leaningColor, color: leaningColor }}
        >
          {member.leaning}
        </span>
      </div>
      <div className="council-member-district">
        District {member.districtNumber}: {member.district}
      </div>
      <div className="council-disposition-row">
        <DispositionBar value={member.disposition} />
        <span className="council-disposition-value">
          {member.disposition > 0 ? '+' : ''}{Math.round(member.disposition)}
        </span>
        <span className={`council-disposition-label council-disposition-label--${level}`}>
          {DISPOSITION_LABELS[level]}
        </span>
      </div>
      <div className="tag-list">
        {member.priorities.map((p) => (
          <span key={p} className="tag">{p.replace(/_/g, ' ')}</span>
        ))}
      </div>
    </div>
  );
}

export default function CouncilPanel() {
  const { state } = useGame();
  const members = Object.values(state.councilMembers).sort(
    (a, b) => a.districtNumber - b.districtNumber,
  );

  return (
    <div className="panel council-panel">
      <h2 className="panel-title">City Council</h2>
      <p className="panel-subtitle">
        9 council members vote on policies. Build relationships to earn votes.
      </p>
      <div className="council-grid">
        {members.map((m) => (
          <CouncilMemberCard key={m.id} member={m} />
        ))}
      </div>
    </div>
  );
}
