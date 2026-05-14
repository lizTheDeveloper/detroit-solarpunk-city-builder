import { describe, it, expect } from 'vitest';
import {
  checkPrerequisites,
  advanceContact,
  tickContacts,
  canAdvanceContact,
  STRATEGIC_CONTACTS,
} from './strategic-contacts';
import type { StrategicContact } from '../state/types';

function makeContact(overrides: Partial<StrategicContact> = {}): StrategicContact {
  return {
    id: 'funder_morrison',
    name: 'Patricia Morrison',
    stage: 'discovery',
    cooldownRemaining: 0,
    patienceTimer: 4,
    monthsEstablished: 0,
    yieldMultiplier: 1.0,
    introducerId: 'leader_rosa',
    ...overrides,
  };
}

describe('Strategic Contacts', () => {
  describe('checkPrerequisites', () => {
    it('returns false when introducer trust too low', () => {
      const result = checkPrerequisites(STRATEGIC_CONTACTS[0], {
        npcTrust: { leader_rosa: 50 },
        completedProjects: 5,
        meters: { communityTrust: 70 },
      });
      expect(result).toBe(false);
    });

    it('returns false when not enough projects', () => {
      const result = checkPrerequisites(STRATEGIC_CONTACTS[0], {
        npcTrust: { leader_rosa: 85 },
        completedProjects: 2,
        meters: { communityTrust: 70 },
      });
      expect(result).toBe(false);
    });

    it('returns true when all conditions met', () => {
      const result = checkPrerequisites(STRATEGIC_CONTACTS[0], {
        npcTrust: { leader_rosa: 85 },
        completedProjects: 5,
        meters: { communityTrust: 70 },
      });
      expect(result).toBe(true);
    });
  });

  describe('advanceContact', () => {
    it('advances from discovery to introduction', () => {
      const contact = makeContact({ stage: 'discovery' });
      const result = advanceContact(contact, 5);
      expect(result.stage).toBe('introduction');
    });

    it('advances from introduction to cooldown with timer', () => {
      const contact = makeContact({ stage: 'introduction' });
      const result = advanceContact(contact, 5);
      expect(result.stage).toBe('cooldown');
      expect(result.cooldownRemaining).toBe(2);
    });

    it('advances from follow_up to established', () => {
      const contact = makeContact({ stage: 'follow_up' });
      const result = advanceContact(contact, 10);
      expect(result.stage).toBe('established');
      expect(result.monthsEstablished).toBe(0);
    });
  });

  describe('tickContacts', () => {
    it('decreases cooldown', () => {
      const contacts = [makeContact({ stage: 'cooldown', cooldownRemaining: 2 })];
      const result = tickContacts(contacts);
      expect(result[0].cooldownRemaining).toBe(1);
    });

    it('decreases patience after cooldown expires', () => {
      const contacts = [makeContact({ stage: 'cooldown', cooldownRemaining: 0, patienceTimer: 3 })];
      const result = tickContacts(contacts);
      expect(result[0].patienceTimer).toBe(2);
    });

    it('closes door when patience runs out', () => {
      const contacts = [makeContact({ stage: 'follow_up', cooldownRemaining: 0, patienceTimer: 1 })];
      const result = tickContacts(contacts);
      expect(result[0].stage).toBe('closed');
    });

    it('tracks months established and deepens every 3', () => {
      const contacts = [makeContact({ stage: 'established', monthsEstablished: 2, yieldMultiplier: 1.0 })];
      const result = tickContacts(contacts);
      expect(result[0].monthsEstablished).toBe(3);
      expect(result[0].yieldMultiplier).toBe(1.25);
    });
  });

  describe('canAdvanceContact', () => {
    it('allows advancing from discovery', () => {
      expect(canAdvanceContact(makeContact({ stage: 'discovery' }))).toBe(true);
    });

    it('blocks advancing during cooldown', () => {
      expect(canAdvanceContact(makeContact({ stage: 'cooldown', cooldownRemaining: 1 }))).toBe(false);
    });

    it('allows advancing after cooldown expires', () => {
      expect(canAdvanceContact(makeContact({ stage: 'cooldown', cooldownRemaining: 0 }))).toBe(true);
    });

    it('blocks advancing closed contacts', () => {
      expect(canAdvanceContact(makeContact({ stage: 'closed' }))).toBe(false);
    });
  });
});
