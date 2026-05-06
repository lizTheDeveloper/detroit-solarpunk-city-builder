import { useGame } from '@/state/store';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { arcTemplateMap } from '@/data/arcs/index';
import { getForeshadowHints } from '@/systems/delayed-consequences';
import { deserializeDependencyWeb } from '@/systems/dependency-web';
import { isElectionTurn } from '@/systems/reelection';
import type { ActiveProject, ProjectCategory, ArcStage } from '@/state/types';
import '@/ui/styles/timeline.css';

const TIMELINE_WINDOW = 12;

const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  ecology: 'var(--color-positive)',
  infrastructure: 'var(--color-blue)',
  community: 'var(--color-warning)',
  restoration: '#a855f7',
};

const ESCALATION_STAGES: ArcStage[] = ['escalation', 'crisis', 'reckoning'];

function getAllActiveProjects(tiles: Record<string, { activeProjects: ActiveProject[] }>): ActiveProject[] {
  const projects: ActiveProject[] = [];
  for (const tile of Object.values(tiles)) {
    for (const p of tile.activeProjects) {
      projects.push(p);
    }
  }
  return projects;
}

function getCompletionTurn(project: ActiveProject, currentTurn: number): number {
  const remaining = project.duration - project.progress;
  return currentTurn + remaining;
}

function findElectionTurnInWindow(currentTurn: number): number | null {
  for (let t = currentTurn; t <= currentTurn + TIMELINE_WINDOW; t++) {
    if (isElectionTurn(t)) return t;
  }
  return null;
}

export default function Timeline() {
  const { state } = useGame();
  const { turn: currentTurn, tiles, delayedConsequenceQueue, dependencyWeb, activeArcs } = state;

  const endTurn = currentTurn + TIMELINE_WINDOW;
  const turns = Array.from({ length: TIMELINE_WINDOW + 1 }, (_, i) => currentTurn + i);

  // Projects
  const allProjects = getAllActiveProjects(tiles);

  // Foreshadow hints
  const web = deserializeDependencyWeb(dependencyWeb);
  const hints = getForeshadowHints(delayedConsequenceQueue, currentTurn, web);

  // Election marker
  const electionTurn = findElectionTurnInWindow(currentTurn);
  const turnsToElection = electionTurn != null ? electionTurn - currentTurn : null;

  // Arcs at escalation+ stage
  const escalatedArcs = activeArcs.filter((a) => ESCALATION_STAGES.includes(a.currentStage));

  // Helper: turn to percentage position
  function turnToPercent(t: number): number {
    return ((t - currentTurn) / TIMELINE_WINDOW) * 100;
  }

  return (
    <div className="timeline">
      <div className="timeline__header">
        <span className="timeline__title">Timeline</span>
        <span className="timeline__range">T{currentTurn} - T{endTurn}</span>
      </div>

      <div className="timeline__body">
        {/* Turn axis */}
        <div className="timeline__axis">
          {turns.map((t) => (
            <div
              key={t}
              className="timeline__tick"
              style={{ left: `${turnToPercent(t)}%` }}
            >
              <span className="timeline__tick-label">{t}</span>
            </div>
          ))}
        </div>

        {/* Foreshadow regions */}
        <div className="timeline__lane timeline__lane--foreshadow">
          <span className="timeline__lane-label">Foreshadow</span>
          <div className="timeline__lane-track">
            {hints.map((hint) => {
              const consequence = delayedConsequenceQueue.find((c) => c.id === hint.consequenceId);
              if (!consequence) return null;
              const startTurn = consequence.triggerTurn - consequence.hintTurnsBeforeTrigger;
              const clampedStart = Math.max(currentTurn, startTurn);
              const clampedEnd = Math.min(endTurn, consequence.triggerTurn);
              if (clampedStart >= clampedEnd) return null;
              return (
                <div
                  key={hint.consequenceId}
                  className="timeline__foreshadow-region"
                  style={{
                    left: `${turnToPercent(clampedStart)}%`,
                    width: `${((clampedEnd - clampedStart) / TIMELINE_WINDOW) * 100}%`,
                  }}
                  title={hint.hint}
                >
                  <span className="timeline__foreshadow-text">{hint.hint}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Projects lane */}
        <div className="timeline__lane timeline__lane--projects">
          <span className="timeline__lane-label">Projects</span>
          <div className="timeline__lane-track">
            {allProjects.map((project) => {
              const def = PROJECT_CATALOG[project.definitionId];
              if (!def) return null;
              const completionTurn = getCompletionTurn(project, currentTurn);
              const clampedEnd = Math.min(endTurn, completionTurn);
              if (clampedEnd <= currentTurn) return null;
              const barLeft = 0; // starts at current turn
              const barWidth = ((clampedEnd - currentTurn) / TIMELINE_WINDOW) * 100;
              const color = CATEGORY_COLORS[def.category] ?? 'var(--text-dim)';
              return (
                <div
                  key={`${project.definitionId}-${project.tileId}`}
                  className="timeline__project-bar"
                  style={{
                    left: `${barLeft}%`,
                    width: `${barWidth}%`,
                    borderColor: color,
                  }}
                  title={`${def.name} (${def.category}) - completes T${completionTurn}`}
                >
                  <span className="timeline__project-name" style={{ color }}>
                    {def.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arcs lane */}
        {escalatedArcs.length > 0 && (
          <div className="timeline__lane timeline__lane--arcs">
            <span className="timeline__lane-label">Crises</span>
            <div className="timeline__lane-track">
              {escalatedArcs.map((arc) => {
                const template = arcTemplateMap[arc.arcId];
                const name = template?.name ?? arc.arcId;
                const threshold = template?.config.escalationThreshold ?? 6;
                const timerPercent = Math.min(100, (arc.inactionTimer / threshold) * 100);
                return (
                  <div
                    key={arc.arcId}
                    className="timeline__arc-item"
                    title={`${name} - ${arc.currentStage} (${arc.inactionTimer}/${threshold} inaction)`}
                  >
                    <span className="timeline__arc-name">{name}</span>
                    <span className="timeline__arc-stage">{arc.currentStage}</span>
                    <div className="timeline__arc-timer-track">
                      <div
                        className="timeline__arc-timer-fill"
                        style={{ width: `${timerPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Election marker */}
        {electionTurn != null && (
          <div
            className={`timeline__election-marker${turnsToElection != null && turnsToElection < 8 ? ' timeline__election-marker--urgent' : ''}`}
            style={{ left: `${turnToPercent(electionTurn)}%` }}
            title={`Election at T${electionTurn}`}
          >
            <span className="timeline__election-label">Election</span>
          </div>
        )}
      </div>
    </div>
  );
}
