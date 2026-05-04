import { useGame } from '@/state/store';
import type { GameEvent, EventChoice } from '@/state/types';

function EffectsPreview({ choice }: { choice: EventChoice }) {
  const { meterDeltas, other } = choice.effects;

  return (
    <div className="event-effects-preview">
      {meterDeltas.map((d, i) => {
        const label = d.meter === 'communityTrust'
          ? 'Trust'
          : d.meter === 'ecologicalHealth'
            ? 'Eco'
            : d.meter === 'foodSovereignty'
              ? 'Food Sov'
              : d.meter === 'politicalWill'
                ? 'Will'
                : d.meter === 'budget'
                  ? 'Budget'
                  : d.meter === 'climatePressure'
                    ? 'Climate'
                    : d.meter;
        const color = d.amount >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
        const fmt = d.meter === 'budget'
          ? `${d.amount >= 0 ? '+' : ''}$${d.amount.toFixed(2)}M`
          : `${d.amount >= 0 ? '+' : ''}${d.amount}%`;
        return (
          <span key={i} className="effect-tag" style={{ color }}>
            {label} {fmt}
          </span>
        );
      })}
      {other.map((o, i) => (
        <span key={`o-${i}`} className="effect-tag">{o}</span>
      ))}
    </div>
  );
}

function RequirementsNotice({ choice, state }: { choice: EventChoice; state: { meters: { politicalWill: number; budget: number; communityTrust: number } } }) {
  if (!choice.requirements) return null;
  const reqs = choice.requirements;
  const fails: string[] = [];
  if (reqs.minWill !== null && state.meters.politicalWill < reqs.minWill) {
    fails.push(`Will >= ${reqs.minWill}%`);
  }
  if (reqs.minBudget !== null && state.meters.budget < reqs.minBudget) {
    fails.push(`Budget >= $${reqs.minBudget}M`);
  }
  if (reqs.minTrust !== null && state.meters.communityTrust < reqs.minTrust) {
    fails.push(`Trust >= ${reqs.minTrust}%`);
  }
  if (fails.length === 0) return null;
  return <div className="event-req-warning">Requires: {fails.join(', ')}</div>;
}

function EventCard({ event }: { event: GameEvent }) {
  const { state, dispatch } = useGame();

  function handleChoice(choiceId: string) {
    dispatch({ type: 'RESPOND_EVENT', eventId: event.id, choiceId });
  }

  const categoryColors: Record<string, string> = {
    climate: '#fbbf24',
    political: '#60a5fa',
    community: '#4ade80',
    crisis: '#f87171',
    antagonist: '#a855f7',
  };

  return (
    <div className="event-card">
      <div className="event-card-header">
        <span className="event-card-title">{event.title}</span>
        <span
          className="event-category-badge"
          style={{ color: categoryColors[event.category] ?? 'var(--text-dim)' }}
        >
          {event.category}
        </span>
      </div>
      <p className="event-card-desc">{event.description}</p>
      {event.targetTileId && (
        <div className="event-target">
          Target: {state.tiles[event.targetTileId]?.name ?? event.targetTileId}
        </div>
      )}
      <div className="event-choices">
        {event.choices.map((choice) => {
          const meetsReqs = !choice.requirements || (
            (choice.requirements.minWill === null || state.meters.politicalWill >= choice.requirements.minWill) &&
            (choice.requirements.minBudget === null || state.meters.budget >= choice.requirements.minBudget) &&
            (choice.requirements.minTrust === null || state.meters.communityTrust >= choice.requirements.minTrust)
          );

          return (
            <div key={choice.id} className="event-choice-option">
              <div className="event-choice-info">
                <span className="event-choice-label">{choice.label}</span>
                <span className="event-choice-desc">{choice.description}</span>
                <EffectsPreview choice={choice} />
                <RequirementsNotice choice={choice} state={state} />
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={!meetsReqs}
                onClick={() => handleChoice(choice.id)}
                type="button"
              >
                Choose
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EventPanel() {
  const { state } = useGame();

  if (state.eventQueue.length === 0) return null;

  return (
    <div className="panel event-panel">
      <h2 className="panel-title">Events</h2>
      <p className="panel-subtitle">
        Respond to events before continuing. {state.eventQueue.length} event{state.eventQueue.length !== 1 ? 's' : ''} pending.
      </p>
      {state.eventQueue.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
