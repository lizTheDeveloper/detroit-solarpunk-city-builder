import { useGame } from '@/state/store';
import { calculateProjections } from '@/systems/projections';
import Timeline from './Timeline';
import type { Meters } from '@/state/types';
import '@/ui/styles/dashboard.css';

const METER_CONFIG: Array<{
  key: keyof Meters;
  label: string;
  icon: string;
  color: string;
  invertDelta?: boolean;
  format: (v: number) => string;
}> = [
  { key: 'communityTrust', label: 'Community Trust', icon: '🤝', color: '#4ade80', format: v => `${v.toFixed(0)}%` },
  { key: 'ecologicalHealth', label: 'Ecological Health', icon: '🌿', color: '#34d399', format: v => `${v.toFixed(0)}%` },
  { key: 'foodSovereignty', label: 'Food Sovereignty', icon: '🌾', color: '#fbbf24', format: v => `${v.toFixed(0)}%` },
  { key: 'politicalWill', label: 'Political Will', icon: '✊', color: '#f97316', format: v => `${v.toFixed(0)}%` },
  { key: 'budget', label: 'Budget', icon: '💰', color: '#60a5fa', format: v => `$${(v * 1000).toFixed(0)}K` },
  { key: 'climatePressure', label: 'Climate Pressure', icon: '🌡', color: '#f87171', invertDelta: true, format: v => `${v.toFixed(0)}%` },
];

function getStageThresholds(stage: string): Partial<Record<keyof Meters, number>> {
  if (stage === 'awakening') return { ecologicalHealth: 30, foodSovereignty: 25, communityTrust: 40 };
  if (stage === 'transition') return { ecologicalHealth: 55, foodSovereignty: 40, communityTrust: 50 };
  if (stage === 'restoration') return { ecologicalHealth: 75, foodSovereignty: 60, communityTrust: 70 };
  return {};
}

function MeterCard({
  label, icon, color, values, threshold, format, invertDelta,
}: {
  label: string; icon: string; color: string;
  values: number[]; threshold?: number;
  format: (v: number) => string;
  invertDelta?: boolean;
}) {
  const current = values[0];
  const final = values[values.length - 1];
  const delta = final - current;
  const deltaStr = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  const isRising = invertDelta ? delta < -1 : delta > 1;
  const isFalling = invertDelta ? delta > 1 : delta < -1;

  // Sparkline SVG
  const w = 200;
  const h = 48;
  const pad = 4;
  const allVals = [...values, ...(threshold != null ? [threshold] : [])];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const rawRange = rawMax - rawMin;
  // Ensure minimum visible range so flat data doesn't fill the entire chart
  const minRange = Math.max(rawMax * 0.2, 10);
  const displayRange = Math.max(rawRange, minRange);
  const center = (rawMin + rawMax) / 2;
  const min = center - displayRange / 2 - 2;
  const max = center + displayRange / 2 + 2;
  const range = max - min;
  const toY = (v: number) => pad + (h - 2 * pad) - ((v - min) / range) * (h - 2 * pad);
  const toX = (i: number) => (i / (values.length - 1)) * w;

  const pathD = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${w},${h} L0,${h} Z`;
  const isFlat = rawRange < 1;

  const thresholdY = threshold != null ? toY(threshold) : null;
  const meetsThreshold = threshold != null && current >= threshold;

  // Unique gradient ID per card instance
  const gradId = `grad-${label.replace(/\s+/g, '')}`;

  return (
    <div className="dash-card">
      <div className="dash-card__header">
        <span className="dash-card__icon">{icon}</span>
        <span className="dash-card__label">{label}</span>
        <span className={`dash-card__delta ${isRising ? 'dash-card__delta--up' : isFalling ? 'dash-card__delta--down' : ''}`}>
          {Math.abs(delta) > 0.5 ? deltaStr : '—'}
        </span>
      </div>
      <div className="dash-card__value" style={{ color }}>{format(current)}</div>
      <svg className="dash-card__spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={isFlat ? '0.08' : '0.25'} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {!isFlat && <path d={areaD} fill={`url(#${gradId})`} />}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={isFlat ? 0.4 : 1} />
        {thresholdY != null && (
          <line
            x1={0} x2={w} y1={thresholdY} y2={thresholdY}
            stroke={meetsThreshold ? '#4ade80' : '#fbbf24'}
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.6"
          />
        )}
        <circle cx={toX(0)} cy={toY(values[0])} r="3" fill={color} />
        {!isFlat && <circle cx={toX(values.length - 1)} cy={toY(final)} r="2.5" fill={color} opacity="0.5" />}
      </svg>
      {threshold != null && (
        <div className={`dash-card__threshold ${meetsThreshold ? 'dash-card__threshold--met' : ''}`}>
          {meetsThreshold ? '✓' : '→'} {format(threshold)} needed
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { state } = useGame();
  const projections = calculateProjections(state);
  const thresholds = getStageThresholds(state.stage);

  const upcomingCompletions = projections.events.filter(e => e.type === 'project').slice(0, 4);
  const upcomingThreats = projections.events.filter(e => e.type === 'consequence').slice(0, 3);
  const electionEvent = projections.events.find(e => e.type === 'election');

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div className="dash-header__title">
          <span className="dash-header__label">Mayor's Briefing</span>
          <span className="dash-header__sub">12-month projection from T{state.turn}</span>
        </div>
        <div className="dash-header__stage">
          <span className="dash-header__stage-label">{state.stage}</span>
          {electionEvent && (
            <span className="dash-header__election">
              Election in {electionEvent.turn - state.turn} turns
            </span>
          )}
        </div>
      </div>

      <div className="dash-grid">
        {METER_CONFIG.map(({ key, label, icon, color, format, invertDelta }) => (
          <MeterCard
            key={key}
            label={label}
            icon={icon}
            color={color}
            values={projections.meters[key]}
            threshold={thresholds[key]}
            format={format}
            invertDelta={invertDelta}
          />
        ))}
      </div>

      <div className="dash-timeline-wrap">
        <Timeline />
      </div>

      {(upcomingCompletions.length > 0 || upcomingThreats.length > 0) && (
        <div className="dash-intel">
          {upcomingCompletions.length > 0 && (
            <div className="dash-intel__section">
              <h4 className="dash-intel__heading">
                <span className="dash-intel__dot dash-intel__dot--positive" />
                Completing Soon
              </h4>
              {upcomingCompletions.map((e, i) => (
                <div key={i} className="dash-intel__item">
                  <span className="dash-intel__turn">T{e.turn}</span>
                  <span className="dash-intel__text">{e.label}</span>
                </div>
              ))}
            </div>
          )}
          {upcomingThreats.length > 0 && (
            <div className="dash-intel__section">
              <h4 className="dash-intel__heading">
                <span className="dash-intel__dot dash-intel__dot--warning" />
                Approaching Consequences
              </h4>
              {upcomingThreats.map((e, i) => (
                <div key={i} className="dash-intel__item dash-intel__item--warning">
                  <span className="dash-intel__turn">T{e.turn}</span>
                  <span className="dash-intel__text">{e.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
