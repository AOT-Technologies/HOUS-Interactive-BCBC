/**
 * FlexSearch configuration for BCBC search
 */

/**
 * FlexSearch index configuration
 * Optimized for BC Building Code content with:
 * - Forward tokenization for prefix matching
 * - High boost for article numbers and titles
 * - Stored fields for result display
 * - Cache enabled for performance
 * - High resolution (9) for accurate matching
 * 
 * Requirements: 3.1, 3.2
 */
export const searchIndexConfig = {
  preset: 'match' as const,
  tokenize: 'forward' as const,
  cache: true,
  resolution: 9,
  document: {
    id: 'id',
    index: [
      {
        field: 'title',
        tokenize: 'forward' as const,
        optimize: true,
        resolution: 9,
        boost: 2.0, // Higher boost for titles
      },
      {
        field: 'content',
        tokenize: 'forward' as const,
        optimize: true,
        resolution: 5, // Lower resolution for content to balance performance
      },
      {
        field: 'number',
        tokenize: 'strict' as const,
        resolution: 9,
        boost: 3.0, // Highest boost for article numbers
      },
    ],
    store: ['id', 'number', 'title', 'type', 'breadcrumb', 'path', 'snippet'],
  },
};

/**
 * Search result type
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
 * Search filters
 */
export interface SearchFilters {
  amendmentDate?: string;
  division?: string;
  part?: string;
  contentType?: ('article' | 'table' | 'figure' | 'note' | 'application-note')[];
}
