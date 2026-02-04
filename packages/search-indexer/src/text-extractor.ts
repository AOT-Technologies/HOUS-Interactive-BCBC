/**
 * Text extraction utilities for BCBC content
 * 
 * Handles extraction of searchable text from articles, tables, and other content,
 * including reference parsing and text normalization.
 */

import type { 
  ReferenceParsingConfig, 
  TextExtractionConfig,
  ReferenceType 
} from './config';

/**
 * Reference match result
 */
export interface ExtractedReference {
  type: ReferenceType;
  id: string;
  displayText: string;
  fullMatch: string;
}

/**
 * Reference pattern: [REF:type:id]displayText or [REF:type:id:format]
 * Examples:
 * - [REF:term:bldng]building
 * - [REF:internal:nbc.divB.part3.sect2.subsect10:long]
 * - [REF:standard:CSA-A23.3]
 */
const REFERENCE_PATTERN = /\[REF:(\w+):([^\]]+)\](\w*)/g;

/**
 * Extract all references from text
 * 
 * @param text - Text containing references
 * @returns Array of extracted references
 */
export function extractReferences(text: string): ExtractedReference[] {
  const references: ExtractedReference[] = [];
  let match;
  
  // Reset regex state
  REFERENCE_PATTERN.lastIndex = 0;
  
  while ((match = REFERENCE_PATTERN.exec(text)) !== null) {
    const [fullMatch, type, idPart, displayText] = match;
    
    // Handle format suffix in ID (e.g., "nbc.divB.part3:long" -> id="nbc.divB.part3")
    const idParts = idPart.split(':');
    const id = idParts[0];
    
    references.push({
      type: type as ReferenceType,
      id,
      displayText: displayText || '',
      fullMatch,
    });
  }
  
  return references;
}

/**
 * Strip reference tags from text, keeping display text
 * 
 * @param text - Text with reference tags
 * @param config - Reference parsing configuration
 * @returns Clean text with references stripped
 */
export function stripReferences(
  text: string, 
  config: ReferenceParsingConfig
): string {
  if (!config.stripFromSearchText) {
    return text;
  }
  
  return text.replace(REFERENCE_PATTERN, (match, type, _id, displayText) => {
    // Only process configured reference types
    if (!config.processTypes.includes(type as ReferenceType)) {
      return match;
    }
    
    // Return just the display text (or empty string if none)
    return displayText || '';
  });
}

/**
 * Extract reference IDs from text
 * 
 * @param text - Text with reference tags
 * @param config - Reference parsing configuration
 * @returns Array of reference IDs
 */
export function extractReferenceIds(
  text: string,
  config: ReferenceParsingConfig
): string[] {
  if (!config.preserveReferenceIds) {
    return [];
  }
  
  const refs = extractReferences(text);
  return refs
    .filter(ref => config.processTypes.includes(ref.type))
    .map(ref => `${ref.type}:${ref.id}`);
}

/**
 * Clause structure from BCBC JSON
 */
interface Clause {
  id?: string;
  type?: string;
  letter?: string;
  number?: number;
  text?: string;
  clauses?: Clause[];
  subclauses?: Clause[];
}

/**
 * Sentence structure from BCBC JSON
 * @deprecated Currently unused but kept for future reference
 */
// interface Sentence {
//   id?: string;
//   type?: string;
//   number?: number;
//   text?: string;
//   clauses?: Clause[];
// }

/**
 * Content item (sentence, table, figure, etc.)
 */
interface ContentItem {
  id?: string;
  type?: string;
  number?: number | string;
  text?: string;
  title?: string;
  clauses?: Clause[];
  structure?: {
    headers?: Array<{ text?: string } | string>;
    rows?: Array<{ cells?: Array<{ text?: string } | string> }>;
  };
  caption?: string;
}

/**
 * Extract text from clauses recursively
 * 
 * @param clauses - Array of clauses
 * @param config - Text extraction configuration
 * @param depth - Current recursion depth
 * @returns Extracted text
 */
export function extractClauseText(
  clauses: Clause[] | undefined,
  config: TextExtractionConfig,
  depth: number = 0
): string {
  if (!clauses || !config.includeClauses) {
    return '';
  }
  
  const texts: string[] = [];
  
  for (const clause of clauses) {
    if (clause.text) {
      texts.push(clause.text);
    }
    
    // Process subclauses if enabled
    if (config.includeSubclauses && clause.subclauses) {
      texts.push(extractClauseText(clause.subclauses, config, depth + 1));
    }
    
    // Some structures use nested 'clauses' instead of 'subclauses'
    if (config.includeSubclauses && clause.clauses) {
      texts.push(extractClauseText(clause.clauses, config, depth + 1));
    }
  }
  
  return texts.filter(t => t).join(' ');
}

/**
 * Extract text from article content
 * 
 * @param content - Article content array (sentences, tables, figures)
 * @param config - Text extraction configuration
 * @param refConfig - Reference parsing configuration
 * @returns Extracted and cleaned text
 */
export function extractArticleText(
  content: ContentItem[] | undefined,
  config: TextExtractionConfig,
  refConfig: ReferenceParsingConfig
): { text: string; referenceIds: string[] } {
  if (!content) {
    return { text: '', referenceIds: [] };
  }
  
  const texts: string[] = [];
  const allReferenceIds: string[] = [];
  
  for (const item of content) {
    if (item.type === 'sentence' && config.includeSentences) {
      // Extract sentence text
      if (item.text) {
        texts.push(item.text);
        allReferenceIds.push(...extractReferenceIds(item.text, refConfig));
      }
      
      // Extract clause text
      if (item.clauses) {
        const clauseText = extractClauseText(item.clauses, config);
        texts.push(clauseText);
        allReferenceIds.push(...extractReferenceIds(clauseText, refConfig));
      }
    }
  }
  
  // Join and clean text
  let fullText = texts.filter(t => t).join(' ');
  
  // Strip references from searchable text
  fullText = stripReferences(fullText, refConfig);
  
  // Normalize whitespace
  fullText = normalizeWhitespace(fullText);
  
  // Truncate if needed
  if (fullText.length > config.maxTextLength) {
    fullText = fullText.substring(0, config.maxTextLength);
  }
  
  return {
    text: fullText,
    referenceIds: [...new Set(allReferenceIds)], // Deduplicate
  };
}

/**
 * Extract text from table structure
 * 
 * @param table - Table content item
 * @param config - Text extraction configuration
 * @param refConfig - Reference parsing configuration
 * @returns Extracted text from table headers and cells
 */
export function extractTableText(
  table: ContentItem,
  config: TextExtractionConfig,
  refConfig: ReferenceParsingConfig
): { text: string; referenceIds: string[] } {
  const texts: string[] = [];
  const allReferenceIds: string[] = [];
  
  // Add title/caption
  if (table.title) {
    texts.push(table.title);
    allReferenceIds.push(...extractReferenceIds(table.title, refConfig));
  }
  if (table.caption) {
    texts.push(table.caption);
    allReferenceIds.push(...extractReferenceIds(table.caption, refConfig));
  }
  
  // Extract from structure
  if (table.structure) {
    // Headers
    if (table.structure.headers) {
      for (const header of table.structure.headers) {
        const headerText = typeof header === 'string' ? header : header.text;
        if (headerText) {
          texts.push(headerText);
          allReferenceIds.push(...extractReferenceIds(headerText, refConfig));
        }
      }
    }
    
    // Rows (limit to first few rows to avoid bloat)
    if (table.structure.rows) {
      const maxRows = 5;
      for (let i = 0; i < Math.min(table.structure.rows.length, maxRows); i++) {
        const row = table.structure.rows[i];
        if (row.cells) {
          for (const cell of row.cells) {
            const cellText = typeof cell === 'string' ? cell : cell.text;
            if (cellText) {
              texts.push(cellText);
              allReferenceIds.push(...extractReferenceIds(cellText, refConfig));
            }
          }
        }
      }
    }
  }
  
  // Join and clean
  let fullText = texts.filter(t => t).join(' ');
  fullText = stripReferences(fullText, refConfig);
  fullText = normalizeWhitespace(fullText);
  
  if (fullText.length > config.maxTextLength) {
    fullText = fullText.substring(0, config.maxTextLength);
  }
  
  return {
    text: fullText,
    referenceIds: [...new Set(allReferenceIds)],
  };
}

/**
 * Generate a snippet from text
 * 
 * @param text - Full text
 * @param length - Maximum snippet length
 * @returns Truncated snippet with ellipsis if needed
 */
export function generateSnippet(text: string, length: number): string {
  if (!text) return '';
  
  const cleaned = normalizeWhitespace(text);
  
  if (cleaned.length <= length) {
    return cleaned;
  }
  
  // Try to break at word boundary
  const truncated = cleaned.substring(0, length);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > length * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Normalize whitespace in text
 * 
 * @param text - Text to normalize
 * @returns Text with normalized whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Collapse multiple whitespace
    .replace(/\n/g, ' ')   // Replace newlines with spaces
    .trim();
}

/**
 * Check if content has tables
 */
export function hasTablesInContent(content: ContentItem[] | undefined): boolean {
  if (!content) return false;
  return content.some(item => item.type === 'table');
}

/**
 * Check if content has figures
 */
export function hasFiguresInContent(content: ContentItem[] | undefined): boolean {
  if (!content) return false;
  return content.some(item => item.type === 'figure');
}

/**
 * Check if text contains internal references
 */
export function hasInternalRefs(text: string): boolean {
  return text.includes('[REF:internal:');
}

/**
 * Check if text contains external references
 */
export function hasExternalRefs(text: string): boolean {
  return text.includes('[REF:external:') || text.includes('[REF:standard:');
}

/**
 * Check if text contains term references
 */
export function hasTermRefs(text: string): boolean {
  return text.includes('[REF:term:');
}
