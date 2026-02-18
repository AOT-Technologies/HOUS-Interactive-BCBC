/**
 * URL Utilities for BC Building Code Interactive Web App
 * 
 * Handles URL parsing, building, and synchronization for:
 * - Content reading pages (flexible hierarchy: Part/Section/Subsection/Article)
 * - Search results pages with filters
 * - State restoration from URLs (bookmarks, shared links)
 * 
 * URL Patterns:
 * - Homepage: /
 * - Search: /search?q={query}&date={date}&division={div}&part={part}&type={type}
 * - Content: /code/{division}/{part}/{section?}/{subsection?}/{article?}?date={date}
 * - Download: /download
 */

/**
 * Content path parameters extracted from URL
 */
export interface ContentPathParams {
  division: string;
  part: string;
  section?: string;
  subsection?: string;
  article?: string;
  version?: string; // Optional version parameter (defaults to current version)
}

/**
 * Search query parameters extracted from URL
 */
export interface SearchQueryParams {
  q: string;
  date?: string;
  division?: string;
  part?: string;
  type?: string;
  version?: string; // Optional version parameter (defaults to current version)
}

/**
 * Content hierarchy level determined from URL depth
 */
export type ContentLevel = 'part' | 'section' | 'subsection' | 'article';

/**
 * Parse content path from URL pathname
 * 
 * Examples:
 * - /code/division-a/part-1 → { division: 'division-a', part: 'part-1' }
 * - /code/division-b/part-3/section-3-2 → { division: 'division-b', part: 'part-3', section: 'section-3-2' }
 * - /code/division-b/part-3/section-3-2/subsection-3-2-1/article-3-2-1-1 → full hierarchy
 * 
 * @param pathname - URL pathname (e.g., '/code/division-a/part-1')
 * @returns Content path parameters or null if invalid
 */
export function parseContentPath(pathname: string): ContentPathParams | null {
  // Remove leading/trailing slashes and split
  const segments = pathname.replace(/^\/|\/$/g, '').split('/');
  
  // Must start with 'code' and have at least division and part
  if (segments[0] !== 'code' || segments.length < 3) {
    return null;
  }
  
  const [, division, part, section, subsection, article] = segments;
  
  return {
    division,
    part,
    section,
    subsection,
    article,
  };
}

/**
 * Build content path URL from parameters
 * 
 * @param params - Content path parameters
 * @param queryParams - Optional query parameters (e.g., date filter)
 * @returns URL pathname with optional query string
 */
export function buildContentPath(
  params: ContentPathParams,
  queryParams?: Record<string, string>
): string {
  const segments = [
    'code',
    params.division,
    params.part,
    params.section,
    params.subsection,
    params.article,
  ].filter(Boolean);
  
  let path = `/${segments.join('/')}`;
  
  // Add query parameters if provided
  if (queryParams && Object.keys(queryParams).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      path += `?${queryString}`;
    }
  }
  
  return path;
}

/**
 * Determine content hierarchy level from path parameters
 * 
 * @param params - Content path parameters
 * @returns Content level (part, section, subsection, or article)
 */
export function getContentLevel(params: ContentPathParams): ContentLevel {
  if (params.article) return 'article';
  if (params.subsection) return 'subsection';
  if (params.section) return 'section';
  return 'part';
}

/**
 * Parse search query parameters from URL search string
 * 
 * @param search - URL search string (e.g., '?q=fire&division=division-b&version=2024')
 * @returns Search query parameters or null if no query
 */
export function parseSearchParams(search: string): SearchQueryParams | null {
  const params = new URLSearchParams(search);
  const query = params.get('q');
  
  if (!query) {
    return null;
  }
  
  return {
    q: query,
    date: params.get('date') || undefined,
    division: params.get('division') || undefined,
    part: params.get('part') || undefined,
    type: params.get('type') || undefined,
    version: params.get('version') || undefined,
  };
}

/**
 * Build search URL from query and filters
 * 
 * @param query - Search query string
 * @param filters - Optional filter parameters
 * @returns Search URL with query parameters
 */
export function buildSearchUrl(
  query: string,
  filters?: {
    date?: string;
    division?: string;
    part?: string;
    type?: string;
    version?: string;
  }
): string {
  const params = new URLSearchParams();
  params.set('q', query);
  
  if (filters) {
    if (filters.date) params.set('date', filters.date);
    if (filters.division) params.set('division', filters.division);
    if (filters.part) params.set('part', filters.part);
    if (filters.type) params.set('type', filters.type);
    if (filters.version) params.set('version', filters.version);
  }
  
  return `/search?${params.toString()}`;
}

/**
 * Update URL without triggering navigation (for state sync)
 * Uses history.replaceState to update URL without adding to history
 * 
 * @param url - New URL to set
 */
export function updateUrlWithoutNavigation(url: string): void {
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', url);
  }
}

/**
 * Navigate to URL (adds to history)
 * Uses history.pushState for client-side navigation
 * 
 * @param url - URL to navigate to
 */
export function navigateToUrl(url: string): void {
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', url);
    // Dispatch popstate event to trigger navigation handlers
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

/**
 * Get current URL pathname
 * 
 * @returns Current pathname or empty string if not in browser
 */
export function getCurrentPathname(): string {
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return '';
}

/**
 * Get current URL search string
 * 
 * @returns Current search string or empty string if not in browser
 */
export function getCurrentSearch(): string {
  if (typeof window !== 'undefined') {
    return window.location.search;
  }
  return '';
}

/**
 * Get full current URL
 * 
 * @returns Current full URL or empty string if not in browser
 */
export function getCurrentUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.href;
  }
  return '';
}

/**
 * Extract query parameter value from URL
 * 
 * @param name - Parameter name
 * @param search - Optional search string (defaults to current)
 * @returns Parameter value or null if not found
 */
export function getQueryParam(name: string, search?: string): string | null {
  const searchString = search || getCurrentSearch();
  const params = new URLSearchParams(searchString);
  return params.get(name);
}

/**
 * Set query parameter in URL
 * 
 * @param name - Parameter name
 * @param value - Parameter value
 * @param replace - If true, uses replaceState instead of pushState
 */
export function setQueryParam(
  name: string,
  value: string,
  replace: boolean = false
): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  
  if (replace) {
    window.history.replaceState({}, '', url.toString());
  } else {
    window.history.pushState({}, '', url.toString());
  }
}

/**
 * Remove query parameter from URL
 * 
 * @param name - Parameter name
 * @param replace - If true, uses replaceState instead of pushState
 */
export function removeQueryParam(name: string, replace: boolean = false): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  
  if (replace) {
    window.history.replaceState({}, '', url.toString());
  } else {
    window.history.pushState({}, '', url.toString());
  }
}

/**
 * Check if current page is a content reading page
 * 
 * @returns True if on content reading page
 */
export function isContentPage(): boolean {
  return getCurrentPathname().startsWith('/code/');
}

/**
 * Check if current page is search results page
 * 
 * @returns True if on search results page
 */
export function isSearchPage(): boolean {
  return getCurrentPathname().startsWith('/search');
}

/**
 * Check if current page is homepage
 * 
 * @returns True if on homepage
 */
export function isHomePage(): boolean {
  const pathname = getCurrentPathname();
  return pathname === '/' || pathname === '';
}

/**
 * Check if current page is download page
 * 
 * @returns True if on download page
 */
export function isDownloadPage(): boolean {
  return getCurrentPathname().startsWith('/download');
}

/**
 * Get version parameter from URL
 * Returns version from query parameter or null if not present
 * 
 * @param search - Optional search string (defaults to current)
 * @returns Version ID or null
 */
export function getVersionFromUrl(search?: string): string | null {
  return getQueryParam('version', search);
}

/**
 * Set version parameter in URL
 * 
 * @param version - Version ID to set
 * @param replace - If true, uses replaceState instead of pushState (default: true)
 */
export function setVersionInUrl(version: string, replace: boolean = true): void {
  setQueryParam('version', version, replace);
}

/**
 * Remove version parameter from URL
 * 
 * @param replace - If true, uses replaceState instead of pushState (default: true)
 */
export function removeVersionFromUrl(replace: boolean = true): void {
  removeQueryParam('version', replace);
}

/**
 * Check if URL has version parameter
 * 
 * @param search - Optional search string (defaults to current)
 * @returns True if version parameter exists
 */
export function hasVersionInUrl(search?: string): boolean {
  return getVersionFromUrl(search) !== null;
}

/**
 * Get version from URL or return default
 * 
 * @param defaultVersion - Default version to return if not in URL
 * @param search - Optional search string (defaults to current)
 * @returns Version ID from URL or default
 */
export function getVersionOrDefault(
  defaultVersion: string,
  search?: string
): string {
  return getVersionFromUrl(search) || defaultVersion;
}

/**
 * URL parameters for reading page content renderer
 * Used for parsing and building URLs with version, date, and modal state
 */
export interface URLParams {
  slug: string[];              // Path segments [division, part, section, subsection?, article?]
  version?: string;            // Query param - code version
  date?: string;               // Query param - effective date (ISO format)
  modal?: string;              // Query param - modal reference ID
}

/**
 * Parse URL parameters for reading page content renderer
 * Extracts path segments and query parameters from a full URL
 * 
 * Supports three URL patterns:
 * - Section: /code/{division}/{part}/{section}?version={version}&date={date}
 * - Subsection: /code/{division}/{part}/{section}/{subsection}?version={version}&date={date}
 * - Article: /code/{division}/{part}/{section}/{subsection}/{article}?version={version}&date={date}&modal={referenceId}
 * 
 * @param url - Full URL string to parse
 * @returns URLParams object with slug and query parameters
 * 
 * @example
 * parseURLParams('/code/division-a/part-1/section-1-1?version=2024&date=2025-06-16')
 * // Returns: { slug: ['division-a', 'part-1', 'section-1-1'], version: '2024', date: '2025-06-16' }
 */
export function parseURLParams(url: string): URLParams {
  // Parse URL to extract pathname and search params
  const urlObj = new URL(url, 'http://localhost'); // Base URL needed for relative URLs
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;
  
  // Parse content path from pathname
  const contentPath = parseContentPath(pathname);
  
  if (!contentPath) {
    throw new Error(`Invalid content URL: ${url}`);
  }
  
  // Build slug array from content path
  const slug: string[] = [
    contentPath.division,
    contentPath.part,
    contentPath.section,
    contentPath.subsection,
    contentPath.article,
  ].filter(Boolean) as string[];
  
  // Extract query parameters
  const version = searchParams.get('version') || undefined;
  const date = searchParams.get('date') || undefined;
  const modal = searchParams.get('modal') || undefined;
  
  return {
    slug,
    version,
    date,
    modal,
  };
}

/**
 * Build URL from URLParams
 * Constructs a full URL path with query parameters
 * 
 * @param params - URLParams object with slug and optional query parameters
 * @returns Full URL string
 * 
 * @example
 * buildURL({ slug: ['division-a', 'part-1', 'section-1-1'], version: '2024', date: '2025-06-16' })
 * // Returns: '/code/division-a/part-1/section-1-1?version=2024&date=2025-06-16'
 */
export function buildURL(params: URLParams): string {
  // Build pathname from slug
  const pathname = `/code/${params.slug.join('/')}`;
  
  // Build query parameters
  const queryParams: Record<string, string> = {};
  if (params.version) queryParams.version = params.version;
  if (params.date) queryParams.date = params.date;
  if (params.modal) queryParams.modal = params.modal;
  
  // Add query string if parameters exist
  if (Object.keys(queryParams).length > 0) {
    const searchParams = new URLSearchParams(queryParams);
    return `${pathname}?${searchParams.toString()}`;
  }
  
  return pathname;
}

/**
 * Update URL with modal reference ID
 * Adds or updates the modal query parameter without navigation
 * 
 * @param referenceId - Modal reference ID to add to URL
 */
export function updateURLWithModal(referenceId: string): void {
  setQueryParam('modal', referenceId, true);
}

/**
 * Remove modal reference ID from URL
 * Removes the modal query parameter without navigation
 */
export function removeModalFromURL(): void {
  removeQueryParam('modal', true);
}
