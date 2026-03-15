import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface SpectableMapEntry {
  number?: string;
  title?: string;
  path?: string;
}

interface SpectablesMapStoreState {
  cache: Map<string, Record<string, SpectableMapEntry>>;
  fetchSpectablesMap: (version: string) => Promise<Record<string, SpectableMapEntry>>;
  clearCache: () => void;
}

const inflightRequests = new Map<string, Promise<Record<string, SpectableMapEntry>>>();

const buildCacheKey = (version: string): string => `spectables-map:${version}`;
const buildFetchPath = (version: string): string => `/data/${version}/spectables-map.json`;

export const useSpectablesMapStore = create<SpectablesMapStoreState>()(
  devtools(
    (set, get) => ({
      cache: new Map<string, Record<string, SpectableMapEntry>>(),

      fetchSpectablesMap: async (version: string) => {
        const cacheKey = buildCacheKey(version);
        const cached = get().cache.get(cacheKey);
        if (cached) {
          return cached;
        }

        const inflight = inflightRequests.get(cacheKey);
        if (inflight) {
          return await inflight;
        }

        const request = (async () => {
          const response = await fetch(buildFetchPath(version));
          if (!response.ok) {
            throw new Error(`Failed to load spectables map: ${response.status}`);
          }

          const map = (await response.json()) as Record<string, SpectableMapEntry>;
          const nextCache = new Map(get().cache);
          nextCache.set(cacheKey, map);
          set({ cache: nextCache });
          return map;
        })();

        inflightRequests.set(cacheKey, request);
        try {
          return await request;
        } finally {
          inflightRequests.delete(cacheKey);
        }
      },

      clearCache: () => set({ cache: new Map<string, Record<string, SpectableMapEntry>>() }),
    }),
    { name: 'spectables-map-store' }
  )
);

