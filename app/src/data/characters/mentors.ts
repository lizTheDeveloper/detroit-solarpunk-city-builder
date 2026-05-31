import type { MentorCharacter, BurnoutState, Stage } from '../../state/types';

export interface MentorUnlockContext {
  publicOpinion: Partial<Record<string, number>>;
  communityTrust: number;
  currentMonth: number;
}

export interface MentorDefinition extends MentorCharacter {
  /** Required overton topics that gate the unlock (any one above its threshold unlocks). */
  unlockOpinionTopics: Array<{ topic: string; threshold: number }>;
  /** Alternate unlock: month >= and trust >= */
  alternateUnlock: { minMonth: number; minTrust: number } | null;
  promptPersona: string;
  promptCoreTeaching: string;
}

export const MENTOR_DEFINITIONS: MentorDefinition[] = [
  {
    id: 'grace_lee_boggs',
    name: 'Grace Lee Boggs',
    philosophy: 'Revolution is not an act of overthrow. It is an act of becoming.',
    cooldownMonths: 3,
    lastMetMonth: 0,
    yieldType: 'overton',
    yieldAmount: 4.0,
    bufferGain: 3,
    unlocked: false,
    unlockOpinionTopics: [
      { topic: 'landReform', threshold: 30 },
      { topic: 'deGrowth', threshold: 30 },
      { topic: 'cooperativeEconomics', threshold: 30 },
    ],
    alternateUnlock: { minMonth: 24, minTrust: 65 },
    promptPersona: 'You are Grace Lee Boggs, philosopher-activist of Detroit. You speak slowly, with patient questions.',
    promptCoreTeaching: 'Real change starts with the question: what does it mean for us to grow our souls? Movement-building is the slow work of becoming.',
  },
  {
    id: 'ron_scott',
    name: 'Ron Scott',
    philosophy: 'The system we have was built; another can be built.',
    cooldownMonths: 4,
    lastMetMonth: 0,
    yieldType: 'overton',
    yieldAmount: 3.5,
    bufferGain: 3,
    unlocked: false,
    unlockOpinionTopics: [
      { topic: 'decarceration', threshold: 25 },
    ],
    alternateUnlock: null,
    promptPersona: 'You are Ron Scott, longtime organizer for the Detroit Coalition Against Police Brutality.',
    promptCoreTeaching: 'Community accountability is harder than punishment. But it is the only thing that actually works.',
  },
];

export function checkMentorUnlock(
  mentor: MentorDefinition,
  ctx: MentorUnlockContext,
): boolean {
  for (const { topic, threshold } of mentor.unlockOpinionTopics) {
    const value = ctx.publicOpinion[topic] ?? 0;
    if (value > threshold) return true;
  }
  if (mentor.alternateUnlock) {
    if (ctx.currentMonth >= mentor.alternateUnlock.minMonth
      && ctx.communityTrust > mentor.alternateUnlock.minTrust) {
      return true;
    }
  }
  return false;
}

export function isMentorAvailable(mentor: MentorCharacter, currentMonth: number): boolean {
  if (!mentor.unlocked) return false;
  if (mentor.lastMetMonth === 0) return true;
  return currentMonth - mentor.lastMetMonth >= mentor.cooldownMonths;
}

export function applyMentorMeeting(
  mentor: MentorCharacter,
  currentMonth: number,
): { updatedMentor: MentorCharacter; yieldAmount: number; bufferGain: number } {
  return {
    updatedMentor: { ...mentor, lastMetMonth: currentMonth },
    yieldAmount: mentor.yieldAmount,
    bufferGain: mentor.bufferGain,
  };
}

export interface MentorPromptContext {
  turn: number;
  stage: Stage;
  delegationTier: number;
}

export function getMentorPrompt(
  mentor: MentorDefinition,
  burnoutState: BurnoutState,
  ctx: MentorPromptContext,
): string {
  const persona = mentor.promptPersona;
  const teaching = mentor.promptCoreTeaching;

  let burnoutPreface = '';
  if (burnoutState === 'burnout' || burnoutState === 'collapse') {
    burnoutPreface = 'The player is burned out. They need to rest before they can do this work. Speak gently and tell them rest is part of the movement, not a betrayal of it.';
  } else if (burnoutState === 'overextended') {
    burnoutPreface = 'The player looks tired. Ask them how they are taking care of themselves.';
  }

  return [
    persona,
    burnoutPreface,
    `Game context: Month ${ctx.turn}, stage ${ctx.stage}, delegation tier ${ctx.delegationTier}.`,
    `Core teaching to weave in: ${teaching}`,
  ].filter(Boolean).join('\n\n');
}
