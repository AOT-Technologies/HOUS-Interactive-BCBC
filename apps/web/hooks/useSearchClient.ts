/**
 * React hook for using the BCBC Search Client
 * 
 * Provides a convenient interface for components to:
 * - Initialize the search index for the current version
 * - Perform searches with filters
 * - Get suggestions
 * - Access metadata (TOC, divisions, revision dates)
 * - Track loading and error states
 * - Automatically reinitialize when version changes
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getSearchClient,
  type SearchResult,
  type SearchOptions,
  type SearchMetadata,
  type TableOfContentsItem,
  type RevisionDate,
  type SearchableContentType,
} from '../lib/search-client';
import { useCurrentVersionId } from '../stores/version-store';

/**
 * Hook state
 */
interface UseSearchClientState {
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
  results: SearchResult[];
  suggestions: string[];
  metadata: SearchMetadata | null;
}

/**
 * Hook return type
 */
interface UseSearchClientReturn extends UseSearchClientState {
  // Search actions
  search: (query: string, options?: SearchOptions) => Promise<void>;
  getSuggestions: (query: string, limit?: number) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
  
  // Metadata accessors
  tableOfContents: TableOfContentsItem[];
  revisionDates: RevisionDate[];
  divisions: SearchMetadata['divisions'];
  contentTypes: SearchableContentType[];
  documentCount: number;
}

/**
 * React hook for using the search client
 * 
 * @param autoInitialize - Whether to automatically initialize on mount (default: true)
 * @param version - Optional version ID (defaults to current version from version store)
 * @returns Search client interface
 * 
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const { 
 *     search, 
 *     results, 
 *     isLoading, 
 *     error,
 *     tableOfContents,
 *     revisionDates,
 *   } = useSearchClient();
 * 
 *   const handleSearch = async (query: string) => {
 *     await search(query, { 
 *       divisionFilter: 'B',
 *       amendmentsOnly: true,
 *       limit: 20 
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       {isLoading && <p>Loading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *       {results.map(result => (
 *         <div key={result.document.id}>
 *           <h3>{result.document.title}</h3>
 *           <p>{result.document.snippet}</p>
 *           <span>Score: {result.score}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSearchClient(autoInitialize: boolean = true, version?: string): UseSearchClientReturn {
  // Get current version from version store if not provided
  const currentVersionId = useCurrentVersionId();
  const activeVersion = version || currentVersionId;
  
  const [state, setState] = useState<UseSearchClientState>({
    isLoading: autoInitialize,
    isInitialized: false,
    error: null,
    results: [],
    suggestions: [],
    metadata: null,
  });

  const client = useMemo(() => getSearchClient(), []);

  /**
   * Initialize the search client for the current version
   * Reinitializes when version changes
   */
  useEffect(() => {
    if (!autoInitialize || !activeVersion) {
      return;
    }

    const initialize = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Initialize for the active version
        await client.initialize(activeVersion);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isInitialized: true,
          metadata: client.getMetadata(activeVersion),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }));
      }
    };

    initialize();
  }, [autoInitialize, activeVersion, client]);

  /**
   * Perform a search with the current version
   */
  const search = useCallback(
    async (query: string, options?: SearchOptions) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const results = await client.search(query, options, activeVersion);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          results,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error as Error,
          results: [],
        }));
      }
    },
    [client, activeVersion]
  );

  /**
   * Get search suggestions for the current version
   */
  const getSuggestions = useCallback(
    async (query: string, limit: number = 5) => {
      try {
        const suggestions = await client.getSuggestions(query, limit, activeVersion);

        setState((prev) => ({
          ...prev,
          suggestions,
        }));
      } catch (error) {
        console.error('Failed to get suggestions:', error);
        setState((prev) => ({
          ...prev,
          suggestions: [],
        }));
      }
    },
    [client, activeVersion]
  );

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      results: [],
      suggestions: [],
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  // Memoized metadata accessors (version-aware)
  const tableOfContents = useMemo(
    () => client.getTableOfContents(activeVersion),
    [client, activeVersion, state.isInitialized]
  );

  const revisionDates = useMemo(
    () => client.getRevisionDates(activeVersion),
    [client, activeVersion, state.isInitialized]
  );

  const divisions = useMemo(
    () => client.getDivisions(activeVersion),
    [client, activeVersion, state.isInitialized]
  );

  const contentTypes = useMemo(
    () => client.getContentTypes(activeVersion),
    [client, activeVersion, state.isInitialized]
  );

  const documentCount = useMemo(
    () => client.getDocumentCount(activeVersion),
    [client, activeVersion, state.isInitialized]
  );

  return {
    ...state,
    search,
    getSuggestions,
    clearResults,
    clearError,
    tableOfContents,
    revisionDates,
    divisions,
    contentTypes,
    documentCount,
  };
}

/**
 * Hook for accessing just the metadata (no search functionality)
 * Useful for components that only need TOC, divisions, etc.
 * 
 * @param version - Optional version ID (defaults to current version from version store)
 */
export function useSearchMetadata(version?: string): {
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
  metadata: SearchMetadata | null;
  tableOfContents: TableOfContentsItem[];
  revisionDates: RevisionDate[];
  divisions: SearchMetadata['divisions'];
  contentTypes: SearchableContentType[];
} {
  const {
    isLoading,
    isInitialized,
    error,
    metadata,
    tableOfContents,
    revisionDates,
    divisions,
    contentTypes,
  } = useSearchClient(true, version);

  return {
    isLoading,
    isInitialized,
    error,
    metadata,
    tableOfContents,
    revisionDates,
    divisions,
    contentTypes,
  };
}
