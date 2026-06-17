import { describe, it, expect } from 'vitest';
import { COUNCIL_MEMBERS } from './council-members';

describe('COUNCIL_MEMBERS', () => {
  it('contains exactly 7 council members', () => {
    expect(Object.keys(COUNCIL_MEMBERS)).toHaveLength(7);
  });

  it('has all 7 members by key', () => {
    const expectedKeys = [
      'marlena_calloway',
      'jt_thibodeaux',
      'denise_okonkwo',
      'victor_marek',
      'bobby_slade',
      'tomoko_reyes',
      'aaliyah_foster',
    ];
    for (const key of expectedKeys) {
      expect(COUNCIL_MEMBERS).toHaveProperty(key);
    }
  });

  it('has unique district numbers 1 through 7', () => {
    const districtNumbers = Object.values(COUNCIL_MEMBERS).map(
      (m) => m.districtNumber
    );
    expect(districtNumbers.sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
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

  describe('Marlena Calloway (District 1)', () => {
    const m = () => COUNCIL_MEMBERS.marlena_calloway;

    it('has correct id and name', () => {
      expect(m().id).toBe('marlena_calloway');
      expect(m().name).toBe('Marlena Calloway');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Northwest Detroit');
      expect(m().districtNumber).toBe(1);
    });

    it('is progressive', () => {
      expect(m().leaning).toBe('progressive');
    });

    it('has correct priorities', () => {
      expect(m().priorities).toEqual([
        'food_sovereignty',
        'vacant_land',
        'community_land_trusts',
      ]);
    });

    it('has disposition +60', () => {
      expect(m().disposition).toBe(60);
    });

    it('has a backstory mentioning urban farming and community organizing', () => {
      expect(m().backstory.length).toBeGreaterThan(20);
      expect(m().backstory.toLowerCase()).toMatch(/urban farm|farm/);
      expect(m().backstory.toLowerCase()).toMatch(/organiz/);
    });
  });

  describe('JT Thibodeaux (District 5)', () => {
    const m = () => COUNCIL_MEMBERS.jt_thibodeaux;

    it('has correct id and name', () => {
      expect(m().id).toBe('jt_thibodeaux');
      expect(m().name).toBe('JT Thibodeaux');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Central Detroit');
      expect(m().districtNumber).toBe(5);
    });

    it('is moderate', () => {
      expect(m().leaning).toBe('moderate');
    });

    it('has correct priorities', () => {
      expect(m().priorities).toEqual([
        'small_business',
        'arts_culture',
        'neighborhood_safety',
      ]);
    });

    it('has disposition +20', () => {
      expect(m().disposition).toBe(20);
    });

    it('has a backstory mentioning jazz club', () => {
      expect(m().backstory.length).toBeGreaterThan(20);
      expect(m().backstory.toLowerCase()).toMatch(/jazz/);
    });
  });

  describe('Denise Okonkwo (District 3)', () => {
    const m = () => COUNCIL_MEMBERS.denise_okonkwo;

    it('has correct id and name', () => {
      expect(m().id).toBe('denise_okonkwo');
      expect(m().name).toBe('Denise Okonkwo');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Northeast Detroit');
      expect(m().districtNumber).toBe(3);
    });

    it('is progressive', () => {
      expect(m().leaning).toBe('progressive');
    });

    it('has correct priorities', () => {
      expect(m().priorities).toEqual([
        'youth_programs',
        'education',
        'anti_blight',
      ]);
    });

    it('has disposition +40', () => {
      expect(m().disposition).toBe(40);
    });

    it('has a backstory mentioning school principal', () => {
      expect(m().backstory.length).toBeGreaterThan(20);
      expect(m().backstory.toLowerCase()).toMatch(/principal|school/);
    });
  });

  describe('Victor Marek (District 7)', () => {
    const m = () => COUNCIL_MEMBERS.victor_marek;

    it('has correct id and name', () => {
      expect(m().id).toBe('victor_marek');
      expect(m().name).toBe('Victor Marek');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('West-Central Detroit');
      expect(m().districtNumber).toBe(7);
    });

    it('is moderate', () => {
      expect(m().leaning).toBe('moderate');
    });

    it('has correct priorities', () => {
      expect(m().priorities).toEqual([
        'immigrant_support',
        'manufacturing',
        'infrastructure',
      ]);
    });

    it('has disposition +25', () => {
      expect(m().disposition).toBe(25);
    });

    it('has a backstory mentioning machine shop', () => {
      expect(m().backstory.length).toBeGreaterThan(20);
      expect(m().backstory.toLowerCase()).toMatch(/machine shop/);
    });
  });

  describe('Bobby Slade (District 2)', () => {
    const m = () => COUNCIL_MEMBERS.bobby_slade;

    it('has correct id and name', () => {
      expect(m().id).toBe('bobby_slade');
      expect(m().name).toBe('Bobby Slade');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('North-Central Detroit');
      expect(m().districtNumber).toBe(2);
    });

    it('is moderate-conservative', () => {
      expect(m().leaning).toBe('moderate-conservative');
    });

    it('has correct priorities', () => {
      expect(m().priorities).toEqual([
        'historic_preservation',
        'property_tax',
        'public_safety',
      ]);
    });

    it('has disposition -10', () => {
      expect(m().disposition).toBe(-10);
    });

    it('has a backstory mentioning auto industry and engineer', () => {
      expect(m().backstory.length).toBeGreaterThan(20);
      expect(m().backstory.toLowerCase()).toMatch(/auto|engineer/);
    });
  });

  describe('Tomoko Reyes (District 6)', () => {
    const m = () => COUNCIL_MEMBERS.tomoko_reyes;

    it('has correct id and name', () => {
      expect(m().id).toBe('tomoko_reyes');
      expect(m().name).toBe('Tomoko Reyes');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Southwest Detroit');
      expect(m().districtNumber).toBe(6);
    });

    it('is progressive', () => {
      expect(m().leaning).toBe('progressive');
    });

    it('has correct priorities', () => {
      expect(m().priorities).toEqual([
        'environmental_justice',
        'water_rights',
        'pollution_cleanup',
      ]);
    });

    it('has disposition +50', () => {
      expect(m().disposition).toBe(50);
    });

    it('has a backstory mentioning environmental justice attorney', () => {
      expect(m().backstory.length).toBeGreaterThan(20);
      expect(m().backstory.toLowerCase()).toMatch(/attorney|lawyer|legal|environmental justice/);
    });
  });

  describe('Aaliyah Foster (District 4)', () => {
    const m = () => COUNCIL_MEMBERS.aaliyah_foster;

    it('has correct id and name', () => {
      expect(m().id).toBe('aaliyah_foster');
      expect(m().name).toBe('Aaliyah Foster');
    });

    it('has correct district info', () => {
      expect(m().district).toBe('Far East Side');
      expect(m().districtNumber).toBe(4);
    });

    it('is moderate', () => {
      expect(m().leaning).toBe('moderate');
    });

    it('has correct priorities', () => {
      expect(m().priorities).toEqual([
        'waterfront_access',
        'flood_resilience',
        'intergenerational_wealth',
      ]);
    });

    it('has disposition +15', () => {
      expect(m().disposition).toBe(15);
    });

    it('has a backstory mentioning real estate', () => {
      expect(m().backstory.length).toBeGreaterThan(20);
      expect(m().backstory.toLowerCase()).toMatch(/real estate/);
    });
  });
});
