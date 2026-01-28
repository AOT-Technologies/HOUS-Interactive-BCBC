/**
 * BCBC JSON parsing logic
 */

import type { BCBCDocument } from './types';

/**
 * Parse BCBC JSON data
 * @param jsonData - Raw JSON data
 * @returns Parsed BCBC document
 */
export function parseBCBC(jsonData: unknown): BCBCDocument {
  // TODO: Implement parsing logic in Sprint 1
  // This is a placeholder that will be implemented during task 8
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Invalid BCBC JSON data');
  }

  return jsonData as BCBCDocument;
}

/**
 * Parse a specific division from BCBC JSON
 * @param jsonData - Raw JSON data
 * @param divisionId - Division ID to parse
 * @returns Parsed division or null if not found
 */
export function parseDivision(jsonData: unknown, divisionId: string) {
  const document = parseBCBC(jsonData);
  return document.divisions.find((d) => d.id === divisionId) || null;
}

/**
 * Extract all content IDs from a BCBC document
 * @param document - BCBC document
 * @returns Array of content IDs
 */
export function extractContentIds(document: BCBCDocument): string[] {
  const ids: string[] = [];

  for (const division of document.divisions) {
    ids.push(division.id);
    for (const part of division.parts) {
      ids.push(part.id);
      for (const section of part.sections) {
        ids.push(section.id);
        for (const subsection of section.subsections) {
          ids.push(subsection.id);
          for (const article of subsection.articles) {
            ids.push(article.id);
          }
        }
      }
    }
  }

  return ids;
}
