import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface StandardReferenceEntry {
  standard_id?: string;
  standard_ref_id?: string;
  title?: string;
  full_title?: string;
  number?: string;
  full_number?: string;
  agency?: string;
  table_id?: string;
  location_id?: string;
}

interface StandardsMapStoreState {
  cache: Map<string, Record<string, StandardReferenceEntry>>;
  fetchStandardsMap: (version: string) => Promise<Record<string, StandardReferenceEntry>>;
  clearCache: () => void;
}

const inflightRequests = new Map<string, Promise<Record<string, StandardReferenceEntry>>>();

const buildCacheKey = (version: string): string => `standards-map:${version}`;
const buildFetchPath = (version: string): string => `/data/${version}/standards-map.json`;

export const useStandardsMapStore = create<StandardsMapStoreState>()(
  devtools(
    (set, get) => ({
      cache: new Map<string, Record<string, StandardReferenceEntry>>(),

      fetchStandardsMap: async (version: string) => {
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
            throw new Error(`Failed to load standards map: ${response.status}`);
          }

          const map = (await response.json()) as Record<string, StandardReferenceEntry>;
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

      clearCache: () => set({ cache: new Map<string, Record<string, StandardReferenceEntry>>() }),
    }),
    { name: 'standards-map-store' }
  )
);

