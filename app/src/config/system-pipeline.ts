import type { GameState, MeterDelta } from '../state/types';

export interface SystemStepResult {
  state: GameState;
  deltas: MeterDelta[];
}

export interface SystemStep {
  id: string;
  phase: 'pre-resolve' | 'resolve' | 'post-resolve';
  order: number;
  execute: (state: GameState, context: PipelineContext) => SystemStepResult;
}

export interface PipelineContext {
  originalState: GameState;
  rng: () => number;
  allDeltas: MeterDelta[];
  completedProjectNames: string[];
}

class SystemPipeline {
  private steps: SystemStep[] = [];
  private sorted = false;

  register(step: SystemStep): void {
    this.steps.push(step);
    this.sorted = false;
  }

  private ensureSorted(): void {
    if (!this.sorted) {
      const phaseOrder = { 'pre-resolve': 0, 'resolve': 1, 'post-resolve': 2 };
      this.steps.sort((a, b) => {
        const phaseCompare = phaseOrder[a.phase] - phaseOrder[b.phase];
        if (phaseCompare !== 0) return phaseCompare;
        return a.order - b.order;
      });
      this.sorted = true;
    }
  }

  getSteps(phase?: SystemStep['phase']): readonly SystemStep[] {
    this.ensureSorted();
    if (phase) return this.steps.filter(s => s.phase === phase);
    return this.steps;
  }

  getStep(id: string): SystemStep | undefined {
    return this.steps.find(s => s.id === id);
  }
}

export const systemPipeline = new SystemPipeline();
