/**
 * FlexSearch index serialization and export
 * 
 * Requirements: 2.2
 */

import type { Document } from 'flexsearch';
import type { SearchResult } from './config';

/**
 * Export search index to JSON format
 * Serializes the FlexSearch index for storage and client-side loading
 * 
 * @param index - FlexSearch Document index
 * @param searchableItems - Array of items that were indexed
 * @returns Serialized index data as JSON string
 */
export async function exportIndex(
  index: Document<SearchResult>,
  searchableItems: SearchResult[]
): Promise<string> {
  // FlexSearch Document.export() requires a handler function
  // We'll collect the exported data in an array
  const exportedData: any[] = [];

  await index.export((key: string | number, data: any) => {
    exportedData.push({ key, data });
  });

  // Create a structured export with version and metadata
  const exportObject = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentCount: searchableItems.length,
    index: exportedData,
    // Store the searchable items for reference
    items: searchableItems,
  };

  return JSON.stringify(exportObject);
}

/**
 * Import search index from JSON format
 * Deserializes and loads a FlexSearch index from JSON
 * 
 * @param indexData - Serialized index data as JSON string
 * @param index - FlexSearch Document index to import into
 * @returns The imported FlexSearch index
 */
export async function importIndex(
  indexData: string,
  index: Document<SearchResult>
): Promise<Document<SearchResult>> {
  const data = JSON.parse(indexData);

  // Import the index data into the FlexSearch Document
  if (data.index && Array.isArray(data.index)) {
    for (const item of data.index) {
      await index.import(item.key, item.data);
    }
  }

  return index;
}

/**
 * Get index statistics
 * Provides information about the index size and document count
 * 
 * @param searchableItems - Array of items that were indexed
 * @param indexData - Serialized index data (optional)
 * @returns Index statistics
 */
export function getIndexStats(
  searchableItems: SearchResult[],
  indexData?: string
): {
  documentCount: number;
  indexSize: number;
  indexSizeKB: number;
} {
  const documentCount = searchableItems.length;

  // Calculate index size if data is provided
  let indexSize = 0;
  let indexSizeKB = 0;

  if (indexData) {
    indexSize = new Blob([indexData]).size;
    indexSizeKB = Math.round(indexSize / 1024);
  }

  return {
    documentCount,
    indexSize,
    indexSizeKB,
  };
}
