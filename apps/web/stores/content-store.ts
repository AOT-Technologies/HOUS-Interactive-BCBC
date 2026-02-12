import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useVersionStore } from './version-store';

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

/**
 * Content item within a table cell (text or figure)
 */
export interface TableCellContent {
  type: 'text' | 'figure';
  value?: string; // For text content
  id?: string; // For figure content
  source?: 'nbc' | 'bc';
  title?: string;
  graphic?: {
    src: string;
    alt_text: string;
  };
}

export interface TableCell {
  text?: string; // Legacy format
  content?: TableCellContent[]; // New format
  align?: 'left' | 'center' | 'right';
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

export interface TableRow {
  id?: string;
  type?: 'header_row' | 'body_row';
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
  loadContent: (path: string, version?: string) => Promise<void>;
  clearContent: () => void;
  clearError: () => void;
}

/**
 * Content store
 * Manages current content, loading state, and content caching
 * Now version-aware: loads content from version-specific paths and caches per version
 */
export const useContentStore = create<ContentStore>()(
  devtools(
    (set, get) => ({
      currentContent: null,
      loading: false,
      error: null,
      contentCache: new Map(),

      loadContent: async (path, version) => {
        // Get version data path from version store
        const versionStore = useVersionStore.getState();
        const dataPath = versionStore.getVersionDataPath(version);
        const versionId = version || versionStore.currentVersion || '2024';
        
        // Create version-specific cache key
        const cacheKey = `${versionId}:${path}`;
        
        // Check cache first
        const { contentCache } = get();
        if (contentCache.has(cacheKey)) {
          set({ currentContent: contentCache.get(cacheKey)!, error: null });
          return;
        }

        set({ loading: true, error: null });
        try {
          const response = await fetch(`${dataPath}/content/${path}.json`);
          if (response.ok) {
            const content = await response.json();
            // Update cache with version-specific key
            const newCache = new Map(contentCache);
            newCache.set(cacheKey, content);
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
