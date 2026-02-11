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
      const response = await fetch(
        `/data/${version}/content/${division}/${part}/${section}.json`,
        { signal }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Content not found: ${division}/${part}/${section}`);
        }
        throw new Error(`Failed to load content: ${response.statusText}`);
      }

      const content: SectionContent = await response.json();

      // Validate content structure
      if (!content.id || !content.reference || !content.title) {
        throw new Error('Invalid content structure: missing required fields');
      }

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

    if (article && subsection) {
      // Article-level render
      const sub = content.subsections.find((s) => s.id === subsection);
      if (!sub) {
        throw new Error(`Subsection not found: ${subsection}`);
      }

      const art = sub.articles.find((a) => a.id === article);
      if (!art) {
        throw new Error(`Article not found: ${article}`);
      }

      return {
        content: art,
        renderLevel: 'article' as const,
        context: content,
      };
    }

    if (subsection) {
      // Subsection-level render
      const sub = content.subsections.find((s) => s.id === subsection);
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
