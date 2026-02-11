/**
 * Content Store
 * 
 * Zustand store for managing reading view content state, caching, and loading.
 * Includes AbortController support for canceling in-flight requests.
 */

import { create } from 'zustand';
import type {
  ContentState,
  SectionContent,
  SubsectionContent,
  ArticleContent,
} from '@repo/data';
import { fetchAndAdaptSectionContent } from '../content-adapter';

/**
 * AbortController for canceling in-flight fetch requests
 * Stored outside the store to avoid serialization issues
 */
let abortController: AbortController | null = null;

/**
 * Content store for managing section content, caching, and subtree extraction
 */
export const useContentStore = create<ContentState>((set, get) => ({
  // State
  cache: new Map<string, SectionContent>(),
  currentContent: null,
  currentPath: [],
  renderLevel: 'section',
  loading: false,
  error: null,

  // Actions
  fetchContent: async (version: string, path: string[]) => {
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
      set({ currentContent: cached, loading: false, error: null });
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
      // Use adapter to fetch and transform content
      const content = await fetchAndAdaptSectionContent(
        version,
        division,
        part,
        section,
        signal
      );

      // Update cache
      const newCache = new Map(get().cache);
      newCache.set(cacheKey, content);

      set({
        cache: newCache,
        currentContent: content,
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

  extractSubtree: (
    content: SectionContent,
    path: string[]
  ): {
    content: SectionContent | SubsectionContent | ArticleContent;
    renderLevel: 'section' | 'subsection' | 'article';
    context: SectionContent | null;
  } => {
    const [, , , subsection, article] = path;

    // Extract just the number from subsection/article if they're in format "subsection-1" or "article-2"
    const subsectionNumber = subsection?.replace(/^subsection-/, '');
    const articleNumber = article?.replace(/^article-/, '');

    if (articleNumber && subsectionNumber) {
      // Article-level render
      // Match by number field extracted from reference
      const sub = content.subsections.find((s) => {
        const subNumber = s.reference.split('.').pop();
        return subNumber === subsectionNumber;
      });
      
      if (!sub) {
        throw new Error(`Subsection not found: ${subsection}`);
      }

      // Match article by number field extracted from reference
      const art = sub.articles.find((a) => {
        const artNumber = a.reference.split('.').pop();
        return artNumber === articleNumber;
      });
      
      if (!art) {
        throw new Error(`Article not found: ${article}`);
      }

      return {
        content: art,
        renderLevel: 'article' as const,
        context: content,
      };
    }

    if (subsectionNumber) {
      // Subsection-level render
      // Match by number field extracted from reference
      const sub = content.subsections.find((s) => {
        const subNumber = s.reference.split('.').pop();
        return subNumber === subsectionNumber;
      });
      
      if (!sub) {
        throw new Error(`Subsection not found: ${subsection}`);
      }

      return {
        content: sub,
        renderLevel: 'subsection' as const,
        context: content,
      };
    }

    // Section-level render (full)
    return {
      content,
      renderLevel: 'section' as const,
      context: null,
    };
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
      currentContent: null,
      currentPath: [],
      renderLevel: 'section',
      loading: false,
      error: null,
    });
  },
}));
