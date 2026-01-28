import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Clause interface
 */
export interface Clause {
  id: string;
  number: string;
  text: string;
  glossaryTerms: string[];
  subclauses?: Clause[];
  tables?: Table[];
  figures?: Figure[];
  equations?: Equation[];
}

/**
 * Table interfaces
 */
export interface TableHeader {
  text: string;
  colspan?: number;
  rowspan?: number;
}

export interface TableCell {
  text: string;
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

export interface TableRow {
  cells: TableCell[];
}

export interface Table {
  id: string;
  number: string;
  title: string;
  headers: TableHeader[];
  rows: TableRow[];
  notes?: string[];
}

/**
 * Figure interface
 */
export interface Figure {
  id: string;
  number: string;
  title: string;
  imageUrl: string;
  caption?: string;
}

/**
 * Equation interface
 */
export interface Equation {
  id: string;
  number: string;
  latex: string;
  display: 'inline' | 'block';
}

/**
 * Note reference interface
 */
export interface NoteReference {
  id: string;
  number: string;
  title: string;
  content: string;
}

/**
 * Article interface
 */
export interface Article {
  id: string;
  number: string;
  title: string;
  type: 'article';
  clauses: Clause[];
  notes: NoteReference[];
  effectiveDate?: string;
  amendedDate?: string;
}

/**
 * Content store state interface
 */
interface ContentStore {
  currentContent: Article | null;
  loading: boolean;
  error: string | null;
  contentCache: Map<string, Article>;
  loadContent: (path: string) => Promise<void>;
  clearContent: () => void;
  clearError: () => void;
}

/**
 * Content store
 * Manages current content, loading state, and content caching
 */
export const useContentStore = create<ContentStore>()(
  devtools(
    (set, get) => ({
      currentContent: null,
      loading: false,
      error: null,
      contentCache: new Map(),

      loadContent: async (path) => {
        // Check cache first
        const { contentCache } = get();
        if (contentCache.has(path)) {
          set({ currentContent: contentCache.get(path)!, error: null });
          return;
        }

        set({ loading: true, error: null });
        try {
          // TODO: Load content from /public/data/content/{path}.json
          // This will be implemented in Sprint 1 after the build pipeline is set up
          const response = await fetch(`/data/content/${path}.json`);
          if (response.ok) {
            const content = await response.json();
            // Update cache
            const newCache = new Map(contentCache);
            newCache.set(path, content);
            set({
              currentContent: content,
              loading: false,
              contentCache: newCache,
            });
          } else {
            set({
              error: 'Failed to load content',
              loading: false,
            });
          }
        } catch (error) {
          console.error('Error loading content:', error);
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      clearContent: () => set({ currentContent: null, error: null }),

      clearError: () => set({ error: null }),
    }),
    { name: 'content-store' }
  )
);
