import { describe, it, expect } from 'vitest';
import { COUNCIL_MEMBERS } from './council-members';

describe('COUNCIL_MEMBERS', () => {
  it('contains exactly 9 council members (7 district + 2 at-large)', () => {
    expect(Object.keys(COUNCIL_MEMBERS)).toHaveLength(9);
  });

  it('has all 9 members by key', () => {
    const expectedKeys = [
      'james_tate',
      'angela_whitfield_calloway',
      'scott_benson',
      'latisha_johnson',
      'renata_miller',
      'gabriela_santiago_romero',
      'denzel_anton_mccampbell',
      'coleman_young_ii',
      'mary_waters',
    ];
    for (const key of expectedKeys) {
      expect(COUNCIL_MEMBERS).toHaveProperty(key);
    }
  });

  it('has unique district numbers for 7 district members (1-7) plus 2 at-large (0)', () => {
    const districtNumbers = Object.values(COUNCIL_MEMBERS).map(
      (m) => m.districtNumber
    );
    const nonAtLarge = districtNumbers.filter((n) => n > 0);
    expect(nonAtLarge.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const atLarge = districtNumbers.filter((n) => n === 0);
    expect(atLarge).toHaveLength(2);
  });

  it('every member has required fields', () => {
    for (const member of Object.values(COUNCIL_MEMBERS)) {
      expect(member.id).toBeTruthy();
      expect(member.name).toBeTruthy();
      expect(member.district).toBeTruthy();
      expect(typeof member.districtNumber).toBe('number');
      expect(member.leaning).toBeTruthy();
      expect(Array.isArray(member.priorities)).toBe(true);
      expect(member.priorities.length).toBeGreaterThanOrEqual(1);
      expect(typeof member.disposition).toBe('number');
      expect(member.backstory).toBeTruthy();
      expect(Array.isArray(member.tileIds)).toBe(true);
    }
  });

  it('every member id matches its key', () => {
    for (const [key, member] of Object.entries(COUNCIL_MEMBERS)) {
      expect(member.id).toBe(key);
    }
  });

  describe('James Tate (District 1)', () => {
    const m = () => COUNCIL_MEMBERS.james_tate;

    it('has correct id and name', () => {
      expect(m().id).toBe('james_tate');
      expect(m().name).toBe('James Tate');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Northwest Detroit');
      expect(m().districtNumber).toBe(1);
    });

    it('is progressive', () => {
      expect(m().leaning).toBe('progressive');
    });

    it('has disposition +60', () => {
      expect(m().disposition).toBe(60);
    });
  });

  describe('Angela Whitfield-Calloway (District 2)', () => {
    const m = () => COUNCIL_MEMBERS.angela_whitfield_calloway;

    it('has correct id and name', () => {
      expect(m().id).toBe('angela_whitfield_calloway');
      expect(m().name).toBe('Angela Whitfield-Calloway');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('North-Central Detroit');
      expect(m().districtNumber).toBe(2);
    });

    it('has disposition 10', () => {
      expect(m().disposition).toBe(10);
    });
  });

  describe('Scott Benson (District 3)', () => {
    const m = () => COUNCIL_MEMBERS.scott_benson;

    it('has correct id and name', () => {
      expect(m().id).toBe('scott_benson');
      expect(m().name).toBe('Scott Benson');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Northeast Detroit');
      expect(m().districtNumber).toBe(3);
    });

    it('is progressive', () => {
      expect(m().leaning).toBe('progressive');
    });
  });

  describe('Latisha Johnson (District 4)', () => {
    const m = () => COUNCIL_MEMBERS.latisha_johnson;

    it('has correct id and name', () => {
      expect(m().id).toBe('latisha_johnson');
      expect(m().name).toBe('Latisha Johnson');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Far East Side');
      expect(m().districtNumber).toBe(4);
    });
  });

  describe('Renata Miller (District 5)', () => {
    const m = () => COUNCIL_MEMBERS.renata_miller;

    it('has correct id and name', () => {
      expect(m().id).toBe('renata_miller');
      expect(m().name).toBe('Renata Miller');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Central Detroit');
      expect(m().districtNumber).toBe(5);
    });
  });

  describe('Gabriela Santiago-Romero (District 6)', () => {
    const m = () => COUNCIL_MEMBERS.gabriela_santiago_romero;

    it('has correct id and name', () => {
      expect(m().id).toBe('gabriela_santiago_romero');
      expect(m().name).toBe('Gabriela Santiago-Romero');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Southwest Detroit');
      expect(m().districtNumber).toBe(6);
    });

    it('is progressive', () => {
      expect(m().leaning).toBe('progressive');
    });

    it('has disposition +50', () => {
      expect(m().disposition).toBe(50);
    });
  });

  describe('Denzel Anton McCampbell (District 7)', () => {
    const m = () => COUNCIL_MEMBERS.denzel_anton_mccampbell;

    it('has correct id and name', () => {
      expect(m().id).toBe('denzel_anton_mccampbell');
      expect(m().name).toBe('Denzel Anton McCampbell');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('West-Central Detroit');
      expect(m().districtNumber).toBe(7);
    });
  });

  describe('Coleman Young II (At-Large)', () => {
    const m = () => COUNCIL_MEMBERS.coleman_young_ii;

    it('has correct id and name', () => {
      expect(m().id).toBe('coleman_young_ii');
      expect(m().name).toBe('Coleman Young II');
    });

    it('is at-large (district 0)', () => {
      expect(m().district).toBe('At-Large');
      expect(m().districtNumber).toBe(0);
    });
  });

  describe('Mary Waters (At-Large)', () => {
    const m = () => COUNCIL_MEMBERS.mary_waters;

    it('has correct id and name', () => {
      expect(m().id).toBe('mary_waters');
      expect(m().name).toBe('Mary Waters');
    });

    it('is at-large (district 0)', () => {
      expect(m().district).toBe('At-Large');
      expect(m().districtNumber).toBe(0);
    });
  });
});
