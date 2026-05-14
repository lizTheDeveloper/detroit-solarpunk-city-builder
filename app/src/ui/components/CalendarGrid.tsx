import React from 'react';

interface SlotData {
  type: 'fixed' | 'spent' | 'available' | 'taxed' | 'overscheduled';
  action?: string;
  npcName?: string;
  crisisName?: string;
}

interface CalendarGridProps {
  totalSlots: number;
  fixedSlots: number;
  slotsSpent: number;
  crisisSlotTax: number;
  overscheduleAmount: number;
  spentSlotDetails: Array<{ action: string; npcName?: string }>;
  crisisNames: string[];
  monthNumber: number;
  expanded: boolean;
  onToggle: () => void;
}

function buildSlotGrid(props: CalendarGridProps): SlotData[] {
  const slots: SlotData[] = [];

  // Fixed obligation slots
  for (let i = 0; i < props.fixedSlots; i++) {
    slots.push({ type: 'fixed' });
  }

  // Crisis-taxed slots
  for (let i = 0; i < props.crisisSlotTax; i++) {
    slots.push({ type: 'taxed', crisisName: props.crisisNames[i % props.crisisNames.length] });
  }

  // Spent discretionary slots
  for (let i = 0; i < props.slotsSpent; i++) {
    const detail = props.spentSlotDetails[i];
    slots.push({
      type: 'spent',
      action: detail?.action ?? 'action',
      npcName: detail?.npcName,
    });
  }

  // Overscheduled slots
  for (let i = 0; i < props.overscheduleAmount; i++) {
    slots.push({ type: 'overscheduled' });
  }

  // Available slots
  const totalUsed = props.fixedSlots + props.crisisSlotTax + props.slotsSpent;
  const availableCount = Math.max(0, props.totalSlots - totalUsed);
  for (let i = 0; i < availableCount; i++) {
    slots.push({ type: 'available' });
  }

  return slots;
}

function getSlotClassName(slot: SlotData): string {
  return `calendar-grid__slot calendar-grid__slot--${slot.type}`;
}

function getSlotTitle(slot: SlotData): string {
  switch (slot.type) {
    case 'fixed': return 'Fixed obligation (council, press, admin)';
    case 'spent': return `${slot.action}${slot.npcName ? ` — ${slot.npcName}` : ''}`;
    case 'available': return 'Available';
    case 'taxed': return `Crisis: ${slot.crisisName ?? 'active crisis'}`;
    case 'overscheduled': return 'Overscheduled (drains burnout buffer)';
    default: return '';
  }
}

export const CalendarGrid: React.FC<CalendarGridProps> = (props) => {
  if (!props.expanded) return null;

  const slots = buildSlotGrid(props);

  return (
    <div className="calendar-grid">
      <div className="calendar-grid__header">
        <h3>Month {props.monthNumber} — Calendar</h3>
        <button className="calendar-grid__close" onClick={props.onToggle}>Close</button>
      </div>
      <div className="calendar-grid__legend">
        <span className="calendar-grid__legend-item"><span className="calendar-grid__dot calendar-grid__dot--fixed" /> Fixed</span>
        <span className="calendar-grid__legend-item"><span className="calendar-grid__dot calendar-grid__dot--spent" /> Spent</span>
        <span className="calendar-grid__legend-item"><span className="calendar-grid__dot calendar-grid__dot--available" /> Available</span>
        <span className="calendar-grid__legend-item"><span className="calendar-grid__dot calendar-grid__dot--taxed" /> Crisis Tax</span>
      </div>
      <div className="calendar-grid__cells">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={getSlotClassName(slot)}
            title={getSlotTitle(slot)}
          >
            {slot.type === 'spent' && (
              <span className="calendar-grid__slot-label">
                {slot.action?.slice(0, 3)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
