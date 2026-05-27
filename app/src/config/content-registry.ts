import type { GameState, GameEvent, EventChoice, EventCategory, Season, Antagonist } from '../state/types';
import type { ArcTemplate } from '../data/arcs/types';

export interface EventDef {
  type: string;
  category: EventCategory;
  title: string;
  description: string;
  baseProbability: (season: Season) => number;
  condition: (state: GameState) => boolean;
  cooldownTurns: number;
  needsTargetTile: boolean;
  choices: (state: GameState) => EventChoice[];
}

export interface AntagonistActivationRule {
  id: string;
  shouldActivate: (state: GameState) => boolean;
}

export interface AntagonistEventFactory {
  id: string;
  createEvent: (ant: Antagonist, state: GameState) => GameEvent | null;
}

class ContentRegistry {
  private eventDefs: EventDef[] = [];
  private antagonistActivationRules: Map<string, AntagonistActivationRule> = new Map();
  private antagonistEventFactories: Map<string, AntagonistEventFactory> = new Map();
  private arcTemplates: Map<string, ArcTemplate> = new Map();

  registerEvents(defs: EventDef[]): void {
    this.eventDefs.push(...defs);
  }

  getEventDefs(): readonly EventDef[] {
    return this.eventDefs;
  }

  registerAntagonistRule(rule: AntagonistActivationRule): void {
    this.antagonistActivationRules.set(rule.id, rule);
  }

  getAntagonistRule(id: string): AntagonistActivationRule | undefined {
    return this.antagonistActivationRules.get(id);
  }

  registerAntagonistEventFactory(factory: AntagonistEventFactory): void {
    this.antagonistEventFactories.set(factory.id, factory);
  }

  getAntagonistEventFactory(id: string): AntagonistEventFactory | undefined {
    return this.antagonistEventFactories.get(id);
  }

  registerArcTemplate(template: ArcTemplate): void {
    this.arcTemplates.set(template.id, template);
  }

  getArcTemplate(id: string): ArcTemplate | undefined {
    return this.arcTemplates.get(id);
  }

  getAllArcTemplates(): ArcTemplate[] {
    return Array.from(this.arcTemplates.values());
  }

  getArcTemplateMap(): Record<string, ArcTemplate> {
    return Object.fromEntries(this.arcTemplates);
  }
}

export const contentRegistry = new ContentRegistry();
