/**
 * @bc-building-code/content-chunker
 * 
 * Content splitting and metadata extraction for BCBC
 */

// Export chunker functions
export {
  chunkContent,
  generateChunkPath,
  isOptimalChunkSize,
  getChunkStats,
} from './chunker';
export type { ContentChunk } from './chunker';

// Export metadata extractor functions
export {
  extractMetadata,
  extractNavigationTree,
  extractGlossaryMap,
  extractContentTypes,
  extractQuickAccess,
} from './metadata-extractor';
export type {
  NavigationNode,
  QuickAccessSection,
  ExtractedMetadata,
} from './metadata-extractor';
