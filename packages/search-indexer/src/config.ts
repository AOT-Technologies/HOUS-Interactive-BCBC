/**
 * FlexSearch Indexer Configuration
 * 
 * Configurable options for search index generation.
 * All settings can be overridden when calling the indexer.
 */

/**
 * Reference types found in BCBC content
 */
export type ReferenceType = 'term' | 'internal' | 'external' | 'standard';

/**
 * Content types that can be indexed
 */
export type IndexableContentType = 
  | 'article' 
  | 'table' 
  | 'figure' 
  | 'part' 
  | 'section' 
  | 'subsection'
  | 'glossary'
  | 'note'
  | 'application-note';

/**
 * Reference parsing configuration
 */
export interface ReferenceParsingConfig {
  /** Whether to strip reference tags from searchable text */
  stripFromSearchText: boolean;
  /** Whether to preserve reference IDs in a separate field for linking */
  preserveReferenceIds: boolean;
  /** Reference types to process (others will be left as-is) */
  processTypes: ReferenceType[];
}

/**
 * Content type indexing configuration
 */
export interface ContentTypeConfig {
  /** Whether to index this content type */
  enabled: boolean;
  /** Search priority (higher = more important in results) */
  priority: number;
  /** Boost factor for amended content */
  amendmentBoost: number;
}

/**
 * Field-specific search configuration
 */
export interface FieldConfig {
  /** Field name */
  field: string;
  /** Tokenization strategy */
  tokenize: 'strict' | 'forward' | 'reverse' | 'full';
  /** Resolution (1-9, higher = more accurate but larger index) */
  resolution: number;
  /** Score multiplier for this field */
  scoreWeight: number;
}

/**
 * Text extraction configuration
 */
export interface TextExtractionConfig {
  /** Include sentence text */
  includeSentences: boolean;
  /** Include clause text */
  includeClauses: boolean;
  /** Include subclause text (recursive) */
  includeSubclauses: boolean;
  /** Maximum text length per document (characters) */
  maxTextLength: number;
  /** Snippet length for search results */
  snippetLength: number;
}

/**
 * Output configuration
 */
export interface OutputConfig {
  /** Generate unified metadata.json */
  generateMetadataJson: boolean;
  /** Generate individual metadata files (navigation-tree.json, etc.) */
  generateIndividualFiles: boolean;
  /** Pretty print JSON output */
  prettyPrint: boolean;
  /** Include statistics in output */
  includeStatistics: boolean;
}

/**
 * Complete indexer configuration
 */
export interface IndexerConfig {
  /** Reference parsing settings */
  references: ReferenceParsingConfig;
  /** Content type settings */
  contentTypes: Record<IndexableContentType, ContentTypeConfig>;
  /** Field indexing settings */
  fields: FieldConfig[];
  /** Text extraction settings */
  textExtraction: TextExtractionConfig;
  /** Output settings */
  output: OutputConfig;
}

/**
 * Default reference parsing configuration
 */
export const DEFAULT_REFERENCE_CONFIG: ReferenceParsingConfig = {
  stripFromSearchText: true,
  preserveReferenceIds: true,
  processTypes: ['term', 'internal', 'external', 'standard'],
};

/**
 * Default content type configuration
 */
export const DEFAULT_CONTENT_TYPE_CONFIG: Record<IndexableContentType, ContentTypeConfig> = {
  article: { enabled: true, priority: 5, amendmentBoost: 1.5 },
  table: { enabled: true, priority: 7, amendmentBoost: 1.3 },
  figure: { enabled: true, priority: 7, amendmentBoost: 1.3 },
  part: { enabled: true, priority: 10, amendmentBoost: 1.0 },
  section: { enabled: true, priority: 9, amendmentBoost: 1.0 },
  subsection: { enabled: true, priority: 8, amendmentBoost: 1.0 },
  glossary: { enabled: true, priority: 6, amendmentBoost: 1.0 },
  note: { enabled: true, priority: 4, amendmentBoost: 1.2 },
  'application-note': { enabled: true, priority: 4, amendmentBoost: 1.2 },
};

/**
 * Default field configuration for FlexSearch
 */
export const DEFAULT_FIELD_CONFIG: FieldConfig[] = [
  { field: 'articleNumber', tokenize: 'strict', resolution: 9, scoreWeight: 10 },
  { field: 'title', tokenize: 'forward', resolution: 9, scoreWeight: 5 },
  { field: 'text', tokenize: 'forward', resolution: 5, scoreWeight: 1 },
  { field: 'path', tokenize: 'forward', resolution: 3, scoreWeight: 2 },
];

/**
 * Default text extraction configuration
 */
export const DEFAULT_TEXT_EXTRACTION_CONFIG: TextExtractionConfig = {
  includeSentences: true,
  includeClauses: true,
  includeSubclauses: true,
  maxTextLength: 10000,
  snippetLength: 200,
};

/**
 * Default output configuration
 */
export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  generateMetadataJson: true,
  generateIndividualFiles: true,
  prettyPrint: false,
  includeStatistics: true,
};

/**
 * Complete default configuration
 */
export const DEFAULT_INDEXER_CONFIG: IndexerConfig = {
  references: DEFAULT_REFERENCE_CONFIG,
  contentTypes: DEFAULT_CONTENT_TYPE_CONFIG,
  fields: DEFAULT_FIELD_CONFIG,
  textExtraction: DEFAULT_TEXT_EXTRACTION_CONFIG,
  output: DEFAULT_OUTPUT_CONFIG,
};

/**
 * Search document interface - the indexed document structure
 */
export interface SearchDocument {
  /** Unique document ID */
  id: string;
  /** Content type */
  type: IndexableContentType;
  /** Article/section number (e.g., "A.1.2.3.4") */
  articleNumber: string;
  /** Document title */
  title: string;
  /** Searchable text content */
  text: string;
  /** Text snippet for display */
  snippet: string;
  
  // Hierarchy information
  divisionId: string;
  divisionLetter: string;
  divisionTitle: string;
  partId: string;
  partNumber: number;
  partTitle: string;
  sectionId: string;
  sectionNumber: number;
  sectionTitle: string;
  subsectionId: string;
  subsectionNumber: number;
  subsectionTitle: string;
  
  /** Breadcrumb path for display */
  path: string;
  /** Breadcrumb array */
  breadcrumbs: string[];
  /** URL path for navigation */
  urlPath: string;
  
  // Flags for filtering
  hasAmendment: boolean;
  amendmentType?: 'add' | 'replace' | 'delete' | 'amendment';
  latestAmendmentDate?: string;
  hasInternalRefs: boolean;
  hasExternalRefs: boolean;
  hasTermRefs: boolean;
  hasTables: boolean;
  hasFigures: boolean;
  
  /** Search priority (computed from config) */
  searchPriority: number;
  
  /** Extracted reference IDs (if preserveReferenceIds is true) */
  referenceIds?: string[];
}

/**
 * Revision/amendment date entry
 */
export interface RevisionDate {
  effectiveDate: string;
  displayDate: string;
  count: number;
  type: 'original' | 'amendment' | 'mixed';
}

/**
 * Table of contents item
 */
export interface TableOfContentsItem {
  id: string;
  type: 'division' | 'part' | 'section' | 'subsection' | 'article';
  number: string | number;
  title: string;
  level: number;
  children?: TableOfContentsItem[];
  hasRevisions?: boolean;
}

/**
 * Search metadata structure
 */
export interface SearchMetadata {
  version: string;
  generatedAt: string;
  statistics: {
    totalDocuments: number;
    totalArticles: number;
    totalTables: number;
    totalFigures: number;
    totalParts: number;
    totalSections: number;
    totalSubsections: number;
    totalAmendments: number;
    totalRevisionDates: number;
    totalGlossaryTerms: number;
  };
  divisions: Array<{
    id: string;
    letter: string;
    title: string;
    parts: Array<{
      id: string;
      number: number;
      title: string;
    }>;
  }>;
  revisionDates: RevisionDate[];
  tableOfContents: TableOfContentsItem[];
  contentTypes: IndexableContentType[];
}

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
 * Search options for runtime queries
 */
export interface SearchOptions {
  divisionFilter?: string;
  partFilter?: number;
  sectionFilter?: number;
  amendmentsOnly?: boolean;
  tablesOnly?: boolean;
  figuresOnly?: boolean;
  contentTypes?: IndexableContentType[];
  effectiveDate?: string;
  limit?: number;
  offset?: number;
}
