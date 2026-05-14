import React from 'react';

interface CalendarBarProps {
  discretionarySlots: number;
  slotsSpent: number;
  overscheduleAmount: number;
  overscheduleLimit: number;
  crisisSlotTax: number;
  burnoutState: string;
  burnoutBuffer: number;
  burnoutBufferMax: number;
  onRestDay?: () => void;
  onExpandCalendar?: () => void;
}

function getBarColor(percent: number, overscheduled: boolean): string {
  if (overscheduled) return 'var(--calendar-overschedule)';
  if (percent > 60) return 'var(--calendar-healthy)';
  if (percent > 30) return 'var(--calendar-caution)';
  if (percent > 10) return 'var(--calendar-warning)';
  return 'var(--calendar-critical)';
}

function getBurnoutLabel(state: string): string {
  switch (state) {
    case 'sustainable': return '';
    case 'overextended': return 'Overextended';
    case 'burnout': return 'Burned Out';
    case 'collapse': return 'Collapsed';
    default: return '';
  }
}

export const CalendarBar: React.FC<CalendarBarProps> = ({
  discretionarySlots,
  slotsSpent,
  overscheduleAmount,
  overscheduleLimit,
  crisisSlotTax,
  burnoutState,
  burnoutBuffer,
  burnoutBufferMax,
  onRestDay,
  onExpandCalendar,
}) => {
  const available = discretionarySlots - slotsSpent;
  const percentRemaining = (available / discretionarySlots) * 100;
  const percentSpent = (slotsSpent / discretionarySlots) * 100;
  const percentTaxed = (crisisSlotTax / 60) * 100;
  const isOverscheduled = overscheduleAmount > 0;
  const burnoutLabel = getBurnoutLabel(burnoutState);

  return (
    <div className="calendar-bar" onClick={onExpandCalendar} title="Click to expand calendar">
      <div className="calendar-bar__header">
        <span className="calendar-bar__title">Calendar</span>
        <span className="calendar-bar__count">
          {available} / {discretionarySlots} slots
          {crisisSlotTax > 0 && (
            <span className="calendar-bar__tax"> ({crisisSlotTax} taxed by crises)</span>
          )}
        </span>
        {burnoutLabel && (
          <span className={`calendar-bar__burnout calendar-bar__burnout--${burnoutState}`}>
            {burnoutLabel}
          </span>
        )}
      </div>

      <div className="calendar-bar__track">
        {/* Crisis tax portion (unavailable) */}
        {crisisSlotTax > 0 && (
          <div
            className="calendar-bar__segment calendar-bar__segment--taxed"
            style={{ width: `${percentTaxed}%` }}
            title={`${crisisSlotTax} slots consumed by active crises`}
          />
        )}

        {/* Spent portion */}
        <div
          className="calendar-bar__segment calendar-bar__segment--spent"
          style={{
            width: `${Math.min(percentSpent, 100 - percentTaxed)}%`,
            backgroundColor: getBarColor(percentRemaining, isOverscheduled),
          }}
        />

        {/* Overschedule extension */}
        {isOverscheduled && (
          <div
            className="calendar-bar__segment calendar-bar__segment--overschedule"
            style={{ width: `${(overscheduleAmount / overscheduleLimit) * 10}%` }}
            title={`Overscheduled: ${overscheduleAmount}/${overscheduleLimit}`}
          />
        )}
      </div>

      <div className="calendar-bar__footer">
        <div className="calendar-bar__buffer" title={`Burnout buffer: ${burnoutBuffer}/${burnoutBufferMax}`}>
          <div className="calendar-bar__buffer-fill" style={{ width: `${(burnoutBuffer / burnoutBufferMax) * 100}%` }} />
        </div>
        {onRestDay && burnoutState !== 'collapse' && (
          <button
            className="calendar-bar__rest-btn"
            onClick={(e) => { e.stopPropagation(); onRestDay(); }}
            title="Take a rest day: +3 burnout buffer, costs 1 slot"
          >
            Rest Day
          </button>
        )}
      </div>
    </div>
  );
};
