import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Search result interface
 */
export interface SearchResult {
  id: string;
  type: 'article' | 'section' | 'note' | 'glossary';
  number: string;
  title: string;
  snippet: string;
  breadcrumb: string[];
  path: string;
  score: number;
}

/**
 * Search filters interface
 */
export interface SearchFilters {
  amendmentDate?: string;
  division?: string;
  part?: string;
  contentType?: ('article' | 'table' | 'figure' | 'note' | 'application-note')[];
}

/**
 * Search store state interface
 */
interface SearchStore {
  query: string;
  results: SearchResult[];
  loading: boolean;
  filters: SearchFilters;
  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: SearchFilters) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
}

/**
 * Search store
 * Manages search query, results, loading state, and filters
 */
export const useSearchStore = create<SearchStore>()(
  devtools(
    (set) => ({
      query: '',
      results: [],
      loading: false,
      filters: {},

      setQuery: (query) => set({ query }),

      setResults: (results) => set({ results }),

      setLoading: (loading) => set({ loading }),

      setFilters: (filters) => set({ filters }),

      search: async (query) => {
        set({ loading: true, query });
        try {
          // TODO: Implement actual search logic with FlexSearch
          // This is a placeholder that will be implemented in Sprint 3
          await new Promise((resolve) => setTimeout(resolve, 100));
          set({ results: [], loading: false });
        } catch (error) {
          console.error('Search error:', error);
          set({ loading: false });
        }
      },

      clearSearch: () => set({ query: '', results: [], filters: {} }),
    }),
    { name: 'search-store' }
  )
);
