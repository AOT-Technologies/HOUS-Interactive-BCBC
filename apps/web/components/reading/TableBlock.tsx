'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormingPartReference, StructuredList, Table, TableCellContent } from '@bc-building-code/bcbc-parser';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import { resolveImagePath } from '../../lib/image-config';
import { StructuredListBlock } from './StructuredListBlock';
import './TableBlock.css';

export interface TableBlockProps {
  table: Table;
  interactive?: boolean;
  effectiveDate?: string;
  renderContext?: ReferenceRenderContext;
  /** Number of sibling tables in the same appendix article. When 1, letter suffix is omitted. */
  appendixSiblingTableCount?: number;
}

const LANDSCAPE_PRINT_CAPACITY_REM = 65;
const LARGE_TABLE_ROW_THRESHOLD = 250;
const INITIAL_BODY_ROW_RENDER_COUNT = 120;
const BODY_ROW_RENDER_CHUNK_SIZE = 120;
const ROW_LOAD_SCROLL_THRESHOLD_PX = 240;

type RawTableCell = {
  content?: string | RawTableCellContent[];
  text?: string;
  align?: 'left' | 'center' | 'right';
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
};

type RawTableCellContent =
  | TableCellContent
  | {
    type: 'list';
    list_type?: StructuredList['type'];
    items?: unknown[];
  };

type RawTableRow =
  | {
    id?: string;
    type?: 'header_row' | 'body_row';
    cells?: RawTableCell[];
    revisions?: Array<{
      effective_date?: string;
      deleted?: boolean;
      cells?: RawTableCell[];
    }>;
  }
  | RawTableCell[];

type RawTableStructure = {
  header_rows?: RawTableRow[];
  body_rows?: RawTableRow[];
};

type RawTableRevision = {
  effective_date?: string;
  title?: string;
  caption?: string;
  structure?: RawTableStructure;
  table_notes?: RawTableNote[];
};

type RawTableNote = {
  id?: string;
  vendor_id?: string;
  content?: string;
  list?: StructuredList;
};

type TableWithRawSupport = Table & {
  structure?: RawTableStructure;
  revisions?: RawTableRevision[];
  table_notes?: RawTableNote[];
  forming_part?: FormingPartReference[];
  number?: string | number;
  title?: string;
  caption?: string;
};

type ParsedInternalReference = {
  appendixLetter?: string;
  appendixSection?: string;
  part?: string;
  section?: string;
  subsection?: string;
  article?: string;
  paragraph?: string;
  sentence?: string;
  clause?: string;
  subclause?: string;
  table?: string;
};

type TableCellFigureContent = Extract<TableCellContent, { type: 'figure' }>;

/**
 * Renders a figure within a table cell
 */
const TableCellFigure: React.FC<{ figure: TableCellFigureContent }> = ({ figure }) => {
  if (!figure.graphic) return null;

  const imagePath = resolveImagePath(figure.graphic.src);
  if (!imagePath) return null;

  return (
    <figure className="table-block__figure">
      {figure.title && (
        <div className="table-block__figure-title">{figure.title}</div>
      )}
      <img
        src={imagePath}
        alt={figure.graphic.alt_text}
        className="table-block__figure-image"
        loading="lazy"
      />
    </figure>
  );
};

/**
 * Renders the content of a table cell (text, figure, or mixed)
 */
const renderFormattedText = (
  text: string,
  interactive: boolean,
  renderContext?: ReferenceRenderContext,
  localLists: StructuredList[] = []
): React.ReactNode[] => {
  const normalizedText = text
    // Legacy placeholders used in some table content
    .replace(/<>/g, '<italic>')
    .replace(/<\/>/g, '</italic>')
    // Normalize dash markers used in tables and common mojibake variants.
    .replace(/â€”/g, '-')
    .replace(/â€“/g, '-')
    .replace(/—/g, '-')
    .replace(/–/g, '-');

  const tokenRegex = /(<italic>[\s\S]*?<\/italic>|<bold>[\s\S]*?<\/bold>|\^\{[\s\S]*?\}|_\{[\s\S]*?\})/gi;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let chunkIndex = 0;

  while ((match = tokenRegex.exec(normalizedText)) !== null) {
    const matchStart = match.index;
    const matchEnd = tokenRegex.lastIndex;
    const token = match[0] || '';

    if (matchStart > lastIndex) {
      nodes.push(
        <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
          {parseTextWithMarkers(
            normalizedText.slice(lastIndex, matchStart),
            [],
            interactive,
            [],
            localLists,
            renderContext
          )}
        </React.Fragment>
      );
      chunkIndex += 1;
    }

    if (/^<italic>/i.test(token)) {
      const italicText = token.replace(/^<italic>/i, '').replace(/<\/italic>$/i, '');
      nodes.push(
        <em key={`table-italic-${chunkIndex}`}>
          {parseTextWithMarkers(italicText, [], interactive, [], localLists, renderContext)}
        </em>
      );
    } else if (/^<bold>/i.test(token)) {
      const boldText = token.replace(/^<bold>/i, '').replace(/<\/bold>$/i, '');
      nodes.push(
        <strong key={`table-bold-${chunkIndex}`}>
          {parseTextWithMarkers(boldText, [], interactive, [], localLists, renderContext)}
        </strong>
      );
    } else if (/^\^\{/.test(token)) {
      const superText = token.replace(/^\^\{/, '').replace(/\}$/, '');
      nodes.push(
        <sup key={`table-sup-${chunkIndex}`}>
          {parseTextWithMarkers(superText, [], interactive, [], localLists, renderContext)}
        </sup>
      );
    } else if (/^_\{/.test(token)) {
      const subText = token.replace(/^_\{/, '').replace(/\}$/, '');
      nodes.push(
        <sub key={`table-sub-${chunkIndex}`}>
          {parseTextWithMarkers(subText, [], interactive, [], localLists, renderContext)}
        </sub>
      );
    }

    chunkIndex += 1;
    lastIndex = matchEnd;
  }

  if (lastIndex < normalizedText.length) {
    nodes.push(
      <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
        {parseTextWithMarkers(normalizedText.slice(lastIndex), [], interactive, [], localLists, renderContext)}
      </React.Fragment>
    );
  }

  if (nodes.length === 0) {
    nodes.push(
      <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
        {parseTextWithMarkers(normalizedText, [], interactive, [], localLists, renderContext)}
      </React.Fragment>
    );
  }

  return nodes;
};

const renderCellContent = (
  content: string | TableCellContent[],
  interactive: boolean,
  renderContext?: ReferenceRenderContext
): React.ReactNode => {
  // Legacy format: plain string
  if (typeof content === 'string') {
    return renderFormattedText(content, interactive, renderContext);
  }

  // New format: array of content items
  return content.map((item, index) => {
    if (item.type === 'text') {
      return (
        <React.Fragment key={index}>
          {renderFormattedText(item.value || '', interactive, renderContext)}
        </React.Fragment>
      );
    } else if (item.type === 'figure') {
      return <TableCellFigure key={index} figure={item} />;
    } else if (item.type === 'list') {
      return (
        <StructuredListBlock
          key={index}
          list={item.list}
          interactive={interactive}
          renderText={(value: string) =>
            parseTextWithMarkers(value, [], interactive, [], [], renderContext)
          }
        />
      );
    }
    return null;
  });
};

const getActiveRevision = <T extends { effective_date?: string }>(
  revisions: T[] | undefined,
  effectiveDate?: string
): T | undefined => {
  if (!revisions || revisions.length === 0) return undefined;

  const sorted = [...revisions].sort((a, b) =>
    (b.effective_date || '').localeCompare(a.effective_date || '')
  );

  if (!effectiveDate) return sorted[0];

  return sorted.find((rev) => (rev.effective_date || '') <= effectiveDate) || sorted[sorted.length - 1];
};

const normalizeStructuredList = (
  listType: StructuredList['type'] | undefined,
  items: unknown[] | undefined
): StructuredList | null => {
  if (!listType || !Array.isArray(items)) {
    return null;
  }

  switch (listType) {
    case 'bulleted':
    case 'numbered':
    case 'alphabetic':
      return {
        type: listType,
        items: items
          .filter((item): item is { id?: string; content: string } =>
            Boolean(item && typeof item === 'object' && typeof (item as { content?: unknown }).content === 'string')
          )
          .map((item) => ({
            id: item.id,
            content: item.content,
          })),
      };
    case 'variable':
    case 'symbol':
      return {
        type: listType,
        items: items
          .filter(
            (item): item is { id?: string; symbol: string; description: string } =>
              Boolean(
                item &&
                typeof item === 'object' &&
                typeof (item as { symbol?: unknown }).symbol === 'string' &&
                typeof (item as { description?: unknown }).description === 'string'
              )
          )
          .map((item) => ({
            id: item.id,
            symbol: item.symbol,
            description: item.description,
          })),
      };
    case 'definition':
      return {
        type: 'definition',
        items: items
          .filter(
            (item): item is { id: string; term: string; definition: string } =>
              Boolean(
                item &&
                typeof item === 'object' &&
                typeof (item as { id?: unknown }).id === 'string' &&
                typeof (item as { term?: unknown }).term === 'string' &&
                typeof (item as { definition?: unknown }).definition === 'string'
              )
          )
          .map((item) => ({
            id: item.id,
            term: item.term,
            definition: item.definition,
          })),
      };
    case 'organization':
      return {
        type: 'organization',
        items: items
          .filter(
            (item): item is { id: string; abbreviation: string; fullName: string; website?: string } =>
              Boolean(
                item &&
                typeof item === 'object' &&
                typeof (item as { id?: unknown }).id === 'string' &&
                typeof (item as { abbreviation?: unknown }).abbreviation === 'string' &&
                typeof (item as { fullName?: unknown }).fullName === 'string'
              )
          )
          .map((item) => ({
            id: item.id,
            abbreviation: item.abbreviation,
            fullName: item.fullName,
            website: item.website,
          })),
      };
    default:
      return null;
  }
};

const normalizeTableCellContent = (item: RawTableCellContent): TableCellContent | null => {
  if (!item || typeof item !== 'object' || typeof item.type !== 'string') {
    return null;
  }

  if (item.type === 'list') {
    if ('list' in item && item.list) {
      return item as TableCellContent;
    }

    const rawListItem = item as {
      type: 'list';
      list_type?: StructuredList['type'];
      items?: unknown[];
    };
    const normalizedList = normalizeStructuredList(rawListItem.list_type, rawListItem.items);
    if (!normalizedList) {
      return null;
    }

    return {
      type: 'list',
      list: normalizedList,
    };
  }

  return item as TableCellContent;
};

const normalizeCell = (cell: RawTableCell, isHeader: boolean) => ({
  content: Array.isArray(cell.content)
    ? cell.content
      .map(normalizeTableCellContent)
      .filter((item): item is TableCellContent => item !== null)
    : cell.content ?? cell.text ?? '',
  align: cell.align,
  colspan: typeof cell.colspan === 'number' && cell.colspan > 0 ? cell.colspan : undefined,
  rowspan: typeof cell.rowspan === 'number' && cell.rowspan > 0 ? cell.rowspan : undefined,
  isHeader: cell.isHeader ?? isHeader,
});

const normalizeRows = (
  rows: RawTableRow[],
  isHeader: boolean,
  effectiveDate?: string,
  rowPrefix: string = 'row'
) => {
  return (
    rows
      .map((row, rowIndex) => {
        const rowObject = Array.isArray(row) ? { cells: row } : row;
        const activeRowRevision = Array.isArray(row)
          ? undefined
          : getActiveRevision(rowObject.revisions, effectiveDate);
        if (activeRowRevision && 'deleted' in activeRowRevision && activeRowRevision.deleted) {
          return null;
        }
        const resolvedCells = activeRowRevision?.cells || rowObject.cells || [];
        const cells = resolvedCells.map((cell) => normalizeCell(cell, isHeader));
        return {
          id: rowObject.id || `${rowPrefix}-${rowIndex}`,
          type: rowObject.type,
          cells,
        };
      })
      .filter(Boolean) as Array<{
        id?: string;
        type?: 'header_row' | 'body_row';
        cells: ReturnType<typeof normalizeCell>[];
      }>
  );
};

const extractNumeric = (value: string, pattern: RegExp): string | undefined =>
  value.match(pattern)?.[1];

const toAlphabetOrdinal = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return String(value);
  }

  let current = value;
  let result = '';

  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(97 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }

  return result;
};

const toRoman = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return String(value);
  }

  const numerals: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];

  let remainder = Math.floor(value);
  let result = '';

  for (const [numericValue, numeral] of numerals) {
    while (remainder >= numericValue) {
      result += numeral;
      remainder -= numericValue;
    }
  }

  return result;
};

const parseInternalReference = (referenceId: string): ParsedInternalReference => {
  const appendixMatch = referenceId.match(
    /^nbc\.div[A-Za-z0-9]+\.appendix([A-Za-z])(?:\.appsect(\d+))?(?:\.subsect(\d+))?(?:\.article(\d+))?(?:\.para(\d+))?(?:\.table(\d+))?/i
  );

  if (appendixMatch) {
    return {
      appendixLetter: appendixMatch[1]?.toUpperCase(),
      appendixSection: appendixMatch[2],
      subsection: appendixMatch[3],
      article: appendixMatch[4],
      paragraph: appendixMatch[5],
      table: appendixMatch[6],
    };
  }

  return {
    part: extractNumeric(referenceId, /\.part(\d+)/i),
    section: extractNumeric(referenceId, /\.sect(\d+)/i),
    subsection: extractNumeric(referenceId, /\.subsect(\d+)/i),
    article: extractNumeric(referenceId, /\.art(\d+)/i),
    sentence: extractNumeric(referenceId, /\.sent(\d+)/i),
    clause: extractNumeric(referenceId, /\.clause(\d+)/i),
    subclause: extractNumeric(referenceId, /\.subclause(\d+)/i),
    table: extractNumeric(referenceId, /\.table(\d+)/i),
  };
};

const buildArticleReference = (referenceId: string): string | null => {
  const parsed = parseInternalReference(referenceId);

  if (parsed.appendixLetter && parsed.appendixSection) {
    return [parsed.appendixLetter, parsed.appendixSection, parsed.subsection, parsed.article]
      .filter(Boolean)
      .join('.');
  }

  if (!parsed.part || !parsed.section || !parsed.subsection || !parsed.article) {
    return null;
  }

  return `${parsed.part}.${parsed.section}.${parsed.subsection}.${parsed.article}`;
};

const getResolvedTableNumber = (table: TableWithRawSupport, siblingTableCount?: number): string => {
  if (table.number) {
    return String(table.number);
  }

  const parsedFromId = parseInternalReference(table.id);
  if (parsedFromId.appendixLetter && parsedFromId.table) {
    if (parsedFromId.appendixSection && parsedFromId.subsection && parsedFromId.article) {
      const baseNumber = `${parsedFromId.appendixLetter}-${[
        parsedFromId.appendixSection,
        parsedFromId.subsection,
        parsedFromId.article,
      ].join('.')}`;
      // Only append letter suffix when there are multiple tables in the article
      if (siblingTableCount != null && siblingTableCount <= 1) {
        return baseNumber;
      }
      const tableIndex = parseInt(parsedFromId.table, 10);
      const tableLetter = toAlphabetOrdinal(tableIndex).toUpperCase();
      return `${baseNumber}-${tableLetter}`;
    }

    return `${parsedFromId.appendixLetter}-${parsedFromId.table}`;
  }

  if (
    parsedFromId.appendixLetter &&
    parsedFromId.appendixSection &&
    parsedFromId.subsection &&
    parsedFromId.article &&
    parsedFromId.table
  ) {
    const baseNumber = `${parsedFromId.appendixLetter}-${[
      parsedFromId.appendixSection,
      parsedFromId.subsection,
      parsedFromId.article,
    ].join('.')}`;
    if (siblingTableCount != null && siblingTableCount <= 1) {
      return baseNumber;
    }
    const tableIndex = parseInt(parsedFromId.table, 10);
    const tableLetter = toAlphabetOrdinal(tableIndex).toUpperCase();
    return `${baseNumber}-${tableLetter}`;
  }

  const formingPartEntries = table.formingPart ?? table.forming_part;
  const formingPartTarget = formingPartEntries?.find((entry) => typeof entry?.target === 'string')?.target;
  const referenceFromTarget = formingPartTarget ? buildArticleReference(formingPartTarget) : null;

  return referenceFromTarget || buildArticleReference(table.id) || '';
};

const formatFormingPartLabel = (reference: ParsedInternalReference): string | null => {
  if (reference.appendixLetter) {
    // Build appendix number in D-X.Y.Z. format
    const segments = [
      reference.appendixSection,
      reference.subsection,
      reference.article,
    ].filter(Boolean);
    const appendixNumber = segments.length > 0
      ? `${reference.appendixLetter}-${segments.join('.')}.`
      : reference.appendixLetter;

    if (reference.paragraph) {
      return `Sentence ${appendixNumber}(${reference.paragraph})`;
    }

    if (reference.article) {
      return appendixNumber;
    }

    if (reference.subsection) {
      return appendixNumber;
    }

    if (reference.appendixSection) {
      return appendixNumber;
    }

    return `Appendix ${reference.appendixLetter}`;
  }

  const articleReference = [reference.part, reference.section, reference.subsection, reference.article]
    .filter(Boolean)
    .join('.');

  if (reference.subclause) {
    return articleReference
      ? `Subclause ${articleReference}.(${toRoman(Number(reference.subclause))})`
      : `Subclause (${toRoman(Number(reference.subclause))})`;
  }

  if (reference.clause) {
    const clauseLabel = toAlphabetOrdinal(Number(reference.clause));
    return articleReference
      ? `Clause ${articleReference}.(${clauseLabel})`
      : `Clause (${clauseLabel})`;
  }

  if (reference.sentence) {
    return articleReference
      ? `Sentence ${articleReference}.(${reference.sentence})`
      : `Sentence (${reference.sentence})`;
  }

  if (articleReference) {
    return `Article ${articleReference}.`;
  }

  return null;
};

const formatFormingPartText = (formingPart: FormingPartReference[] | undefined): string | null => {
  if (!formingPart || formingPart.length === 0) {
    return null;
  }

  const labels = formingPart
    .filter((entry) => entry?.type === 'internal' && typeof entry.target === 'string')
    .map((entry) => formatFormingPartLabel(parseInternalReference(entry.target)))
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return null;
  }

  if (labels.length === 1) {
    return `Forming Part of ${labels[0]}`;
  }

  if (labels.length === 2) {
    return `Forming Part of ${labels[0]} and ${labels[1]}`;
  }

  return `Forming Part of ${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

const getTableNumberDisplay = (tableNumber: string): string => {
  const normalized = tableNumber.trim();

  // If the number already includes "Table" prefix (from source data), use as-is
  if (/^Table\s/i.test(normalized)) {
    return normalized.endsWith('.') || normalized.endsWith(')') ? normalized : `${normalized}.`;
  }

  const omitTrailingDot =
    normalized.endsWith(')') || /^[A-Za-z]-\d+$/i.test(normalized);

  return `Table ${normalized}${omitTrailingDot ? '' : '.'}`;
};

type TableWidthAnalysisRow = {
  cells: Array<{
    content: string | TableCellContent[];
    colspan?: number;
  }>;
};

type ColumnWidthProfile = {
  maxChars: number;
  maxToken: number;
  hasFigure: boolean;
  letterCount: number;
  digitCount: number;
  hasMultiWordText: boolean;
};

const getStructuredListPlainText = (list: StructuredList): string => {
  switch (list.type) {
    case 'bulleted':
    case 'numbered':
    case 'alphabetic':
      return list.items.map((item) => item.content).join(' ');
    case 'variable':
    case 'symbol':
      return list.items.map((item) => `${item.symbol} ${item.description}`.trim()).join(' ');
    case 'definition':
      return list.items.map((item) => `${item.term} ${item.definition}`.trim()).join(' ');
    case 'organization':
      return list.items
        .map((item) => `${item.abbreviation} ${item.fullName} ${item.website || ''}`.trim())
        .join(' ');
    default:
      return '';
  }
};

const getCellPlainText = (content: string | TableCellContent[]): string => {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((item) => {
      if (item.type === 'text') return item.value || '';
      if (item.type === 'figure') return `${item.title || ''} ${item.graphic?.alt_text || ''}`;
      if (item.type === 'list') return getStructuredListPlainText(item.list);
      return '';
    })
    .join(' ')
    .trim();
};

const getLongestTokenLength = (text: string): number => {
  const cleaned = text.replace(/<[^>]+>/g, ' ').trim();
  if (!cleaned) return 0;

  return cleaned
    .split(/[\s/()]+/)
    .filter(Boolean)
    .reduce((max, token) => Math.max(max, token.length), 0);
};

const getCharacterCounts = (text: string) => {
  const cleaned = text.replace(/<[^>]+>/g, ' ').trim();

  return {
    letters: (cleaned.match(/[A-Za-z]/g) || []).length,
    digits: (cleaned.match(/\d/g) || []).length,
    hasMultiWordText: /\S+\s+\S+/.test(cleaned),
  };
};

const analyzeTableWidth = (
  rows: TableWidthAnalysisRow[],
  maxColumnCount: number
): {
  preferHorizontalScroll: boolean;
  minWidthRem: number;
  columnWidthsRem: number[];
  columnProfiles: ColumnWidthProfile[];
} => {
  if (maxColumnCount === 0) {
    return {
      preferHorizontalScroll: false,
      minWidthRem: 0,
      columnWidthsRem: [],
      columnProfiles: [],
    };
  }

  const columns: ColumnWidthProfile[] = Array.from({ length: maxColumnCount }, () => ({
    maxChars: 0,
    maxToken: 0,
    hasFigure: false,
    letterCount: 0,
    digitCount: 0,
    hasMultiWordText: false,
  }));

  rows.forEach((row) => {
    let columnIndex = 0;
    row.cells.forEach((cell) => {
      const colspan = typeof cell.colspan === 'number' && cell.colspan > 0 ? cell.colspan : 1;
      const hasFigure = Array.isArray(cell.content) ? cell.content.some((item) => item.type === 'figure') : false;
      const text = getCellPlainText(cell.content);
      const plainTextLength = text.replace(/<[^>]+>/g, '').trim().length;
      const longestTokenLength = getLongestTokenLength(text);
      const { letters, digits, hasMultiWordText } = getCharacterCounts(text);

      if (colspan === 1 && columns[columnIndex]) {
        columns[columnIndex].maxChars = Math.max(columns[columnIndex].maxChars, Math.min(plainTextLength, 60));
        columns[columnIndex].maxToken = Math.max(columns[columnIndex].maxToken, longestTokenLength);
        columns[columnIndex].hasFigure = columns[columnIndex].hasFigure || hasFigure;
        columns[columnIndex].letterCount += letters;
        columns[columnIndex].digitCount += digits;
        columns[columnIndex].hasMultiWordText =
          columns[columnIndex].hasMultiWordText || hasMultiWordText;
      }

      columnIndex += colspan;
    });
  });

  const columnWidthsRem = columns.map((column) => {
    const baseRem = 5.5;
    const tokenRem = Math.min(Math.max(column.maxToken * 0.58 + 1.6, 4.8), 15);
    const textRem = Math.min(Math.max(column.maxChars * 0.2 + 2.4, 4.8), 14);
    const figureRem = column.hasFigure ? 9 : 0;
    return Math.max(baseRem, tokenRem, textRem, figureRem);
  });

  const estimatedMinWidthRem = columnWidthsRem.reduce((total, width) => total + width, 0);

  // Single or two-column tables often include long headers but still read well
  // without horizontal scroll. Gate this trigger to wider tables.
  const hasVeryLongToken = maxColumnCount >= 3 && columns.some((column) => column.maxToken >= 14);
  const hasModerateCompressionRisk = maxColumnCount >= 4 && estimatedMinWidthRem >= 30;
  const preferHorizontalScroll =
    maxColumnCount >= 7 ||
    hasVeryLongToken ||
    hasModerateCompressionRisk ||
    (maxColumnCount >= 3 && estimatedMinWidthRem >= 42) ||
    estimatedMinWidthRem >= 60;

  return {
    preferHorizontalScroll,
    minWidthRem: Math.max(estimatedMinWidthRem, 32),
    columnWidthsRem,
    columnProfiles: columns,
  };
};

const getPrintColumnWidthPercentages = (
  columnWidthsRem: number[],
  columnProfiles: ColumnWidthProfile[],
  landscape: boolean
): number[] => {
  if (columnWidthsRem.length === 0 || columnWidthsRem.length !== columnProfiles.length) {
    return [];
  }

  const weightedWidths = columnWidthsRem.map((width, index) => {
    const profile = columnProfiles[index];
    const isMostlyNumeric =
      profile.digitCount > profile.letterCount * 2 &&
      profile.maxToken <= 4 &&
      profile.maxChars <= 12 &&
      !profile.hasFigure;
    const isTextHeavy =
      profile.hasMultiWordText ||
      (profile.letterCount > profile.digitCount && profile.maxChars >= 14) ||
      profile.maxToken >= 8;

    let adjustedWidth = width;

    if (isMostlyNumeric) {
      adjustedWidth *= landscape ? 0.48 : 0.58;
    }

    if (isTextHeavy) {
      adjustedWidth *= landscape ? 1.85 : 1.65;
    }

    if (profile.hasFigure) {
      adjustedWidth *= 1.2;
    }

    const exponent = landscape ? 0.88 : 0.92;
    return Math.pow(Math.max(adjustedWidth, 1), exponent);
  });
  const totalWeightedWidth = weightedWidths.reduce((total, width) => total + width, 0);

  if (totalWeightedWidth <= 0) {
    return [];
  }

  return weightedWidths.map((width) => (width / totalWeightedWidth) * 100);
};

type NormalizedCell = ReturnType<typeof normalizeCell>;
type NormalizedRow = {
  id?: string;
  type?: 'header_row' | 'body_row';
  cells: NormalizedCell[];
};

const getColumnCount = (row: NormalizedRow): number =>
  row.cells.reduce((total, cell) => total + (typeof cell.colspan === 'number' ? cell.colspan : 1), 0);

const trimRowToColumnCount = (row: NormalizedRow, maxColumns: number): void => {
  if (maxColumns <= 0 || row.cells.length === 0) {
    row.cells = [];
    return;
  }

  let usedColumns = 0;
  const nextCells: NormalizedCell[] = [];

  row.cells.forEach((cell) => {
    if (usedColumns >= maxColumns) {
      return;
    }

    const cellColumns = typeof cell.colspan === 'number' && cell.colspan > 0 ? cell.colspan : 1;
    const remainingColumns = maxColumns - usedColumns;

    if (cellColumns <= remainingColumns) {
      nextCells.push(cell);
      usedColumns += cellColumns;
      return;
    }

    if (remainingColumns > 0) {
      nextCells.push({
        ...cell,
        colspan: remainingColumns > 1 ? remainingColumns : undefined,
      });
      usedColumns = maxColumns;
    }
  });

  row.cells = nextCells;
};

const getHeaderGroupToken = (value: string): string | null => {
  const cleaned = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\^\{[^}]*\}/g, ' ')
    .replace(/_\{[^}]*\}/g, ' ')
    .replace(/\[REF:[^\]]+:(.*?)\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(/^([A-Z]{2,})/);
  return match?.[1] ?? null;
};

const getContiguousHeaderGroupRuns = (row: NormalizedRow): number[] | null => {
  const tokens = row.cells
    .map((cell) => getHeaderGroupToken(getCellPlainText(cell.content)))
    .filter((token): token is string => Boolean(token));

  if (tokens.length !== row.cells.length || tokens.length <= 1) {
    return null;
  }

  const runs: number[] = [];
  let currentToken = tokens[0];
  let currentCount = 1;

  for (let index = 1; index < tokens.length; index += 1) {
    if (tokens[index] === currentToken) {
      currentCount += 1;
      continue;
    }

    runs.push(currentCount);
    currentToken = tokens[index];
    currentCount = 1;
  }

  runs.push(currentCount);
  return runs.length > 1 ? runs : null;
};

const inferHeaderSpans = (
  headerRows: NormalizedRow[],
  totalColumns: number
): NormalizedRow[] => {
  if (headerRows.length === 0 || totalColumns <= 1) {
    return headerRows;
  }

  const clonedRows = headerRows.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => ({ ...cell })),
  }));

  const getCellText = (cell: NormalizedCell): string => getCellPlainText(cell.content).trim();
  const isPlaceholderCell = (cell: NormalizedCell | undefined): boolean =>
    Boolean(
      cell &&
      getCellText(cell) === '' &&
      (typeof cell.colspan !== 'number' || cell.colspan <= 1) &&
      (typeof cell.rowspan !== 'number' || cell.rowspan <= 1)
    );

  const buildRowLayouts = (rows: NormalizedRow[]) => {
    const activeRowspans = new Array(totalColumns).fill(0);

    return rows.map((row) => {
      const positionedCells: Array<{ index: number; start: number; end: number; cell: NormalizedCell }> = [];
      let columnCursor = 0;

      row.cells.forEach((cell, cellIndex) => {
        while (columnCursor < totalColumns && activeRowspans[columnCursor] > 0) {
          columnCursor += 1;
        }

        const colspan = typeof cell.colspan === 'number' && cell.colspan > 0 ? cell.colspan : 1;
        const rowspan = typeof cell.rowspan === 'number' && cell.rowspan > 1 ? cell.rowspan : 1;
        const start = columnCursor;
        const end = columnCursor + colspan - 1;

        positionedCells.push({ index: cellIndex, start, end, cell });

        if (rowspan > 1) {
          for (let offset = 0; offset < colspan; offset += 1) {
            if (columnCursor + offset < totalColumns) {
              activeRowspans[columnCursor + offset] = Math.max(
                activeRowspans[columnCursor + offset],
                rowspan - 1
              );
            }
          }
        }

        columnCursor += colspan;
      });

      for (let columnIndex = 0; columnIndex < activeRowspans.length; columnIndex += 1) {
        if (activeRowspans[columnIndex] > 0) {
          activeRowspans[columnIndex] -= 1;
        }
      }

      return positionedCells;
    });
  };

  // Some legacy tables provide explicit colspans but omit rowspans, leaving
  // blank placeholder cells in subsequent header rows. Promote the anchor cell
  // to cover those rows so the split header uses the same column map as the body.
  clonedRows.forEach((row, rowIndex) => {
    if (rowIndex >= clonedRows.length - 1 || row.cells.length === 0) {
      return;
    }

    const leadingCell = row.cells[0];
    const leadingText = getCellText(leadingCell);
    const hasExplicitRowspan = typeof leadingCell.rowspan === 'number' && leadingCell.rowspan > 1;

    if (!leadingText || hasExplicitRowspan) {
      return;
    }

    let placeholderCount = 0;
    for (let nextRowIndex = rowIndex + 1; nextRowIndex < clonedRows.length; nextRowIndex += 1) {
      if (!isPlaceholderCell(clonedRows[nextRowIndex].cells[0])) {
        break;
      }
      placeholderCount += 1;
    }

    if (placeholderCount === 0) {
      return;
    }

    leadingCell.rowspan = placeholderCount + 1;
    for (let nextRowIndex = rowIndex + 1; nextRowIndex <= rowIndex + placeholderCount; nextRowIndex += 1) {
      clonedRows[nextRowIndex].cells.shift();
    }
  });

  let inferredPlaceholderRowspans = true;
  while (inferredPlaceholderRowspans) {
    inferredPlaceholderRowspans = false;
    const layouts = buildRowLayouts(clonedRows);

    for (let rowIndex = 0; rowIndex < clonedRows.length - 1 && !inferredPlaceholderRowspans; rowIndex += 1) {
      for (const positionedCell of layouts[rowIndex] || []) {
        const { cell, start, end } = positionedCell;
        const hasExplicitRowspan = typeof cell.rowspan === 'number' && cell.rowspan > 1;
        if (hasExplicitRowspan) {
          continue;
        }

        const rowsToConsume: Array<{ rowIndex: number; cellIndexes: number[] }> = [];

        for (let nextRowIndex = rowIndex + 1; nextRowIndex < clonedRows.length; nextRowIndex += 1) {
          const overlaps = (layouts[nextRowIndex] || [])
            .filter((entry) => !(entry.end < start || entry.start > end))
            .sort((a, b) => a.start - b.start);

          if (overlaps.length === 0) {
            break;
          }

          const fullyCovered =
            overlaps.every((entry) => isPlaceholderCell(entry.cell)) &&
            overlaps[0]?.start === start &&
            overlaps[overlaps.length - 1]?.end === end &&
            overlaps.every((entry, overlapIndex) =>
              overlapIndex === 0 ? true : overlaps[overlapIndex - 1].end + 1 === entry.start
            );

          if (!fullyCovered) {
            break;
          }

          rowsToConsume.push({
            rowIndex: nextRowIndex,
            cellIndexes: overlaps.map((entry) => entry.index).sort((a, b) => b - a),
          });
        }

        if (rowsToConsume.length === 0) {
          continue;
        }

        cell.rowspan = rowsToConsume.length + 1;
        rowsToConsume.forEach(({ rowIndex: targetRowIndex, cellIndexes }) => {
          cellIndexes.forEach((cellIndex) => {
            clonedRows[targetRowIndex].cells.splice(cellIndex, 1);
          });
        });

        inferredPlaceholderRowspans = true;
      }
    }
  }

  let activeRowspans = new Array(totalColumns).fill(0);

  clonedRows.forEach((row, rowIndex) => {
    const occupiedColumns = activeRowspans.filter((value) => value > 0).length;
    const availableColumns = totalColumns - occupiedColumns;
    let rowColumnCount = getColumnCount(row);
    const cellCount = row.cells.length;

    if (rowColumnCount > availableColumns) {
      trimRowToColumnCount(row, availableColumns);
      rowColumnCount = getColumnCount(row);
    }

    if (availableColumns > rowColumnCount && cellCount > 0) {
      const canInferGroupedColspans =
        rowIndex > 0 &&
        row.cells.every((cell) => typeof cell.colspan !== 'number' || cell.colspan <= 1) &&
        row.cells.every((cell) => typeof cell.rowspan !== 'number' || cell.rowspan <= 1);
      const nextRow = clonedRows[rowIndex + 1];
      const childGroupRuns =
        canInferGroupedColspans && nextRow ? getContiguousHeaderGroupRuns(nextRow) : null;

      if (
        childGroupRuns &&
        childGroupRuns.length === row.cells.length &&
        childGroupRuns.reduce((total, span) => total + span, 0) === availableColumns
      ) {
        row.cells = row.cells.map((cell, index) => ({
          ...cell,
          colspan: childGroupRuns[index] > 1 ? childGroupRuns[index] : undefined,
        }));
        rowColumnCount = getColumnCount(row);
      }

      if (rowIndex === 0 && cellCount > 1) {
        for (let index = 0; index < cellCount - 1; index += 1) {
          row.cells[index].rowspan = clonedRows.length;
        }

        const trailingSpan = availableColumns - (cellCount - 1);
        if (trailingSpan > 1) {
          row.cells[cellCount - 1].colspan = trailingSpan;
        }
      } else if (availableColumns > rowColumnCount) {
        const trailingSpan = availableColumns - (cellCount - 1);
        if (trailingSpan > 1) {
          row.cells[cellCount - 1].colspan = trailingSpan;
        }
      }
    }

    const nextRowspans = activeRowspans.map((value) => (value > 0 ? value - 1 : 0));
    let columnCursor = 0;

    row.cells.forEach((cell) => {
      while (columnCursor < totalColumns && activeRowspans[columnCursor] > 0) {
        columnCursor += 1;
      }

      const colspan = typeof cell.colspan === 'number' && cell.colspan > 0 ? cell.colspan : 1;
      const rowspan = typeof cell.rowspan === 'number' && cell.rowspan > 1 ? cell.rowspan : 1;

      if (rowspan > 1) {
        for (let offset = 0; offset < colspan; offset += 1) {
          if (columnCursor + offset < totalColumns) {
            nextRowspans[columnCursor + offset] = Math.max(
              nextRowspans[columnCursor + offset],
              rowspan - 1
            );
          }
        }
      }

      columnCursor += colspan;
    });

    activeRowspans = nextRowspans;
  });

  return clonedRows;
};

const renderColGroup = (columnWidthsRem: number[], printColumnWidthsPct: number[]) => {
  if (columnWidthsRem.length === 0 || columnWidthsRem.length !== printColumnWidthsPct.length) {
    return null;
  }

  return (
    <colgroup>
      {columnWidthsRem.map((width, index) => (
        <col
          key={`column-${index}`}
          className="table-block__col"
          style={
            {
              '--table-column-width-rem': width,
              '--table-column-width-print': `${printColumnWidthsPct[index]}%`,
            } as React.CSSProperties
          }
        />
      ))}
    </colgroup>
  );
};

const renderRows = (
  rows: NormalizedRow[],
  interactive: boolean,
  renderContext?: ReferenceRenderContext
) => {
  return rows.map((row, rowIndex) => (
    <tr key={row.id || rowIndex}>
      {row.cells.map((cell, cellIndex) => {
        const CellTag = cell.isHeader ? 'th' : 'td';
        const alignClass = cell.align ? `table-block__cell--${cell.align}` : '';
        const hasFigureContent = Array.isArray(cell.content)
          ? cell.content.some((item) => item.type === 'figure')
          : false;
        const figureClass = hasFigureContent ? 'table-block__cell--has-figure' : '';
        const spanClass =
          (typeof cell.colspan === 'number' && cell.colspan > 1) ||
            (typeof cell.rowspan === 'number' && cell.rowspan > 1)
            ? 'table-block__cell--spanned'
            : '';

        return (
          <CellTag
            key={cellIndex}
            className={`${cell.isHeader ? 'table-block__header-cell' : 'table-block__cell'} ${alignClass} ${figureClass} ${spanClass}`.trim()}
            colSpan={cell.colspan}
            rowSpan={cell.rowspan}
          >
            {renderCellContent(cell.content, interactive, renderContext)}
          </CellTag>
        );
      })}
    </tr>
  ));
};

/**
 * Renders header rows for the split-scroll layout, adding
 * data-sticky-first-col="true" to every cell that sits at column position 0.
 * The scroll handler uses this marker to apply a counter-translateX so the
 * first header column stays pinned while the rest of the header track scrolls.
 */
const renderHeaderRowsWithFirstColMark = (
  rows: NormalizedRow[],
  interactive: boolean,
  renderContext?: ReferenceRenderContext
) => {
  // Track whether column 0 is occupied by a rowspan from a previous row.
  let col0ActiveRowspan = 0;

  return rows.map((row, rowIndex) => {
    const firstCellIsAtColZero = col0ActiveRowspan === 0;

    if (firstCellIsAtColZero && row.cells.length > 0) {
      const rs =
        typeof row.cells[0].rowspan === 'number' && row.cells[0].rowspan > 1
          ? row.cells[0].rowspan - 1
          : 0;
      col0ActiveRowspan = rs;
    } else if (col0ActiveRowspan > 0) {
      col0ActiveRowspan -= 1;
    }

    return (
      <tr key={row.id || rowIndex}>
        {row.cells.map((cell, cellIndex) => {
          const CellTag = cell.isHeader ? 'th' : 'td';
          const alignClass = cell.align ? `table-block__cell--${cell.align}` : '';
          const hasFigureContent = Array.isArray(cell.content)
            ? cell.content.some((item) => item.type === 'figure')
            : false;
          const figureClass = hasFigureContent ? 'table-block__cell--has-figure' : '';
          const spanClass =
            (typeof cell.colspan === 'number' && cell.colspan > 1) ||
            (typeof cell.rowspan === 'number' && cell.rowspan > 1)
              ? 'table-block__cell--spanned'
              : '';

          return (
            <CellTag
              key={cellIndex}
              {...(cellIndex === 0 && firstCellIsAtColZero
                ? { 'data-sticky-first-col': 'true' }
                : {})}
              className={`${
                cell.isHeader ? 'table-block__header-cell' : 'table-block__cell'
              } ${alignClass} ${figureClass} ${spanClass}`.trim()}
              colSpan={cell.colspan}
              rowSpan={cell.rowspan}
            >
              {renderCellContent(cell.content, interactive, renderContext)}
            </CellTag>
          );
        })}
      </tr>
    );
  });
};

/**
 * Expands rowspan cells in the first column of body rows so that group labels
 * (e.g. "Concrete Slabs") appear in every row rather than only in the anchor row.
 * Subsequent rows whose first column is covered by a rowspan get an inline copy
 * of the anchor cell's content (rowspan attribute stripped). All other columns
 * are left untouched.
 */
const expandBodyFirstColumnRowspans = (rows: NormalizedRow[]): NormalizedRow[] => {
  if (rows.length === 0) return rows;

  let activeSpan: { cell: NormalizedCell; remaining: number } | null = null;

  return rows.map((row) => {
    // Column 0 is covered by a rowspan from a previous row — inject a copy.
    if (activeSpan !== null) {
      const injected: NormalizedCell = { ...activeSpan.cell, rowspan: undefined };
      activeSpan.remaining -= 1;
      if (activeSpan.remaining <= 0) activeSpan = null;
      return { ...row, cells: [injected, ...row.cells] };
    }

    // Column 0 is free — check if the first cell starts a new rowspan.
    const firstCell = row.cells[0];
    const rowspan =
      firstCell && typeof firstCell.rowspan === 'number' && firstCell.rowspan > 1
        ? firstCell.rowspan
        : 0;

    if (rowspan > 0) {
      activeSpan = { cell: firstCell, remaining: rowspan - 1 };
      // Strip rowspan so the anchor row renders normally (no cell spanning).
      return {
        ...row,
        cells: [{ ...firstCell, rowspan: undefined }, ...row.cells.slice(1)],
      };
    }

    return row;
  });
};

export const TableBlock: React.FC<TableBlockProps> = ({
  table,
  interactive = true,
  effectiveDate,
  renderContext,
  appendixSiblingTableCount,
}) => {
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [renderedBodyRowCount, setRenderedBodyRowCount] = useState<number>(INITIAL_BODY_ROW_RENDER_COUNT);
  const [scrollbarCompensation, setScrollbarCompensation] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [headerRowTops, setHeaderRowTops] = useState<number[]>([]);
  const bodyViewportRef = useRef<HTMLDivElement | null>(null);
  const bodyContainerRef = useRef<HTMLDivElement | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const headerTrackRef = useRef<HTMLDivElement | null>(null);
  const theadRef = useRef<HTMLTableSectionElement | null>(null);
  const rawTable = table as TableWithRawSupport;
  const activeRevision = getActiveRevision(rawTable.revisions, effectiveDate);
  const resolvedTitle = activeRevision?.title ?? rawTable.title ?? '';
  const resolvedCaption = activeRevision?.caption ?? rawTable.caption;
  const rawTableNotes = activeRevision?.table_notes ?? rawTable.table_notes ?? [];
  const filteredHeaderCount = rawTableNotes.filter((note) => {
    const content = (note.content || '').trim();
    if (/^Notes to Table\b.*:$/.test(content)) return true;
    if ((note.id || '').endsWith('.notes.header')) return true;
    return false;
  }).length;
  const resolvedTableNotes = rawTableNotes.filter((note) => {
    // Filter out notes that are just the "Notes to Table X:" header text,
    // since the component already renders its own heading from the table number.
    const content = (note.content || '').trim();
    if (/^Notes to Table\b.*:$/.test(content)) return false;
    if ((note.id || '').endsWith('.notes.header')) return false;
    return true;
  });
  const formingPartEntries = rawTable.formingPart ?? rawTable.forming_part;
  const tableNumber = getResolvedTableNumber(rawTable, appendixSiblingTableCount);
  const tableNumberDisplay = tableNumber ? getTableNumberDisplay(tableNumber) : null;
  const tableNotesHeading = tableNumberDisplay ? `Notes to ${tableNumberDisplay}:` : 'Table notes';
  const formingPartText = formatFormingPartText(formingPartEntries);

  const structure = activeRevision?.structure ?? rawTable.structure;
  const hasDirectRows = Array.isArray(table.rows) && table.rows.length > 0;
  const normalizedRows = useMemo(
    () =>
      hasDirectRows
        ? table.rows.map((row, rowIndex) => ({
          id: row.id || `row-${rowIndex}`,
          type: row.type,
          cells: row.cells.map((cell) => normalizeCell(cell as RawTableCell, Boolean(cell.isHeader))),
        }))
        : [
          ...normalizeRows(structure?.header_rows || [], true, effectiveDate, 'header-row'),
          ...normalizeRows(structure?.body_rows || [], false, effectiveDate, 'body-row'),
        ],
    [effectiveDate, hasDirectRows, structure, table.rows]
  );

  const headerRows = useMemo(
    () => normalizedRows.filter((row) => row.cells.some((cell) => cell.isHeader)),
    [normalizedRows]
  );

  const bodyRows = useMemo(
    () => normalizedRows.filter((row) => !row.cells.every((cell) => cell.isHeader)),
    [normalizedRows]
  );

  // Flatten first-column rowspans so every body row shows its group label
  // (e.g. "Concrete Slabs") even after scrolling past the anchor cell.
  const expandedBodyRows = useMemo(
    () => expandBodyFirstColumnRowspans(bodyRows),
    [bodyRows]
  );

  const shouldProgressivelyRenderBodyRows = expandedBodyRows.length >= LARGE_TABLE_ROW_THRESHOLD;
  const renderedBodyRows = useMemo(
    () =>
      shouldProgressivelyRenderBodyRows && !isPrintMode
        ? expandedBodyRows.slice(0, Math.min(renderedBodyRowCount, expandedBodyRows.length))
        : expandedBodyRows,
    [expandedBodyRows, isPrintMode, renderedBodyRowCount, shouldProgressivelyRenderBodyRows]
  );

  const maxColumnCount = normalizedRows.reduce((max, row) => {
    const rowColumnCount = getColumnCount(row);
    return Math.max(max, rowColumnCount);
  }, 0);
  const displayHeaderRows = useMemo(
    () => inferHeaderSpans(headerRows, Math.max(maxColumnCount, bodyRows.reduce((max, row) => Math.max(max, getColumnCount(row)), 0))),
    [bodyRows, headerRows, maxColumnCount]
  );
  const displayRows = useMemo(
    () => (displayHeaderRows.length > 0 ? [...displayHeaderRows, ...bodyRows] : normalizedRows),
    [bodyRows, displayHeaderRows, normalizedRows]
  );
  const { preferHorizontalScroll, minWidthRem, columnWidthsRem, columnProfiles } = useMemo(
    () => analyzeTableWidth(displayRows, Math.max(...displayRows.map(getColumnCount), 0)),
    [displayRows]
  );
  useEffect(() => {
    const updateAvailableWidth = () => {
      const element = bodyContainerRef.current;
      if (!element) return;
      setAvailableWidth(element.clientWidth);
    };

    updateAvailableWidth();

    const element = bodyContainerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateAvailableWidth);
      return () => window.removeEventListener('resize', updateAvailableWidth);
    }

    const observer = new ResizeObserver(() => updateAvailableWidth());
    observer.observe(element);
    window.addEventListener('resize', updateAvailableWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateAvailableWidth);
    };
  }, []);

  const estimatedTableWidthPx = useMemo(() => {
    if (typeof window === 'undefined') {
      return minWidthRem * 16;
    }

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize || '16') || 16;
    return minWidthRem * rootFontSize;
  }, [minWidthRem]);

  const usesHorizontalScrollLayout =
    preferHorizontalScroll && availableWidth > 0 && estimatedTableWidthPx > availableWidth;

  const usesSplitScrollLayout =
    usesHorizontalScrollLayout && displayHeaderRows.length > 0;

  const needsLandscapePrint = minWidthRem > 48;
  const printScale = useMemo(
    () =>
      needsLandscapePrint
        ? Math.min(1, LANDSCAPE_PRINT_CAPACITY_REM / Math.max(minWidthRem, LANDSCAPE_PRINT_CAPACITY_REM))
        : 1,
    [minWidthRem, needsLandscapePrint]
  );
  const usesLandscapePrintScaling = needsLandscapePrint && printScale < 0.995;
  const printColumnWidthsPct = useMemo(
    () => getPrintColumnWidthPercentages(columnWidthsRem, columnProfiles, needsLandscapePrint),
    [columnProfiles, columnWidthsRem, needsLandscapePrint]
  );
  const renderedHeaderRowsMarkup = useMemo(
    () => renderRows(displayHeaderRows, interactive, renderContext),
    [displayHeaderRows, interactive, renderContext]
  );
  // Split-layout header: uses the first-col marker variant so the scroll handler
  // can counter-translate column-0 cells to keep them pinned.
  const splitHeaderRowsMarkup = useMemo(
    () => renderHeaderRowsWithFirstColMark(displayHeaderRows, interactive, renderContext),
    [displayHeaderRows, interactive, renderContext]
  );
  const renderedBodyRowsMarkup = useMemo(
    () => renderRows(renderedBodyRows, interactive, renderContext),
    [interactive, renderContext, renderedBodyRows]
  );
  const fullBodyRowsMarkup = useMemo(
    () => renderRows(expandedBodyRows, interactive, renderContext),
    [expandedBodyRows, interactive, renderContext]
  );
  const fullDisplayRowsMarkup = useMemo(
    () => renderRows(displayRows, interactive, renderContext),
    [displayRows, interactive, renderContext]
  );
  const loadNextBodyRowChunk = useCallback(() => {
    if (
      !shouldProgressivelyRenderBodyRows ||
      isPrintMode ||
      renderedBodyRowCount >= bodyRows.length
    ) {
      return;
    }

    setRenderedBodyRowCount((current) =>
      Math.min(current + BODY_ROW_RENDER_CHUNK_SIZE, bodyRows.length)
    );
  }, [
    bodyRows.length,
    isPrintMode,
    renderedBodyRowCount,
    shouldProgressivelyRenderBodyRows,
  ]);

  const maybeLoadMoreRowsOnScroll = useCallback(
    (scrollElement: HTMLElement) => {
      if (!shouldProgressivelyRenderBodyRows || isPrintMode || renderedBodyRowCount >= bodyRows.length) {
        return;
      }

      const nearBottom =
        scrollElement.scrollTop + scrollElement.clientHeight >=
        scrollElement.scrollHeight - ROW_LOAD_SCROLL_THRESHOLD_PX;

      if (nearBottom) {
        loadNextBodyRowChunk();
      }
    },
    [
      bodyRows.length,
      isPrintMode,
      loadNextBodyRowChunk,
      renderedBodyRowCount,
      shouldProgressivelyRenderBodyRows,
    ]
  );

  useEffect(() => {
    if (!shouldProgressivelyRenderBodyRows || isPrintMode) {
      setRenderedBodyRowCount(bodyRows.length);
      return;
    }

    setRenderedBodyRowCount(Math.min(INITIAL_BODY_ROW_RENDER_COUNT, bodyRows.length));
  }, [bodyRows.length, isPrintMode, shouldProgressivelyRenderBodyRows]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const enablePrintMode = () => setIsPrintMode(true);
    const disablePrintMode = () => setIsPrintMode(false);
    const mediaQuery = window.matchMedia('print');
    const onMediaChange = (event: MediaQueryListEvent) => setIsPrintMode(event.matches);

    window.addEventListener('beforeprint', enablePrintMode);
    window.addEventListener('afterprint', disablePrintMode);
    mediaQuery.addEventListener('change', onMediaChange);

    return () => {
      window.removeEventListener('beforeprint', enablePrintMode);
      window.removeEventListener('afterprint', disablePrintMode);
      mediaQuery.removeEventListener('change', onMediaChange);
    };
  }, []);

  useEffect(() => {
    if (!shouldProgressivelyRenderBodyRows || isPrintMode || renderedBodyRowCount >= bodyRows.length) {
      return;
    }

    const scrollRoot = usesSplitScrollLayout ? bodyViewportRef.current : tableWrapperRef.current;
    if (!scrollRoot) return;

    // If current chunk does not fill the viewport yet, pull one more chunk.
    if (scrollRoot.scrollHeight <= scrollRoot.clientHeight + 1) {
      loadNextBodyRowChunk();
    }
  }, [
    bodyRows.length,
    isPrintMode,
    loadNextBodyRowChunk,
    renderedBodyRowCount,
    shouldProgressivelyRenderBodyRows,
    usesSplitScrollLayout,
  ]);

  useEffect(() => {
    if (!usesSplitScrollLayout) {
      setScrollbarCompensation(0);
      return;
    }

    const updateScrollbarCompensation = () => {
      const element = bodyViewportRef.current;
      if (!element) return;

      const styles = window.getComputedStyle(element);
      const borderLeft = parseFloat(styles.borderLeftWidth || '0') || 0;
      const borderRight = parseFloat(styles.borderRightWidth || '0') || 0;
      const nextCompensation = Math.max(
        0,
        Math.round(element.offsetWidth - element.clientWidth - borderLeft - borderRight)
      );

      setScrollbarCompensation(nextCompensation);
    };

    updateScrollbarCompensation();

    const element = bodyViewportRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScrollbarCompensation);
      return () => window.removeEventListener('resize', updateScrollbarCompensation);
    }

    const observer = new ResizeObserver(() => updateScrollbarCompensation());
    observer.observe(element);
    window.addEventListener('resize', updateScrollbarCompensation);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScrollbarCompensation);
    };
  }, [usesSplitScrollLayout]);

  // Measure header row heights for multi-row sticky offset calculation
  useEffect(() => {
    const thead = theadRef.current;
    if (!thead) {
      setHeaderRowTops([]);
      return;
    }

    const measureRowTops = () => {
      const rows = thead.querySelectorAll('tr');
      const tops: number[] = [];
      let cumulative = 0;
      rows.forEach((row) => {
        tops.push(cumulative);
        cumulative += row.getBoundingClientRect().height;
      });
      setHeaderRowTops(tops);
    };

    measureRowTops();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => measureRowTops());
      observer.observe(thead);
      return () => observer.disconnect();
    }

    return undefined;
  }, [displayHeaderRows, usesSplitScrollLayout]);

  const getTableNoteLabel = (note: RawTableNote, index: number): string => {
    const noteId = (note.id || '').trim();
    const numericSuffix = noteId.match(/\.note(\d+)$/i)?.[1];
    if (numericSuffix) {
      // Adjust numbering when header notes were filtered out
      const adjustedNumber = Number(numericSuffix) - filteredHeaderCount;
      return `(${adjustedNumber > 0 ? adjustedNumber : index + 1})`;
    }

    return `(${index + 1})`;
  };

  return (
    <div
      className={`table-block${needsLandscapePrint ? ' table-block--landscape' : ''}${usesLandscapePrintScaling ? ' table-block--print-scaled' : ''}`}
      id={rawTable.id}
      style={
        needsLandscapePrint
          ? ({
            '--table-print-natural-width': `${minWidthRem}rem`,
            '--table-print-scale': `${printScale}`,
          } as React.CSSProperties)
          : undefined
      }
    >
      {(tableNumber || resolvedTitle || formingPartText) && (
        <div className="table-block__header">
          {tableNumber && (
            <div className="table-block__number">
              {renderFormattedText(tableNumberDisplay || '', interactive, renderContext)}
            </div>
          )}
          {resolvedTitle && (
            <div className="table-block__title">
              {renderFormattedText(resolvedTitle, interactive, renderContext)}
            </div>
          )}
          {formingPartText && (
            <div className="table-block__forming-part">
              {renderFormattedText(formingPartText, interactive, renderContext)}
            </div>
          )}
        </div>
      )}
      {resolvedCaption && (
        <div className="table-block__caption">
          {renderFormattedText(resolvedCaption, interactive, renderContext)}
        </div>
      )}
      <div
        ref={bodyContainerRef}
        className={`table-block__body${usesHorizontalScrollLayout ? ' table-block__body--scroll' : ''}`}
      >
        <div
          ref={tableWrapperRef}
          className={`table-block__wrapper${usesHorizontalScrollLayout ? ' table-block__wrapper--scroll' : ''}${usesSplitScrollLayout ? ' table-block__wrapper--split' : ''}`}
          onScroll={
            usesSplitScrollLayout
              ? undefined
              : (event) => maybeLoadMoreRowsOnScroll(event.currentTarget)
          }
        >
          {usesSplitScrollLayout ? (
            <>
              <div className="table-block__split-scroll">
                <div
                  className="table-block__header-viewport"
                  aria-hidden="true"
                  style={{ paddingRight: `${scrollbarCompensation}px` }}
                >
                  <div
                    ref={headerTrackRef}
                    className="table-block__header-track"
                    style={{
                      width: `${minWidthRem}rem`,
                      transform: 'translateX(0px)',
                    }}
                  >
                    <table
                      className="table-block__table table-block__table--split-header"
                      style={{ width: `${minWidthRem}rem`, minWidth: `${minWidthRem}rem` }}
                    >
                      {renderColGroup(columnWidthsRem, printColumnWidthsPct)}
                      <thead>{splitHeaderRowsMarkup}</thead>
                    </table>
                  </div>
                </div>
                <div
                  className="table-block__body-viewport"
                  ref={bodyViewportRef}
                  onScroll={(event) => {
                    const currentTarget = event.currentTarget;
                    const { scrollLeft } = currentTarget;
                    if (headerTrackRef.current) {
                      headerTrackRef.current.style.transform = `translateX(-${scrollLeft}px)`;
                      // Counter-translate first-column header cells so they stay
                      // pinned at left: 0 while the rest of the header track scrolls.
                      headerTrackRef.current
                        .querySelectorAll<HTMLElement>('[data-sticky-first-col="true"]')
                        .forEach((cell) => {
                          cell.style.transform = `translateX(${scrollLeft}px)`;
                        });
                    }
                    maybeLoadMoreRowsOnScroll(currentTarget);
                  }}
                >
                  <table
                    className="table-block__table table-block__table--split-body"
                    style={{ width: `${minWidthRem}rem`, minWidth: `${minWidthRem}rem` }}
                  >
                    {renderColGroup(columnWidthsRem, printColumnWidthsPct)}
                    <tbody>{renderedBodyRowsMarkup}</tbody>
                  </table>
                </div>
              </div>
              {/* Print-only unified table: combines header + body in one <table> so browsers can repeat <thead> on each page */}
              {isPrintMode && (
                <table
                  className="table-block__table table-block__table--print-unified"
                  aria-hidden="true"
                >
                  {renderColGroup(columnWidthsRem, printColumnWidthsPct)}
                  <thead>{renderedHeaderRowsMarkup}</thead>
                  <tbody>{fullBodyRowsMarkup}</tbody>
                </table>
              )}
            </>
          ) : (
            <table
              className="table-block__table"
              style={usesHorizontalScrollLayout ? { minWidth: `${minWidthRem}rem` } : undefined}
            >
              {renderColGroup(columnWidthsRem, printColumnWidthsPct)}
              {displayHeaderRows.length > 0 ? (
                <>
                  <thead className="table-block__thead-sticky" ref={theadRef}>
                    {displayHeaderRows.map((row, rowIndex) => (
                      <tr
                        key={row.id || rowIndex}
                        style={
                          headerRowTops[rowIndex] != null
                            ? ({ '--sticky-top': `${headerRowTops[rowIndex]}px` } as React.CSSProperties)
                            : undefined
                        }
                      >
                        {row.cells.map((cell, cellIndex) => {
                          const CellTag = cell.isHeader ? 'th' : 'td';
                          const alignClass = cell.align ? `table-block__cell--${cell.align}` : '';
                          const hasFigureContent = Array.isArray(cell.content)
                            ? cell.content.some((item) => item.type === 'figure')
                            : false;
                          const figureClass = hasFigureContent ? 'table-block__cell--has-figure' : '';
                          const spanClass =
                            (typeof cell.colspan === 'number' && cell.colspan > 1) ||
                              (typeof cell.rowspan === 'number' && cell.rowspan > 1)
                              ? 'table-block__cell--spanned'
                              : '';

                          return (
                            <CellTag
                              key={cellIndex}
                              className={`${cell.isHeader ? 'table-block__header-cell' : 'table-block__cell'} ${alignClass} ${figureClass} ${spanClass}`.trim()}
                              colSpan={cell.colspan}
                              rowSpan={cell.rowspan}
                            >
                              {renderCellContent(cell.content, interactive, renderContext)}
                            </CellTag>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody>{renderedBodyRowsMarkup}</tbody>
                </>
              ) : (
                <tbody>{fullDisplayRowsMarkup}</tbody>
              )}
            </table>
          )}
        </div>
        {resolvedTableNotes.length > 0 && (
          <div className="table-block__notes" aria-label="Table notes">
            <div className="table-block__notes-title">{tableNotesHeading}</div>
            {resolvedTableNotes.map((note, index) => (
              <div
                className="table-block__note"
                id={note.id}
                key={note.id || note.vendor_id || `note-${index}`}
              >
                <span className="table-block__note-label">{getTableNoteLabel(note, index)}</span>
                <span className="table-block__note-content">
                  {renderFormattedText(note.content || '', interactive, renderContext, note.list ? [note.list] : [])}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
