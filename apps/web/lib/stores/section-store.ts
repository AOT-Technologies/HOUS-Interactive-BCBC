/**
 * Section Store
 * 
 * Zustand store for managing section content (works directly with parser types)
 */

import { create } from 'zustand';
import type { Section } from '@bc-building-code/bcbc-parser';

interface SectionState {
  cache: Map<string, Section>;
  currentSection: Section | null;
  currentPath: string[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchSection: (version: string, path: string[]) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * AbortController for canceling in-flight fetch requests
 */
let abortController: AbortController | null = null;

/**
 * Section store for managing section content
 */
export const useSectionStore = create<SectionState>((set, get) => ({
  // State
  cache: new Map<string, Section>(),
  currentSection: null,
  currentPath: [],
  loading: false,
  error: null,

  // Actions
  fetchSection: async (version: string, path: string[]) => {
    const [division, part, section] = path;
    
    // Validate required path segments
    if (!division || !part || !section) {
      set({
        loading: false,
        error: 'Invalid content path: division, part, and section are required',
      });
      return;
    }
    
    const cacheKey = `${version}/${division}/${part}/${section}`;

    // Check cache first
    const cached = get().cache.get(cacheKey);
    if (cached) {
      set({ currentSection: cached, loading: false, error: null });
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
    set({ loading: true, error: null });

    try {
      // Transform navigation format to file system format
      // nbc.divA/1/1 → nbc-diva/part-1/section-1
      const transformedDivision = division.replace(/nbc\.div([A-Z0-9]+)/i, (_, suffix) => 
        `nbc-div${suffix.toLowerCase()}`
      );
      const transformedPart = /^\d+$/.test(part) ? `part-${part}` : part;
      const transformedSection = /^\d+$/.test(section) ? `section-${section}` : section;
      
      // Construct file path: /data/{version}/content/{division}/{part}/{section}.json
      const filePath = `/data/${version}/content/${transformedDivision}/${transformedPart}/${transformedSection}.json`;
      
      console.log('Fetching section from:', filePath);
      
      const response = await fetch(filePath, { signal });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Content not found: ${transformedDivision}/${transformedPart}/${transformedSection}`);
        }
        throw new Error(`Failed to load content: ${response.statusText}`);
      }
      
      const sectionData: Section = await response.json();

      // Update cache
      const newCache = new Map(get().cache);
      newCache.set(cacheKey, sectionData);

      set({
        cache: newCache,
        currentSection: sectionData,
        currentPath: path,
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
    // Cancel any in-flight request
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    
    set({
      cache: new Map(),
      currentSection: null,
      currentPath: [],
      loading: false,
      error: null,
    });
  },
}));
