import { useGame } from '@/state/store';
import { POLICY_CATALOG } from '@/data/content/policy-catalog';
import { calculateTotalPolicyDrain } from '@/systems/policies';
import { formatBudget } from '@/ui/format';
import type { Meters, MeterDelta, PublicOpinion } from '@/state/types';

function meterColor(value: number, thresholds: { green: number; yellow: number }): string {
  if (value >= thresholds.green) return 'var(--color-positive)';
  if (value >= thresholds.yellow) return 'var(--color-warning)';
  return 'var(--color-negative)';
}

function getDelta(deltas: MeterDelta[], meter: keyof Meters): number {
  return deltas
    .filter((d) => d.meter === meter)
    .reduce((sum, d) => sum + d.amount, 0);
}

function DeltaArrow({ value }: { value: number }) {
  if (Math.abs(value) < 0.01) return null;
  const arrow = value > 0 ? '▲' : '▼';
  const color = value > 0 ? 'var(--color-positive)' : 'var(--color-negative)';
  return (
    <span className="meter-delta" style={{ color }}>
      {arrow} {Math.abs(value).toFixed(1)}
    </span>
  );
}

interface MeterItemProps {
  label: string;
  value: string;
  barPercent: number;
  barColor: string;
  delta: number;
  subtext?: string;
}

function MeterItem({ label, value, barPercent, barColor, delta, subtext }: MeterItemProps) {
  return (
    <div className="meter-item">
      <div className="meter-label">{label}</div>
      <div className="meter-bar-track">
        <div
          className="meter-bar-fill"
          style={{ width: `${Math.max(0, Math.min(100, barPercent))}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="meter-value">
        {value}
        <DeltaArrow value={delta} />
      </div>
      {subtext && <div className="meter-subtext">{subtext}</div>}
    </div>
  );
}

const OPINION_LABELS: Record<keyof PublicOpinion, string> = {
  foodSovereignty: 'Food',
  waterCommons: 'Water',
  landReform: 'Land',
  ecologicalRestoration: 'Eco',
  cooperativeEconomics: 'Coop',
  nuclearEnergy: 'Nuclear',
  nutrientRecycling: 'Nutrient',
  landExpropriation: 'Expropriate',
  deGrowth: 'De-Growth',
  decarceration: 'Decarcer',
};

function getTopOpinions(opinion: PublicOpinion, count: number): { key: keyof PublicOpinion; label: string; value: number }[] {
  return (Object.keys(OPINION_LABELS) as (keyof PublicOpinion)[])
    .map((key) => ({ key, label: OPINION_LABELS[key], value: opinion[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

export default function MeterBar() {
  const { state } = useGame();
  const { meters, turnSummary, activePolicies, publicOpinion } = state;
  const deltas = turnSummary?.deltas ?? [];

  const totalDrain = calculateTotalPolicyDrain(activePolicies, POLICY_CATALOG);
  const drainText = totalDrain > 0 ? `drain: -${(totalDrain * 100).toFixed(1)}%/turn` : undefined;

  const topIssues = getTopOpinions(publicOpinion, 4);

  return (
    <div className="meter-bar">
      <MeterItem
        label="Community Trust"
        value={`${Math.round(meters.communityTrust)}%`}
        barPercent={meters.communityTrust}
        barColor={meterColor(meters.communityTrust, { green: 50, yellow: 25 })}
        delta={getDelta(deltas, 'communityTrust')}
      />
      <MeterItem
        label="Eco Health"
        value={`${Math.round(meters.ecologicalHealth)}%`}
        barPercent={meters.ecologicalHealth}
        barColor={meterColor(meters.ecologicalHealth, { green: 50, yellow: 25 })}
        delta={getDelta(deltas, 'ecologicalHealth')}
      />
      <MeterItem
        label="Food Sovereignty"
        value={`${Math.round(meters.foodSovereignty)}%`}
        barPercent={meters.foodSovereignty}
        barColor={meterColor(meters.foodSovereignty, { green: 40, yellow: 20 })}
        delta={getDelta(deltas, 'foodSovereignty')}
      />
      <MeterItem
        label="Political Will"
        value={`${Math.round(meters.politicalWill)}%`}
        barPercent={meters.politicalWill}
        barColor={meterColor(meters.politicalWill, { green: 50, yellow: 25 })}
        delta={getDelta(deltas, 'politicalWill')}
        subtext={drainText}
      />
      <MeterItem
        label="Budget"
        value={formatBudget(meters.budget)}
        barPercent={(meters.budget / 10) * 100}
        barColor="#60a5fa"
        delta={getDelta(deltas, 'budget')}
      />
      <MeterItem
        label="Climate Pressure"
        value={`${Math.round(meters.climatePressure)}%`}
        barPercent={meters.climatePressure}
        barColor={meters.climatePressure > 60 ? 'var(--color-negative)' : '#fbbf24'}
        delta={getDelta(deltas, 'climatePressure')}
      />
      <div className="meter-item meter-item--opinion">
        <div className="meter-label">Top Issues</div>
        <div className="opinion-top-issues">
          {topIssues.map(({ key, label, value }) => (
            <span key={key} className="opinion-chip" title={`${label}: ${value.toFixed(0)}% public support`}>
              {label} {value.toFixed(0)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
