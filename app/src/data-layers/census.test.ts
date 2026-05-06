import { describe, it, expect } from 'vitest';
import { parseCensusResponse } from './census';

describe('parseCensusResponse', () => {
  it('parses Census API JSON array response', () => {
    const raw = [
      ['B01003_001E', 'B19013_001E', 'B25002_003E', 'B25001_001E', 'state', 'county', 'tract', 'block group'],
      ['5000', '35000', '200', '2000', '26', '163', '510100', '1'],
      ['3000', '42000', '50', '1500', '26', '163', '510100', '2'],
    ];
    const result = parseCensusResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].population).toBe(5000);
    expect(result[0].medianIncome).toBe(35000);
    expect(result[0].vacancyRate).toBeCloseTo(0.1);
    expect(result[0].geoid).toBe('261635101001');
  });
});
