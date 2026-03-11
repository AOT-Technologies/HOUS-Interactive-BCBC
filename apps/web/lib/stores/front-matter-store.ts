/**
 * Front Matter Store
 * 
 * Zustand store for managing front matter content (preface, introduction, committees)
 */

import { create } from 'zustand';

/**
 * Front matter content item (paragraph, heading, table, etc.)
 */
export interface FrontMatterContentItem {
  type: 'paragraph' | 'heading' | 'table' | 'figure' | 'list';
  id: string;
  content?: string;
  level?: number;  // For headings
  [key: string]: any;  // Allow additional properties
}

/**
 * Front matter section (preface, introduction, committees)
 */
export interface FrontMatterSection {
  id: string;
  type: 'preface' | 'introduction' | 'committees';
  title?: string;
  content?: FrontMatterContentItem[];
  tables?: any[];  // For committees section
  notes?: any[];   // For committees section
}

interface FrontMatterState {
  cache: Map<string, FrontMatterSection>;
  currentSection: FrontMatterSection | null;
  currentPath: string[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchFrontMatter: (version: string, section: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * AbortController for canceling in-flight fetch requests
 */
let abortController: AbortController | null = null;

/**
 * Front matter store for managing front matter content
 */
export const useFrontMatterStore = create<FrontMatterState>((set, get) => ({
  // State
  cache: new Map<string, FrontMatterSection>(),
  currentSection: null,
  currentPath: [],
  loading: false,
  error: null,

  // Actions
  fetchFrontMatter: async (version: string, section: string) => {
    // Validate section name
    const validSections = ['preface', 'introduction', 'committees'];
    if (!validSections.includes(section)) {
      set({
        loading: false,
        error: `Invalid front matter section: ${section}. Must be one of: ${validSections.join(', ')}`,
      });
      return;
    }
    
    const cacheKey = `${version}/front-matter/${section}`;

    // Check cache first
    const cached = get().cache.get(cacheKey);
    if (cached) {
      set({
        currentSection: cached,
        currentPath: ['front-matter', section],
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
      currentSection: null,
      currentPath: ['front-matter', section],
      loading: true,
      error: null,
    });

    try {
      // Construct file path: /data/{version}/content/front-matter/{section}.json
      const filePath = `/data/${version}/content/front-matter/${section}.json`;
      
      console.log('Fetching front matter from:', filePath);
      
      const response = await fetch(filePath, { signal });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Front matter section not found: ${section}`);
        }
        throw new Error(`Failed to load front matter: ${response.statusText}`);
      }
      
      const sectionData: FrontMatterSection = await response.json();

      // Update cache
      const newCache = new Map(get().cache);
      newCache.set(cacheKey, sectionData);

      set({
        cache: newCache,
        currentSection: sectionData,
        currentPath: ['front-matter', section],
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
