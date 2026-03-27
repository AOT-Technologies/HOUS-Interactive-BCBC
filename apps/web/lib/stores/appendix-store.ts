import { create } from 'zustand';
import type { Equation, Figure, StructuredList, Table } from '@bc-building-code/bcbc-parser';

export type AppendixParagraph = {
  id: string;
  type?: 'paragraph';
  content: string;
  equations?: Equation[];
  lists?: StructuredList[];
};

export type AppendixStandaloneList = {
  id?: string;
  type: 'list';
  list?: StructuredList;
  list_type?: StructuredList['type'];
  items?: unknown[];
};

export type AppendixRenderableItem =
  | AppendixParagraph
  | AppendixDivision
  | Table
  | Figure
  | AppendixStandaloneList;

export type AppendixContentBlock = {
  id: string;
  paragraphs?: AppendixParagraph[];
  tables?: Table[];
  figures?: Figure[];
  content?: AppendixRenderableItem[];
};

export type AppendixDivision = AppendixContentBlock & {
  type?: 'note_division' | 'appendix_section';
  title?: string;
};

export type ApplicationNote = AppendixContentBlock & {
  type?: 'application_note';
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

export type DivisionAppendixArticle = {
  id: string;
  type: 'appendix_article';
  title: string;
  content?: Array<AppendixParagraph | Table | Figure>;
  see_also?: string;
};

export type DivisionAppendixSubsection = {
  id: string;
  type: 'appendix_subsection';
  title: string;
  paragraphs?: AppendixParagraph[];
  articles: DivisionAppendixArticle[];
};

export type DivisionAppendixSection = {
  id: string;
  type: 'appendix_section' | 'note_division';
  title?: string;
  paragraphs?: AppendixParagraph[];
  content?: Array<AppendixParagraph | Table | Figure | AppendixStandaloneList>;
  subsections?: DivisionAppendixSubsection[];
};

export type DivisionAppendix = {
  id: string;
  type: 'appendix';
  letter: string;
  number: string;
  title: string;
  introduction?: string;
  sections: Array<AppendixRenderableItem>;
};

interface AppendixStoreState {
  cache: Map<string, PartAppendix | DivisionAppendix>;
  fetchAppendix: (version: string, division: string, part: string) => Promise<PartAppendix>;
  fetchDivisionAppendix: (version: string, division: string, letter: string) => Promise<DivisionAppendix>;
  clearCache: () => void;
}

const inflightRequests = new Map<string, Promise<PartAppendix | DivisionAppendix>>();

const normalizeDivision = (division: string): string =>
  division.replace(/nbc\.div([A-Z0-9]+)/i, (_, suffix) => `nbc-div${String(suffix).toLowerCase()}`);

const normalizePart = (part: string): string => (/^\d+$/.test(part) ? `part-${part}` : part);

const buildCacheKey = (version: string, division: string, part: string): string =>
  `${version}/${normalizeDivision(division)}/${normalizePart(part)}/appendix`;

const buildFetchPath = (version: string, division: string, part: string): string =>
  `/data/${version}/content/${normalizeDivision(division)}/${normalizePart(part)}/appendix.json`;

const buildDivisionAppendixCacheKey = (version: string, division: string, letter: string): string =>
  `${version}/${normalizeDivision(division)}/appendix-${letter.toLowerCase()}`;

const buildDivisionAppendixFetchPath = (version: string, division: string, letter: string): string =>
  `/data/${version}/content/${normalizeDivision(division)}/appendix-${letter.toLowerCase()}.json`;

const isPartAppendixPayload = (
  payload: PartAppendix | DivisionAppendix
): payload is PartAppendix => payload.type === 'part_appendix';

const isDivisionAppendixPayload = (
  payload: PartAppendix | DivisionAppendix
): payload is DivisionAppendix => payload.type === 'appendix';

export const useAppendixStore = create<AppendixStoreState>((set, get) => ({
  cache: new Map<string, PartAppendix | DivisionAppendix>(),

  fetchAppendix: async (version: string, division: string, part: string): Promise<PartAppendix> => {
    const cacheKey = buildCacheKey(version, division, part);
    const cached = get().cache.get(cacheKey);
    if (cached && isPartAppendixPayload(cached)) {
      return cached;
    }

    const inflight = inflightRequests.get(cacheKey);
    if (inflight) {
      const inflightPayload = await inflight;
      if (isPartAppendixPayload(inflightPayload)) {
        return inflightPayload;
      }
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

  fetchDivisionAppendix: async (
    version: string,
    division: string,
    letter: string
  ): Promise<DivisionAppendix> => {
    const cacheKey = buildDivisionAppendixCacheKey(version, division, letter);
    const cached = get().cache.get(cacheKey);
    if (cached && isDivisionAppendixPayload(cached)) {
      return cached;
    }

    const inflight = inflightRequests.get(cacheKey);
    if (inflight) {
      const inflightPayload = await inflight;
      if (isDivisionAppendixPayload(inflightPayload)) {
        return inflightPayload;
      }
    }

    const request = (async () => {
      const fetchPath = buildDivisionAppendixFetchPath(version, division, letter);
      const response = await fetch(fetchPath);

      if (!response.ok) {
        throw new Error(`Appendix ${letter.toUpperCase()} not found for ${division}.`);
      }

      const appendix = (await response.json()) as DivisionAppendix;
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

  clearCache: () => set({ cache: new Map<string, PartAppendix | DivisionAppendix>() }),
}));
