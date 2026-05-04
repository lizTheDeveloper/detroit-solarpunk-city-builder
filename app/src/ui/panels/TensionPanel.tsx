import { useGame } from '@/state/store';
import { getTensionSummary, getSpeedJusticeAdvice, calculateGentrificationRisk } from '@/systems/tensions';

function TensionBar({ label, leftLabel, rightLabel, ratio }: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  ratio: number;
}) {
  const pct = Math.round(ratio * 100);
  return (
    <div className="tension-bar-container">
      <div className="tension-bar-label">{label}</div>
      <div className="tension-bar">
        <span className="tension-bar-left">{leftLabel}</span>
        <div className="tension-bar-track">
          <div
            className="tension-bar-fill"
            style={{ width: `${pct}%` }}
          />
          <div className="tension-bar-marker" style={{ left: `${pct}%` }} />
        </div>
        <span className="tension-bar-right">{rightLabel}</span>
      </div>
    </div>
  );
}

export default function TensionPanel() {
  const { state } = useGame();
  const summary = getTensionSummary(state);
  const { speedVsJustice, growthVsDegrowth, topDownVsBottomUp, overallHealth } = summary;
  const advice = getSpeedJusticeAdvice(speedVsJustice.tension, speedVsJustice.speedScore, speedVsJustice.justiceScore);
  const gentrification = calculateGentrificationRisk(state);

  const healthColors: Record<string, string> = {
    healthy: 'var(--color-positive)',
    concerning: 'var(--color-warning)',
    critical: 'var(--color-negative)',
  };

  return (
    <div className="panel tension-panel">
      <h2 className="panel-title">
        Tensions
        <span
          className="tension-health-badge"
          style={{ color: healthColors[overallHealth] }}
        >
          {overallHealth}
        </span>
      </h2>
      <p className="panel-subtitle">
        Balance competing values. Extremes in any direction cause problems.
      </p>

      <TensionBar
        label="Speed vs Justice"
        leftLabel="Progress"
        rightLabel="Equity"
        ratio={speedVsJustice.justiceScore / Math.max(1, speedVsJustice.speedScore + speedVsJustice.justiceScore)}
      />
      <div className="tension-advice">{advice}</div>

      <TensionBar
        label="Growth vs De-Growth"
        leftLabel="Growth"
        rightLabel="De-Growth"
        ratio={growthVsDegrowth.ratio}
      />
      <div className="tension-label-tag">{growthVsDegrowth.label}</div>

      <TensionBar
        label="Top-Down vs Bottom-Up"
        leftLabel="Player-Led"
        rightLabel="Community-Led"
        ratio={topDownVsBottomUp.ratio}
      />
      <div className="tension-label-tag">{topDownVsBottomUp.label}</div>

      {gentrification.atRisk.length > 0 && (
        <div className="tension-warning">
          Gentrification risk in: {gentrification.atRisk.map(id => {
            const tile = state.tiles[id];
            return tile ? tile.name : id;
          }).join(', ')}
        </div>
      )}
    </div>
  );
}
