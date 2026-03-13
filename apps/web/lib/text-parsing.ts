/**
 * Text Parsing Utilities
 * 
 * Utilities for parsing text containing inline markers and converting them
 * to interactive React components.
 * 
 * Marker formats:
 * - Glossary terms: [REF:term:termId]
 * - Cross-references: [REF:internal:referenceId]
 * - Note references: [REF:internal:noteId:short|long]
 * 
 * Requirements: 11.1, 12.1, 21.10, 21.11, 21.12, 21.13, 21.14
 */

'use client';

import React from 'react';
import { GlossaryTerm } from '../components/reading/GlossaryTerm';
import { NoteReference } from '../components/reading/NoteReference';
import { EquationBlock } from '../components/reading/EquationBlock';
import { CrossReferenceLink } from '../components/reading/CrossReferenceLink';
import { FunctionalStatementLink } from '../components/reading/FunctionalStatementLink';
import { ObjectiveLink } from '../components/reading/ObjectiveLink';
import { useEquationStore } from '../stores/equation-store';

/**
 * Marker type for internal tracking
 */
interface Marker {
  type: 'glossary' | 'crossref' | 'standardRef' | 'note' | 'tableNote' | 'equation' | 'functionalStatement' | 'objective' | 'compound';
  start: number;
  end: number;
  termId?: string;
  glossaryLabel?: string;
  referenceId?: string;
  crossRefLabel?: string;
  noteId?: string;
  noteLabel?: string;
  tableNoteId?: string;
  equationId?: string;
  equationType?: 'display' | 'inline';
  format?: InternalRefFormat;
  functionalStatementId?: string;
  objectiveId?: string;
  compoundParts?: Array<{ type: 'functionalStatement' | 'objective'; id: string }>;
  standardsRefType?: 'standard' | 'external';
  standardsRefId?: string;
  standardsTrailingWhitespace?: number;
}

type InternalRefFormat = 'short' | 'long' | 'medium' | 'title' | 'number' | 'shortNum' | undefined;

interface GlossaryDisplay {
  text: string;
  consumed: number;
}

interface ParsedGlossaryMarker {
  termId: string;
  label?: string;
}

interface ParsedStandardsMarker {
  standardsId: string;
  label?: string;
  trailingWhitespace?: number;
}

function skipWhitespaceBeforePunctuation(text: string, index: number): number {
  if (index >= text.length) return index;
  const remaining = text.slice(index);
  const match = remaining.match(/^(\s+)([,:.;)\]])/);
  if (!match) return index;
  return index + match[1].length;
}

function avoidDuplicateTrailingPeriod(displayText: string, remainingText: string): string {
  if (!displayText.endsWith('.')) return displayText;
  if (!/^\s*\./.test(remainingText)) return displayText;
  return displayText.slice(0, -1);
}

function avoidDuplicateLeadingReferenceType(precedingText: string, displayText: string): string {
  const displayMatch = displayText.match(
    /^(Appendix|Section|Subsection|Article|Sentence|Clause|Subclause|Table|Figure|Note)\s+/i
  );
  if (!displayMatch) return displayText;

  const duplicatedType = displayMatch[1];
  if (!new RegExp(`${duplicatedType}\\s*$`, 'i').test(precedingText)) {
    return displayText;
  }

  return displayText.slice(displayMatch[0].length);
}

export interface TextEquationEntry {
  id: string;
  type?: 'display' | 'inline' | string;
  latex?: string;
  plainText?: string;
  mathml?: string;
  htmlSrc?: string;
  image?: string;
  imageSrc?: string;
}

function toRenderableEquation(
  equation: TextEquationEntry,
  fallbackType: 'display' | 'inline'
): React.ComponentProps<typeof EquationBlock>['equation'] {
  const preferredType = equation.type === 'inline' ? 'inline' : 'display';
  const display = preferredType === 'inline' ? 'inline' : 'block';

  return {
    id: equation.id,
    type: 'equation',
    number: equation.id,
    latex: equation.latex || equation.plainText || '',
    description: equation.plainText,
    plainText: equation.plainText,
    mathml: equation.mathml,
    htmlSrc: equation.htmlSrc,
    image: equation.image,
    imageSrc: equation.imageSrc,
    display: fallbackType === 'inline' ? 'inline' : display,
  };
}

function getNoteLabel(noteId: string): string {
  const normalized = noteId.trim();
  const match = normalized.match(/(?:title)?note(\d+)$/i);
  if (match) {
    return `(${match[1]})`;
  }

  return `(${normalized.split('.').pop() || normalized})`;
}

function sanitizeLegacyPlaceholderTags(text: string): string {
  // Legacy source uses <>...</> placeholders for inline emphasis.
  // Render as plain text by stripping these wrapper tokens.
  return text.replace(/<>/g, '').replace(/<\/>/g, '');
}

/**
 * Parse text with inline formatting tags (italic, bold) and script notation
 * Returns array of React nodes with proper formatting applied
 */
function parseInlineFormatting(text: string, interactive: boolean = true, startIndex: number = 0): React.ReactNode[] {
  if (!text) {
    return [text];
  }

  // Check if text contains any formatting tags or script notation
  if (!text.includes('<italic>') && !text.includes('<bold>') && !text.includes('_{') && !text.includes('^{')) {
    return [text];
  }

  const nodes: React.ReactNode[] = [];
  // Match italic, bold, subscript, and superscript patterns
  const formatRegex = /(<italic>[\s\S]*?<\/italic>|<bold>[\s\S]*?<\/bold>|_\{[^{}]+\}|\^\{[^{}]+\})/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = formatRegex.exec(text)) !== null) {
    const token = match[0];
    const matchStart = match.index;
    const matchEnd = formatRegex.lastIndex;
    const keyIndex = startIndex + matchStart;

    // Add plain text before this match
    if (matchStart > lastIndex) {
      nodes.push(text.substring(lastIndex, matchStart));
    }

    // Handle different formatting types
    if (/^<italic>/i.test(token)) {
      const italicText = token.replace(/^<italic>/i, '').replace(/<\/italic>$/i, '');
      nodes.push(
        React.createElement('em', { key: `italic-${keyIndex}` },
          ...parseInlineFormatting(italicText, interactive, keyIndex)
        )
      );
    } else if (/^<bold>/i.test(token)) {
      const boldText = token.replace(/^<bold>/i, '').replace(/<\/bold>$/i, '');
      nodes.push(
        React.createElement('strong', { key: `bold-${keyIndex}` },
          ...parseInlineFormatting(boldText, interactive, keyIndex)
        )
      );
    } else if (token.startsWith('_{')) {
      // Subscript
      nodes.push(
        React.createElement('sub', { key: `sub-${keyIndex}` }, token.slice(2, -1))
      );
    } else if (token.startsWith('^{')) {
      // Superscript
      nodes.push(
        React.createElement('sup', { key: `sup-${keyIndex}` }, token.slice(2, -1))
      );
    }

    lastIndex = matchEnd;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

const GLOSSARY_SECOND_WORD_STOPWORDS = new Set([
  'shall',
  'must',
  'may',
  'can',
  'will',
  'is',
  'are',
  'was',
  'were',
  'be',
  'being',
  'been',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'to',
  'of',
  'and',
  'or',
  'in',
  'on',
  'by',
  'with',
  'for',
  'from',
  'that',
  'this',
  'these',
  'those',
  'as',
]);

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

function toRoman(value: number): string {
  if (value <= 0 || Number.isNaN(value)) return String(value);

  const map: Array<{ value: number; symbol: string }> = [
    { value: 1000, symbol: 'm' },
    { value: 900, symbol: 'cm' },
    { value: 500, symbol: 'd' },
    { value: 400, symbol: 'cd' },
    { value: 100, symbol: 'c' },
    { value: 90, symbol: 'xc' },
    { value: 50, symbol: 'l' },
    { value: 40, symbol: 'xl' },
    { value: 10, symbol: 'x' },
    { value: 9, symbol: 'ix' },
    { value: 5, symbol: 'v' },
    { value: 4, symbol: 'iv' },
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

function extractNumeric(referenceId: string, pattern: RegExp): string | undefined {
  const match = referenceId.match(pattern);
  return match?.[1];
}

function asNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function getGlossaryDisplayText(
  fullText: string,
  markerEnd: number,
  termId: string,
  markerLabel?: string
): GlossaryDisplay {
  if (markerLabel && markerLabel.trim().length > 0) {
    return { text: markerLabel.trim(), consumed: 0 };
  }

  const remaining = fullText.slice(markerEnd);
  const immediateTermMatch = remaining.match(
    /^([A-Za-z][A-Za-z0-9'./-]*)(?:\s+([A-Za-z][A-Za-z0-9'./-]*))?/
  );

  if (immediateTermMatch) {
    const firstWord = immediateTermMatch[1];
    const secondWord = immediateTermMatch[2];

    if (secondWord && !GLOSSARY_SECOND_WORD_STOPWORDS.has(secondWord.toLowerCase())) {
      return {
        text: `${firstWord} ${secondWord}`,
        consumed: firstWord.length + 1 + secondWord.length,
      };
    }

    return { text: firstWord, consumed: firstWord.length };
  }

  // Fallback for malformed source where marker is not immediately followed by term text.
  return { text: termId.replace(/-/g, ' '), consumed: 0 };
}

function parseGlossaryMarkerPayload(payload: string): ParsedGlossaryMarker {
  const firstColon = payload.indexOf(':');

  if (firstColon === -1) {
    return { termId: payload.trim() };
  }

  const termId = payload.slice(0, firstColon).trim();
  const label = payload.slice(firstColon + 1).trim();

  return {
    termId,
    label: label.length > 0 ? label : undefined,
  };
}

function parseStandardsMarkerPayload(payload: string): ParsedStandardsMarker {
  const firstColon = payload.indexOf(':');
  if (firstColon === -1) {
    return { standardsId: payload.trim() };
  }

  const standardsId = payload.slice(0, firstColon).trim();
  const rawLabel = payload.slice(firstColon + 1);
  const trailingWhitespace = (rawLabel.match(/\s+$/) || [''])[0].length;
  const label = rawLabel.replace(/\s+$/, '');

  return {
    standardsId,
    label: label.length > 0 ? label : undefined,
    trailingWhitespace: trailingWhitespace > 0 ? trailingWhitespace : undefined,
  };
}

function getCrossReferenceDisplayText(
  fullText: string,
  markerEnd: number,
  referenceId: string,
  format?: InternalRefFormat
): GlossaryDisplay {
  const remaining = fullText.slice(markerEnd);

  // Note labels can include suffix qualifiers such as " (a)" or "(1)".
  // Ensure the full note token is linked instead of splitting trailing qualifiers.
  const noteDisplayMatch = remaining.match(/^(Note\s+[A-Z0-9][A-Z0-9.\-]*\.?(?:\s*\([^)]+\))?\.?)/i);
  if (noteDisplayMatch) {
    const text = noteDisplayMatch[1];
    return {
      text,
      consumed: text.length,
    };
  }
  
  // Match different patterns based on format:
  // - long: "Articles 3.2.4.7." or "Article 3.2.4.7." or "Section 3.3." or "Sentence (2)"
  // - short: "Sentence (2)" or "(2)"
  // - number/shortNum: "3.2.4.7." or "3.2.2.93."
  
  let displayTextMatch: RegExpMatchArray | null = null;
  
  if (format === 'long') {
    // Match "Article X.X.X." / "Figure X.X.X.-A" / "Section X.X." / "Sentence (X)" etc.
    displayTextMatch = remaining.match(/^((?:Articles?|Figures?|Sections?|Sentences?|Clauses?|Subclauses?|Tables?|Note)\s+[A-Z0-9][A-Z0-9.\-()]*\.?)/i);
  } else if (format === 'short') {
    // Match "Sentence (X)" or just "(X)"
    displayTextMatch = remaining.match(/^((?:Sentence|Clause|Subclause)\s+\([^)]+\)|\([^)]+\))/i);
  } else if (format === 'number' || format === 'shortNum') {
    // Match just the number like "3.2.4.7." or "3.2.2.93."
    displayTextMatch = remaining.match(/^([A-Z]?[0-9]+(?:\.[0-9]+)*\.?)/);
  }
  
  if (displayTextMatch) {
    const text = displayTextMatch[1];
    return {
      text,
      consumed: text.length,
    };
  }
  
  // Fallback: generate display text from referenceId
  const fallback = formatInternalReference(referenceId, format);
  const qualifierMatch = fallback.startsWith('Note ')
    ? remaining.match(/^(\s*\([^)]+\))/)
    : null;

  if (qualifierMatch) {
    const qualifier = qualifierMatch[1].trim();
    return {
      text: `${fallback} ${qualifier}`.replace(/\s+/g, ' ').trim(),
      consumed: qualifierMatch[1].length,
    };
  }

  return {
    text: fallback,
    consumed: 0,
  };
}

function formatInternalReference(referenceId: string, format?: InternalRefFormat): string {
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
      const figureIndex = asNumber(figure);
      const figureLetter = typeof figureIndex === 'number'
        ? toAlphabetOrdinal(figureIndex).toUpperCase()
        : undefined;
      const figureNumber = baseNumber && figureLetter
        ? `${baseNumber}.-${figureLetter}`
        : [appendixLetter, appendixSection, subsection, article, figure].filter(Boolean).join('.');
      return isShortNumeric ? figureNumber : `Figure ${figureNumber}`;
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

  const division = extractNumeric(referenceId, /\.div([A-Za-z0-9]+)/i)?.toUpperCase();
  const part = extractNumeric(referenceId, /\.part(\d+)/i);
  const section = extractNumeric(referenceId, /\.sect(\d+)/i);
  const subsection = extractNumeric(referenceId, /\.subsect(\d+)/i);
  const article = extractNumeric(referenceId, /\.art(\d+)/i);
  const figure = extractNumeric(referenceId, /\.figure(\d+)/i);
  const sentence = extractNumeric(referenceId, /\.sent(\d+)/i);
  const clause = extractNumeric(referenceId, /\.clause(\d+)/i);
  const subclause = extractNumeric(referenceId, /\.subclause(\d+)/i);
  const table = extractNumeric(referenceId, /\.table(\d+)/i);
  const appNote = extractNumeric(referenceId, /\.appnote(\d+)/i);

  const sectionNumber = [part, section].filter(Boolean).join('.');
  const subsectionNumber = [part, section, subsection].filter(Boolean).join('.');
  const articleNumber = [part, section, subsection, article].filter(Boolean).join('.');
  const tableNumber = [part, section, subsection, article, table].filter(Boolean).join('.');
  const figureIndex = asNumber(figure);
  const figureLetter = typeof figureIndex === 'number' ? toAlphabetOrdinal(figureIndex).toUpperCase() : undefined;
  const figureNumber = part && section && subsection && article && figureLetter
    ? `${part}.${section}.${subsection}.${article}.-${figureLetter}`
    : undefined;

  // Application notes are rendered as Note references in BC style.
  if (appNote) {
    const trail = [part, section, subsection, article].filter(Boolean).join('.');
    const prefix = [division, trail].filter(Boolean).join('-');
    const noteLabel = `${prefix}.(${appNote})`;
    return `Note ${noteLabel}.`;
  }

  const isShortNumeric = format === 'shortNum' || format === 'number';

  if (subclause) {
    const number = toRoman(asNumber(subclause) ?? Number.NaN);
    return isShortNumeric ? `(${number})` : `Subclause (${number})`;
  }

  if (clause) {
    const number = toAlphabetOrdinal(asNumber(clause) ?? Number.NaN);
    return isShortNumeric ? `(${number})` : `Clause (${number})`;
  }

  if (sentence) {
    return isShortNumeric ? `(${sentence})` : `Sentence (${sentence})`;
  }

  if (table) {
    return tableNumber ? `Table ${tableNumber}.` : `Table ${table}`;
  }

  if (figureNumber) {
    return isShortNumeric ? figureNumber : `Figure ${figureNumber}`;
  }

  if (figure) {
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

/**
 * Parse text containing [REF:term:id] markers and convert to GlossaryTerm components
 * 
 * @param text - Text containing glossary term markers
 * @param glossaryTerms - Array of term IDs present in the text (for validation)
 * @param interactive - Whether to render interactive components (default: true)
 * @returns Array of React nodes (strings and GlossaryTerm components)
 * 
 * Requirements: 11.1, 21.10, 21.11
 */
export function parseTextWithGlossary(
  text: string,
  _glossaryTerms: string[],
  interactive: boolean = true
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  
  // Regex to match [REF:term:termId]
  const glossaryRegex = /\[REF:term:([^\]]+)\]/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = glossaryRegex.exec(text)) !== null) {
    const glossaryMarker = parseGlossaryMarkerPayload(match[1]);
    const termId = glossaryMarker.termId;
    const matchStart = match.index;
    const matchEnd = glossaryRegex.lastIndex;
    
    // Add plain text before the marker
    if (matchStart > lastIndex) {
      nodes.push(text.substring(lastIndex, matchStart));
    }
    
    // Extract the term text from the original text
    // The term text is the content between the marker and the next marker or end
    // For now, we'll use the termId as the display text
    // In a real implementation, this would look up the term from glossary
    const glossaryDisplay = getGlossaryDisplayText(text, matchEnd, termId, glossaryMarker.label);
    
    // Add GlossaryTerm component
    nodes.push(
      React.createElement(GlossaryTerm, {
        key: `glossary-${matchStart}`,
        termId,
        text: glossaryDisplay.text,
        interactive,
      })
    );
    
    lastIndex = matchEnd + glossaryDisplay.consumed;
  }
  
  // Add remaining text after last marker
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }
  
  // If no markers found, return the original text
  if (nodes.length === 0) {
    nodes.push(text);
  }
  
  return nodes;
}

/**
 * Parse text containing [REF:internal:id] markers and convert to CrossReferenceLink components
 * 
 * @param text - Text containing cross-reference markers
 * @param interactive - Whether to render interactive components (default: true)
 * @returns Array of React nodes (strings and CrossReferenceLink components)
 * 
 * Requirements: 12.1, 21.10, 21.12
 */
export function parseTextWithCrossReferences(
  text: string,
  interactive: boolean = true
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  
  // Regex to match:
  // - [REF:internal:referenceId]
  // - [REF:internal:referenceId:format]
  // - [REF:internal:referenceId:format:custom label]
  const crossRefRegex = /\[REF:internal:([^\]:]+)(?::([a-zA-Z]+)(?::([^\]]+))?)?\]/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = crossRefRegex.exec(text)) !== null) {
    const referenceId = match[1];
    const format = match[2] as InternalRefFormat;
    const customLabel = match[3]?.trim();
    const matchStart = match.index;
    const matchEnd = crossRefRegex.lastIndex;
    
    // Add plain text before the marker
    if (matchStart > lastIndex) {
      nodes.push(text.substring(lastIndex, matchStart));
    }

    const baseDisplay = customLabel || formatInternalReference(referenceId, format);
    const trailing = text.slice(matchEnd);
    const qualifierMatch = baseDisplay.startsWith('Note ')
      ? trailing.match(/^(\s*\([^)]+\))/)
      : null;
    const displayText = qualifierMatch
      ? `${baseDisplay} ${qualifierMatch[1].trim()}`.replace(/\s+/g, ' ').trim()
      : baseDisplay;
    const normalizedDisplayText = avoidDuplicateTrailingPeriod(
      avoidDuplicateLeadingReferenceType(text.slice(0, matchStart), displayText),
      text.slice(matchEnd + (qualifierMatch ? qualifierMatch[1].length : 0))
    );
    
    nodes.push(
      React.createElement(CrossReferenceLink, {
        key: `crossref-${matchStart}`,
        referenceId,
        displayText: normalizedDisplayText,
        format,
        interactive,
        preserveDisplayText: Boolean(customLabel),
      })
    );
    
    lastIndex = matchEnd + (qualifierMatch ? qualifierMatch[1].length : 0);
  }

  // Add remaining text after last marker
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }
  
  // If no markers found, return the original text
  if (nodes.length === 0) {
    nodes.push(text);
  }
  
  return nodes;
}

/**
 * Parse text containing [REF:internal:noteId:short|long] markers and convert to NoteReference components
 * 
 * @param text - Text containing note reference markers
 * @param interactive - Whether to render interactive components (default: true)
 * @returns Array of React nodes (strings and NoteReference components)
 * 
 * Requirements: 21.10, 21.13
 */
export function parseTextWithNotes(
  text: string,
  interactive: boolean = true
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  
  // Dedicated note references only (excluding application notes).
  const noteRegex = /\[REF:internal:([^:\]]*\.note\d+[^:\]]*):(short|long)(?::([^\]]+))?\]/gi;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = noteRegex.exec(text)) !== null) {
    const noteId = match[1];
    const format = match[2] as 'short' | 'long';
    const customLabel = match[3]?.trim();
    const matchStart = match.index;
    const matchEnd = noteRegex.lastIndex;
    
    // Add plain text before the marker
    if (matchStart > lastIndex) {
      nodes.push(text.substring(lastIndex, matchStart));
    }
    
    // Generate display text based on format
    // For short format, typically shows a number like "(1)"
    // For long format, shows more descriptive text
    const displayText = customLabel || (format === 'short' ? getNoteLabel(noteId) : noteId);
    
    // Add NoteReference component
    nodes.push(
      React.createElement(NoteReference, {
        key: `note-${matchStart}`,
        referenceId: noteId,
        text: displayText,
        interactive,
      })
    );
    
    lastIndex = matchEnd;
  }
  
  // Add remaining text after last marker
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }
  
  // If no markers found, return the original text
  if (nodes.length === 0) {
    nodes.push(text);
  }
  
  return nodes;
}

/**
 * Parse text containing all marker types in a single pass
 * 
 * This is the main parsing function that should be used by rendering components.
 * It handles glossary terms, cross-references, note references, and objective-based
 * code references (functional statements and objectives) in a single pass,
 * preserving the exact source order.
 * 
 * Supported marker formats:
 * - Glossary: [REF:term:termId]
 * - Cross-references: [REF:internal:referenceId]
 * - Notes: [REF:internal:noteId:short|long]
 * - Table notes: [REF:table-note:noteId]
 * - Equations: [EQ:display|inline:equationId]
 * - Functional statements: [[REF:functional-statement:fs01]]
 * - Objectives: [[REF:sub-objective:nbc-obj-os1.2]]
 * - Compound references: [[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]
 * 
 * @param text - Text containing any combination of markers
 * @param glossaryTerms - Array of term IDs present in the text (for validation)
 * @param interactive - Whether to render interactive components (default: true)
 * @returns Array of React nodes preserving exact source order
 * 
 * Requirements: 11.1, 12.1, 21.10, 21.11, 21.12, 21.13, 21.14
 */
export function parseTextWithMarkers(
  text: string,
  _glossaryTerms: string[] = [],
  interactive: boolean = true,
  localEquations: TextEquationEntry[] = []
): React.ReactNode[] {
  const sanitizedText = sanitizeLegacyPlaceholderTags(text);
  const nodes: React.ReactNode[] = [];
  const markers: Marker[] = [];
  const getEquation = useEquationStore.getState().getEquation;
  const localEquationById = new Map(
    localEquations
      .filter((equation) => typeof equation.id === 'string' && equation.id.trim().length > 0)
      .map((equation) => [equation.id.trim().toLowerCase(), equation] as const)
  );
  const consumedLocalEquationIds = new Set<string>();
  
  // Find all glossary term markers
  const glossaryRegex = /\[REF:term:([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  
  while ((match = glossaryRegex.exec(sanitizedText)) !== null) {
    const glossaryMarker = parseGlossaryMarkerPayload(match[1]);
    markers.push({
      type: 'glossary',
      start: match.index,
      end: glossaryRegex.lastIndex,
      termId: glossaryMarker.termId,
      glossaryLabel: glossaryMarker.label,
    });
  }
  
  // Find dedicated note reference markers (must check before cross-references).
  // This intentionally excludes application notes (appnote), which are handled
  // as regular cross-references (e.g., "Note A-2.1.1.2.(6).").
  const noteRegex = /\[REF:internal:([^:\]]*\.note\d+[^:\]]*):(short|long)(?::([^\]]+))?\]/gi;
  
  while ((match = noteRegex.exec(sanitizedText)) !== null) {
    markers.push({
      type: 'note',
      start: match.index,
      end: noteRegex.lastIndex,
      noteId: match[1],
      format: match[2] as 'short' | 'long',
      noteLabel: match[3]?.trim() || undefined,
    });
  }

  // Find table note markers.
  // Example: [REF:table-note:nbc.divB.part3.sect1.subsect3.art1.table1.note2]
  const tableNoteRegex = /\[REF:table-note:([^\]]+)\]/gi;

  while ((match = tableNoteRegex.exec(sanitizedText)) !== null) {
    markers.push({
      type: 'tableNote',
      start: match.index,
      end: tableNoteRegex.lastIndex,
      tableNoteId: match[1],
    });
  }
  
  // Find all cross-reference markers.
  // Supports optional format and optional inline display label payload.
  // Examples:
  // - [REF:internal:nbc.divB.part9]
  // - [REF:internal:nbc.divB.part9:short]
  // - [REF:internal:nbc.divC.part2.appendix.appnote1:short:Note A-2.2.1.2.(1)]
  const crossRefRegex = /\[REF:internal:([^\]:]+)(?::([a-zA-Z]+)(?::([^\]]+))?)?\]/g;
  
  while ((match = crossRefRegex.exec(sanitizedText)) !== null) {
    // Check if this position is already occupied by a note marker
    const isNoteMarker = markers.some(
      m => m.type === 'note' && m.start === match!.index
    );
    
    if (!isNoteMarker) {
      markers.push({
        type: 'crossref',
        start: match.index,
        end: crossRefRegex.lastIndex,
        referenceId: match[1],
        format: match[2] as InternalRefFormat,
        crossRefLabel: match[3]?.trim() || undefined,
      });
    }
  }

  // Find standards/external markers.
  // Examples:
  // - [REF:standard:csaa440S1]
  // - [REF:external:csa101a440]
  const standardsRegex = /\[REF:(standard|external):([^\]]+)\]/gi;

  while ((match = standardsRegex.exec(sanitizedText)) !== null) {
    const parsedStandardsPayload = parseStandardsMarkerPayload(match[2] || '');
    markers.push({
      type: 'standardRef',
      start: match.index,
      end: standardsRegex.lastIndex,
      standardsRefType: (match[1] || '').toLowerCase() as 'standard' | 'external',
      standardsRefId: parsedStandardsPayload.standardsId,
      glossaryLabel: parsedStandardsPayload.label,
      standardsTrailingWhitespace: parsedStandardsPayload.trailingWhitespace,
    });
  }

  // Find equation markers.
  // Examples: [EQ:display:es007867q1], [EQ:inline:eg02643a], [EQ:display:]
  const equationRegex = /\[EQ:(display|inline)(?::([^\]]*))?\]/gi;

  while ((match = equationRegex.exec(sanitizedText)) !== null) {
    markers.push({
      type: 'equation',
      start: match.index,
      end: equationRegex.lastIndex,
      equationType: (match[1]?.toLowerCase() === 'inline' ? 'inline' : 'display'),
      equationId: (match[2] || '').trim() || undefined,
    });
  }

  // Find double-bracket objective-based code references
  // Examples:
  // - [[REF:functional-statement:fs03]]
  // - [[REF:sub-objective:nbc-obj-os1.2]]
  // - [[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]
  // - [[REF:functional-statement:fs02],[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]
  // Use non-greedy match to capture everything between [[ and ]],
  // while also supporting spaced forms like:
  // [ [REF:functional-statement:fs03] - [REF:sub-objective:nbc-obj-os1.2] ]
  const doubleBracketRegex = /\[\s*\[([\s\S]*?)\]\s*\]/g;

  while ((match = doubleBracketRegex.exec(sanitizedText)) !== null) {
    const content = match[1];
    const matchStart = match.index;
    const matchEnd = doubleBracketRegex.lastIndex;

    // Extract reference parts in source order without splitting on `-`,
    // because IDs themselves contain hyphens (e.g., functional-statement, nbc-obj-os1.2).
    const objectiveRefRegex = /REF:(functional-statement|sub-objective):([A-Za-z0-9.-]+)/gi;
    let partMatch: RegExpExecArray | null;
    const compoundParts: Array<{ type: 'functionalStatement' | 'objective'; id: string }> = [];

    while ((partMatch = objectiveRefRegex.exec(content)) !== null) {
      const refType = partMatch[1]?.toLowerCase();
      const refId = partMatch[2];
      if (!refId) continue;

      if (refType === 'functional-statement') {
        compoundParts.push({ type: 'functionalStatement', id: refId });
      } else if (refType === 'sub-objective') {
        compoundParts.push({ type: 'objective', id: refId });
      }
    }

    if (compoundParts.length > 0) {
      if (compoundParts.length === 1) {
        // Single reference
        const part = compoundParts[0];
        if (part.type === 'functionalStatement') {
          markers.push({
            type: 'functionalStatement',
            start: matchStart,
            end: matchEnd,
            functionalStatementId: part.id,
          });
        } else {
          markers.push({
            type: 'objective',
            start: matchStart,
            end: matchEnd,
            objectiveId: part.id,
          });
        }
      } else {
        // Compound reference
        markers.push({
          type: 'compound',
          start: matchStart,
          end: matchEnd,
          compoundParts,
        });
      }
    }
  }
  
  // Sort markers by position to maintain source order
  markers.sort((a, b) => a.start - b.start);
  
  // Build the node array
  let lastIndex = 0;
  
  for (const marker of markers) {
    // Skip markers that overlap with previously consumed text
    if (marker.start < lastIndex) {
      continue;
    }
    // Add plain text before the marker
    if (marker.start > lastIndex) {
      nodes.push(
        ...parseInlineFormatting(
          sanitizedText.substring(lastIndex, marker.start),
          interactive,
          lastIndex
        )
      );
    }
    
    // Add the appropriate component based on marker type
    switch (marker.type) {
      case 'glossary': {
        const glossaryDisplay = getGlossaryDisplayText(
          sanitizedText,
          marker.end,
          marker.termId!,
          marker.glossaryLabel
        );

        nodes.push(
          React.createElement(GlossaryTerm, {
            key: `glossary-${marker.start}`,
            termId: marker.termId!,
            text: glossaryDisplay.text,
            interactive,
          })
        );
        // For glossary terms, consume the text that follows the marker
        lastIndex = skipWhitespaceBeforePunctuation(
          sanitizedText,
          marker.end + glossaryDisplay.consumed
        );
        break;
      }
      
      case 'crossref': {
        const crossRefDisplay = marker.crossRefLabel
          ? (() => {
              const trailing = sanitizedText.slice(marker.end);
              const qualifierMatch = marker.crossRefLabel.startsWith('Note ')
                ? trailing.match(/^(\s*\([^)]+\))/)
                : null;
              if (qualifierMatch) {
                return {
                  text: `${marker.crossRefLabel} ${qualifierMatch[1].trim()}`.replace(/\s+/g, ' ').trim(),
                  consumed: qualifierMatch[1].length,
                };
              }
              return { text: marker.crossRefLabel, consumed: 0 };
            })()
          : getCrossReferenceDisplayText(
              sanitizedText,
              marker.end,
              marker.referenceId!,
              marker.format as InternalRefFormat
            );

        const normalizedDisplayText = avoidDuplicateTrailingPeriod(
          avoidDuplicateLeadingReferenceType(
            sanitizedText.slice(0, marker.start),
            crossRefDisplay.text
          ),
          sanitizedText.slice(marker.end + crossRefDisplay.consumed)
        );

        nodes.push(
          React.createElement(CrossReferenceLink, {
            key: `crossref-${marker.start}`,
            referenceId: marker.referenceId!,
            displayText: normalizedDisplayText,
            format: marker.format as InternalRefFormat,
            interactive,
            preserveDisplayText: Boolean(marker.crossRefLabel),
          })
        );
        // For cross-references, consume the marker and the display text that follows
        lastIndex = skipWhitespaceBeforePunctuation(
          sanitizedText,
          marker.end + crossRefDisplay.consumed
        );
        break;
      }

      case 'standardRef': {
        const standardsType = marker.standardsRefType || 'standard';
        const standardsId = marker.standardsRefId || '';
        const standardsLabel = marker.glossaryLabel;
        const trailingWhitespace = marker.standardsTrailingWhitespace || 0;

        nodes.push(
          React.createElement(CrossReferenceLink, {
            key: `standards-${marker.start}`,
            referenceId: `${standardsType}:${standardsId}`,
            displayText: standardsLabel || standardsId,
            interactive,
          })
        );
        if (trailingWhitespace > 0) {
          nodes.push(' '.repeat(trailingWhitespace));
        }
        lastIndex = skipWhitespaceBeforePunctuation(sanitizedText, marker.end);
        break;
      }
      
      case 'note': {
        const displayText = marker.noteLabel || (marker.format === 'short'
          ? getNoteLabel(marker.noteId!)
          : marker.noteId!);
        
        nodes.push(
          React.createElement(NoteReference, {
            key: `note-${marker.start}`,
            referenceId: marker.noteId!,
            text: displayText,
            interactive,
          })
        );
        lastIndex = skipWhitespaceBeforePunctuation(sanitizedText, marker.end);
        break;
      }

      case 'tableNote': {
        nodes.push(
          React.createElement(CrossReferenceLink, {
            key: `table-note-${marker.start}`,
            referenceId: marker.tableNoteId!,
            displayText: getNoteLabel(marker.tableNoteId!),
            interactive,
          })
        );
        lastIndex = skipWhitespaceBeforePunctuation(sanitizedText, marker.end);
        break;
      }

      case 'equation': {
        const markerType = marker.equationType === 'inline' ? 'inline' : 'display';
        const markerId = marker.equationId?.toLowerCase();

        let equation: TextEquationEntry | undefined;

        if (markerId) {
          equation = localEquationById.get(markerId) || getEquation(markerId);
          if (equation?.id) {
            consumedLocalEquationIds.add(equation.id.toLowerCase());
          }
        } else {
          equation = localEquations.find(
            (candidate) =>
              typeof candidate.id === 'string' &&
              candidate.id.trim().length > 0 &&
              !consumedLocalEquationIds.has(candidate.id.toLowerCase())
          );
          if (equation?.id) {
            consumedLocalEquationIds.add(equation.id.toLowerCase());
          }
        }

        if (!equation) {
          lastIndex = marker.end;
          break;
        }

        nodes.push(
          React.createElement(EquationBlock, {
            key: `equation-${marker.start}`,
            equation: toRenderableEquation(equation, markerType),
            variant: 'marker',
            displayMode: markerType === 'inline' ? 'inline' : 'block',
          })
        );
        lastIndex = marker.end;
        break;
      }

      case 'functionalStatement': {
        // Format: "F03" not "FS03" to match printed format
        const displayText = marker.functionalStatementId?.toUpperCase().replace(/^FS/, 'F') || '';
        nodes.push(
          React.createElement(FunctionalStatementLink, {
            key: `fs-${marker.start}`,
            statementId: marker.functionalStatementId!,
            displayText,
            interactive,
          })
        );
        lastIndex = marker.end;
        break;
      }

      case 'objective': {
        // Format: "OS1.2" not "NBC-OBJ-OS1.2" to match printed format
        const displayText = marker.objectiveId?.toUpperCase().replace(/^NBC-OBJ-/, '') || '';
        nodes.push(
          React.createElement(ObjectiveLink, {
            key: `obj-${marker.start}`,
            objectiveId: marker.objectiveId!,
            displayText,
            interactive,
          })
        );
        lastIndex = marker.end;
        break;
      }

      case 'compound': {
        // Render compound references with square brackets: [ F03 - OS1.2 ]
        const parts = marker.compoundParts || [];
        const displayParts: React.ReactNode[] = [];
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLast = i === parts.length - 1;
          
          if (part.type === 'functionalStatement') {
            // Format: "F03" not "FS03"
            const displayText = part.id.toUpperCase().replace(/^FS/, 'F');
            displayParts.push(
              React.createElement(FunctionalStatementLink, {
                key: `fs-${marker.start}-${i}`,
                statementId: part.id,
                displayText,
                interactive,
              })
            );
          } else {
            // Format: "OS1.2" not "NBC-OBJ-OS1.2"
            const displayText = part.id.toUpperCase().replace(/^NBC-OBJ-/, '');
            displayParts.push(
              React.createElement(ObjectiveLink, {
                key: `obj-${marker.start}-${i}`,
                objectiveId: part.id,
                displayText,
                interactive,
              })
            );
          }
          
          // Add separator if not last
          if (!isLast) {
            // Determine separator based on next part type
            const nextPart = parts[i + 1];
            const separator = nextPart.type === part.type ? ', ' : ' - ';
            displayParts.push(separator);
          }
        }
        
        nodes.push(
          React.createElement('span', {
            key: `compound-${marker.start}`,
            className: 'compound-ref',
          }, ...displayParts)
        );
        lastIndex = marker.end;
        break;
      }
    }
  }
  
  // Add remaining text after last marker
  if (lastIndex < sanitizedText.length) {
      nodes.push(
        ...parseInlineFormatting(
          sanitizedText.substring(lastIndex),
          interactive,
          lastIndex
        )
      );
  }
  
  // If no markers found, return the original text with formatting
  if (nodes.length === 0) {
    return parseInlineFormatting(sanitizedText, interactive, 0);
  }
  
  return nodes;
}
