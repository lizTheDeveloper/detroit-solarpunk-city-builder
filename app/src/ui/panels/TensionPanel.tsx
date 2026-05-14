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

const GROWTH_EXPLANATIONS: Record<string, string> = {
  'growth-dominant': 'Heavy on revenue-generating projects (solar, maker spaces). Risk: gentrification outpaces community benefit.',
  'balanced': 'Mix of growth and de-growth projects. Both economic development and ecological restoration.',
  'degrowth-dominant': 'Heavy on ecological projects (food forests, prairies, wetlands). Low revenue but strong community resilience.',
};

const MODE_EXPLANATIONS: Record<string, string> = {
  'top-down': 'You\'re driving most decisions. Community leaders may feel sidelined — accept more proposals.',
  'mixed': 'Healthy mix of your projects and community proposals.',
  'bottom-up': 'Community is leading. Strong trust, but you may need to initiate strategic infrastructure.',
};

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

  const totalCompleted = Object.values(state.tiles).reduce((sum, t) => sum + t.completedProjects.length, 0);

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
        Your choices create trade-offs. The city thrives when you balance competing values — extremes in any direction trigger backlash.
      </p>

      {totalCompleted < 3 && (
        <div className="tension-early-notice">
          Tensions emerge as you make decisions. Complete a few projects and these bars will start reflecting your approach.
        </div>
      )}

      <TensionBar
        label="Speed vs Justice"
        leftLabel="Progress"
        rightLabel="Equity"
        ratio={speedVsJustice.justiceScore / Math.max(1, speedVsJustice.speedScore + speedVsJustice.justiceScore)}
      />
      <div className="tension-advice">{advice}</div>
      <div className="tension-explanation">
        Progress = ecological + food sovereignty gains. Equity = anti-gentrification. If you build fast without protecting residents, tension rises.
      </div>

      <TensionBar
        label="Growth vs De-Growth"
        leftLabel="Growth"
        rightLabel="De-Growth"
        ratio={growthVsDegrowth.ratio}
      />
      <div className="tension-label-tag">{growthVsDegrowth.label}</div>
      <div className="tension-explanation">{GROWTH_EXPLANATIONS[growthVsDegrowth.label]}</div>

      <TensionBar
        label="Top-Down vs Bottom-Up"
        leftLabel="Player-Led"
        rightLabel="Community-Led"
        ratio={topDownVsBottomUp.ratio}
      />
      <div className="tension-label-tag">{topDownVsBottomUp.label}</div>
      <div className="tension-explanation">{MODE_EXPLANATIONS[topDownVsBottomUp.label]}</div>

      {gentrification.atRisk.length > 0 && (
        <div className="tension-warning">
          <strong>Gentrification risk:</strong> {gentrification.atRisk.map(id => {
            const tile = state.tiles[id];
            return tile ? tile.name : id;
          }).join(', ')}
          <div className="tension-warning-advice">
            Build Community Land Trusts or accept de-growth proposals in these areas to reduce pressure.
          </div>
        </div>
      )}
    </div>
  );
}
