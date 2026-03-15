import { create } from 'zustand';
import type { Table } from '@bc-building-code/bcbc-parser';

export type Spectables = {
  id: string;
  type: 'spectables';
  title: string;
  table_prefix?: string;
  toc_entry?: string;
  tables: Table[];
};

interface SpectablesStoreState {
  cache: Map<string, Spectables>;
  fetchSpectables: (version: string, division: string, part: string, spectablesNumber: string) => Promise<Spectables>;
  clearCache: () => void;
}

const inflightRequests = new Map<string, Promise<Spectables>>();

const normalizeDivision = (division: string): string =>
  division.replace(/nbc\.div([A-Z0-9]+)/i, (_, suffix) => `nbc-div${String(suffix).toLowerCase()}`);

const normalizePart = (part: string): string => (/^\d+$/.test(part) ? `part-${part}` : part);

const buildCacheKey = (
  version: string,
  division: string,
  part: string,
  spectablesNumber: string
): string => `${version}/${normalizeDivision(division)}/${normalizePart(part)}/spectables-${spectablesNumber}`;

const buildFetchPath = (
  version: string,
  division: string,
  part: string,
  spectablesNumber: string
): string =>
  `/data/${version}/content/${normalizeDivision(division)}/${normalizePart(part)}/spectables-${spectablesNumber}.json`;

export const useSpectablesStore = create<SpectablesStoreState>((set, get) => ({
  cache: new Map<string, Spectables>(),

  fetchSpectables: async (
    version: string,
    division: string,
    part: string,
    spectablesNumber: string
  ): Promise<Spectables> => {
    const cacheKey = buildCacheKey(version, division, part, spectablesNumber);
    const cached = get().cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inflight = inflightRequests.get(cacheKey);
    if (inflight) {
      return await inflight;
    }

    const request = (async () => {
      const fetchPath = buildFetchPath(version, division, part, spectablesNumber);
      const response = await fetch(fetchPath);

      if (!response.ok) {
        throw new Error(`Spectables ${spectablesNumber} not found for ${division} Part ${part}.`);
      }

      const spectables = (await response.json()) as Spectables;
      const nextCache = new Map(get().cache);
      nextCache.set(cacheKey, spectables);
      set({ cache: nextCache });
      return spectables;
    })();

    inflightRequests.set(cacheKey, request);

    try {
      return await request;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  },

  clearCache: () => set({ cache: new Map<string, Spectables>() }),
}));

