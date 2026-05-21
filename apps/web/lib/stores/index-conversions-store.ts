/**
 * Index & Conversions Store
 * 
 * Zustand store for managing Index and Conversion Factors content
 */

import { create } from 'zustand';

/**
 * Index section data (as stored in the content chunk)
 */
export interface IndexSectionData {
    id: string;
    type: 'index';
    introduction?: string;
    letters?: IndexLetter[];
    [key: string]: unknown;
}

export interface IndexLetter {
    id: string;
    letter: string;
    groups: IndexGroup[];
}

export interface IndexGroup {
    id: string;
    term_id: string;
    term: string;
    subterms?: IndexSubterm[];
    references?: IndexReference[];
}

export interface IndexSubterm {
    id: string;
    term: string;
    references: IndexReference[];
}

export interface IndexReference {
    target: string;
    division?: string;
    vendor_target?: string;
}

/**
 * Conversions section data (as stored in the content chunk)
 */
export interface ConversionsSectionData {
    id: string;
    type: 'conversions';
    table_id?: string;
    table_title?: string;
    table_structure?: {
        columns: number;
        column_specs: Array<{ name: string; width: string }>;
        header_rows?: any[];
        body_rows?: any[];
    };
    [key: string]: unknown;
}

type ContentData = IndexSectionData | ConversionsSectionData;

interface IndexConversionsState {
    cache: Map<string, ContentData>;
    currentContent: ContentData | null;
    currentPath: string[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchContent: (version: string, contentType: 'index' | 'conversions', volumeSlug: string) => Promise<void>;
    clearError: () => void;
    reset: () => void;
}

/**
 * AbortController for canceling in-flight fetch requests
 */
let abortController: AbortController | null = null;

/**
 * Index & Conversions store
 */
export const useIndexConversionsStore = create<IndexConversionsState>((set, get) => ({
    // State
    cache: new Map<string, ContentData>(),
    currentContent: null,
    currentPath: [],
    loading: false,
    error: null,

    // Actions
    fetchContent: async (version: string, contentType: 'index' | 'conversions', volumeSlug: string) => {
        const cacheKey = `${version}/${contentType}/${volumeSlug}`;

        // Check cache first
        const cached = get().cache.get(cacheKey);
        if (cached) {
            set({
                currentContent: cached,
                currentPath: [contentType, volumeSlug],
                loading: false,
                error: null,
            });
            return;
        }

        // Cancel any in-flight request
        if (abortController) {
            abortController.abort();
        }

        // Create new AbortController for this request
        abortController = new AbortController();
        const signal = abortController.signal;

        // Fetch from public data directory
        set({
            currentContent: null,
            currentPath: [contentType, volumeSlug],
            loading: true,
            error: null,
        });

        try {
            // Construct file path: /data/{version}/content/{contentType}/{volumeSlug}.json
            const filePath = `/data/${version}/content/${contentType}/${volumeSlug}.json`;

            const response = await fetch(filePath, { signal });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`${contentType === 'index' ? 'Index' : 'Conversion Factors'} content not found for ${volumeSlug}`);
                }
                throw new Error(`Failed to load content: ${response.statusText}`);
            }

            const data: ContentData = await response.json();

            // Update cache
            const newCache = new Map(get().cache);
            newCache.set(cacheKey, data);

            set({
                cache: newCache,
                currentContent: data,
                currentPath: [contentType, volumeSlug],
                loading: false,
                error: null,
            });
        } catch (error) {
            // Ignore AbortError (request was cancelled)
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            set({
                loading: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    },

    clearError: () => set({ error: null }),

    reset: () => {
        if (abortController) {
            abortController.abort();
            abortController = null;
        }

        set({
            cache: new Map(),
            currentContent: null,
            currentPath: [],
            loading: false,
            error: null,
        });
    },
}));
