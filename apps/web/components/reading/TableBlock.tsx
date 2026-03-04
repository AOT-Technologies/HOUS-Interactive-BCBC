import React from 'react';
import type { Table, TableCellContent } from '@bc-building-code/bcbc-parser';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import { resolveImagePath } from '../../lib/image-config';
import './TableBlock.css';

export interface TableBlockProps {
  table: Table;
  interactive?: boolean;
  effectiveDate?: string;
}

type RawTableCell = {
  content?: string | TableCellContent[];
  text?: string;
  align?: 'left' | 'center' | 'right';
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
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
  number?: string | number;
  title?: string;
  caption?: string;
};

/**
 * Renders a figure within a table cell
 */
const TableCellFigure: React.FC<{ figure: TableCellContent }> = ({ figure }) => {
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
const renderFormattedText = (text: string, interactive: boolean): React.ReactNode[] => {
  const normalizedText = text
    // Legacy placeholders used in some table content
    .replace(/<>/g, '<italic>')
    .replace(/<\/>/g, '</italic>');

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
          {parseTextWithMarkers(normalizedText.slice(lastIndex, matchStart), [], interactive)}
        </React.Fragment>
      );
      chunkIndex += 1;
    }

    if (/^<italic>/i.test(token)) {
      const italicText = token.replace(/^<italic>/i, '').replace(/<\/italic>$/i, '');
      nodes.push(
        <em key={`table-italic-${chunkIndex}`}>
          {parseTextWithMarkers(italicText, [], interactive)}
        </em>
      );
    } else if (/^<bold>/i.test(token)) {
      const boldText = token.replace(/^<bold>/i, '').replace(/<\/bold>$/i, '');
      nodes.push(
        <strong key={`table-bold-${chunkIndex}`}>
          {parseTextWithMarkers(boldText, [], interactive)}
        </strong>
      );
    } else if (/^\^\{/.test(token)) {
      const superText = token.replace(/^\^\{/, '').replace(/\}$/, '');
      nodes.push(
        <sup key={`table-sup-${chunkIndex}`}>
          {parseTextWithMarkers(superText, [], interactive)}
        </sup>
      );
    } else if (/^_\{/.test(token)) {
      const subText = token.replace(/^_\{/, '').replace(/\}$/, '');
      nodes.push(
        <sub key={`table-sub-${chunkIndex}`}>
          {parseTextWithMarkers(subText, [], interactive)}
        </sub>
      );
    }

    chunkIndex += 1;
    lastIndex = matchEnd;
  }

  if (lastIndex < normalizedText.length) {
    nodes.push(
      <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
        {parseTextWithMarkers(normalizedText.slice(lastIndex), [], interactive)}
      </React.Fragment>
    );
  }

  if (nodes.length === 0) {
    nodes.push(
      <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
        {parseTextWithMarkers(normalizedText, [], interactive)}
      </React.Fragment>
    );
  }

  return nodes;
};

const renderCellContent = (
  content: string | TableCellContent[],
  interactive: boolean
): React.ReactNode => {
  // Legacy format: plain string
  if (typeof content === 'string') {
    return renderFormattedText(content, interactive);
  }

  // New format: array of content items
  return content.map((item, index) => {
    if (item.type === 'text') {
      return (
        <React.Fragment key={index}>
          {renderFormattedText(item.value || '', interactive)}
        </React.Fragment>
      );
    } else if (item.type === 'figure') {
      return <TableCellFigure key={index} figure={item} />;
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

const normalizeCell = (cell: RawTableCell, isHeader: boolean) => ({
  content: cell.content ?? cell.text ?? '',
  align: cell.align,
  colspan: cell.colspan,
  rowspan: cell.rowspan,
  isHeader: cell.isHeader ?? isHeader,
});

const normalizeRows = (rows: RawTableRow[], isHeader: boolean, effectiveDate?: string, rowPrefix: string = 'row') =>
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
    }>;

type TableWidthAnalysisRow = {
  cells: Array<{
    content: string | TableCellContent[];
    colspan?: number;
  }>;
};

const getCellPlainText = (content: string | TableCellContent[]): string => {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((item) => {
      if (item.type === 'text') return item.value || '';
      if (item.type === 'figure') return `${item.title || ''} ${item.graphic?.alt_text || ''}`;
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

  const hasVeryLongToken = columns.some((column) => column.maxToken >= 14);
  const hasModerateCompressionRisk = maxColumnCount >= 4 && estimatedMinWidthRem >= 30;
  const preferHorizontalScroll =
    maxColumnCount >= 7 ||
    hasVeryLongToken ||
    hasModerateCompressionRisk ||
    estimatedMinWidthRem >= 42;

  return {
    preferHorizontalScroll,
    minWidthRem: Math.min(Math.max(estimatedMinWidthRem, 32), 120),
  };
};

export const TableBlock: React.FC<TableBlockProps> = ({
  table,
  interactive = true,
  effectiveDate,
}) => {
  const rawTable = table as TableWithRawSupport;
  const activeRevision = getActiveRevision(rawTable.revisions, effectiveDate);
  const resolvedTitle = activeRevision?.title ?? rawTable.title ?? '';
  const resolvedCaption = activeRevision?.caption ?? rawTable.caption;
  const resolvedTableNotes = activeRevision?.table_notes ?? rawTable.table_notes ?? [];

  const structure = activeRevision?.structure ?? rawTable.structure;
  const normalizedRows = table.rows && Array.isArray(table.rows)
    ? table.rows
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

  const getTableNoteLabel = (_note: RawTableNote, index: number): string => {
    return `(${index + 1})`;
  };

  return (
    <div className="table-block" id={rawTable.id}>
      {resolvedTitle && (
        <div className="table-block__title">
          {renderFormattedText(`Table ${String(rawTable.number ?? '')} ${resolvedTitle}`, interactive)}
        </div>
      )}
      {resolvedCaption && (
        <div className="table-block__caption">
          {renderFormattedText(resolvedCaption, interactive)}
        </div>
      )}
      <div className={`table-block__wrapper ${preferHorizontalScroll ? 'table-block__wrapper--scroll' : ''}`}>
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
                  
                  return (
                    <CellTag
                      key={cellIndex}
                      className={`${cell.isHeader ? 'table-block__header-cell' : 'table-block__cell'} ${alignClass} ${figureClass}`.trim()}
                      colSpan={cell.colspan}
                      rowSpan={cell.rowspan}
                    >
                      {renderCellContent(cell.content, interactive)}
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
          <div className="table-block__notes-title">Table notes</div>
          {resolvedTableNotes.map((note, index) => (
            <div
              className="table-block__note"
              id={note.id}
              key={note.id || note.vendor_id || `note-${index}`}
            >
              <span className="table-block__note-label">{getTableNoteLabel(note, index)}</span>
              <span className="table-block__note-content">
                {renderFormattedText(note.content || '', interactive)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
