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
  format?: 'short' | 'long';
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
  glossaryTerms: string[],
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
    const termText = termId.replace(/-/g, ' ');
    
    // Add GlossaryTerm component
    nodes.push(
      React.createElement(GlossaryTerm, {
        key: `glossary-${matchStart}`,
        termId,
        text: termText,
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
  
  // Regex to match [REF:internal:referenceId] but NOT [REF:internal:noteId:short|long]
  // This regex ensures we don't match note references
  const crossRefRegex = /\[REF:internal:([^\]:]+)\](?!:)/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = crossRefRegex.exec(text)) !== null) {
    const referenceId = match[1];
    const matchStart = match.index;
    const matchEnd = crossRefRegex.lastIndex;
    
    // Add plain text before the marker
    if (matchStart > lastIndex) {
      nodes.push(text.substring(lastIndex, matchStart));
    }
    
    // For now, render as plain text with a placeholder
    // The actual CrossReferenceLink component will be implemented in task 8.1
    // TODO: Replace with actual CrossReferenceLink component
    if (interactive) {
      nodes.push(
        React.createElement('span', {
          key: `crossref-${matchStart}`,
          className: 'cross-reference-link',
          style: { color: '#1A5A96', textDecoration: 'underline' }
        }, referenceId)
      );
    } else {
      nodes.push(referenceId);
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
  
  // Regex to match [REF:internal:noteId:short] or [REF:internal:noteId:long]
  const noteRegex = /\[REF:internal:([^:]+):(short|long)\]/g;
  
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
  glossaryTerms: string[] = [],
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
  
  // Find all note reference markers (must check before cross-references)
  const noteRegex = /\[REF:internal:([^:]+):(short|long)\]/g;
  
  while ((match = noteRegex.exec(text)) !== null) {
    markers.push({
      type: 'note',
      start: match.index,
      end: noteRegex.lastIndex,
      noteId: match[1],
      format: match[2] as 'short' | 'long',
    });
  }
  
  // Find all cross-reference markers (excluding note references)
  const crossRefRegex = /\[REF:internal:([^\]:]+)\](?!:)/g;
  
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
        const termText = marker.termId!.replace(/-/g, ' ');
        nodes.push(
          React.createElement(GlossaryTerm, {
            key: `glossary-${marker.start}`,
            termId: marker.termId!,
            text: termText,
            interactive,
          })
        );
        break;
      }
      
      case 'crossref': {
        // TODO: Replace with actual CrossReferenceLink component in task 8.1
        if (interactive) {
          nodes.push(
            React.createElement('span', {
              key: `crossref-${marker.start}`,
              className: 'cross-reference-link',
              style: { color: '#1A5A96', textDecoration: 'underline' }
            }, marker.referenceId!)
          );
        } else {
          nodes.push(marker.referenceId!);
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
    
    lastIndex = marker.end;
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
