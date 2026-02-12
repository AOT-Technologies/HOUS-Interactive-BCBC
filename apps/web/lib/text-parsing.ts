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

import React from 'react';
import { GlossaryTerm } from '../components/reading/GlossaryTerm';
import { NoteReference } from '../components/reading/NoteReference';

/**
 * Marker type for internal tracking
 */
interface Marker {
  type: 'glossary' | 'crossref' | 'note';
  start: number;
  end: number;
  termId?: string;
  referenceId?: string;
  noteId?: string;
  format?: InternalRefFormat;
}

type InternalRefFormat = 'short' | 'long' | 'medium' | 'title' | 'number' | 'shortNum' | undefined;

interface GlossaryDisplay {
  text: string;
  consumed: number;
}

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
  const immediateTermMatch = remaining.match(/^([A-Za-z][A-Za-z0-9'./-]*)/);

  if (immediateTermMatch) {
    const display = immediateTermMatch[1];
    return { text: display, consumed: display.length };
  }

  // Fallback for malformed source where marker is not immediately followed by term text.
  return { text: termId.replace(/-/g, ' '), consumed: 0 };
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

  if (articleNumber) {
    return isShortNumeric ? articleNumber : `Article ${articleNumber}.`;
  }

  if (subsectionNumber) {
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
    
    // For now, render as plain text with a placeholder
    // The actual CrossReferenceLink component will be implemented in task 8.1
    // TODO: Replace with actual CrossReferenceLink component
    if (interactive) {
      nodes.push(
        React.createElement('span', {
          key: `crossref-${matchStart}`,
          className: 'cross-reference-link',
          style: { color: '#1A5A96', textDecoration: 'underline' }
        }, displayText)
      );
    } else {
      nodes.push(displayText);
    }
    
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
  interactive: boolean = true
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const markers: Marker[] = [];
  
  // Find all glossary term markers
  const glossaryRegex = /\[REF:term:([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  
  while ((match = glossaryRegex.exec(text)) !== null) {
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
  
  while ((match = noteRegex.exec(text)) !== null) {
    markers.push({
      type: 'note',
      start: match.index,
      end: noteRegex.lastIndex,
      noteId: match[1],
      format: match[2] as 'short' | 'long',
    });
  }
  
  // Find all cross-reference markers (with optional display format suffix)
  const crossRefRegex = /\[REF:internal:([^\]:]+)(?::([a-zA-Z]+))?\]/g;
  
  while ((match = crossRefRegex.exec(text)) !== null) {
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
  
  // Sort markers by position to maintain source order
  markers.sort((a, b) => a.start - b.start);
  
  // Build the node array
  let lastIndex = 0;
  
  for (const marker of markers) {
    // Add plain text before the marker
    if (marker.start > lastIndex) {
      nodes.push(text.substring(lastIndex, marker.start));
    }
    
    // Add the appropriate component based on marker type
    switch (marker.type) {
      case 'glossary': {
        const glossaryDisplay = getGlossaryDisplayText(
          text,
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
        lastIndex = marker.end + glossaryDisplay.consumed;
        break;
      }
      
      case 'crossref': {
        const displayText = formatInternalReference(
          marker.referenceId!,
          marker.format as InternalRefFormat
        );

        // TODO: Replace with actual CrossReferenceLink component in task 8.1
        if (interactive) {
          nodes.push(
            React.createElement('span', {
              key: `crossref-${marker.start}`,
              className: 'cross-reference-link',
              style: { color: '#1A5A96', textDecoration: 'underline' }
            }, displayText)
          );
        } else {
          nodes.push(displayText);
        }
        break;
      }
      
      case 'note': {
        const displayText = marker.format === 'short' 
          ? `(${marker.noteId!.split('.').pop()})` 
          : marker.noteId!;
        
        nodes.push(
          React.createElement(NoteReference, {
            key: `note-${marker.start}`,
            referenceId: marker.noteId!,
            text: displayText,
            interactive,
          })
        );
        break;
      }
    }
    
    if (marker.type !== 'glossary') {
      lastIndex = marker.end;
    }
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
