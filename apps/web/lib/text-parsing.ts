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
import { useEquationStore } from '../stores/equation-store';

/**
 * Marker type for internal tracking
 */
interface Marker {
  type: 'glossary' | 'crossref' | 'note' | 'tableNote' | 'equation';
  start: number;
  end: number;
  termId?: string;
  referenceId?: string;
  noteId?: string;
  tableNoteId?: string;
  equationId?: string;
  equationType?: 'display' | 'inline';
  format?: InternalRefFormat;
}

type InternalRefFormat = 'short' | 'long' | 'medium' | 'title' | 'number' | 'shortNum' | undefined;

interface GlossaryDisplay {
  text: string;
  consumed: number;
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
  termId: string
): GlossaryDisplay {
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

function getCrossReferenceDisplayText(
  fullText: string,
  markerEnd: number,
  referenceId: string,
  format?: InternalRefFormat
): GlossaryDisplay {
  const remaining = fullText.slice(markerEnd);
  
  // Match different patterns based on format:
  // - long: "Articles 3.2.4.7." or "Article 3.2.4.7." or "Section 3.3." or "Sentence (2)"
  // - short: "Sentence (2)" or "(2)"
  // - number/shortNum: "3.2.4.7." or "3.2.2.93."
  
  let displayTextMatch: RegExpMatchArray | null = null;
  
  if (format === 'long') {
    // Match "Articles X.X.X." or "Article X.X.X." or "Section X.X." or "Sentence (X)" etc.
    displayTextMatch = remaining.match(/^((?:Articles?|Sections?|Sentences?|Clauses?|Subclauses?|Tables?|Note)\s+[A-Z0-9][A-Z0-9.\-()]*\.?)/i);
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
  return {
    text: formatInternalReference(referenceId, format),
    consumed: 0,
  };
}

function formatInternalReference(referenceId: string, format?: InternalRefFormat): string {
  const division = extractNumeric(referenceId, /\.div([A-Za-z0-9]+)/i)?.toUpperCase();
  const part = extractNumeric(referenceId, /\.part(\d+)/i);
  const section = extractNumeric(referenceId, /\.sect(\d+)/i);
  const subsection = extractNumeric(referenceId, /\.subsect(\d+)/i);
  const article = extractNumeric(referenceId, /\.art(\d+)/i);
  const sentence = extractNumeric(referenceId, /\.sent(\d+)/i);
  const clause = extractNumeric(referenceId, /\.clause(\d+)/i);
  const subclause = extractNumeric(referenceId, /\.subclause(\d+)/i);
  const table = extractNumeric(referenceId, /\.table(\d+)/i);
  const appNote = extractNumeric(referenceId, /\.appnote(\d+)/i);

  const sectionNumber = [part, section].filter(Boolean).join('.');
  const subsectionNumber = [part, section, subsection].filter(Boolean).join('.');
  const articleNumber = [part, section, subsection, article].filter(Boolean).join('.');
  const tableNumber = [part, section, subsection, article, table].filter(Boolean).join('.');

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
    const termId = match[1];
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
    const glossaryDisplay = getGlossaryDisplayText(text, matchEnd, termId);
    
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
  
  // Regex to match [REF:internal:referenceId] or [REF:internal:referenceId:format]
  const crossRefRegex = /\[REF:internal:([^\]:]+)(?::([a-zA-Z]+))?\]/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = crossRefRegex.exec(text)) !== null) {
    const referenceId = match[1];
    const format = match[2] as InternalRefFormat;
    const matchStart = match.index;
    const matchEnd = crossRefRegex.lastIndex;
    
    // Add plain text before the marker
    if (matchStart > lastIndex) {
      nodes.push(text.substring(lastIndex, matchStart));
    }

    const displayText = formatInternalReference(referenceId, format);
    
    nodes.push(
      React.createElement(CrossReferenceLink, {
        key: `crossref-${matchStart}`,
        referenceId,
        displayText,
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
  const noteRegex = /\[REF:internal:([^:\]]*\.note\d+[^:\]]*):(short|long)\]/gi;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = noteRegex.exec(text)) !== null) {
    const noteId = match[1];
    const format = match[2] as 'short' | 'long';
    const matchStart = match.index;
    const matchEnd = noteRegex.lastIndex;
    
    // Add plain text before the marker
    if (matchStart > lastIndex) {
      nodes.push(text.substring(lastIndex, matchStart));
    }
    
    // Generate display text based on format
    // For short format, typically shows a number like "(1)"
    // For long format, shows more descriptive text
    const displayText = format === 'short' ? `(${noteId.split('.').pop()})` : noteId;
    
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
 * It handles glossary terms, cross-references, and note references in a single pass,
 * preserving the exact source order.
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
    markers.push({
      type: 'glossary',
      start: match.index,
      end: glossaryRegex.lastIndex,
      termId: match[1],
    });
  }
  
  // Find dedicated note reference markers (must check before cross-references).
  // This intentionally excludes application notes (appnote), which are handled
  // as regular cross-references (e.g., "Note A-2.1.1.2.(6).").
  const noteRegex = /\[REF:internal:([^:\]]*\.note\d+[^:\]]*):(short|long)\]/gi;
  
  while ((match = noteRegex.exec(sanitizedText)) !== null) {
    markers.push({
      type: 'note',
      start: match.index,
      end: noteRegex.lastIndex,
      noteId: match[1],
      format: match[2] as 'short' | 'long',
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
  
  // Find all cross-reference markers (with optional display format suffix)
  const crossRefRegex = /\[REF:internal:([^\]:]+)(?::([a-zA-Z]+))?\]/g;
  
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
      });
    }
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
  
  // Sort markers by position to maintain source order
  markers.sort((a, b) => a.start - b.start);
  
  // Build the node array
  let lastIndex = 0;
  
  for (const marker of markers) {
    // Add plain text before the marker
    if (marker.start > lastIndex) {
      nodes.push(sanitizedText.substring(lastIndex, marker.start));
    }
    
    // Add the appropriate component based on marker type
    switch (marker.type) {
      case 'glossary': {
        const glossaryDisplay = getGlossaryDisplayText(
          sanitizedText,
          marker.end,
          marker.termId!
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
        lastIndex = marker.end + glossaryDisplay.consumed;
        break;
      }
      
      case 'crossref': {
        const crossRefDisplay = getCrossReferenceDisplayText(
          sanitizedText,
          marker.end,
          marker.referenceId!,
          marker.format as InternalRefFormat
        );

        nodes.push(
          React.createElement(CrossReferenceLink, {
            key: `crossref-${marker.start}`,
            referenceId: marker.referenceId!,
            displayText: crossRefDisplay.text,
            interactive,
          })
        );
        // For cross-references, consume the marker and the display text that follows
        lastIndex = marker.end + crossRefDisplay.consumed;
        break;
      }
      
      case 'note': {
        const displayText = marker.format === 'short' 
          ? getNoteLabel(marker.noteId!)
          : marker.noteId!;
        
        nodes.push(
          React.createElement(NoteReference, {
            key: `note-${marker.start}`,
            referenceId: marker.noteId!,
            text: displayText,
            interactive,
          })
        );
        lastIndex = marker.end;
        break;
      }

      case 'tableNote': {
        nodes.push(
          React.createElement(NoteReference, {
            key: `table-note-${marker.start}`,
            referenceId: marker.tableNoteId!,
            text: getNoteLabel(marker.tableNoteId!),
            interactive,
          })
        );
        lastIndex = marker.end;
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
    }
  }
  
  // Add remaining text after last marker
  if (lastIndex < sanitizedText.length) {
      nodes.push(sanitizedText.substring(lastIndex));
  }
  
  // If no markers found, return the original text
  if (nodes.length === 0) {
    nodes.push(sanitizedText);
  }
  
  return nodes;
}
