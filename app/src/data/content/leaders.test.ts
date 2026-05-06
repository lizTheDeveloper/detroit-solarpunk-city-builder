import { describe, it, expect } from 'vitest';
import { LEADER_DEFINITIONS } from './leaders';

describe('LEADER_DEFINITIONS', () => {
  it('contains exactly 8 leaders', () => {
    expect(Object.keys(LEADER_DEFINITIONS)).toHaveLength(8);
  });

  it('has all 8 leaders by key', () => {
    const expectedKeys = [
      'grace',
      'kez',
      'darius',
      'lucia',
      'elder_whitehorse',
      'hassan',
      'tamika',
      'big_mike',
    ];
    for (const key of expectedKeys) {
      expect(LEADER_DEFINITIONS).toHaveProperty(key);
    }
  });

  it('every leader has required fields', () => {
    for (const leader of Object.values(LEADER_DEFINITIONS)) {
      expect(leader.id).toBeTruthy();
      expect(leader.name).toBeTruthy();
      expect(leader.neighborhood).toBeTruthy();
      expect(Array.isArray(leader.tileIds)).toBe(true);
      expect(leader.backstory).toBeTruthy();
      expect(Array.isArray(leader.priorities)).toBe(true);
      expect(leader.priorities.length).toBeGreaterThanOrEqual(1);
      expect(typeof leader.trust).toBe('number');
      expect(typeof leader.advocacyPower).toBe('number');
      expect(typeof leader.proposalCooldown).toBe('number');
      expect(typeof leader.consecutiveDeferrals).toBe('number');
    }
  });

  it('every leader id matches its key', () => {
    for (const [key, leader] of Object.entries(LEADER_DEFINITIONS)) {
      expect(leader.id).toBe(key);
    }
  });

  it('all leaders start with proposalCooldown 0 and consecutiveDeferrals 0', () => {
    for (const leader of Object.values(LEADER_DEFINITIONS)) {
      expect(leader.proposalCooldown).toBe(0);
      expect(leader.consecutiveDeferrals).toBe(0);
    }
  });

  describe('Grace Okafor-Williams', () => {
    it('has correct id and name', () => {
      const grace = LEADER_DEFINITIONS.grace;
      expect(grace.id).toBe('grace');
      expect(grace.name).toBe('Grace Okafor-Williams');
    });

    it('has neighborhood Brightmoor with correct tileIds', () => {
      const grace = LEADER_DEFINITIONS.grace;
      expect(grace.neighborhood).toBe('Brightmoor');
      expect(grace.tileIds).toEqual(['brightmoor']);
    });

    it('has correct backstory', () => {
      expect(LEADER_DEFINITIONS.grace.backstory).toContain('urban farmer');
      expect(LEADER_DEFINITIONS.grace.backstory).toContain('2008');
    });

    it('has correct priorities', () => {
      expect(LEADER_DEFINITIONS.grace.priorities).toEqual([
        'food_forest',
        'community_kitchen',
        'soil_remediation',
      ]);
    });

    it('has trust 30 and advocacyPower 4', () => {
      const grace = LEADER_DEFINITIONS.grace;
      expect(grace.trust).toBe(30);
      expect(grace.advocacyPower).toBe(4);
    });

    it('has proposalCooldown 0 and consecutiveDeferrals 0', () => {
      const grace = LEADER_DEFINITIONS.grace;
      expect(grace.proposalCooldown).toBe(0);
      expect(grace.consecutiveDeferrals).toBe(0);
    });
  });

  describe('Kezia "Kez" Monroe', () => {
    it('has correct id and name', () => {
      const kez = LEADER_DEFINITIONS.kez;
      expect(kez.id).toBe('kez');
      expect(kez.name).toBe('Kezia "Kez" Monroe');
    });

    it('has neighborhood Corktown with correct tileIds', () => {
      const kez = LEADER_DEFINITIONS.kez;
      expect(kez.neighborhood).toBe('Corktown');
      expect(kez.tileIds).toEqual(['corktown']);
    });

    it('has correct backstory', () => {
      expect(LEADER_DEFINITIONS.kez.backstory).toContain('housing justice');
      expect(LEADER_DEFINITIONS.kez.backstory).toContain('Corktown');
    });

    it('has correct priorities', () => {
      expect(LEADER_DEFINITIONS.kez.priorities).toEqual([
        'land_trust',
        'community_kitchen',
        'maker_space',
      ]);
    });

    it('has trust 10 and advocacyPower 3', () => {
      const kez = LEADER_DEFINITIONS.kez;
      expect(kez.trust).toBe(10);
      expect(kez.advocacyPower).toBe(3);
    });

    it('has proposalCooldown 0 and consecutiveDeferrals 0', () => {
      const kez = LEADER_DEFINITIONS.kez;
      expect(kez.proposalCooldown).toBe(0);
      expect(kez.consecutiveDeferrals).toBe(0);
    });
  });

  describe('Darius Kemp', () => {
    it('has correct id and name', () => {
      const darius = LEADER_DEFINITIONS.darius;
      expect(darius.id).toBe('darius');
      expect(darius.name).toBe('Darius Kemp');
    });

    it('has neighborhood Eastern Market with correct tileIds', () => {
      const darius = LEADER_DEFINITIONS.darius;
      expect(darius.neighborhood).toBe('Eastern Market');
      expect(darius.tileIds).toEqual(['eastern_market']);
    });

    it('has correct backstory', () => {
      expect(LEADER_DEFINITIONS.darius.backstory).toContain('maker');
      expect(LEADER_DEFINITIONS.darius.backstory).toContain('muralist');
    });

    it('has correct priorities', () => {
      expect(LEADER_DEFINITIONS.darius.priorities).toEqual([
        'maker_space',
        'greenway',
        'native_planting',
      ]);
    });

    it('has trust 20 and advocacyPower 3', () => {
      const darius = LEADER_DEFINITIONS.darius;
      expect(darius.trust).toBe(20);
      expect(darius.advocacyPower).toBe(3);
    });

    it('has proposalCooldown 0 and consecutiveDeferrals 0', () => {
      const darius = LEADER_DEFINITIONS.darius;
      expect(darius.proposalCooldown).toBe(0);
      expect(darius.consecutiveDeferrals).toBe(0);
    });
  });

  describe('Lucia Espinoza', () => {
    const l = () => LEADER_DEFINITIONS.lucia;

    it('has correct id and name', () => {
      expect(l().id).toBe('lucia');
      expect(l().name).toBe('Lucia Espinoza');
    });

    it('has correct neighborhood and tileIds', () => {
      expect(l().neighborhood).toBe('Southwest Detroit/Delray');
      expect(l().tileIds).toEqual(['southwest_detroit', 'delray']);
    });

    it('has correct priorities', () => {
      expect(l().priorities).toEqual([
        'rain_garden',
        'wetland_restoration',
        'soil_remediation',
      ]);
    });

    it('has trust +15 and advocacyPower 4', () => {
      expect(l().trust).toBe(15);
      expect(l().advocacyPower).toBe(4);
    });

    it('has a meaningful backstory', () => {
      expect(l().backstory.length).toBeGreaterThan(20);
    });
  });

  describe('Elder Whitehorse', () => {
    const l = () => LEADER_DEFINITIONS.elder_whitehorse;

    it('has correct id and name', () => {
      expect(l().id).toBe('elder_whitehorse');
      expect(l().name).toBe('Elder Whitehorse');
    });

    it('has correct neighborhood and tileIds', () => {
      expect(l().neighborhood).toBe('Indian Village/West Village');
      expect(l().tileIds).toEqual(['indian_village', 'west_village']);
    });

    it('has correct priorities', () => {
      expect(l().priorities).toEqual([
        'community_kitchen',
        'greenway',
        'native_planting',
      ]);
    });

    it('has trust +25 and advocacyPower 3', () => {
      expect(l().trust).toBe(25);
      expect(l().advocacyPower).toBe(3);
    });

    it('has a meaningful backstory', () => {
      expect(l().backstory.length).toBeGreaterThan(20);
    });
  });

  describe('Hassan Farah', () => {
    const l = () => LEADER_DEFINITIONS.hassan;

    it('has correct id and name', () => {
      expect(l().id).toBe('hassan');
      expect(l().name).toBe('Hassan Farah');
    });

    it('has correct neighborhood and tileIds', () => {
      expect(l().neighborhood).toBe('Hamtramck/Banglatown');
      expect(l().tileIds).toEqual(['hamtramck', 'banglatown']);
    });

    it('has correct priorities', () => {
      expect(l().priorities).toEqual([
        'maker_space',
        'community_kitchen',
        'solar_grid',
      ]);
    });

    it('has trust +5 and advocacyPower 4', () => {
      expect(l().trust).toBe(5);
      expect(l().advocacyPower).toBe(4);
    });

    it('has a meaningful backstory', () => {
      expect(l().backstory.length).toBeGreaterThan(20);
    });
  });

  describe('Tamika Jefferson', () => {
    const l = () => LEADER_DEFINITIONS.tamika;

    it('has correct id and name', () => {
      expect(l().id).toBe('tamika');
      expect(l().name).toBe('Tamika Jefferson');
    });

    it('has correct neighborhood and tileIds', () => {
      expect(l().neighborhood).toBe('North End/Highland Park');
      expect(l().tileIds).toEqual(['north_end', 'highland_park']);
    });

    it('has correct priorities', () => {
      expect(l().priorities).toEqual([
        'soil_remediation',
        'community_kitchen',
        'rain_garden',
      ]);
    });

    it('has trust +20 and advocacyPower 3', () => {
      expect(l().trust).toBe(20);
      expect(l().advocacyPower).toBe(3);
    });

    it('has a meaningful backstory', () => {
      expect(l().backstory.length).toBeGreaterThan(20);
    });
  });

  describe('Big Mike Novak', () => {
    const l = () => LEADER_DEFINITIONS.big_mike;

    it('has correct id and name', () => {
      expect(l().id).toBe('big_mike');
      expect(l().name).toBe('Big Mike Novak');
    });

    it('has correct neighborhood and tileIds', () => {
      expect(l().neighborhood).toBe('Warrendale/Rouge Park');
      expect(l().tileIds).toEqual(['warrendale', 'rouge_park']);
    });

    it('has correct priorities', () => {
      expect(l().priorities).toEqual([
        'rain_garden',
        'solar_grid',
        'greenway',
      ]);
    });

    it('has trust +15 and advocacyPower 3', () => {
      expect(l().trust).toBe(15);
      expect(l().advocacyPower).toBe(3);
    });

    it('has a meaningful backstory', () => {
      expect(l().backstory.length).toBeGreaterThan(20);
    });
  });
});
