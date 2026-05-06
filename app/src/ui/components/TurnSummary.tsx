import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { formatBudgetDelta } from '@/ui/format';
import type { Meters } from '@/state/types';

const METER_LABELS: Record<keyof Meters, string> = {
  communityTrust: 'Community Trust',
  ecologicalHealth: 'Eco Health',
  foodSovereignty: 'Food Sovereignty',
  politicalWill: 'Political Will',
  budget: 'Budget',
  climatePressure: 'Climate Pressure',
};

interface TurnSummaryProps {
  onDismiss: () => void;
}

export default function TurnSummary({ onDismiss }: TurnSummaryProps) {
  const { state } = useGame();
  const summary = state.turnSummary;

  if (!summary) return null;

  // Group deltas by meter
  const grouped: Record<string, Array<{ amount: number; source: string }>> = {};
  for (const delta of summary.deltas) {
    if (!grouped[delta.meter]) grouped[delta.meter] = [];
    grouped[delta.meter].push({ amount: delta.amount, source: delta.source });
  }

  return (
    <div className="turn-summary-overlay">
      <div className="turn-summary-modal">
        <h2 className="turn-summary-title">
          Turn {summary.turn} Summary - {summary.season.charAt(0).toUpperCase() + summary.season.slice(1)}, Year {summary.year}
        </h2>

        {Object.keys(grouped).length > 0 && (
          <div className="turn-summary-section">
            <h3>Meter Changes</h3>
            {Object.entries(grouped).map(([meter, entries]) => {
              const total = entries.reduce((s, e) => s + e.amount, 0);
              const meterKey = meter as keyof Meters;
              const arrow = total > 0 ? '▲' : total < 0 ? '▼' : '';
              const color = total > 0 ? 'var(--color-positive)' : total < 0 ? 'var(--color-negative)' : 'inherit';
              const format = meterKey === 'budget'
                ? formatBudgetDelta(total)
                : `${total > 0 ? '+' : ''}${total.toFixed(1)}%`;
              return (
                <div key={meter} className="summary-meter-row">
                  <span className="summary-meter-name">{METER_LABELS[meterKey] ?? meter}</span>
                  <span className="summary-meter-change" style={{ color }}>
                    {arrow} {format}
                  </span>
                  <div className="summary-meter-sources">
                    {entries.map((e, i) => (
                      <span key={i} className="summary-source">
                        {e.source}: {meterKey === 'budget' ? formatBudgetDelta(e.amount) : `${e.amount > 0 ? '+' : ''}${e.amount.toFixed(1)}%`}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {summary.completedProjects.length > 0 && (
          <div className="turn-summary-section">
            <h3>Completed Projects</h3>
            <div className="tag-list">
              {summary.completedProjects.map((pid, i) => {
                const def = PROJECT_CATALOG[pid];
                return (
                  <span key={`${pid}-${i}`} className="tag tag--completed">
                    {def?.name ?? pid}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {summary.firedConsequences.length > 0 && (
          <div className="turn-summary-section">
            <h3>Consequences Unfolding</h3>
            {summary.firedConsequences.map((c, i) => (
              <div key={i} className="summary-consequence">
                {c.hint}
              </div>
            ))}
          </div>
        )}

        {summary.arcTransitions.length > 0 && (
          <div className="turn-summary-section">
            <h3>Crisis Developments</h3>
            {summary.arcTransitions.map((t, i) => (
              <div key={i} className="summary-arc-transition">
                {t.arcId.replace(/-/g, ' ')}: {t.from} → {t.to}
              </div>
            ))}
          </div>
        )}

        {summary.tileTransformations.length > 0 && (
          <div className="turn-summary-section">
            <h3>Neighborhood Transformations</h3>
            {summary.tileTransformations.map((t, i) => (
              <div key={i} className="summary-transformation">
                {t.tileId}: {t.from} → {t.to}
              </div>
            ))}
          </div>
        )}

        {Object.keys(grouped).length === 0 && summary.completedProjects.length === 0 && summary.firedConsequences.length === 0 && (
          <p className="summary-empty">No major changes this turn.</p>
        )}

        <button className="btn btn-primary" onClick={onDismiss} type="button">
          Continue
        </button>
      </div>
    </div>
  );
}
