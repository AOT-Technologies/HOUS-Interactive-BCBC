/**
 * @bc-building-code/content-chunker
 * 
 * Content splitting and metadata extraction for BCBC
 */

// Export chunker functions
export {
  chunkContent,
  chunkRawContent,
  generateChunkPath,
  isOptimalChunkSize,
  getChunkStats,
} from './chunker';
export type { ContentChunk, RawContentChunk, RawDocumentForChunking } from './chunker';

// Export metadata extractor functions
export {
  extractMetadata,
  extractNavigationTree,
  extractGlossaryMap,
  extractContentTypes,
  extractQuickAccess,
  extractFunctionalStatements,
  extractObjectives,
  extractFunctionalStatementsFromRaw,
  extractObjectivesFromRaw,
} from './metadata-extractor';
export type {
  NavigationNode,
  QuickAccessSection,
  ExtractedMetadata,
  FunctionalStatement,
  Objective,
  SubObjective,
} from './metadata-extractor';
