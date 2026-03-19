import React from 'react';
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
}

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
  renderContext?: ReferenceRenderContext
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
            [],
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
          {parseTextWithMarkers(italicText, [], interactive, [], [], renderContext)}
        </em>
      );
    } else if (/^<bold>/i.test(token)) {
      const boldText = token.replace(/^<bold>/i, '').replace(/<\/bold>$/i, '');
      nodes.push(
        <strong key={`table-bold-${chunkIndex}`}>
          {parseTextWithMarkers(boldText, [], interactive, [], [], renderContext)}
        </strong>
      );
    } else if (/^\^\{/.test(token)) {
      const superText = token.replace(/^\^\{/, '').replace(/\}$/, '');
      nodes.push(
        <sup key={`table-sup-${chunkIndex}`}>
          {parseTextWithMarkers(superText, [], interactive, [], [], renderContext)}
        </sup>
      );
    } else if (/^_\{/.test(token)) {
      const subText = token.replace(/^_\{/, '').replace(/\}$/, '');
      nodes.push(
        <sub key={`table-sub-${chunkIndex}`}>
          {parseTextWithMarkers(subText, [], interactive, [], [], renderContext)}
        </sub>
      );
    }

    chunkIndex += 1;
    lastIndex = matchEnd;
  }

  if (lastIndex < normalizedText.length) {
    nodes.push(
      <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
        {parseTextWithMarkers(normalizedText.slice(lastIndex), [], interactive, [], [], renderContext)}
      </React.Fragment>
    );
  }

  if (nodes.length === 0) {
    nodes.push(
      <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
        {parseTextWithMarkers(normalizedText, [], interactive, [], [], renderContext)}
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
      return {
        type: 'variable',
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

const getResolvedTableNumber = (table: TableWithRawSupport): string => {
  if (table.number) {
    return String(table.number);
  }

  const parsedFromId = parseInternalReference(table.id);
  if (
    parsedFromId.appendixLetter &&
    parsedFromId.appendixSection &&
    parsedFromId.subsection &&
    parsedFromId.article &&
    parsedFromId.table
  ) {
    return [
      parsedFromId.appendixLetter,
      parsedFromId.appendixSection,
      parsedFromId.subsection,
      parsedFromId.article,
    ].join('.');
  }

  const formingPartEntries = table.formingPart ?? table.forming_part;
  const formingPartTarget = formingPartEntries?.find((entry) => typeof entry?.target === 'string')?.target;
  const referenceFromTarget = formingPartTarget ? buildArticleReference(formingPartTarget) : null;

  return referenceFromTarget || buildArticleReference(table.id) || '';
};

const formatFormingPartLabel = (reference: ParsedInternalReference): string | null => {
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

type TableWidthAnalysisRow = {
  cells: Array<{
    content: string | TableCellContent[];
    colspan?: number;
  }>;
};

const getStructuredListPlainText = (list: StructuredList): string => {
  switch (list.type) {
    case 'bulleted':
    case 'numbered':
    case 'alphabetic':
      return list.items.map((item) => item.content).join(' ');
    case 'variable':
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

const analyzeTableWidth = (
  rows: TableWidthAnalysisRow[],
  maxColumnCount: number
): { preferHorizontalScroll: boolean; minWidthRem: number } => {
  if (maxColumnCount === 0) {
    return { preferHorizontalScroll: false, minWidthRem: 0 };
  }

  const columns = Array.from({ length: maxColumnCount }, () => ({
    maxChars: 0,
    maxToken: 0,
    hasFigure: false,
  }));

  rows.forEach((row) => {
    let columnIndex = 0;
    row.cells.forEach((cell) => {
      const colspan = typeof cell.colspan === 'number' && cell.colspan > 0 ? cell.colspan : 1;
      const hasFigure = Array.isArray(cell.content) ? cell.content.some((item) => item.type === 'figure') : false;
      const text = getCellPlainText(cell.content);
      const plainTextLength = text.replace(/<[^>]+>/g, '').trim().length;
      const longestTokenLength = getLongestTokenLength(text);

      if (colspan === 1 && columns[columnIndex]) {
        columns[columnIndex].maxChars = Math.max(columns[columnIndex].maxChars, Math.min(plainTextLength, 60));
        columns[columnIndex].maxToken = Math.max(columns[columnIndex].maxToken, longestTokenLength);
        columns[columnIndex].hasFigure = columns[columnIndex].hasFigure || hasFigure;
      }

      columnIndex += colspan;
    });
  });

  const estimatedMinWidthRem = columns.reduce((total, column) => {
    const baseRem = 5.5;
    const tokenRem = Math.min(Math.max(column.maxToken * 0.58 + 1.6, 4.8), 15);
    const textRem = Math.min(Math.max(column.maxChars * 0.2 + 2.4, 4.8), 14);
    const figureRem = column.hasFigure ? 9 : 0;
    return total + Math.max(baseRem, tokenRem, textRem, figureRem);
  }, 0);

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
    minWidthRem: Math.min(Math.max(estimatedMinWidthRem, 32), 120),
  };
};

export const TableBlock: React.FC<TableBlockProps> = ({
  table,
  interactive = true,
  effectiveDate,
  renderContext,
}) => {
  const rawTable = table as TableWithRawSupport;
  const activeRevision = getActiveRevision(rawTable.revisions, effectiveDate);
  const resolvedTitle = activeRevision?.title ?? rawTable.title ?? '';
  const resolvedCaption = activeRevision?.caption ?? rawTable.caption;
  const resolvedTableNotes = activeRevision?.table_notes ?? rawTable.table_notes ?? [];
  const formingPartEntries = rawTable.formingPart ?? rawTable.forming_part;
  const tableNumber = getResolvedTableNumber(rawTable);
  const tableNumberDisplay = tableNumber
    ? `Table ${tableNumber}${tableNumber.endsWith(')') ? '' : '.'}`
    : null;
  const tableNotesHeading = tableNumberDisplay ? `Notes to ${tableNumberDisplay}:` : 'Table notes';
  const formingPartText = formatFormingPartText(formingPartEntries);

  const structure = activeRevision?.structure ?? rawTable.structure;
  const hasDirectRows = Array.isArray(table.rows) && table.rows.length > 0;
  const normalizedRows = hasDirectRows
    ? table.rows.map((row, rowIndex) => ({
        id: row.id || `row-${rowIndex}`,
        type: row.type,
        cells: row.cells.map((cell) => normalizeCell(cell as RawTableCell, Boolean(cell.isHeader))),
      }))
    : [
        ...normalizeRows(structure?.header_rows || [], true, effectiveDate, 'header-row'),
        ...normalizeRows(structure?.body_rows || [], false, effectiveDate, 'body-row'),
      ];
  const maxColumnCount = normalizedRows.reduce((max, row) => {
    const rowColumnCount = row.cells.reduce(
      (total, cell) => total + (typeof cell.colspan === 'number' ? cell.colspan : 1),
      0
    );
    return Math.max(max, rowColumnCount);
  }, 0);
  const { preferHorizontalScroll, minWidthRem } = analyzeTableWidth(normalizedRows, maxColumnCount);

  const getTableNoteLabel = (note: RawTableNote, index: number): string => {
    const noteId = (note.id || '').trim();
    const numericSuffix = noteId.match(/\.note(\d+)$/i)?.[1];
    if (numericSuffix) {
      return `(${numericSuffix})`;
    }

    return `(${index + 1})`;
  };

  return (
    <div className="table-block" id={rawTable.id}>
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
      <div className={`table-block__body${preferHorizontalScroll ? ' table-block__body--scroll' : ''}`}>
        <div className={`table-block__wrapper${preferHorizontalScroll ? ' table-block__wrapper--scroll' : ''}`}>
          <table
            className="table-block__table"
            style={preferHorizontalScroll ? { minWidth: `${minWidthRem}rem` } : undefined}
          >
            <tbody>
              {normalizedRows.map((row, rowIndex) => (
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
              ))}
            </tbody>
          </table>
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
                  {renderFormattedText(note.content || '', interactive, renderContext)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
