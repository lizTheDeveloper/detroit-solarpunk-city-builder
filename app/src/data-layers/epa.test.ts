import { describe, it, expect } from 'vitest';
import { parseEpaSites } from './epa';

describe('parseEpaSites', () => {
  it('parses EPA Envirofacts response', () => {
    const raw = [
      {
        REGISTRY_ID: '110000123',
        PRIMARY_NAME: 'Former Auto Plant',
        LATITUDE83: 42.33,
        LONGITUDE83: -83.05,
        SITE_TYPE_NAME: 'BROWNFIELDS',
        FEDERAL_FACILITY_CODE: null,
      },
    ];
    const result = parseEpaSites(raw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Former Auto Plant');
    expect(result[0].type).toBe('brownfield');
    expect(result[0].lat).toBe(42.33);
  });
});
