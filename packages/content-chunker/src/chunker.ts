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
 * Minimal raw source shape used for preserving sections during chunking.
 */
export interface RawDocumentForChunking {
  volumes?: RawVolume[];
}

interface RawVolume {
  divisions?: RawDivision[];
}

interface RawDivision {
  id: string;
  parts?: RawPart[];
}

interface RawPart {
  number: string | number;
  sections?: RawSection[];
}

interface RawSection {
  number: string | number;
  [key: string]: unknown;
}

/**
 * Content chunk where data is the raw section object from source JSON.
 */
export interface RawContentChunk {
  path: string;
  data: RawSection;
  size: number;
}

/**
 * Split BCBC content into optimized chunks by section
 * 
 * Each chunk contains a complete section with all subsections and articles.
 * Chunks are organized by path: content/{division}/{part}/{section}.json
 * Typical chunk size: 50-200KB per section
 * 
 * @param document - BCBC document
 * @returns Array of content chunks
 */
export function chunkContent(document: BCBCDocument): ContentChunk[] {
  const chunks: ContentChunk[] = [];

  // Get divisions from volumes
  const divisions = document.volumes.flatMap(v => v.divisions);

  for (const division of divisions) {
    for (const part of division.parts) {
      for (const section of part.sections) {
        // Generate path for this section chunk
        const path = generateChunkPath(division.id, part.number, section.number);
        
        // Section data includes all subsections and articles
        const data = section;
        
        // Calculate size in bytes (JSON string length)
        const size = JSON.stringify(data).length;

        chunks.push({ path, data, size });
      }
    }
  }

  return chunks;
}

/**
 * Split raw BCBC source JSON into section chunks without parsing/transformation.
 *
 * Each chunk copies the original section object exactly as found in source data.
 */
export function chunkRawContent(document: RawDocumentForChunking): RawContentChunk[] {
  const chunks: RawContentChunk[] = [];
  const volumes = document.volumes ?? [];

  for (const volume of volumes) {
    for (const division of volume.divisions ?? []) {
      for (const part of division.parts ?? []) {
        for (const section of part.sections ?? []) {
          const path = generateChunkPath(
            division.id,
            String(part.number),
            String(section.number)
          );
          const size = JSON.stringify(section).length;

          chunks.push({ path, data: section, size });
        }
      }
    }
  }

  return chunks;
}

/**
 * Generate chunk file path
 * 
 * Generates a path in the format: content/{division}/{part}/{section}.json
 * Example: content/division-a/part-1/section-1-1.json
 * 
 * @param divisionId - Division ID (e.g., "division-a")
 * @param partNumber - Part number (e.g., "1")
 * @param sectionNumber - Section number (e.g., "1.1")
 * @returns Chunk file path
 */
export function generateChunkPath(
  divisionId: string,
  partNumber: string,
  sectionNumber: string
): string {
  // Normalize division ID to lowercase and replace dots with hyphens
  const normalizedDivision = divisionId.toLowerCase().replace(/\./g, '-');
  
  // Normalize section number by replacing dots with hyphens
  const normalizedSection = sectionNumber.replace(/\./g, '-');
  
  return `content/${normalizedDivision}/part-${partNumber}/section-${normalizedSection}.json`;
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
