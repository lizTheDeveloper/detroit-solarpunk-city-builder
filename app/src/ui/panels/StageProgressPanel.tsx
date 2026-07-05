import { useGame } from '@/state/store';
import { STAGE_ORDER } from '@/systems/progression';
import type { Stage } from '@/state/types';

interface StageRequirement {
  meter: string;
  label: string;
  current: number;
  required: number;
  met: boolean;
}

function StageProgressPanel() {
  const { state } = useGame();
  if (!state) return null;

  const currentStage = state.stage;
  const nextStage = calculateNextStage(state);
  const requirements = getStageRequirements(state, nextStage);
  
  return (
    <div className="stage-progress-panel">
      <h2 className="panel-title">City Progress</h2>
      <p className="panel-subtitle">
        Track your journey from awakening to a fully realized solarpunk utopia.
      </p>

      <div className="stage-timeline">
        {STAGE_ORDER.map((stage, index) => (
          <div
            key={stage}
            className={`stage-node ${
              stage === currentStage ? 'current' :
              STAGE_ORDER.indexOf(currentStage) > index ? 'completed' : 'locked'
            }`}
          >
            <div className="stage-indicator">
              {STAGE_ORDER.indexOf(currentStage) > index ? '✓' : 
               stage === currentStage ? '●' : '○'}
            </div>
            <div className="stage-label">{formatStage(stage)}</div>
          </div>
        ))}
      </div>

      {currentStage === 'beyond' ? (
        <div className="stage-complete">
          <h3>🌟 You've Reached Beyond</h3>
          <p>Detroit has become a fully realized solarpunk utopia. The community thrives in ecological harmony and democratic governance.</p>
        </div>
      ) : nextStage ? (
        <div className="next-stage-section">
          <h3>
            Next Stage: <strong>{formatStage(nextStage)}</strong>
          </h3>
          <p className="next-stage-description">
            {getStageDescription(nextStage)}
          </p>

          <div className="requirements-list">
            {requirements.map((req, index) => (
              <div key={index} className={`requirement ${req.met ? 'met' : 'unmet'}`}>
                <div className="req-check">{req.met ? '✓' : '○'}</div>
                <div className="req-content">
                  <div className="req-label">{req.label}</div>
                  <div className="req-progress">
                    <span className="req-current">{Math.round(req.current)}</span>
                    <div className="req-bar">
                      <div
                        className="req-fill"
                        style={{ width: `${Math.min(100, (req.current / req.required) * 100)}%` }}
                      />
                    </div>
                    <span className="req-required">/ {req.required}</span>
                  </div>
                  {!req.met && (
                    <div className="req-gap">
                      Need {Math.ceil(req.required - req.current)} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="stage-hint">
            <strong>💡 How to Advance:</strong>
            <p>{getStageHint(nextStage, requirements)}</p>
          </div>
        </div>
      ) : null}

      {currentStage !== 'beyond' && (
        <div className="current-stage-info">
          <h3>Current: {formatStage(currentStage)}</h3>
          <p>{getStageDescription(currentStage)}</p>
        </div>
      )}
    </div>
  );
}

function calculateNextStage(state: { stage: Stage }): Stage | null {
  const currentStage = state.stage;
  const order = ['awakening', 'transition', 'restoration', 'beyond'];
  const currentIndex = order.indexOf(currentStage);
  if (currentIndex === order.length - 1) return null;
  return order[currentIndex + 1] as Stage;
}

function getStageRequirements(state: any, nextStage: Stage | null): StageRequirement[] {
  if (!nextStage || state.stage === 'beyond') return [];

  const requirements: StageRequirement[] = [];
  const meters = state.meters;

  switch (nextStage) {
    case 'transition':
      requirements.push(
        { meter: 'communityTrust', label: 'Community Trust', current: meters.communityTrust, required: 65, met: meters.communityTrust >= 65 },
        { meter: 'ecologicalHealth', label: 'Ecological Health', current: meters.ecologicalHealth, required: 35, met: meters.ecologicalHealth >= 35 },
        { meter: 'foodSovereignty', label: 'Food Sovereignty', current: meters.foodSovereignty, required: 25, met: meters.foodSovereignty >= 25 }
      );
      break;

    case 'restoration':
      requirements.push(
        { meter: 'communityTrust', label: 'Community Trust', current: meters.communityTrust, required: 50, met: meters.communityTrust >= 50 },
        { meter: 'ecologicalHealth', label: 'Ecological Health', current: meters.ecologicalHealth, required: 55, met: meters.ecologicalHealth >= 55 },
        { meter: 'foodSovereignty', label: 'Food Sovereignty', current: meters.foodSovereignty, required: 40, met: meters.foodSovereignty >= 40 },
        { meter: 'policies', label: 'Policies Enacted', current: state.policies.filter((p: any) => p.enacted).length, required: 2, met: state.policies.filter((p: any) => p.enacted).length >= 2 }
      );
      break;

    case 'beyond':
      requirements.push(
        { meter: 'communityTrust', label: 'Community Trust', current: meters.communityTrust, required: 70, met: meters.communityTrust >= 70 },
        { meter: 'ecologicalHealth', label: 'Ecological Health', current: meters.ecologicalHealth, required: 75, met: meters.ecologicalHealth >= 75 },
        { meter: 'foodSovereignty', label: 'Food Sovereignty', current: meters.foodSovereignty, required: 60, met: meters.foodSovereignty >= 60 },
        { meter: 'policies', label: 'Policies Enacted', current: state.policies.filter((p: any) => p.enacted).length, required: 4, met: state.policies.filter((p: any) => p.enacted).length >= 4 },
        { meter: 'coalitions', label: 'Active Coalitions', current: state.coalitions.filter((c: any) => c.active).length, required: 1, met: state.coalitions.filter((c: any) => c.active).length >= 1 }
      );
      break;
  }

  return requirements;
}

function formatStage(stage: Stage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function getStageDescription(stage: Stage): string {
  switch (stage) {
    case 'awakening':
      return 'The city is just beginning to recognize solarpunk possibilities. Community gardens sprout in vacant lots, and residents dream of a different future.';
    case 'transition':
      return 'Solarpunk ideas are taking root. The community is organizing, infrastructure is changing, and the city begins to transform.';
    case 'restoration':
      return 'Detroit is actively restoring degraded ecosystems and rebuilding community power. Policy changes codify solarpunk values into law.';
    case 'beyond':
      return 'The city has fully realized solarpunk principles. Ecological health, community trust, and food sovereignty are thriving at scale.';
  }
}

function getStageHint(nextStage: Stage, requirements: StageRequirement[]): string {
  const unmet = requirements.filter(r => !r.met);
  
  if (unmet.length === 0) {
    return 'All requirements met! You\'ll advance to the next stage soon.';
  }

  const mostBehind = unmet.reduce((worst, req) => {
    const gap = req.required - req.current;
    const worstGap = worst ? worst.required - worst.current : 0;
    return gap > worstGap ? req : worst;
  }, null as StageRequirement | null);

  if (!mostBehind) return '';

  switch (nextStage) {
    case 'transition':
      if (mostBehind.meter === 'communityTrust') {
        return 'Focus on community trust: respond to proposals, hold neighborhood meetings, and pass policies that residents support.';
      }
      if (mostBehind.meter === 'ecologicalHealth') {
        return 'Improve ecological health by funding community gardens, restoring brownfields, and planting trees in vacant lots.';
      }
      if (mostBehind.meter === 'foodSovereignty') {
        return 'Boost food sovereignty by supporting urban farms, funding food cooperatives, and establishing community kitchens.';
      }
      break;

    case 'restoration':
      if (mostBehind.meter === 'policies') {
        return 'Enact more policies by building political will and working with council members to pass legislation.';
      }
      if (mostBehind.meter === 'communityTrust') {
        return 'Deepen community trust through consistent engagement, transparent governance, and delivering on promises.';
      }
      if (mostBehind.meter === 'ecologicalHealth') {
        return 'Invest in large-scale restoration projects, wetland rehabilitation, and ecosystem recovery programs.';
      }
      if (mostBehind.meter === 'foodSovereignty') {
        return 'Expand food production infrastructure, establish food hubs, and build regional food distribution networks.';
      }
      break;

    case 'beyond':
      if (mostBehind.meter === 'coalitions') {
        return 'Form coalitions with neighborhood organizations, labor unions, and environmental groups to amplify your impact.';
      }
      if (mostBehind.meter === 'policies') {
        return 'Pass transformative policies that codify solarpunk values: tenant protections, renewable energy mandates, community land trusts.';
      }
      if (mostBehind.meter === 'ecologicalHealth') {
        return 'Scale up ecological restoration to regional levels: green corridors, wildlife habitat, water quality improvements.';
      }
      if (mostBehind.meter === 'communityTrust') {
        return 'Demonstrate sustained commitment to community-led development and equitable outcomes across all neighborhoods.';
      }
      if (mostBehind.meter === 'foodSovereignty') {
        return 'Build a comprehensive local food system that provides healthy, affordable food to all residents.';
      }
      break;
  }

  return '';
}

export default StageProgressPanel;
