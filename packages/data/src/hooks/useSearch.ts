import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Options for the useSearch hook
 */
export interface UseSearchOptions {
  /** Callback when search is submitted */
  onSearch: (query: string) => void;
  /** Function to fetch search suggestions */
  getSuggestions?: (query: string) => Promise<string[]> | string[];
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Minimum query length to trigger suggestions (default: 2) */
  minQueryLength?: number;
  /** Maximum number of suggestions to show (default: 10) */
  maxSuggestions?: number;
}

/**
 * Return type for the useSearch hook
 */
export interface UseSearchReturn {
  /** Current search query */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Array of search suggestions */
  suggestions: string[];
  /** Whether suggestions are currently loading */
  isLoading: boolean;
  /** Error that occurred while fetching suggestions */
  error: Error | null;
  /** Submit the current search query */
  handleSubmit: () => void;
  /** Clear the search query and suggestions */
  handleClear: () => void;
  /** Select a suggestion and submit search */
  handleSelectSuggestion: (suggestion: string) => void;
}

/**
 * Custom hook for managing search state and behavior
 * 
 * Provides shared search logic including:
 * - Query state management
 * - Debounced suggestion fetching
 * - Loading and error states
 * - Submit and clear handlers
 * 
 * @example
 * ```tsx
 * const search = useSearch({
 *   onSearch: (query) => router.push(`/search?q=${query}`),
 *   getSuggestions: (query) => searchIndex.suggest(query),
 * });
 * 
 * return (
 *   <input
 *     value={search.query}
 *     onChange={(e) => search.setQuery(e.target.value)}
 *     onKeyDown={(e) => e.key === 'Enter' && search.handleSubmit()}
 *   />
 * );
 * ```
 */
export function useSearch(options: UseSearchOptions): UseSearchReturn {
  const {
    onSearch,
    getSuggestions,
    debounceMs = 300,
    minQueryLength = 2,
    maxSuggestions = 10,
  } = options;

  // State
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Debounced suggestion fetching
  useEffect(() => {
    // Don't fetch if no getSuggestions function provided
    if (!getSuggestions) {
      return;
    }

    // Don't fetch if query is too short
    if (query.length < minQueryLength) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    // Set loading state
    setIsLoading(true);
    setError(null);

    // Debounce the fetch
    const timeoutId = setTimeout(async () => {
      try {
        const result = await Promise.resolve(getSuggestions(query));
        const limited = result.slice(0, maxSuggestions);
        setSuggestions(limited);
        setError(null);
      } catch (err) {
        console.error('Error fetching search suggestions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch suggestions'));
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, getSuggestions, debounceMs, minQueryLength, maxSuggestions]);

  /**
   * Submit the current search query
   */
  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  }, [query, onSearch]);

  /**
   * Clear the search query and suggestions
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Select a suggestion and submit search
   */
  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      onSearch(suggestion);
    },
    [onSearch]
  );

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    error,
    handleSubmit,
    handleClear,
    handleSelectSuggestion,
  };
}
