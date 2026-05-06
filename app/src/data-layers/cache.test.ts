import { describe, it, expect, beforeEach } from 'vitest';
import { DataLayerCache } from './cache';

describe('DataLayerCache', () => {
  let cache: DataLayerCache;

  beforeEach(() => {
    cache = new DataLayerCache();
  });

  it('stores and retrieves data', async () => {
    await cache.set('census', { population: 5000 }, 3600);
    const result = await cache.get('census');
    expect(result).toEqual({ population: 5000 });
  });

  it('returns null for expired data', async () => {
    await cache.set('census', { population: 5000 }, -1);
    const result = await cache.get('census');
    expect(result).toBeNull();
  });

  it('returns null for missing keys', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });
});
