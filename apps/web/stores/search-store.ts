/**
 * Search Store
 * 
 * Zustand store for managing search state across the application.
 * Integrates with the BCBCSearchClient for search operations.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  getSearchClient,
  type SearchResult,
  type SearchOptions,
  type SearchMetadata,
  type SearchableContentType,
  type RevisionDate,
  type TableOfContentsItem,
} from '../lib/search-client';
import { useVersionStore } from './version-store';

/**
 * Search filters interface
 */
export interface SearchFilters {
  divisionFilter?: string;
  partFilter?: number;
  sectionFilter?: number;
  amendmentsOnly?: boolean;
  tablesOnly?: boolean;
  figuresOnly?: boolean;
  contentTypes?: SearchableContentType[];
  effectiveDate?: string;
}

/**
 * Search store state interface
 */
interface SearchStoreState {
  // Version tracking
  currentVersion: string | null;
  
  // Initialization state
  isInitialized: boolean;
  isInitializing: boolean;
  initError: Error | null;
  
  // Search state
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  searchError: Error | null;
  
  // Filters
  filters: SearchFilters;
  
  // Pagination
  limit: number;
  offset: number;
  hasMore: boolean;
  
  // Suggestions
  suggestions: string[];
  
  // Metadata (from search client)
  metadata: SearchMetadata | null;
}

/**
 * Search store actions interface
 */
interface SearchStoreActions {
  // Initialization
  initialize: (version?: string) => Promise<void>;
  
  // Search actions
  search: (query: string, options?: Partial<SearchOptions>, version?: string) => Promise<void>;
  searchMore: (version?: string) => Promise<void>;
  getSuggestions: (query: string, version?: string) => Promise<void>;
  
  // State setters
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  clearSearch: () => void;
  clearSuggestions: () => void;
  
  // Metadata accessors
  getTableOfContents: (version?: string) => TableOfContentsItem[];
  getRevisionDates: (version?: string) => RevisionDate[];
  getDivisions: (version?: string) => SearchMetadata['divisions'];
  getContentTypes: (version?: string) => SearchableContentType[];
}

type SearchStore = SearchStoreState & SearchStoreActions;

const DEFAULT_LIMIT = 50;

const initialState: SearchStoreState = {
  currentVersion: null,
  isInitialized: false,
  isInitializing: false,
  initError: null,
  query: '',
  results: [],
  isSearching: false,
  searchError: null,
  filters: {},
  limit: DEFAULT_LIMIT,
  offset: 0,
  hasMore: false,
  suggestions: [],
  metadata: null,
};

/**
 * Search store
 * Manages search query, results, filters, and metadata
 */
export const useSearchStore = create<SearchStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Initialize the search client for a specific version
       * 
       * @param version - Optional version ID (defaults to current version from version store)
       */
      initialize: async (version?: string) => {
        // Get version from version store if not provided
        const versionId = version || useVersionStore.getState().currentVersion || '2024';
        
        const { currentVersion, isInitialized, isInitializing } = get();
        
        // If already initialized for this version, skip
        if (isInitialized && currentVersion === versionId && !isInitializing) {
          return;
        }

        set({ 
          isInitializing: true, 
          initError: null,
          currentVersion: versionId,
        });

        try {
          const client = getSearchClient();
          await client.initialize(versionId);
          
          set({
            isInitialized: true,
            isInitializing: false,
            metadata: client.getMetadata(versionId),
          });
        } catch (error) {
          set({
            isInitializing: false,
            initError: error as Error,
          });
        }
      },

      /**
       * Perform a search for a specific version
       * 
       * @param query - Search query
       * @param options - Search options
       * @param version - Optional version ID (defaults to current version)
       */
      search: async (query, options = {}, version?: string) => {
        const { filters, limit, currentVersion } = get();
        const searchVersion = version || currentVersion || useVersionStore.getState().currentVersion || '2024';
        
        // Ensure initialized for this version
        if (get().currentVersion !== searchVersion) {
          await get().initialize(searchVersion);
        }
        
        set({ 
          isSearching: true, 
          searchError: null, 
          query,
          offset: 0,
        });

        try {
          const client = getSearchClient();
          const searchOptions: SearchOptions = {
            ...filters,
            ...options,
            limit,
            offset: 0,
          };

          const results = await client.search(query, searchOptions, searchVersion);

          set({
            isSearching: false,
            results,
            hasMore: results.length >= limit,
          });
        } catch (error) {
          set({
            isSearching: false,
            searchError: error as Error,
            results: [],
          });
        }
      },

      /**
       * Load more results (pagination) for current version
       * 
       * @param version - Optional version ID (defaults to current version)
       */
      searchMore: async (version?: string) => {
        const { query, filters, limit, offset, results, isSearching, hasMore, currentVersion } = get();
        const searchVersion = version || currentVersion || useVersionStore.getState().currentVersion || '2024';
        
        if (isSearching || !hasMore || !query) return;

        set({ isSearching: true });

        try {
          const client = getSearchClient();
          const newOffset = offset + limit;
          
          const searchOptions: SearchOptions = {
            ...filters,
            limit,
            offset: newOffset,
          };

          const newResults = await client.search(query, searchOptions, searchVersion);

          set({
            isSearching: false,
            results: [...results, ...newResults],
            offset: newOffset,
            hasMore: newResults.length >= limit,
          });
        } catch (error) {
          set({
            isSearching: false,
            searchError: error as Error,
          });
        }
      },

      /**
       * Get search suggestions for current version
       * 
       * @param query - Search query
       * @param version - Optional version ID (defaults to current version)
       */
      getSuggestions: async (query, version?: string) => {
        const { currentVersion } = get();
        const searchVersion = version || currentVersion || useVersionStore.getState().currentVersion || '2024';
        
        if (query.length < 2) {
          set({ suggestions: [] });
          return;
        }

        try {
          const client = getSearchClient();
          const suggestions = await client.getSuggestions(query, 10, searchVersion);
          set({ suggestions });
        } catch (error) {
          console.error('Failed to get suggestions:', error);
          set({ suggestions: [] });
        }
      },

      /**
       * Set query without searching
       */
      setQuery: (query) => set({ query }),

      /**
       * Update filters
       */
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      /**
       * Reset all filters
       */
      resetFilters: () => set({ filters: {} }),

      /**
       * Clear search state
       */
      clearSearch: () => set({
        query: '',
        results: [],
        searchError: null,
        offset: 0,
        hasMore: false,
        suggestions: [],
      }),

      /**
       * Clear suggestions only
       */
      clearSuggestions: () => set({ suggestions: [] }),

      /**
       * Get table of contents from metadata for a specific version
       * 
       * @param version - Optional version ID (defaults to current version)
       */
      getTableOfContents: (version?: string) => {
        const { currentVersion } = get();
        const searchVersion = version || currentVersion || useVersionStore.getState().currentVersion || '2024';
        const client = getSearchClient();
        return client.getTableOfContents(searchVersion);
      },

      /**
       * Get revision dates from metadata for a specific version
       * 
       * @param version - Optional version ID (defaults to current version)
       */
      getRevisionDates: (version?: string) => {
        const { currentVersion } = get();
        const searchVersion = version || currentVersion || useVersionStore.getState().currentVersion || '2024';
        const client = getSearchClient();
        return client.getRevisionDates(searchVersion);
      },

      /**
       * Get divisions from metadata for a specific version
       * 
       * @param version - Optional version ID (defaults to current version)
       */
      getDivisions: (version?: string) => {
        const { currentVersion } = get();
        const searchVersion = version || currentVersion || useVersionStore.getState().currentVersion || '2024';
        const client = getSearchClient();
        return client.getDivisions(searchVersion);
      },

      /**
       * Get content types from metadata for a specific version
       * 
       * @param version - Optional version ID (defaults to current version)
       */
      getContentTypes: (version?: string) => {
        const { currentVersion } = get();
        const searchVersion = version || currentVersion || useVersionStore.getState().currentVersion || '2024';
        const client = getSearchClient();
        return client.getContentTypes(searchVersion);
      },
    }),
    { name: 'search-store' }
  )
);

// Re-export types for convenience
export type { SearchResult, SearchOptions, SearchMetadata, SearchableContentType, RevisionDate, TableOfContentsItem };
