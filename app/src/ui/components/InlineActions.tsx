import type { BurnoutState, CalendarActionType } from '@/state/types';

export interface InlineAction {
  id: string;
  label: string;
  slotCost: number;
  actionType: CalendarActionType;
  tileId?: string;
  targetId?: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface InlineActionsProps {
  actions: InlineAction[];
  availableSlots: number;
  overscheduleLimit: number;
  overscheduleUsed: number;
  burnoutState: BurnoutState;
  onAction: (action: InlineAction) => void;
}

export function InlineActions({
  actions,
  availableSlots,
  overscheduleLimit,
  overscheduleUsed,
  burnoutState,
  onAction,
}: InlineActionsProps) {
  const overscheduleAvailable = overscheduleLimit - overscheduleUsed;
  const collapsed = burnoutState === 'collapse';

  return (
    <div className="inline-actions">
      <div className="inline-actions-status">
        <span>Slots: {availableSlots}</span>
        {overscheduleAvailable > 0 && (
          <span className="inline-actions-overschedule">
            (+{overscheduleAvailable} via overschedule)
          </span>
        )}
      </div>
      <div className="inline-actions-buttons">
        {actions.map((action) => {
          const exceedsBudget = action.slotCost > availableSlots + overscheduleAvailable;
          const isDisabled = action.disabled || exceedsBudget || collapsed;
          const reason = collapsed
            ? 'Cannot act — burnout collapse'
            : exceedsBudget
              ? 'Not enough slots'
              : action.disabledReason;
          return (
            <button
              key={action.id}
              type="button"
              className="btn btn-sm inline-action-btn"
              onClick={() => onAction(action)}
              disabled={isDisabled}
              title={reason}
            >
              {action.label} <span className="inline-action-cost">({action.slotCost} slot{action.slotCost === 1 ? '' : 's'})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default InlineActions;
