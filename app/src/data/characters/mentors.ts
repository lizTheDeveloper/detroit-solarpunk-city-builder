import type { MentorCharacter } from '../../state/types';

export interface MentorDefinition {
  id: string;
  name: string;
  philosophy: string;
  llmSystemPrompt: string;
  cooldownMonths: number;
  yieldType: string;
  yieldAmount: number;
  bufferGain: number;
  unlockCondition: MentorUnlockCondition;
  portraitDescription: string;
}

interface MentorUnlockCondition {
  type: 'overton' | 'trust' | 'stage' | 'combined';
  overtonTopic?: string;
  overtonThreshold?: number;
  trustThreshold?: number;
  alternateMonth?: number;  // alternate unlock after this month if primary not met
  alternateCondition?: { trustThreshold: number };
}

export const MENTOR_DEFINITIONS: MentorDefinition[] = [
  {
    id: 'grace_lee_boggs',
    name: 'Grace Lee Boggs',
    philosophy: 'Revolution is evolution. The most radical thing is to transform yourself and your community from within. Not seizing power, but growing it.',
    llmSystemPrompt: `You are Grace Lee Boggs, a philosopher-activist who spent 75 years in Detroit. You believe in:
- Revolution as evolution, not seizure of power
- "The most radical thing" is letting go and growing new forms
- Community transformation starts with self-transformation
- Detroit as a model for post-industrial rebirth
- The importance of visionary organizing over protest
- Young people as the agents of change

Speak with warmth, depth, and occasional sharp wit. Reference your decades of work with Jimmy Boggs, the Asian-American movement, and Detroit's grassroots organizations. Ask questions that make the mayor think deeper about WHY they're doing this work, not just WHAT they're building.

If the mayor seems burned out, gently remind them: "You cannot give what you do not have. Rest is not retreat — it is preparation for the next transformation."`,
    cooldownMonths: 3,
    yieldType: 'overton',
    yieldAmount: 4.0,  // log10(10000) = 4.0 — transformative Overton shift
    bufferGain: 3,
    unlockCondition: {
      type: 'combined',
      overtonTopic: 'any',
      overtonThreshold: 30,
      alternateMonth: 24,
      alternateCondition: { trustThreshold: 65 },
    },
    portraitDescription: 'An elderly Chinese-American woman with kind eyes and an unwavering gaze. She has seen everything and still believes in tomorrow.',
  },
  {
    id: 'ron_scott',
    name: 'Ron Scott',
    philosophy: 'Peace zones are not the absence of conflict — they are the presence of justice. You cannot police your way to safety.',
    llmSystemPrompt: `You are Ron Scott, founder of the Detroit Coalition Against Police Brutality and a lifetime community organizer. You believe in:
- Peace zones: neighborhoods self-governing their own safety
- Accountability over punishment
- Community-based alternatives to policing
- The power of direct action paired with political strategy
- Coalition building across racial and class lines

Speak directly, with urgency but not anger. You've spent decades in this fight. You know what works and what doesn't. If the mayor is too focused on policy and not enough on people, push back. "Policy without community is just paper."`,
    cooldownMonths: 3,
    yieldType: 'politicalWill',
    yieldAmount: 3.5,
    bufferGain: 2,
    unlockCondition: {
      type: 'overton',
      overtonTopic: 'decarceration',
      overtonThreshold: 25,
    },
    portraitDescription: 'A tall Black man in his 60s with a goatee and reading glasses. Calm but coiled — ready to act at any moment.',
  },
];

/**
 * Check if a mentor's unlock condition is met.
 */
export function checkMentorUnlock(
  mentor: MentorDefinition,
  gameContext: {
    publicOpinion: Record<string, number>;
    communityTrust: number;
    currentMonth: number;
  },
): boolean {
  const cond = mentor.unlockCondition;

  switch (cond.type) {
    case 'overton': {
      if (!cond.overtonTopic || !cond.overtonThreshold) return false;
      const value = gameContext.publicOpinion[cond.overtonTopic] ?? 0;
      return value >= cond.overtonThreshold;
    }

    case 'trust':
      return gameContext.communityTrust >= (cond.trustThreshold ?? 100);

    case 'combined': {
      // Primary: any overton topic past threshold
      if (cond.overtonThreshold) {
        const anyPast = Object.values(gameContext.publicOpinion).some(v => v >= cond.overtonThreshold!);
        if (anyPast) return true;
      }
      // Alternate: after certain month + trust threshold
      if (cond.alternateMonth && gameContext.currentMonth >= cond.alternateMonth) {
        if (cond.alternateCondition && gameContext.communityTrust >= cond.alternateCondition.trustThreshold) {
          return true;
        }
      }
      return false;
    }

    default:
      return false;
  }
}

/**
 * Check if a mentor is available for a meeting (cooldown expired).
 */
export function isMentorAvailable(mentor: MentorCharacter, currentMonth: number): boolean {
  if (!mentor.unlocked) return false;
  if (mentor.lastMetMonth === 0) return true; // never met
  return (currentMonth - mentor.lastMetMonth) >= mentor.cooldownMonths;
}

/**
 * Create initial mentor state from definition.
 */
export function initMentor(def: MentorDefinition): MentorCharacter {
  return {
    id: def.id,
    name: def.name,
    philosophy: def.philosophy,
    cooldownMonths: def.cooldownMonths,
    lastMetMonth: 0,
    yieldType: def.yieldType as any,
    yieldAmount: def.yieldAmount,
    bufferGain: def.bufferGain,
    unlocked: false,
  };
}

/**
 * Apply a mentor meeting: update lastMetMonth, return yields.
 */
export function applyMentorMeeting(
  mentor: MentorCharacter,
  currentMonth: number,
): { updatedMentor: MentorCharacter; yieldType: string; yieldAmount: number; bufferGain: number } {
  return {
    updatedMentor: { ...mentor, lastMetMonth: currentMonth },
    yieldType: mentor.yieldType,
    yieldAmount: mentor.yieldAmount,
    bufferGain: mentor.bufferGain,
  };
}

/**
 * Get the LLM system prompt for a mentor meeting, including burnout context.
 */
export function getMentorPrompt(
  mentorDef: MentorDefinition,
  burnoutState: string,
  gameContext: { turn: number; stage: string; delegationTier: number },
): string {
  let prompt = mentorDef.llmSystemPrompt;

  prompt += `\n\nCurrent game context: Month ${gameContext.turn}, stage: ${gameContext.stage}, delegation tier: ${gameContext.delegationTier}.`;

  if (burnoutState === 'overextended') {
    prompt += '\n\nThe mayor seems tired and stretched thin. Gently acknowledge this.';
  } else if (burnoutState === 'burnout') {
    prompt += '\n\nThe mayor is visibly burned out. They look exhausted. Make this a central part of your conversation — they need to hear that rest and letting go is revolutionary.';
  }

  return prompt;
}
