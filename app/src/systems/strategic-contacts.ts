import type { StrategicContact, StrategicContactStage } from '../state/types';

export interface ContactDefinition {
  id: string;
  name: string;
  role: string;
  introducerId: string;
  prerequisites: ContactPrerequisites;
  patienceMonths: number;
  yieldProfile: Record<string, number>;
  description: string;
}

interface ContactPrerequisites {
  introducerTrust?: number;     // trust level with introducer
  completedProjects?: number;    // total projects completed
  meterThresholds?: Record<string, number>;  // meter name → minimum value
  specificProject?: string;      // specific project type completed
}

// Strategic contacts available in the game
export const STRATEGIC_CONTACTS: ContactDefinition[] = [
  {
    id: 'funder_morrison',
    name: 'Patricia Morrison',
    role: 'Foundation Director',
    introducerId: 'leader_rosa',  // community leader Rosa must be at champion trust
    prerequisites: { introducerTrust: 80, completedProjects: 3, meterThresholds: { communityTrust: 60 } },
    patienceMonths: 4,
    yieldProfile: { budget: 10000, politicalWill: 5 },
    description: 'Director of the Morrison Foundation. Controls significant grant funding for community projects.',
  },
  {
    id: 'media_chen',
    name: 'David Chen',
    role: 'Investigative Journalist',
    introducerId: 'leader_marcus',
    prerequisites: { introducerTrust: 70, meterThresholds: { politicalWill: 45 } },
    patienceMonths: 3,
    yieldProfile: { politicalWill: 15, trust: 5 },
    description: 'Reporter at the Free Press. Can amplify your story — or expose your failures.',
  },
  {
    id: 'developer_okafor',
    name: 'James Okafor',
    role: 'Ethical Developer',
    introducerId: 'council_williams',
    prerequisites: { introducerTrust: 75, completedProjects: 5, meterThresholds: { ecologicalHealth: 50 } },
    patienceMonths: 5,
    yieldProfile: { budget: 5000, ecologicalHealth: 8 },
    description: 'Runs a B-Corp development firm. Interested in affordable, green housing — if you prove the market.',
  },
  {
    id: 'organizer_washington',
    name: 'Keisha Washington',
    role: 'Regional Organizer',
    introducerId: 'leader_denise',
    prerequisites: { introducerTrust: 80, meterThresholds: { communityTrust: 70, politicalWill: 50 } },
    patienceMonths: 4,
    yieldProfile: { politicalWill: 20, trust: 10 },
    description: 'Connected to national organizing networks. Can bring resources and visibility — demands accountability.',
  },
];

/**
 * Check if prerequisites are met for discovering a contact.
 */
export function checkPrerequisites(
  contact: ContactDefinition,
  gameContext: {
    npcTrust: Record<string, number>;
    completedProjects: number;
    meters: Record<string, number>;
  },
): boolean {
  const prereqs = contact.prerequisites;

  if (prereqs.introducerTrust) {
    const introducerTrust = gameContext.npcTrust[contact.introducerId] ?? 0;
    if (introducerTrust < prereqs.introducerTrust) return false;
  }

  if (prereqs.completedProjects) {
    if (gameContext.completedProjects < prereqs.completedProjects) return false;
  }

  if (prereqs.meterThresholds) {
    for (const [meter, threshold] of Object.entries(prereqs.meterThresholds)) {
      if ((gameContext.meters[meter] ?? 0) < threshold) return false;
    }
  }

  return true;
}

/**
 * Advance a contact to the next pipeline stage.
 */
export function advanceContact(
  contact: StrategicContact,
  _currentMonth: number,
): StrategicContact {
  const transitions: Partial<Record<StrategicContactStage, StrategicContactStage>> = {
    undiscovered: 'discovery',
    discovery: 'introduction',
    introduction: 'cooldown',
    cooldown: 'follow_up',
    follow_up: 'established',
    established: 'deepening',
  };

  const nextStage = transitions[contact.stage];
  if (!nextStage) return contact;

  const cooldownRemaining = nextStage === 'cooldown' ? 2 : 0;
  const patienceTimer = nextStage === 'cooldown' || nextStage === 'follow_up'
    ? getContactDef(contact.id)?.patienceMonths ?? 4
    : contact.patienceTimer;

  return {
    ...contact,
    stage: nextStage,
    cooldownRemaining,
    patienceTimer,
    monthsEstablished: nextStage === 'established' ? 0 : contact.monthsEstablished,
  };
}

/**
 * Process monthly tick for all contacts: decrease cooldowns, increase patience timers.
 */
export function tickContacts(contacts: StrategicContact[]): StrategicContact[] {
  return contacts.map(contact => {
    let updated = { ...contact };

    // Decrease cooldown
    if (updated.cooldownRemaining > 0) {
      updated.cooldownRemaining--;
    }

    // Patience timer ticks down in cooldown and follow_up stages
    if (updated.stage === 'cooldown' || updated.stage === 'follow_up') {
      if (updated.cooldownRemaining === 0) {
        updated.patienceTimer--;
      }
    }

    // Door closes if patience runs out
    if (updated.patienceTimer <= 0 && (updated.stage === 'cooldown' || updated.stage === 'follow_up')) {
      updated.stage = 'closed';
    }

    // Track months established for deepening
    if (updated.stage === 'established' || updated.stage === 'deepening') {
      updated.monthsEstablished++;
      // Deepen every 3 months
      if (updated.monthsEstablished > 0 && updated.monthsEstablished % 3 === 0) {
        updated.yieldMultiplier += 0.25;
      }
    }

    return updated;
  });
}

/**
 * Check if a contact's door has closed (patience expired).
 */
export function isContactClosed(contact: StrategicContact): boolean {
  return contact.stage === 'closed';
}

/**
 * Check if a contact can be advanced (not in cooldown, not closed).
 */
export function canAdvanceContact(contact: StrategicContact): boolean {
  if (contact.stage === 'closed') return false;
  if (contact.stage === 'cooldown' && contact.cooldownRemaining > 0) return false;
  if (contact.stage === 'deepening') return false;
  return true;
}

function getContactDef(id: string): ContactDefinition | undefined {
  return STRATEGIC_CONTACTS.find(c => c.id === id);
}
