interface SpentSlotDetail {
  actionType: string;
  cost: number;
  targetName?: string;
}

interface CalendarGridProps {
  totalSlots: number;
  fixedSlots: number;
  slotsSpent: number;
  crisisSlotTax: number;
  overscheduleAmount: number;
  spentSlotDetails: SpentSlotDetail[];
  crisisNames: string[];
  monthNumber: number;
  expanded: boolean;
  onToggle: () => void;
}

export function CalendarGrid({
  totalSlots,
  fixedSlots,
  slotsSpent,
  crisisSlotTax,
  overscheduleAmount,
  spentSlotDetails,
  crisisNames,
  monthNumber,
  expanded,
  onToggle,
}: CalendarGridProps) {
  const cells: Array<{ kind: 'fixed' | 'crisis' | 'spent' | 'open' | 'overschedule'; label?: string }> = [];

  for (let i = 0; i < fixedSlots; i++) cells.push({ kind: 'fixed', label: 'Fixed obligation' });
  for (let i = 0; i < crisisSlotTax; i++) cells.push({ kind: 'crisis', label: crisisNames[i] ?? 'Crisis' });
  for (const detail of spentSlotDetails) {
    for (let i = 0; i < detail.cost; i++) {
      cells.push({ kind: 'spent', label: `${detail.actionType}${detail.targetName ? `: ${detail.targetName}` : ''}` });
    }
  }
  const remaining = totalSlots - cells.length - overscheduleAmount;
  for (let i = 0; i < remaining; i++) cells.push({ kind: 'open' });
  for (let i = 0; i < overscheduleAmount; i++) cells.push({ kind: 'overschedule', label: 'Overscheduled' });

  return (
    <div className="calendar-grid">
      <div className="calendar-grid-header">
        <span>Month {monthNumber}</span>
        <span>{slotsSpent}/{totalSlots - fixedSlots - crisisSlotTax} discretionary spent</span>
        <button type="button" className="btn btn-xs" onClick={onToggle}>
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {expanded && (
        <div className="calendar-grid-cells">
          {cells.map((cell, i) => (
            <div
              key={i}
              className={`calendar-cell calendar-cell--${cell.kind}`}
              title={cell.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CalendarGrid;
