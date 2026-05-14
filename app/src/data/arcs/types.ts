import type { ArcConfig } from '../../state/crisis-types';

export interface AntagonistVoiceProfile {
  tone: string;
  keyPhrases: string[];
  realReferences: string[];
  exampleLanguage: string;
  genuineArgument: string;
  dependents: string;
}

export interface AntagonistManifestations {
  counterNarrativeProbabilityModifier: number;
  lobbyCondition: string;
  trustDrainPerTurn: number;
}

export interface Antagonist {
  id: string;
  name: string;
  voiceProfile: AntagonistVoiceProfile;
  inGameManifestations: AntagonistManifestations;
}

export interface TabooConfig {
  opinionTopic: string;
  unlockThreshold: number;
  baseSocialCost: number;
  justificationPapers: string[];
  tabooLabel: string;
}

export interface ChoiceDelayedConsequence {
  delay: number;
  effects: ConsequenceEffectDef[];
  activationConditions: string[];
  cancelConditions: string[];
  foreshadowHint: string;
  hintTurnsBeforeTrigger: number;
}

export type ConsequenceEffectDef =
  | { type: 'meterDelta'; meter: string; amount: number; source: string }
  | { type: 'tileDamage'; tileSelector: 'random' | 'lowest_eco' | 'highest_gentrify'; damage: number }
  | { type: 'spawnEvent'; eventId: string }
  | { type: 'conditionChange'; action: 'add' | 'remove'; condition: string };

export interface CrisisForkChoice {
  id: string;
  label: string;
  appeal: string;
  immediate: Array<{ meter: string; amount: number; source: string }>;
  conditionsCreated: string[];
  conditionsRemoved: string[];
  delayedConsequences: ChoiceDelayedConsequence[];
  antagonistAlignment: string | null;
  taboo?: TabooConfig;
}

export interface CrisisFork {
  id: string;
  stage: 'escalation' | 'crisis';
  title: string;
  description: string;
  choices: CrisisForkChoice[];
}

export interface ArcPaper {
  doi: string;
  title: string;
  relevance: string;
}

export interface ArcTemplate {
  id: string;
  name: string;
  description: string;
  config: ArcConfig;
  antagonists: Antagonist[];
  crisisForks: CrisisFork[];
  papers: ArcPaper[];
  slotTaxByStage: Record<string, number>;  // stage name → slots consumed per month
}
