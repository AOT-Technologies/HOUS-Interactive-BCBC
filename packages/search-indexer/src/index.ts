/**
 * @bc-building-code/search-indexer
 * 
 * FlexSearch index generation for BCBC content.
 * 
 * Usage:
 * ```typescript
 * import { buildSearchIndex, exportAll } from '@bc-building-code/search-indexer';
 * 
 * // Load BCBC JSON
 * const bcbcData = JSON.parse(fs.readFileSync('bcbc-2024.json', 'utf-8'));
 * 
 * // Build index with default config
 * const { documents, metadata } = buildSearchIndex(bcbcData);
 * 
 * // Or with custom config
 * const { documents, metadata } = buildSearchIndex(bcbcData, {
 *   contentTypes: {
 *     ...DEFAULT_CONTENT_TYPE_CONFIG,
 *     glossary: { enabled: false, priority: 0, amendmentBoost: 1 },
 *   },
 *   references: {
 *     stripFromSearchText: true,
 *     preserveReferenceIds: false,
 *     processTypes: ['term', 'internal'],
 *   },
 * });
 * 
 * // Export to JSON
 * const result = exportAll(documents, metadata, { prettyPrint: true });
 * fs.writeFileSync('documents.json', result.documents);
 * fs.writeFileSync('metadata.json', result.metadata);
 * ```
 */

// Main indexer
export { buildSearchIndex } from './indexer';
export type { IndexBuilderResult } from './indexer';

// Configuration
export {
  DEFAULT_INDEXER_CONFIG,
  DEFAULT_REFERENCE_CONFIG,
  DEFAULT_CONTENT_TYPE_CONFIG,
  DEFAULT_FIELD_CONFIG,
  DEFAULT_TEXT_EXTRACTION_CONFIG,
  DEFAULT_OUTPUT_CONFIG,
} from './config';

export type {
  IndexerConfig,
  ReferenceParsingConfig,
  ContentTypeConfig,
  FieldConfig,
  TextExtractionConfig,
  OutputConfig,
  ReferenceType,
  IndexableContentType,
  SearchDocument,
  SearchMetadata,
  SearchResult,
  SearchOptions,
  RevisionDate,
  TableOfContentsItem,
} from './config';

// Export utilities
export {
  exportDocuments,
  exportMetadata,
  exportNavigationTree,
  exportAmendmentDates,
  exportContentTypes,
  exportGlossaryMap,
  exportAll,
  getExportStats,
} from './export';

export type { ExportOptions, ExportResult } from './export';

// Text extraction utilities
export {
  extractReferences,
  stripReferences,
  extractReferenceIds,
  extractArticleText,
  extractTableText,
  extractClauseText,
  generateSnippet,
  normalizeWhitespace,
  hasTablesInContent,
  hasFiguresInContent,
  hasInternalRefs,
  hasExternalRefs,
  hasTermRefs,
} from './text-extractor';

export type { ExtractedReference } from './text-extractor';
