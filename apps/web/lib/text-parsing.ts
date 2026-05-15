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
import type { StructuredList } from '@bc-building-code/bcbc-parser';
import { GlossaryTerm } from '../components/reading/GlossaryTerm';
import { NoteReference } from '../components/reading/NoteReference';
import { EquationBlock } from '../components/reading/EquationBlock';
import { CrossReferenceLink } from '../components/reading/CrossReferenceLink';
import { FunctionalStatementLink } from '../components/reading/FunctionalStatementLink';
import { ObjectiveLink } from '../components/reading/ObjectiveLink';
import { StructuredListBlock } from '../components/reading/StructuredListBlock';
import {
  parseReferenceId,
  shouldSuppressReferenceInContext,
  type ReferenceRenderContext,
} from './cross-reference';
import { useEquationStore } from '../stores/equation-store';
import { useStandardsMapStore, type StandardReferenceEntry } from '../stores/standards-map-store';
import { useVersionStore } from '../stores/version-store';

/**
 * Marker type for internal tracking
 */
interface Marker {
  type: 'glossary' | 'crossref' | 'standardRef' | 'note' | 'tableNote' | 'equation' | 'list' | 'functionalStatement' | 'objective' | 'compound';
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
  listType?: string;
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

function isHttpReference(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function normalizeStandardsKey(value: string): string {
  return value.replace(/[^a-z0-9.]/gi, '').toLowerCase();
}

/**
 * Legacy/external reference IDs that have display text mappings but no
 * navigable content in the application. These should render as plain text.
 */
const NON_NAVIGABLE_REFERENCE_IDS = new Set([
  'ex000109.7',
  'en000321',
  'en000354',
  'en000437.1',
  'en000437.2',
  'en000439.1',
  'en000439.2',
  'en000439.8',
  'en000439.9',
  'en000471',
  'en001088',
  'en001211',
  'en001271',
  'en001475',
]);

function isNonNavigableReferenceId(referenceId: string): boolean {
  return NON_NAVIGABLE_REFERENCE_IDS.has(referenceId);
}

function stripTrailingStandardsEdition(value: string): string {
  return value.replace(/-\d{2,4}[A-Za-z0-9]*$/u, '');
}

function findStandardReferenceEntry(
  standardsRefId: string
): StandardReferenceEntry | null {
  const normalizedRefId = normalizeStandardsKey(standardsRefId);
  if (!normalizedRefId) return null;

  const version = useVersionStore.getState().currentVersion || '2024';
  const cache = useStandardsMapStore.getState().cache;
  const versionCacheKey = `standards-map:${version}`;
  const standardsMap =
    cache.get(versionCacheKey) ||
    Array.from(cache.values())[0];

  if (!standardsMap) {
    return null;
  }

  const matchedEntry = Object.entries(standardsMap).find(([key, value]) => {
    if (normalizeStandardsKey(key) === normalizedRefId) return true;
    if (value.standard_ref_id && normalizeStandardsKey(value.standard_ref_id) === normalizedRefId) return true;
    if (value.standard_id && normalizeStandardsKey(value.standard_id) === normalizedRefId) return true;
    // Some map keys have a "d-" prefix (Appendix D standards) that the reference
    // ID omits. Try matching the normalized key with the "d-" prefix stripped.
    if (key.startsWith('d-')) {
      const strippedKey = normalizeStandardsKey(key.slice(2));
      if (strippedKey && strippedKey === normalizedRefId) return true;
    }
    return false;
  })?.[1];

  return matchedEntry || null;
}

function formatStandardReferenceText(
  standardsRefId: string,
  explicitLabel?: string
): string {
  const matchedEntry = findStandardReferenceEntry(standardsRefId);
  if (!matchedEntry) {
    return explicitLabel || standardsRefId;
  }

  const abbreviation = [
    matchedEntry.agency,
    stripTrailingStandardsEdition(matchedEntry.full_number || matchedEntry.number || ''),
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim())
    .join(' ');
  const title = matchedEntry.full_title?.trim() || matchedEntry.title?.trim() || '';

  if (abbreviation && title) {
    return `${abbreviation}, "${title}"`;
  }

  return abbreviation || title || explicitLabel || standardsRefId;
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
    /^(Appendix|Part|Section|Subsection|Article|Sentence|Clause|Subclause|Table|Figure|Note)\s+/i
  );
  if (!displayMatch) return displayText;

  const duplicatedType = displayMatch[1];
  const acceptablePrefixes = {
    Appendix: ['Appendix', 'Appendices'],
    Part: ['Part', 'Parts'],
    Section: ['Section', 'Sections'],
    Subsection: ['Subsection', 'Subsections'],
    Article: ['Article', 'Articles'],
    Sentence: ['Sentence', 'Sentences'],
    Clause: ['Clause', 'Clauses'],
    Subclause: ['Subclause', 'Subclauses'],
    Table: ['Table', 'Tables'],
    Figure: ['Figure', 'Figures'],
    Note: ['Note', 'Notes'],
  } as const;

  const allowedForms = acceptablePrefixes[duplicatedType as keyof typeof acceptablePrefixes] || [
    duplicatedType,
  ];

  const escapedAllowedForms = allowedForms.map((value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  if (new RegExp(`(?:${escapedAllowedForms.join('|')})\\s*$`, 'i').test(precedingText)) {
    return displayText.slice(displayMatch[0].length);
  }

  const normalizedPrecedingText = precedingText
    .replace(/\[REF:[^\]]+\]/gi, '(ref)')
    .replace(/\s+/g, ' ')
    .trimEnd();
  const priorReferenceListPattern = new RegExp(
    `(?:${escapedAllowedForms.join('|')})\\s+(?:(?:\\(ref\\)|\\([^)]+\\)|(?:${escapedAllowedForms.join('|')})\\s+\\([^)]+\\))\\s*(?:,\\s*)?(?:(?:and|or)\\s*)?)+$`,
    'i'
  );

  if (!priorReferenceListPattern.test(normalizedPrecedingText)) {
    return displayText;
  }

  return displayText.slice(displayMatch[0].length);
}

function ensureTrailingPeriodBeforeTitleRef(
  precedingSegment: string,
  referenceId?: string,
  format?: InternalRefFormat
): string {
  if (format !== 'title' || !referenceId) return precedingSegment;

  const parsedReference = parseReferenceId(referenceId);
  if (!parsedReference || parsedReference.kind !== 'section' || !parsedReference.section) {
    return precedingSegment;
  }

  const match = precedingSegment.match(/^(.*?)(\s*)$/s);
  if (!match) return precedingSegment;

  const body = match[1];
  const trailingWhitespace = match[2] || '';
  if (!body || body.endsWith('.')) return precedingSegment;

  // Apply for section/subsection/article numbering tokens like "9.3", "9.3.1", "9.3.1.4".
  if (!/\b\d+(?:\.\d+)+$/.test(body)) {
    return precedingSegment;
  }

  return `${body}.${trailingWhitespace}`;
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
  // Some legacy/amendment payloads also include raw CHANGE wrappers that should
  // not surface in reading text.
  // Render as plain text by stripping these wrapper tokens.
  return text
    .replace(/<>/g, '')
    .replace(/<\/>/g, '')
    .replace(/<CHANGE:[^>]+>/gi, '')
    .replace(/<\/CHANGE>/gi, '');
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
    if (!text.includes('\n')) return [text];
    return text.split('\n').reduce<React.ReactNode[]>((acc, line, i) => {
      if (i > 0) acc.push(React.createElement('br', { key: `nl-${startIndex}-${i}` }));
      if (line) acc.push(line);
      return acc;
    }, []);
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

    // Add plain text before this match (preserving newlines as <br>)
    if (matchStart > lastIndex) {
      nodes.push(...parseInlineFormatting(text.substring(lastIndex, matchStart), interactive, startIndex + lastIndex));
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

  // Add remaining text (preserving newlines as <br>)
  if (lastIndex < text.length) {
    nodes.push(...parseInlineFormatting(text.substring(lastIndex), interactive, startIndex + lastIndex));
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
  const trimmedPayload = payload.trim();
  if (isHttpReference(trimmedPayload)) {
    const urlPayloadMatch = trimmedPayload.match(/^(https?:\/\/[^\s:]+[^\s]*?)(?::([\s\S]*))?$/i);
    if (urlPayloadMatch) {
      const standardsId = urlPayloadMatch[1].trim();
      const rawLabel = urlPayloadMatch[2] ?? '';
      const trailingWhitespace = (rawLabel.match(/\s+$/) || [''])[0].length;
      const label = rawLabel.replace(/\s+$/, '');

      return {
        standardsId,
        label: label.length > 0 ? label : undefined,
        trailingWhitespace: trailingWhitespace > 0 ? trailingWhitespace : undefined,
      };
    }
  }

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
  format?: InternalRefFormat,
  renderContext?: ReferenceRenderContext
): GlossaryDisplay {
  // Legacy external IDs that don't follow the nbc.* naming convention.
  // Map them to their known display text.
  const legacyIdMap: Record<string, string> = {
    'ex000109.7': 'Section D-6',
    'en000354': 'Note A-9.33.1.1.(2)',
    'en001088': 'Note A-9.36.5.3.',
    'en001211': 'Note A-9.7.5.2.(2)',
    'en001271': 'Note A-9.33.2.1.(2)',
    'en001475': 'Note A-9.36.5.3.(1)',
  };
  const legacyText = legacyIdMap[referenceId];
  if (legacyText) {
    return { text: legacyText, consumed: 0 };
  }

  const remaining = fullText.slice(markerEnd);
  const parsedReference = parseReferenceId(referenceId);
  const shouldExpandShortArticleRef =
    format === 'short' &&
    renderContext?.kind === 'article' &&
    parsedReference?.kind === 'section' &&
    Boolean(parsedReference.article) &&
    (Boolean(parsedReference.sentence) || Boolean(parsedReference.clause)) &&
    !shouldSuppressReferenceInContext(referenceId, renderContext);

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
    displayTextMatch = remaining.match(/^((?:Parts?|Articles?|Figures?|Sections?|Sentences?|Clauses?|Subclauses?|Tables?|Note)\s+[A-Z0-9][A-Z0-9.\-()]*\.?)/i);
  } else if (format === 'short' && !shouldExpandShortArticleRef) {
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
  const fallback = formatInternalReference(
    referenceId,
    shouldExpandShortArticleRef ? 'medium' : format
  );
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
  const division = extractNumeric(referenceId, /\.div([A-Za-z0-9]+)/i)?.toUpperCase();
  const withDivisionSuffix = (label: string): string =>
    format === 'long' && division ? `${label} of Division ${division}` : label;

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
    return isShortNumeric ? `(${number})` : withDivisionSuffix(`Subclause (${number})`);
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
    return isShortNumeric ? sectionNumber : withDivisionSuffix(`Section ${sectionNumber}.`);
  }

  if (part) {
    return withDivisionSuffix(`Part ${part}`);
  }

  if (table) {
    return withDivisionSuffix(`Table ${table}`);
  }

  return referenceId;
}

function getSpectableTableNoteNumber(referenceId: string): string | null {
  const match = referenceId.match(
    /^nbc\.div[A-Za-z0-9]+\.part\d+\.spectables\d+\.table\d+\.note(\d+)$/i
  );
  return match?.[1] || null;
}

function getSpectableTableNoteLabel(referenceId: string): string | null {
  const noteNumber = getSpectableTableNoteNumber(referenceId);
  return noteNumber ? `(${noteNumber})` : null;
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

    const spectableTableNoteLabel = getSpectableTableNoteLabel(referenceId);
    const baseDisplay = customLabel || spectableTableNoteLabel || formatInternalReference(referenceId, format);
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
        preserveDisplayText: Boolean(customLabel || spectableTableNoteLabel),
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
  localEquations: TextEquationEntry[] = [],
  localLists: StructuredList[] = [],
  renderContext?: ReferenceRenderContext
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
  const consumedLocalListIndexes = new Set<number>();

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
    if (getSpectableTableNoteNumber(match[1])) {
      continue;
    }
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

  const listRegex = /\[LIST:([a-z-]+)\]/gi;

  while ((match = listRegex.exec(sanitizedText)) !== null) {
    markers.push({
      type: 'list',
      start: match.index,
      end: listRegex.lastIndex,
      listType: (match[1] || '').toLowerCase(),
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

  for (let markerIndex = 0; markerIndex < markers.length; markerIndex += 1) {
    const marker = markers[markerIndex];
    const previousMarker = markerIndex > 0 ? markers[markerIndex - 1] : undefined;
    const nextMarker = markerIndex < markers.length - 1 ? markers[markerIndex + 1] : undefined;
    // Skip markers that overlap with previously consumed text
    if (marker.start < lastIndex) {
      continue;
    }
    // Add plain text before the marker
    if (marker.start > lastIndex) {
      const precedingSegment =
        marker.type === 'crossref'
          ? ensureTrailingPeriodBeforeTitleRef(
            sanitizedText.substring(lastIndex, marker.start),
            marker.referenceId,
            marker.format as InternalRefFormat
          )
          : sanitizedText.substring(lastIndex, marker.start);

      nodes.push(
        ...parseInlineFormatting(
          precedingSegment,
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
        const spectableTableNoteLabel = getSpectableTableNoteLabel(marker.referenceId!);

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
          : spectableTableNoteLabel
            ? { text: spectableTableNoteLabel, consumed: 0 }
            : getCrossReferenceDisplayText(
              sanitizedText,
              marker.end,
              marker.referenceId!,
              marker.format as InternalRefFormat,
              renderContext
            );

        const normalizedDisplayText = avoidDuplicateTrailingPeriod(
          avoidDuplicateLeadingReferenceType(
            sanitizedText.slice(0, marker.start),
            crossRefDisplay.text
          ),
          sanitizedText.slice(marker.end + crossRefDisplay.consumed)
        );
        const suppressReference =
          (interactive &&
            shouldSuppressReferenceInContext(marker.referenceId!, renderContext)) ||
          isNonNavigableReferenceId(marker.referenceId!);

        if (suppressReference) {
          nodes.push(
            ...parseInlineFormatting(
              normalizedDisplayText,
              interactive,
              marker.start
            )
          );
        } else {
          nodes.push(
            React.createElement(CrossReferenceLink, {
              key: `crossref-${marker.start}`,
              referenceId: marker.referenceId!,
              displayText: normalizedDisplayText,
              format: marker.format as InternalRefFormat,
              interactive,
              preserveDisplayText: Boolean(marker.crossRefLabel || spectableTableNoteLabel),
            })
          );
        }
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
        const isPlainExternalReference =
          standardsType === 'external' && !isHttpReference(standardsId);

        const standardsText =
          standardsType === 'standard'
            ? formatStandardReferenceText(standardsId, standardsLabel)
            : standardsLabel || standardsId;

        if (isPlainExternalReference || standardsType === 'standard') {
          nodes.push(
            React.createElement(
              React.Fragment,
              { key: `standards-${marker.start}` },
              ...parseInlineFormatting(standardsText, interactive, marker.start)
            )
          );
        } else {
          nodes.push(
            React.createElement(CrossReferenceLink, {
              key: `standards-${marker.start}`,
              referenceId: `${standardsType}:${standardsId}`,
              displayText: standardsText,
              interactive,
            })
          );
        }
        if (trailingWhitespace > 0) {
          nodes.push(' '.repeat(trailingWhitespace));
        }

        // If standards markers are directly adjacent in source, add comma-space separation.
        if (
          previousMarker?.type === 'standardRef' &&
          previousMarker.end === marker.start
        ) {
          const insertionIndex = nodes.length - (trailingWhitespace > 0 ? 1 : 0) - 1;
          if (insertionIndex >= 0) {
            nodes.splice(insertionIndex, 0, ', ');
          }
        }

        // If this standard marker is immediately followed by plain word text, insert a space.
        const hasImmediateNextMarker = Boolean(nextMarker && nextMarker.start === marker.end);
        if (
          !hasImmediateNextMarker &&
          marker.end < sanitizedText.length &&
          sanitizedText[marker.end] &&
          !/\s/.test(sanitizedText[marker.end]) &&
          !/^[,.:;)\]]$/.test(sanitizedText[marker.end])
        ) {
          nodes.push(' ');
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

      case 'list': {
        const targetIndex = localLists.findIndex(
          (list, index) =>
            !consumedLocalListIndexes.has(index) &&
            list.type.toLowerCase() === marker.listType
        );

        if (targetIndex === -1) {
          lastIndex = marker.end;
          break;
        }

        consumedLocalListIndexes.add(targetIndex);
        const list = localLists[targetIndex];

        // Pre-assign sub-lists to each item that contains a [LIST:...] marker.
        // We do this at parse time (synchronously, before React renders) so the
        // renderText callback is a pure function with no shared mutable state —
        // which is required for correctness under React StrictMode double-renders
        // and any other re-renders.
        const remainingLists = localLists.filter(
          (_, i) => !consumedLocalListIndexes.has(i)
        );

        // Walk through items in order, assigning sub-lists sequentially.
        let subListCursor = 0;
        const itemSubLists: StructuredList[][] = list.items.map((item) => {
          const itemContent = (item as { content?: string; symbol?: string; description?: string; definition?: string }).content
            ?? (item as { symbol?: string }).symbol
            ?? (item as { description?: string }).description
            ?? (item as { definition?: string }).definition
            ?? '';
          const markerCount = (itemContent.match(/\[LIST:[a-z-]+\]/gi) || []).length;
          if (markerCount === 0) return [];
          const assigned = remainingLists.slice(subListCursor, subListCursor + markerCount);
          subListCursor += assigned.length;
          return assigned;
        });

        nodes.push(
          React.createElement(StructuredListBlock, {
            key: `list-${marker.start}`,
            list,
            interactive,
            renderText: (value: string, itemIndex?: number) => {
              const subLists = itemIndex !== undefined ? (itemSubLists[itemIndex] ?? []) : [];
              // Rewrite [LIST:bulleted] markers in the item content to match the
              // actual type of each assigned sub-list. This is needed when the
              // parent renderParagraph has remapped bulleted→roman for sub-lists
              // but the item content string still contains [LIST:bulleted].
              let subListIdx = 0;
              const rewrittenValue = value.replace(/\[LIST:bulleted\]/gi, () => {
                const subList = subLists[subListIdx++];
                return subList ? `[LIST:${subList.type}]` : '[LIST:bulleted]';
              });
              return parseTextWithMarkers(rewrittenValue, [], interactive, [], subLists, renderContext);
            },
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

  // Only fall back to raw text when no markers were found at all.
  // If markers were found but could not be resolved, returning the raw text
  // would leak placeholder tokens like [LIST:bulleted] into the UI.
  if (nodes.length === 0 && markers.length === 0) {
    return parseInlineFormatting(sanitizedText, interactive, 0);
  }

  return nodes;
}
