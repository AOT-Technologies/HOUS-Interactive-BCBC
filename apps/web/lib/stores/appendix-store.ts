import { create } from 'zustand';
import type { Figure, Table } from '@bc-building-code/bcbc-parser';

export type AppendixParagraph = { id: string; content: string };

export type AppendixContentBlock = {
  id: string;
  paragraphs?: AppendixParagraph[];
  tables?: Table[];
  figures?: Figure[];
};

export type AppendixDivision = AppendixContentBlock & {
  title?: string;
};

export type ApplicationNote = AppendixContentBlock & {
  number?: string;
  title?: string;
  divisions?: AppendixDivision[];
};

export type PartAppendix = {
  id: string;
  type: 'part_appendix';
  introduction?: string;
  application_notes?: ApplicationNote[];
};

interface AppendixStoreState {
  cache: Map<string, PartAppendix>;
  fetchAppendix: (version: string, division: string, part: string) => Promise<PartAppendix>;
  clearCache: () => void;
}

const inflightRequests = new Map<string, Promise<PartAppendix>>();

const normalizeDivision = (division: string): string =>
  division.replace(/nbc\.div([A-Z0-9]+)/i, (_, suffix) => `nbc-div${String(suffix).toLowerCase()}`);

const normalizePart = (part: string): string => (/^\d+$/.test(part) ? `part-${part}` : part);

const buildCacheKey = (version: string, division: string, part: string): string =>
  `${version}/${normalizeDivision(division)}/${normalizePart(part)}/appendix`;

const buildFetchPath = (version: string, division: string, part: string): string =>
  `/data/${version}/content/${normalizeDivision(division)}/${normalizePart(part)}/appendix.json`;

export const useAppendixStore = create<AppendixStoreState>((set, get) => ({
  cache: new Map<string, PartAppendix>(),

  fetchAppendix: async (version: string, division: string, part: string): Promise<PartAppendix> => {
    const cacheKey = buildCacheKey(version, division, part);
    const cached = get().cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inflight = inflightRequests.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const request = (async () => {
      const fetchPath = buildFetchPath(version, division, part);
      const response = await fetch(fetchPath);

      if (!response.ok) {
        throw new Error(`Appendix not found for ${division} Part ${part}.`);
      }

      const appendix = (await response.json()) as PartAppendix;
      const nextCache = new Map(get().cache);
      nextCache.set(cacheKey, appendix);
      set({ cache: nextCache });
      return appendix;
    })();

    inflightRequests.set(cacheKey, request);

    try {
      return await request;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  },

  clearCache: () => set({ cache: new Map<string, PartAppendix>() }),
}));
