/**
 * Content splitting logic
 */

import type { BCBCDocument, Section } from '@bc-building-code/bcbc-parser';

/**
 * Content chunk with path and data
 */
export interface ContentChunk {
  path: string;
  data: Section;
  size: number;
}

/**
 * Split BCBC content into optimized chunks by section
 * @param document - BCBC document
 * @returns Array of content chunks
 */
export function chunkContent(document: BCBCDocument): ContentChunk[] {
  // TODO: Implement content chunking in Sprint 1
  // This is a placeholder that will be implemented during task 10
  const chunks: ContentChunk[] = [];

  for (const division of document.divisions) {
    for (const part of division.parts) {
      for (const section of part.sections) {
        const path = generateChunkPath(division.id, part.number, section.number);
        const data = section;
        const size = JSON.stringify(data).length;

        chunks.push({ path, data, size });
      }
    }
  }

  return chunks;
}

/**
 * Generate chunk file path
 * @param divisionId - Division ID
 * @param partNumber - Part number
 * @param sectionNumber - Section number
 * @returns Chunk file path
 */
export function generateChunkPath(
  divisionId: string,
  partNumber: string,
  sectionNumber: string
): string {
  return `content/${divisionId}/part-${partNumber}/section-${sectionNumber}.json`;
}

/**
 * Validate chunk size is within optimal range
 * @param chunk - Content chunk
 * @returns True if chunk size is optimal (50-200KB)
 */
export function isOptimalChunkSize(chunk: ContentChunk): boolean {
  const minSize = 50 * 1024; // 50KB
  const maxSize = 200 * 1024; // 200KB
  return chunk.size >= minSize && chunk.size <= maxSize;
}

/**
 * Get chunk statistics
 * @param chunks - Array of content chunks
 * @returns Chunk statistics
 */
export function getChunkStats(chunks: ContentChunk[]): {
  totalChunks: number;
  totalSize: number;
  averageSize: number;
  minSize: number;
  maxSize: number;
} {
  const totalChunks = chunks.length;
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  const averageSize = totalSize / totalChunks;
  const minSize = Math.min(...chunks.map((c) => c.size));
  const maxSize = Math.max(...chunks.map((c) => c.size));

  return {
    totalChunks,
    totalSize,
    averageSize,
    minSize,
    maxSize,
  };
}
