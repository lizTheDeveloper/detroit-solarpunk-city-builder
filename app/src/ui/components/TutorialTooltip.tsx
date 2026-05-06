import { useGame } from '@/state/store';
import { checkTutorialTriggers, completeStep, skipTutorial } from '@/systems/tutorial';
import type { GameState } from '@/state/types';

interface TutorialTooltipProps {
  onStateUpdate: (updater: (prev: GameState) => GameState) => void;
}

export default function TutorialTooltip({ onStateUpdate }: TutorialTooltipProps) {
  const { state } = useGame();

  const current = checkTutorialTriggers(state);
  if (!current) return null;

  const handleComplete = () => {
    onStateUpdate((prev) => completeStep(prev, current.stepId));
  };

  const handleSkip = () => {
    onStateUpdate((prev) => skipTutorial(prev));
  };

  return (
    <div className="tutorial-tooltip-overlay">
      <div className="tutorial-tooltip" role="alert" aria-live="polite">
        <p className="tutorial-tooltip-message">{current.message}</p>
        <div className="tutorial-tooltip-actions">
          <button
            className="btn btn-sm btn-primary"
            onClick={handleComplete}
            type="button"
          >
            Got it
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleSkip}
            type="button"
          >
            Skip Tutorial
          </button>
        </div>
        {current.panel && (
          <span className="tutorial-tooltip-hint">
            Check the {current.panel} tab
          </span>
        )}
      </div>
    </div>
  );
}
