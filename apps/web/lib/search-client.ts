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
 * Supports multiple versions with per-version index caching
 */
export class BCBCSearchClient {
  // Version-specific caches
  private indexCache: Map<string, FlexSearch.Document<SearchDocument>> = new Map();
  private documentsCache: Map<string, Map<string, SearchDocument>> = new Map();
  private metadataCache: Map<string, SearchMetadata> = new Map();
  
  // Current version state
  private currentVersion: string | null = null;
  private initialized = false;

  /**
   * Initialize the search client for a specific version
   * Loads documents and metadata, builds FlexSearch index
   * 
   * @param version - Version ID (e.g., "2024", "2027")
   * @param documentsUrl - URL to documents.json (default: /data/{version}/search/documents.json)
   * @param metadataUrl - URL to metadata.json (default: /data/{version}/search/metadata.json)
   */
  async initialize(
    version: string = '2024',
    documentsUrl?: string,
    metadataUrl?: string
  ): Promise<void> {
    // Check if already initialized for this version
    if (this.currentVersion === version && this.initialized) {
      return;
    }

    // Check if version is already cached
    if (this.indexCache.has(version)) {
      this.currentVersion = version;
      this.initialized = true;
      console.log(`Using cached search index for version ${version}`);
      return;
    }

    // Set default URLs with version path
    const defaultDocumentsUrl = `/data/${version}/search/documents.json`;
    const defaultMetadataUrl = `/data/${version}/search/metadata.json`;
    
    const finalDocumentsUrl = documentsUrl || defaultDocumentsUrl;
    const finalMetadataUrl = metadataUrl || defaultMetadataUrl;

    console.time(`Search index initialization (${version})`);

    try {
      // Load documents and metadata in parallel
      const [documentsData, metadataData] = await Promise.all([
        fetch(finalDocumentsUrl).then((r) => {
          if (!r.ok) throw new Error(`Failed to load documents for version ${version}: ${r.statusText}`);
          return r.json();
        }),
        fetch(finalMetadataUrl).then((r) => {
          if (!r.ok) throw new Error(`Failed to load metadata for version ${version}: ${r.statusText}`);
          return r.json();
        }),
      ]);

      // Create FlexSearch index with field-specific configuration
      const index = new FlexSearch.Document<SearchDocument>({
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

      // Create documents map for this version
      const documents = new Map<string, SearchDocument>();
      
      // Add documents to index and map
      documentsData.forEach((doc: SearchDocument) => {
        documents.set(doc.id, doc);
        index.add(doc);
      });

      // Cache the index, documents, and metadata for this version
      this.indexCache.set(version, index);
      this.documentsCache.set(version, documents);
      this.metadataCache.set(version, metadataData);
      
      // Set as current version
      this.currentVersion = version;
      this.initialized = true;

      console.timeEnd(`Search index initialization (${version})`);
      console.log(`Loaded ${documents.size} documents for version ${version}`);
    } catch (error) {
      console.error(`Failed to initialize search client for version ${version}:`, error);
      throw error;
    }
  }

  /**
   * Perform a search
   * 
   * @param query - Search query string
   * @param options - Search options (filters, pagination)
   * @param version - Optional version ID (defaults to current version)
   * @returns Array of search results with scores and highlights
   */
  async search(query: string, options: SearchOptions = {}, version?: string): Promise<SearchResult[]> {
    const searchVersion = version || this.currentVersion;
    
    if (!searchVersion) {
      throw new Error('No version specified and no current version set');
    }
    
    // Ensure version is initialized
    if (!this.indexCache.has(searchVersion)) {
      await this.initialize(searchVersion);
    }

    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const index = this.indexCache.get(searchVersion)!;
    const documents = this.documentsCache.get(searchVersion)!;

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
      return this.searchByArticleNumber(query, searchVersion);
    }

    // Perform FlexSearch across all fields
    const rawResults = index.search(query, {
      limit: limit * 3, // Get more results for filtering
      enrich: true,
    });

    // Combine results from all fields with field-specific scoring
    const resultMap = new Map<string, { doc: SearchDocument; fieldScores: number[] }>();

    rawResults.forEach((fieldResult: any, fieldIndex: number) => {
      if (!fieldResult.result) return;

      fieldResult.result.forEach((item: any) => {
        const doc = documents.get(item.id);
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
  private searchByArticleNumber(articleNum: string, version: string): SearchResult[] {
    const results: SearchResult[] = [];
    const documents = this.documentsCache.get(version);
    
    if (!documents) {
      return results;
    }

    for (const doc of documents.values()) {
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
   * @param version - Optional version ID (defaults to current version)
   * @returns Array of suggestion strings
   */
  async getSuggestions(query: string, limit: number = 5, version?: string): Promise<string[]> {
    const searchVersion = version || this.currentVersion;
    
    if (!searchVersion || query.length < 2) {
      return [];
    }

    const results = await this.search(query, { limit: limit * 3 }, searchVersion);
    
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
   * 
   * @param id - Document ID
   * @param version - Optional version ID (defaults to current version)
   */
  getDocument(id: string, version?: string): SearchDocument | undefined {
    const searchVersion = version || this.currentVersion;
    if (!searchVersion) return undefined;
    
    const documents = this.documentsCache.get(searchVersion);
    return documents?.get(id);
  }

  /**
   * Get metadata for a specific version
   * 
   * @param version - Optional version ID (defaults to current version)
   */
  getMetadata(version?: string): SearchMetadata | null {
    const searchVersion = version || this.currentVersion;
    if (!searchVersion) return null;
    
    return this.metadataCache.get(searchVersion) || null;
  }

  /**
   * Get table of contents for a specific version
   * 
   * @param version - Optional version ID (defaults to current version)
   */
  getTableOfContents(version?: string): TableOfContentsItem[] {
    const metadata = this.getMetadata(version);
    return metadata?.tableOfContents || [];
  }

  /**
   * Get revision dates for a specific version
   * 
   * @param version - Optional version ID (defaults to current version)
   */
  getRevisionDates(version?: string): RevisionDate[] {
    const metadata = this.getMetadata(version);
    return metadata?.revisionDates || [];
  }

  /**
   * Get divisions for a specific version
   * 
   * @param version - Optional version ID (defaults to current version)
   */
  getDivisions(version?: string): SearchMetadata['divisions'] {
    const metadata = this.getMetadata(version);
    return metadata?.divisions || [];
  }

  /**
   * Get content types for a specific version
   * 
   * @param version - Optional version ID (defaults to current version)
   */
  getContentTypes(version?: string): SearchableContentType[] {
    const metadata = this.getMetadata(version);
    return metadata?.contentTypes || [];
  }

  /**
   * Check if client is initialized for a specific version
   * 
   * @param version - Optional version ID (defaults to current version)
   */
  isInitialized(version?: string): boolean {
    const searchVersion = version || this.currentVersion;
    if (!searchVersion) return false;
    
    return this.indexCache.has(searchVersion);
  }

  /**
   * Get total document count for a specific version
   * 
   * @param version - Optional version ID (defaults to current version)
   */
  getDocumentCount(version?: string): number {
    const searchVersion = version || this.currentVersion;
    if (!searchVersion) return 0;
    
    const documents = this.documentsCache.get(searchVersion);
    return documents?.size || 0;
  }
  
  /**
   * Get current version ID
   */
  getCurrentVersion(): string | null {
    return this.currentVersion;
  }
  
  /**
   * Clear cache for a specific version (useful for memory management)
   * 
   * @param version - Version ID to clear from cache
   */
  clearVersionCache(version: string): void {
    this.indexCache.delete(version);
    this.documentsCache.delete(version);
    this.metadataCache.delete(version);
    
    if (this.currentVersion === version) {
      this.currentVersion = null;
      this.initialized = false;
    }
    
    console.log(`Cleared cache for version ${version}`);
  }
  
  /**
   * Clear all version caches
   */
  clearAllCaches(): void {
    this.indexCache.clear();
    this.documentsCache.clear();
    this.metadataCache.clear();
    this.currentVersion = null;
    this.initialized = false;
    
    console.log('Cleared all version caches');
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
 * 
 * @param version - Version ID (e.g., "2024", "2027")
 * @param documentsUrl - Optional custom documents URL
 * @param metadataUrl - Optional custom metadata URL
 */
export async function initializeSearch(
  version: string = '2024',
  documentsUrl?: string,
  metadataUrl?: string
): Promise<BCBCSearchClient> {
  const client = getSearchClient();
  await client.initialize(version, documentsUrl, metadataUrl);
  return client;
}
