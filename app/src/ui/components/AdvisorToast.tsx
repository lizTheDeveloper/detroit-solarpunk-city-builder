import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/state/store';
import { getAdvisorPrompt, dismissCondition, applyCooldown } from '@/systems/advisors';
import type { AdvisorPrompt } from '@/systems/advisors';
import { trackAdvisorShown } from '@/systems/analytics';

interface AdvisorToastProps {
  onStateUpdate: (updater: (prev: import('@/state/types').GameState) => import('@/state/types').GameState) => void;
}

export default function AdvisorToast({ onStateUpdate }: AdvisorToastProps) {
  const { state } = useGame();
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState<AdvisorPrompt | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const advisorPrompt = getAdvisorPrompt(state);
    if (advisorPrompt) {
      setPrompt(advisorPrompt);
      setVisible(true);
      setFading(false);
      trackAdvisorShown(advisorPrompt.conditionId);
    } else {
      setVisible(false);
    }
  }, [state.turn, state.phase]);

  // Auto-fade after 10 seconds (treat as cooldown)
  useEffect(() => {
    if (!visible || !prompt) return;
    const timer = setTimeout(() => {
      setFading(true);
      const fadeTimer = setTimeout(() => {
        setVisible(false);
        onStateUpdate((prev) => applyCooldown(prev, prompt.conditionId));
      }, 500);
      return () => clearTimeout(fadeTimer);
    }, 10000);
    return () => clearTimeout(timer);
  }, [visible, prompt, onStateUpdate]);

  const handleDismiss = useCallback(() => {
    if (!prompt) return;
    setVisible(false);
    onStateUpdate((prev) => dismissCondition(prev, prompt.conditionId));
  }, [prompt, onStateUpdate]);

  const handleClose = useCallback(() => {
    if (!prompt) return;
    setVisible(false);
    onStateUpdate((prev) => applyCooldown(prev, prompt.conditionId));
  }, [prompt, onStateUpdate]);

  if (!visible || !prompt) return null;

  return (
    <div
      className={`advisor-toast ${fading ? 'advisor-toast--fading' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="advisor-toast__header">
        <span className="advisor-toast__name">{prompt.characterName}</span>
        <button
          className="advisor-toast__close"
          onClick={handleClose}
          aria-label="Close"
          type="button"
        >
          &times;
        </button>
      </div>
      <p className="advisor-toast__message">{prompt.message}</p>
      <button
        className="advisor-toast__dismiss"
        onClick={handleDismiss}
        type="button"
      >
        Don&apos;t remind me
      </button>
    </div>
  );
}
