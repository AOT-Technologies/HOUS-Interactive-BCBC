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
  initialize: () => Promise<void>;
  
  // Search actions
  search: (query: string, options?: Partial<SearchOptions>) => Promise<void>;
  searchMore: () => Promise<void>;
  getSuggestions: (query: string) => Promise<void>;
  
  // State setters
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  clearSearch: () => void;
  clearSuggestions: () => void;
  
  // Metadata accessors
  getTableOfContents: () => TableOfContentsItem[];
  getRevisionDates: () => RevisionDate[];
  getDivisions: () => SearchMetadata['divisions'];
  getContentTypes: () => SearchableContentType[];
}

type SearchStore = SearchStoreState & SearchStoreActions;

const DEFAULT_LIMIT = 50;

const initialState: SearchStoreState = {
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
       * Initialize the search client
       */
      initialize: async () => {
        const { isInitialized, isInitializing } = get();
        if (isInitialized || isInitializing) return;

        set({ isInitializing: true, initError: null });

        try {
          const client = getSearchClient();
          await client.initialize();
          
          set({
            isInitialized: true,
            isInitializing: false,
            metadata: client.getMetadata(),
          });
        } catch (error) {
          set({
            isInitializing: false,
            initError: error as Error,
          });
        }
      },

      /**
       * Perform a search
       */
      search: async (query, options = {}) => {
        const { filters, limit } = get();
        
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

          const results = await client.search(query, searchOptions);

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
       * Load more results (pagination)
       */
      searchMore: async () => {
        const { query, filters, limit, offset, results, isSearching, hasMore } = get();
        
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

          const newResults = await client.search(query, searchOptions);

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
       * Get search suggestions
       */
      getSuggestions: async (query) => {
        if (query.length < 2) {
          set({ suggestions: [] });
          return;
        }

        try {
          const client = getSearchClient();
          const suggestions = await client.getSuggestions(query, 10);
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
       * Get table of contents from metadata
       */
      getTableOfContents: () => {
        const client = getSearchClient();
        return client.getTableOfContents();
      },

      /**
       * Get revision dates from metadata
       */
      getRevisionDates: () => {
        const client = getSearchClient();
        return client.getRevisionDates();
      },

      /**
       * Get divisions from metadata
       */
      getDivisions: () => {
        const client = getSearchClient();
        return client.getDivisions();
      },

      /**
       * Get content types from metadata
       */
      getContentTypes: () => {
        const client = getSearchClient();
        return client.getContentTypes();
      },
    }),
    { name: 'search-store' }
  )
);

// Re-export types for convenience
export type { SearchResult, SearchOptions, SearchMetadata, SearchableContentType, RevisionDate, TableOfContentsItem };
