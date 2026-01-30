/**
 * Search Index Export Utilities
 * 
 * Handles exporting search documents and metadata to JSON files.
 * Supports both unified metadata.json and individual files.
 */

import type { SearchDocument, SearchMetadata } from './config';
import { DEFAULT_OUTPUT_CONFIG } from './config';

/**
 * Export options
 */
export interface ExportOptions {
  /** Pretty print JSON output */
  prettyPrint?: boolean;
  /** Generate unified metadata.json */
  generateMetadataJson?: boolean;
  /** Generate individual metadata files */
  generateIndividualFiles?: boolean;
}

/**
 * Export result containing all generated file contents
 */
export interface ExportResult {
  /** documents.json content */
  documents: string;
  /** metadata.json content (if generateMetadataJson is true) */
  metadata?: string;
  /** Individual file contents (if generateIndividualFiles is true) */
  individualFiles?: {
    'navigation-tree.json'?: string;
    'amendment-dates.json'?: string;
    'content-types.json'?: string;
    'glossary-map.json'?: string;
  };
}

/**
 * Export search documents to JSON string
 * 
 * @param documents - Array of search documents
 * @param prettyPrint - Whether to format JSON with indentation
 * @returns JSON string
 */
export function exportDocuments(
  documents: SearchDocument[],
  prettyPrint: boolean = false
): string {
  return JSON.stringify(documents, null, prettyPrint ? 2 : undefined);
}

/**
 * Export metadata to JSON string
 * 
 * @param metadata - Search metadata
 * @param prettyPrint - Whether to format JSON with indentation
 * @returns JSON string
 */
export function exportMetadata(
  metadata: SearchMetadata,
  prettyPrint: boolean = false
): string {
  return JSON.stringify(metadata, null, prettyPrint ? 2 : undefined);
}

/**
 * Export navigation tree to JSON string
 * 
 * @param metadata - Search metadata containing tableOfContents
 * @param prettyPrint - Whether to format JSON with indentation
 * @returns JSON string
 */
export function exportNavigationTree(
  metadata: SearchMetadata,
  prettyPrint: boolean = false
): string {
  const navigationTree = {
    version: metadata.version,
    generatedAt: metadata.generatedAt,
    divisions: metadata.tableOfContents,
  };
  return JSON.stringify(navigationTree, null, prettyPrint ? 2 : undefined);
}

/**
 * Export amendment dates to JSON string
 * 
 * @param metadata - Search metadata containing revisionDates
 * @param prettyPrint - Whether to format JSON with indentation
 * @returns JSON string
 */
export function exportAmendmentDates(
  metadata: SearchMetadata,
  prettyPrint: boolean = false
): string {
  const amendmentDates = {
    version: metadata.version,
    generatedAt: metadata.generatedAt,
    dates: metadata.revisionDates,
  };
  return JSON.stringify(amendmentDates, null, prettyPrint ? 2 : undefined);
}

/**
 * Export content types to JSON string
 * 
 * @param metadata - Search metadata containing contentTypes
 * @param prettyPrint - Whether to format JSON with indentation
 * @returns JSON string
 */
export function exportContentTypes(
  metadata: SearchMetadata,
  prettyPrint: boolean = false
): string {
  const contentTypes = {
    version: metadata.version,
    generatedAt: metadata.generatedAt,
    types: metadata.contentTypes,
  };
  return JSON.stringify(contentTypes, null, prettyPrint ? 2 : undefined);
}

/**
 * Export glossary map from documents
 * 
 * @param documents - Array of search documents
 * @param prettyPrint - Whether to format JSON with indentation
 * @returns JSON string
 */
export function exportGlossaryMap(
  documents: SearchDocument[],
  prettyPrint: boolean = false
): string {
  const glossaryDocs = documents.filter(d => d.type === 'glossary');
  const glossaryMap: Record<string, { id: string; term: string; definition: string }> = {};
  
  for (const doc of glossaryDocs) {
    // Use lowercase term as key for case-insensitive lookups
    const key = doc.title.toLowerCase();
    glossaryMap[key] = {
      id: doc.id,
      term: doc.title,
      definition: doc.text,
    };
  }
  
  return JSON.stringify(glossaryMap, null, prettyPrint ? 2 : undefined);
}

/**
 * Export all files based on configuration
 * 
 * @param documents - Array of search documents
 * @param metadata - Search metadata
 * @param options - Export options
 * @returns Export result with all file contents
 */
export function exportAll(
  documents: SearchDocument[],
  metadata: SearchMetadata,
  options: ExportOptions = {}
): ExportResult {
  const opts = {
    ...DEFAULT_OUTPUT_CONFIG,
    ...options,
  };
  
  const result: ExportResult = {
    documents: exportDocuments(documents, opts.prettyPrint),
  };
  
  if (opts.generateMetadataJson) {
    result.metadata = exportMetadata(metadata, opts.prettyPrint);
  }
  
  if (opts.generateIndividualFiles) {
    result.individualFiles = {
      'navigation-tree.json': exportNavigationTree(metadata, opts.prettyPrint),
      'amendment-dates.json': exportAmendmentDates(metadata, opts.prettyPrint),
      'content-types.json': exportContentTypes(metadata, opts.prettyPrint),
      'glossary-map.json': exportGlossaryMap(documents, opts.prettyPrint),
    };
  }
  
  return result;
}

/**
 * Get export statistics
 * 
 * @param documents - Array of search documents
 * @param exportResult - Export result
 * @returns Statistics about the export
 */
export function getExportStats(
  documents: SearchDocument[],
  exportResult: ExportResult
): {
  documentCount: number;
  documentsSize: number;
  documentsSizeKB: number;
  metadataSize?: number;
  metadataSizeKB?: number;
  totalSize: number;
  totalSizeKB: number;
} {
  const documentsSize = new Blob([exportResult.documents]).size;
  const metadataSize = exportResult.metadata 
    ? new Blob([exportResult.metadata]).size 
    : 0;
  
  let individualFilesSize = 0;
  if (exportResult.individualFiles) {
    for (const content of Object.values(exportResult.individualFiles)) {
      if (content) {
        individualFilesSize += new Blob([content]).size;
      }
    }
  }
  
  const totalSize = documentsSize + metadataSize + individualFilesSize;
  
  return {
    documentCount: documents.length,
    documentsSize,
    documentsSizeKB: Math.round(documentsSize / 1024),
    metadataSize: metadataSize || undefined,
    metadataSizeKB: metadataSize ? Math.round(metadataSize / 1024) : undefined,
    totalSize,
    totalSizeKB: Math.round(totalSize / 1024),
  };
}
