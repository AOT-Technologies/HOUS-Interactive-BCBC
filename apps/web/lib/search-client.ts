/**
 * BCBC Search Client
 * 
 * Runtime FlexSearch client that loads pre-generated documents and metadata,
 * builds the search index in the browser, and provides search functionality.
 * 
 * Architecture:
 * - Build time: Generate documents.json + metadata.json (flat data)
 * - Runtime: Load JSON, build FlexSearch index, perform searches
 * 
 * This approach is simpler and more maintainable than exporting FlexSearch state.
 */

import FlexSearch from 'flexsearch';

// Re-export types from indexer
export type {
  SearchDocument,
  SearchMetadata,
  RevisionDate,
  TableOfContentsItem,
  SearchOptions,
  IndexableContentType as SearchableContentType,
} from '@bc-building-code/search-indexer';

import type {
  SearchDocument,
  SearchMetadata,
  RevisionDate,
  TableOfContentsItem,
  SearchOptions,
  IndexableContentType as SearchableContentType,
} from '@bc-building-code/search-indexer';

/**
 * Search result with score and highlights
 */
export interface SearchResult {
  document: SearchDocument;
  score: number;
  highlights: Array<{
    field: string;
    text: string;
  }>;
}

/**
 * BCBC Search Client
 * Manages FlexSearch index and provides search functionality
 */
export class BCBCSearchClient {
  private index: FlexSearch.Document<SearchDocument> | null = null;
  private documents: Map<string, SearchDocument> = new Map();
  private metadata: SearchMetadata | null = null;
  private initialized = false;

  /**
   * Initialize the search client
   * Loads documents and metadata, builds FlexSearch index
   * 
   * @param documentsUrl - URL to documents.json (default: /data/search/documents.json)
   * @param metadataUrl - URL to metadata.json (default: /data/search/metadata.json)
   */
  async initialize(
    documentsUrl: string = '/data/search/documents.json',
    metadataUrl: string = '/data/search/metadata.json'
  ): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.time('Search index initialization');

    try {
      // Load documents and metadata in parallel
      const [documentsData, metadataData] = await Promise.all([
        fetch(documentsUrl).then((r) => {
          if (!r.ok) throw new Error(`Failed to load documents: ${r.statusText}`);
          return r.json();
        }),
        fetch(metadataUrl).then((r) => {
          if (!r.ok) throw new Error(`Failed to load metadata: ${r.statusText}`);
          return r.json();
        }),
      ]);

      // Create FlexSearch index with field-specific configuration
      this.index = new FlexSearch.Document<SearchDocument>({
        tokenize: 'forward',
        optimize: true,
        resolution: 9,
        cache: 100,
        context: {
          depth: 2,
          bidirectional: true,
          resolution: 9,
        },
        document: {
          id: 'id',
          index: [
            {
              field: 'articleNumber',
              tokenize: 'strict',
              resolution: 9,
            },
            {
              field: 'title',
              tokenize: 'forward',
              resolution: 9,
            },
            {
              field: 'text',
              tokenize: 'forward',
              resolution: 5,
            },
            {
              field: 'path',
              tokenize: 'forward',
              resolution: 3,
            },
          ],
          store: true as any,
        },
      });

      // Add documents to index and map
      documentsData.forEach((doc: SearchDocument) => {
        this.documents.set(doc.id, doc);
        this.index!.add(doc);
      });

      this.metadata = metadataData;
      this.initialized = true;

      console.timeEnd('Search index initialization');
      console.log(`Loaded ${this.documents.size} documents`);
    } catch (error) {
      console.error('Failed to initialize search client:', error);
      throw error;
    }
  }

  /**
   * Perform a search
   * 
   * @param query - Search query string
   * @param options - Search options (filters, pagination)
   * @returns Array of search results with scores and highlights
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.initialized) {
      throw new Error('Search client not initialized. Call initialize() first.');
    }

    if (!query || query.trim().length < 2) {
      return [];
    }

    const {
      divisionFilter,
      partFilter,
      sectionFilter,
      amendmentsOnly = false,
      tablesOnly = false,
      figuresOnly = false,
      contentTypes,
      effectiveDate,
      limit = 50,
      offset = 0,
    } = options;

    // Check if query is article number format (e.g., "A.1.2.3.4")
    const articleNumberMatch = query.match(/^([A-C])\.(\d+)\.(\d+)\.(\d+)\.(\d+)$/i);
    if (articleNumberMatch) {
      return this.searchByArticleNumber(query);
    }

    // Perform FlexSearch across all fields
    const rawResults = this.index!.search(query, {
      limit: limit * 3, // Get more results for filtering
      enrich: true,
    });

    // Combine results from all fields with field-specific scoring
    const resultMap = new Map<string, { doc: SearchDocument; fieldScores: number[] }>();

    rawResults.forEach((fieldResult: any, fieldIndex: number) => {
      if (!fieldResult.result) return;

      fieldResult.result.forEach((item: any) => {
        const doc = this.documents.get(item.id);
        if (!doc) return;

        if (!resultMap.has(item.id)) {
          resultMap.set(item.id, { doc, fieldScores: [] });
        }

        // Field-specific score weights
        let fieldScore = 1;
        switch (fieldIndex) {
          case 0:
            fieldScore = 10; // articleNumber
            break;
          case 1:
            fieldScore = 5; // title
            break;
          case 2:
            fieldScore = 1; // text
            break;
          case 3:
            fieldScore = 2; // path
            break;
          default:
            fieldScore = 0.5;
        }

        resultMap.get(item.id)!.fieldScores.push(fieldScore);
      });
    });

    // Apply filters and calculate final scores
    let filtered = Array.from(resultMap.values())
      .filter(({ doc }) => {
        // Division filter
        if (divisionFilter && doc.divisionLetter !== divisionFilter) return false;
        
        // Part filter
        if (partFilter !== undefined && doc.partNumber !== partFilter) return false;
        
        // Section filter
        if (sectionFilter !== undefined && doc.sectionNumber !== sectionFilter) return false;
        
        // Amendments filter
        if (amendmentsOnly && !doc.hasAmendment) return false;
        
        // Tables filter
        if (tablesOnly && !doc.hasTables) return false;
        
        // Figures filter
        if (figuresOnly && !doc.hasFigures) return false;
        
        // Content types filter
        if (contentTypes && contentTypes.length > 0 && !contentTypes.includes(doc.type)) {
          return false;
        }
        
        // Effective date filter
        if (effectiveDate && doc.latestAmendmentDate && doc.latestAmendmentDate !== effectiveDate) {
          return false;
        }
        
        return true;
      })
      .map(({ doc, fieldScores }) => ({
        document: doc,
        score: this.calculateFinalScore(doc, fieldScores, query),
        highlights: this.generateHighlights(doc, query),
      }));

    // Sort by score (descending)
    filtered.sort((a, b) => b.score - a.score);

    // Apply pagination
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Search by exact article number
   */
  private searchByArticleNumber(articleNum: string): SearchResult[] {
    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (doc.articleNumber === articleNum) {
        results.push({
          document: doc,
          score: 1000, // Very high score for exact match
          highlights: [],
        });
        break;
      }
    }

    return results;
  }

  /**
   * Calculate final score for a document
   */
  private calculateFinalScore(
    doc: SearchDocument,
    fieldScores: number[],
    query: string
  ): number {
    // Sum field scores
    let score = fieldScores.reduce((sum, s) => sum + s, 0);

    // Apply search priority from document
    score *= doc.searchPriority / 5;

    // Boost amendments
    if (doc.hasAmendment) {
      score *= 1.5;
    }

    // Boost exact phrase match in title
    if (doc.title.toLowerCase().includes(query.toLowerCase())) {
      score *= 2;
    }

    return score;
  }

  /**
   * Generate highlights for search results
   */
  private generateHighlights(doc: SearchDocument, query: string): Array<{ field: string; text: string }> {
    const highlights: Array<{ field: string; text: string }> = [];
    const queryLower = query.toLowerCase();

    // Title highlight
    if (doc.title.toLowerCase().includes(queryLower)) {
      highlights.push({
        field: 'title',
        text: this.highlightText(doc.title, query),
      });
    }

    // Text snippet highlight
    const textLower = doc.text.toLowerCase();
    const index = textLower.indexOf(queryLower);
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(doc.text.length, index + query.length + 50);
      const snippet = doc.text.substring(start, end);

      highlights.push({
        field: 'text',
        text:
          (start > 0 ? '...' : '') +
          this.highlightText(snippet, query) +
          (end < doc.text.length ? '...' : ''),
      });
    }

    return highlights;
  }

  /**
   * Highlight query text in a string
   */
  private highlightText(text: string, query: string): string {
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-0.5">$1</mark>');
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get search suggestions based on partial query
   * 
   * @param query - Partial query string
   * @param limit - Maximum number of suggestions (default: 5)
   * @returns Array of suggestion strings
   */
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!this.initialized || query.length < 2) {
      return [];
    }

    const results = await this.search(query, { limit: limit * 3 });
    
    // Extract unique titles, prioritizing shorter/more relevant ones
    const suggestions = new Set<string>();
    
    // Sort by relevance and title length (shorter titles first)
    const sorted = results.sort((a, b) => {
      // First by score
      if (b.score !== a.score) return b.score - a.score;
      // Then by title length (shorter is better for suggestions)
      return a.document.title.length - b.document.title.length;
    });
    
    for (const result of sorted) {
      const title = result.document.title.trim();
      // Skip empty titles
      if (!title) continue;
      
      suggestions.add(title);
      if (suggestions.size >= limit) break;
    }

    const suggestionArray = Array.from(suggestions);
    return suggestionArray;
  }

  /**
   * Get a specific document by ID
   */
  getDocument(id: string): SearchDocument | undefined {
    return this.documents.get(id);
  }

  /**
   * Get metadata
   */
  getMetadata(): SearchMetadata | null {
    return this.metadata;
  }

  /**
   * Get table of contents
   */
  getTableOfContents(): TableOfContentsItem[] {
    return this.metadata?.tableOfContents || [];
  }

  /**
   * Get revision dates
   */
  getRevisionDates(): RevisionDate[] {
    return this.metadata?.revisionDates || [];
  }

  /**
   * Get divisions
   */
  getDivisions(): SearchMetadata['divisions'] {
    return this.metadata?.divisions || [];
  }

  /**
   * Get content types
   */
  getContentTypes(): SearchableContentType[] {
    return this.metadata?.contentTypes || [];
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get total document count
   */
  getDocumentCount(): number {
    return this.documents.size;
  }
}

// Singleton instance
let searchClientInstance: BCBCSearchClient | null = null;

/**
 * Get the singleton search client instance
 */
export function getSearchClient(): BCBCSearchClient {
  if (!searchClientInstance) {
    searchClientInstance = new BCBCSearchClient();
  }
  return searchClientInstance;
}

/**
 * Initialize the search client (convenience function)
 */
export async function initializeSearch(
  documentsUrl?: string,
  metadataUrl?: string
): Promise<BCBCSearchClient> {
  const client = getSearchClient();
  await client.initialize(documentsUrl, metadataUrl);
  return client;
}
