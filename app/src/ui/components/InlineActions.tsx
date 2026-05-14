import React from 'react';

export interface InlineAction {
  id: string;
  label: string;
  slotCost: number;
  actionType: string;
  targetId?: string;
  tileId?: string;
  disabled?: boolean;
  disabledReason?: string;
  yieldPreview?: Record<string, number>;
}

interface InlineActionsProps {
  actions: InlineAction[];
  availableSlots: number;
  overscheduleLimit: number;
  overscheduleUsed: number;
  burnoutState: string;
  onAction: (action: InlineAction) => void;
}

export const InlineActions: React.FC<InlineActionsProps> = ({
  actions,
  availableSlots,
  overscheduleLimit,
  overscheduleUsed,
  burnoutState,
  onAction,
}) => {
  if (burnoutState === 'collapse') {
    return (
      <div className="inline-actions inline-actions--collapsed">
        <p className="inline-actions__collapse-msg">
          You've collapsed from burnout. No actions available this month.
        </p>
      </div>
    );
  }

  const totalAvailable = availableSlots + (overscheduleLimit - overscheduleUsed);

  return (
    <div className="inline-actions">
      {actions.map((action) => {
        const canAfford = totalAvailable >= action.slotCost;
        const wouldOverschedule = availableSlots < action.slotCost && canAfford;
        const isDisabled = action.disabled || !canAfford;

        return (
          <button
            key={action.id}
            className={`inline-action ${wouldOverschedule ? 'inline-action--overschedule' : ''} ${isDisabled ? 'inline-action--disabled' : ''}`}
            onClick={() => !isDisabled && onAction(action)}
            disabled={isDisabled}
            title={
              action.disabledReason
                ?? (isDisabled ? 'Not enough calendar slots'
                  : wouldOverschedule ? 'This would overschedule you (drains burnout buffer)'
                    : `${action.label} — ${action.slotCost} slot${action.slotCost > 1 ? 's' : ''}`)
            }
          >
            <span className="inline-action__label">{action.label}</span>
            <span className="inline-action__cost">
              {action.slotCost} slot{action.slotCost > 1 ? 's' : ''}
            </span>
            {wouldOverschedule && (
              <span className="inline-action__warning">overschedule</span>
            )}
            {action.yieldPreview && Object.keys(action.yieldPreview).length > 0 && (
              <span className="inline-action__yield">
                {Object.entries(action.yieldPreview).map(([key, val]) => (
                  <span key={key} className="inline-action__yield-item">
                    +{val.toFixed(1)} {key}
                  </span>
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
