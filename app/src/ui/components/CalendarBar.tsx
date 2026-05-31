import type { BurnoutState } from '@/state/types';

interface CalendarBarProps {
  discretionarySlots: number;
  slotsSpent: number;
  overscheduleAmount: number;
  overscheduleLimit: number;
  crisisSlotTax: number;
  burnoutState: BurnoutState;
  burnoutBuffer: number;
  burnoutBufferMax: number;
  onRestDay: () => void;
}

export function CalendarBar({
  discretionarySlots,
  slotsSpent,
  overscheduleAmount,
  overscheduleLimit,
  crisisSlotTax,
  burnoutState,
  burnoutBuffer,
  burnoutBufferMax,
  onRestDay,
}: CalendarBarProps) {
  const remaining = Math.max(0, discretionarySlots - slotsSpent);
  const bufferPct = burnoutBufferMax > 0 ? (burnoutBuffer / burnoutBufferMax) * 100 : 0;

  return (
    <div className="calendar-bar">
      <div className="calendar-bar-slots">
        <span>Slots: {remaining}/{discretionarySlots}</span>
        {overscheduleAmount > 0 && (
          <span className="calendar-bar-overschedule">
            Overscheduled: {overscheduleAmount}/{overscheduleLimit}
          </span>
        )}
        {crisisSlotTax > 0 && (
          <span className="calendar-bar-crisis">Crisis tax: -{crisisSlotTax}</span>
        )}
      </div>
      <div className="calendar-bar-burnout">
        <span>Burnout: {burnoutState}</span>
        <div className="calendar-bar-buffer">
          <div
            className="calendar-bar-buffer-fill"
            style={{ width: `${bufferPct}%` }}
            role="progressbar"
            aria-valuenow={burnoutBuffer}
            aria-valuemax={burnoutBufferMax}
          />
        </div>
        <span>{burnoutBuffer}/{burnoutBufferMax}</span>
      </div>
      <button type="button" className="btn btn-sm" onClick={onRestDay}>
        Rest Day
      </button>
    </div>
  );
}

export default CalendarBar;
