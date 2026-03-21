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
 * Reference pattern: [REF:type:id]displayText or [REF:type:id:label]
 * Examples:
 * - [REF:term:bldng]building
 * - [REF:term:bldng:building]
 * - [REF:internal:nbc.divB.part3.sect2.subsect10:long]
 * - [REF:standard:CSA-A23.3]
 */
const REFERENCE_PATTERN = /\[REF:(\w+):([^\]]+)\]/g;

/**
 * Convert a 1-based number to an alphabet ordinal (1→a, 2→b, …, 27→aa).
 */
function toAlphabetOrdinal(value: number): string {
  if (value <= 0 || Number.isNaN(value)) return String(value);
  let remaining = value;
  let result = '';
  while (remaining > 0) {
    const current = (remaining - 1) % 26;
    result = String.fromCharCode(97 + current) + result;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return result;
}

/**
 * Convert a positive integer to a lowercase roman numeral string.
 */
function toRoman(value: number): string {
  if (value <= 0 || Number.isNaN(value)) return String(value);
  const map: Array<{ value: number; symbol: string }> = [
    { value: 1000, symbol: 'm' }, { value: 900, symbol: 'cm' },
    { value: 500, symbol: 'd' }, { value: 400, symbol: 'cd' },
    { value: 100, symbol: 'c' }, { value: 90, symbol: 'xc' },
    { value: 50, symbol: 'l' }, { value: 40, symbol: 'xl' },
    { value: 10, symbol: 'x' }, { value: 9, symbol: 'ix' },
    { value: 5, symbol: 'v' }, { value: 4, symbol: 'iv' },
    { value: 1, symbol: 'i' },
  ];
  let remaining = value;
  let result = '';
  for (const entry of map) {
    while (remaining >= entry.value) {
      result += entry.symbol;
      remaining -= entry.value;
    }
  }
  return result;
}

/**
 * Extract a numeric segment from a reference ID using a regex pattern.
 */
function extractNumericSegment(referenceId: string, pattern: RegExp): string | undefined {
  const match = referenceId.match(pattern);
  return match?.[1];
}

/**
 * Safe string-to-number conversion. Returns undefined for falsy or non-numeric input.
 */
function asNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Convert a structured internal reference ID to human-readable display text.
 *
 * Ported from apps/web/lib/text-parsing.ts — pure function with no React dependencies.
 */
function formatInternalReference(referenceId: string, format?: string): string {
  const spectablesMatch = referenceId.match(
    /^nbc\.div([A-Za-z0-9]+)\.part(\d+)\.spectables(\d+)(?:\.table(\d+))?/i
  );

  if (spectablesMatch) {
    const table = spectablesMatch[4];
    if (table && (format === 'number' || format === 'shortNum')) {
      return table;
    }
    return 'Table';
  }

  const appendixDocumentMatch = referenceId.match(
    /^nbc\.div([A-Za-z0-9]+)\.appendix([A-Za-z])(?:\.appsect(\d+))?(?:\.subsect(\d+))?(?:\.article(\d+))?(?:\.para(\d+))?(?:\.table(\d+))?(?:\.figure(\d+))?/i
  );

  if (appendixDocumentMatch) {
    const appendixLetter = appendixDocumentMatch[2]?.toUpperCase();
    const appendixSection = appendixDocumentMatch[3];
    const subsection = appendixDocumentMatch[4];
    const article = appendixDocumentMatch[5];
    const paragraph = appendixDocumentMatch[6];
    const table = appendixDocumentMatch[7];
    const figure = appendixDocumentMatch[8];
    const baseNumber = [appendixLetter, appendixSection, subsection, article].filter(Boolean).join('.');
    const isShortNumeric = format === 'shortNum' || format === 'number';

    if (paragraph) {
      return isShortNumeric
        ? `(${paragraph})`
        : `Sentence ${baseNumber}.(${paragraph}).`;
    }

    if (table) {
      const tableNumber = baseNumber || [appendixLetter, appendixSection, subsection, article].filter(Boolean).join('.');
      return isShortNumeric ? tableNumber : `Table ${tableNumber}.`;
    }

    if (figure) {
      const figureNumber = baseNumber || [appendixLetter, appendixSection, subsection, article].filter(Boolean).join('.');
      return isShortNumeric ? figureNumber : `Figure ${figureNumber}.`;
    }

    if (article) {
      return isShortNumeric ? baseNumber : `Article ${baseNumber}.`;
    }

    if (subsection) {
      const subsectionNumber = [appendixLetter, appendixSection, subsection].filter(Boolean).join('.');
      return isShortNumeric ? subsectionNumber : `Subsection ${subsectionNumber}.`;
    }

    if (appendixSection) {
      const sectionNumber = [appendixLetter, appendixSection].filter(Boolean).join('.');
      return isShortNumeric ? sectionNumber : `Section ${sectionNumber}.`;
    }

    return `Appendix ${appendixLetter}`;
  }

  const division = extractNumericSegment(referenceId, /\.div([A-Za-z0-9]+)/i)?.toUpperCase();
  const part = extractNumericSegment(referenceId, /\.part(\d+)/i);
  const section = extractNumericSegment(referenceId, /\.sect(\d+)/i);
  const subsection = extractNumericSegment(referenceId, /\.subsect(\d+)/i);
  const article = extractNumericSegment(referenceId, /\.art(\d+)/i);
  const figure = extractNumericSegment(referenceId, /\.figure(\d+)/i);
  const sentence = extractNumericSegment(referenceId, /\.sent(\d+)/i);
  const clause = extractNumericSegment(referenceId, /\.clause(\d+)/i);
  const subclause = extractNumericSegment(referenceId, /\.subclause(\d+)/i);
  const table = extractNumericSegment(referenceId, /\.table(\d+)/i);
  const appNote = extractNumericSegment(referenceId, /\.appnote(\d+)/i);

  const sectionNumber = section ? [part, section].filter(Boolean).join('.') : '';
  const subsectionNumber =
    section && subsection ? [part, section, subsection].filter(Boolean).join('.') : '';
  const articleNumber =
    section && subsection && article
      ? [part, section, subsection, article].filter(Boolean).join('.')
      : '';
  const containerNumber = articleNumber || subsectionNumber || sectionNumber || part;
  const sentenceNumber = sentence
    ? [containerNumber, `(${sentence})`].filter(Boolean).join('.')
    : '';

  // Application notes are rendered as Note references in BC style.
  if (appNote) {
    const trail = [part, section, subsection, article].filter(Boolean).join('.');
    const noteLabel = [division, trail].filter(Boolean).join('-');
    return noteLabel ? `Note ${noteLabel}.` : 'Note';
  }

  const isShortNumeric = format === 'shortNum' || format === 'number';

  if (subclause) {
    const number = toRoman(asNumber(subclause) ?? Number.NaN);
    return isShortNumeric ? `(${number})` : `Subclause (${number})`;
  }

  if (clause) {
    const number = toAlphabetOrdinal(asNumber(clause) ?? Number.NaN);
    if (isShortNumeric) {
      return `(${number})`;
    }

    if (format === 'short') {
      return `Clause (${number})`;
    }

    if (sentenceNumber) {
      return `Clause ${sentenceNumber}(${number})`;
    }

    return `Clause (${number})`;
  }

  if (sentence) {
    if (isShortNumeric) {
      return `(${sentence})`;
    }

    if (format === 'short') {
      return `Sentence (${sentence})`;
    }

    if (containerNumber) {
      return `Sentence ${containerNumber}.(${sentence})`;
    }

    return `Sentence (${sentence})`;
  }

  if (table) {
    if (containerNumber) {
      return isShortNumeric ? containerNumber : `Table ${containerNumber}.`;
    }
    return isShortNumeric ? table : `Table ${table}`;
  }

  if (figure) {
    if (containerNumber) {
      return isShortNumeric ? containerNumber : `Figure ${containerNumber}.`;
    }
    return isShortNumeric ? figure : `Figure ${figure}`;
  }

  if (article) {
    return isShortNumeric ? articleNumber : `Article ${articleNumber}.`;
  }

  if (subsection) {
    return isShortNumeric ? subsectionNumber : `Subsection ${subsectionNumber}.`;
  }

  if (sectionNumber) {
    return isShortNumeric ? sectionNumber : `Section ${sectionNumber}.`;
  }

  if (part) {
    return `Part ${part}`;
  }

  if (table) {
    return `Table ${table}`;
  }

  return referenceId;
}

interface ParsedReferencePayload {
  id: string;
  displayText: string;
}

/**
 * Parse payload inside a [REF:*:*] marker.
 * Term refs can carry inline labels ([REF:term:id:label]); non-term refs can carry format suffixes.
 */
function parseReferencePayload(
  type: ReferenceType,
  payload: string,
  text: string,
  markerEndIndex: number
): ParsedReferencePayload {
  if (type === 'term') {
    const separatorIndex = payload.indexOf(':');
    if (separatorIndex === -1) {
      return {
        id: payload,
        displayText: extractTrailingDisplayText(text, markerEndIndex),
      };
    }

    const id = payload.slice(0, separatorIndex);
    const inlineLabel = payload.slice(separatorIndex + 1).trim();

    return {
      id,
      displayText: inlineLabel || extractTrailingDisplayText(text, markerEndIndex),
    };
  }

  // Non-term references: generate display text based on type
  const colonIndex = payload.indexOf(':');
  const id = colonIndex === -1 ? payload : payload.slice(0, colonIndex);
  const suffix = colonIndex === -1 ? undefined : payload.slice(colonIndex + 1).trim();

  if (type === 'internal') {
    const generated = formatInternalReference(id, suffix);
    // Consume any trailing display text to avoid duplication
    const trailing = extractTrailingDisplayText(text, markerEndIndex);
    return { id, displayText: generated || trailing || id };
  }

  if (type === 'standard') {
    // Use label after colon if present, otherwise use the standard ID
    return { id, displayText: suffix || id };
  }

  if (type === 'external') {
    // Use label after colon if present, otherwise use the reference ID
    return { id, displayText: suffix || id };
  }

  // Fallback for unknown types
  return { id, displayText: '' };
}

/**
 * Extract trailing word text immediately following a reference marker.
 * Supports legacy markers like [REF:term:bldng]building.
 */
function extractTrailingDisplayText(text: string, markerEndIndex: number): string {
  let endIndex = markerEndIndex;

  while (endIndex < text.length && /[\p{L}\p{N}_-]/u.test(text[endIndex])) {
    endIndex++;
  }

  return text.slice(markerEndIndex, endIndex);
}

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
    const [fullMatch, type, payload] = match;
    const { id, displayText } = parseReferencePayload(
      type as ReferenceType,
      payload,
      text,
      match.index + fullMatch.length
    );
    
    references.push({
      type: type as ReferenceType,
      id,
      displayText,
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
  
  return text.replace(REFERENCE_PATTERN, (match, type, payload, offset, sourceText) => {
    // Only process configured reference types
    if (!config.processTypes.includes(type as ReferenceType)) {
      return match;
    }

    const { displayText } = parseReferencePayload(
      type as ReferenceType,
      payload,
      sourceText,
      offset + match.length
    );

    // For term refs in legacy format (no inline label, payload has no colon),
    // return empty so trailing text remains intact.
    if (type === 'term' && !payload.includes(':')) {
      return '';
    }

    // Emit display text for all reference types that produce non-empty display text
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
