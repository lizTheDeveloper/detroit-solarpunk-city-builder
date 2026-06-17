import { useGame } from '@/state/store';

interface EndTurnButtonProps {
  onEndTurn: () => void;
  onResolve?: () => void;
}

export default function EndTurnButton({ onEndTurn, onResolve }: EndTurnButtonProps) {
  const { state } = useGame();
  const hasUnrespondedProposals = state.activeProposals.length > 0;
  const hasUnrespondedEvents = state.eventQueue.length > 0;
  const isEventsPhase = state.phase === 'events';

  if (isEventsPhase && !hasUnrespondedEvents && onResolve) {
    return (
      <button
        className="btn btn-end-turn"
        onClick={onResolve}
        title="Resolve the turn"
        type="button"
      >
        Resolve Turn
      </button>
    );
  }

  const isBlocked = hasUnrespondedEvents;

  const expiringSoon = state.activeProposals.filter(p => (p.expirationTurn - state.turn) <= 1).length;

  let title = 'End Turn';
  let label = 'End Turn';

  if (hasUnrespondedEvents) {
    title = 'Respond to all events before ending the turn';
    label = `End Turn (${state.eventQueue.length} event${state.eventQueue.length !== 1 ? 's' : ''} pending)`;
  } else if (hasUnrespondedProposals) {
    title = expiringSoon > 0
      ? `${expiringSoon} proposal${expiringSoon !== 1 ? 's' : ''} expiring soon`
      : `${state.activeProposals.length} proposal${state.activeProposals.length !== 1 ? 's' : ''} pending`;
    label = expiringSoon > 0
      ? `End Turn (${expiringSoon} expiring soon)`
      : `End Turn (${state.activeProposals.length} pending)`;
  }

  return (
    <button
      className="btn btn-end-turn"
      disabled={isBlocked}
      onClick={onEndTurn}
      title={title}
      type="button"
    >
      {label}
    </button>
  );
}
