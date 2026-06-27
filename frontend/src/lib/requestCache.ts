type CacheEntry<T> = {
  data?: T;
  promise?: Promise<T>;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function createRequestCache<T>(ttlMs = DEFAULT_TTL_MS) {
  const store = new Map<string, CacheEntry<T>>();

  function get(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry?.data) return undefined;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  async function fetch(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = get(key);
    if (cached !== undefined) return cached;

    const entry = store.get(key);
    if (entry?.promise) return entry.promise;

    const promise = loader()
      .then((data) => {
        store.set(key, { data, expiresAt: Date.now() + ttlMs });
        return data;
      })
      .catch((error) => {
        store.delete(key);
        throw error;
      });

    store.set(key, { promise, expiresAt: Date.now() + ttlMs });
    return promise;
  }

  function set(key: string, data: T) {
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  function update(key: string, updater: (current: T) => T) {
    const current = get(key);
    if (current !== undefined) {
      set(key, updater(current));
    }
  }

  function invalidate(key: string) {
    store.delete(key);
  }

  return { fetch, get, set, update, invalidate };
}
