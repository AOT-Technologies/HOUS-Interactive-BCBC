/**
 * @bc-building-code/search-indexer
 * 
 * FlexSearch index generation for BCBC
 */

// Export configuration
export { searchIndexConfig } from './config';
export type { SearchResult, SearchFilters } from './config';

// Export indexer functions
export {
  createSearchIndex,
  extractSearchableContent,
  generateBreadcrumb,
  generatePath,
} from './indexer';

// Export export/import functions
export { exportIndex, importIndex, getIndexStats } from './export';
