/**
 * useUrlNavigation Hook
 * 
 * Handles URL-based navigation and browser back/forward navigation.
 * Syncs navigation state with URL for bookmarking and sharing.
 * 
 * Features:
 * - Loads content from URL on page load
 * - Handles browser back/forward navigation
 * - Syncs current path to URL
 * - Restores state from URL parameters
 */

import { useEffect } from 'react';
import { useNavigationStore } from '../stores/navigation-store';
import {
  parseContentPath,
  getCurrentPathname,
  isContentPage,
} from '../lib/url-utils';

/**
 * Hook for URL-based navigation
 * 
 * Usage:
 * ```tsx
 * function MyPage() {
 *   useUrlNavigation();
 *   // Component will automatically sync with URL
 * }
 * ```
 */
export function useUrlNavigation() {
  const { syncFromUrl, setCurrentPath } = useNavigationStore();

  useEffect(() => {
    // Sync from URL on initial load
    syncFromUrl();

    // Handle browser back/forward navigation
    const handlePopState = () => {
      syncFromUrl();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [syncFromUrl]);

  useEffect(() => {
    // Update current path when pathname changes
    const pathname = getCurrentPathname();
    if (isContentPage()) {
      const params = parseContentPath(pathname);
      if (params) {
        // Update path without triggering URL update (already in URL)
        setCurrentPath(pathname, false);
      }
    }
  }, [setCurrentPath]);
}

/**
 * Hook for content page URL restoration
 * Returns content path parameters from URL
 * 
 * Usage:
 * ```tsx
 * function ContentPage() {
 *   const params = useContentParams();
 *   
 *   if (!params) {
 *     return <NotFound />;
 *   }
 *   
 *   return <Content params={params} />;
 * }
 * ```
 */
export function useContentParams() {
  const pathname = getCurrentPathname();
  return parseContentPath(pathname);
}

/**
 * Hook for query parameter restoration
 * Returns a specific query parameter value
 * 
 * Usage:
 * ```tsx
 * function SearchPage() {
 *   const query = useQueryParam('q');
 *   const date = useQueryParam('date');
 *   
 *   return <SearchResults query={query} date={date} />;
 * }
 * ```
 */
export function useQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Hook for all query parameters
 * Returns all query parameters as an object
 * 
 * Usage:
 * ```tsx
 * function SearchPage() {
 *   const params = useQueryParams();
 *   
 *   return (
 *     <SearchResults
 *       query={params.q}
 *       date={params.date}
 *       division={params.division}
 *     />
 *   );
 * }
 * ```
 */
export function useQueryParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}
