interface CacheEntry {
  data: any;
  expiresAt: number;
}

export class DataLayerCache {
  private store = new Map<string, CacheEntry>();

  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async get(key: string): Promise<any | null> {
    const entry = this.store.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) return entry.data;
      this.store.delete(key);
    }
    return null;
  }
}
