import React from 'react';
import type { Table, TableCellContent } from '@bc-building-code/bcbc-parser';
import { parseTextWithMarkers } from '../../lib/text-parsing';
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
};

type TableWithRawSupport = Table & {
  structure?: RawTableStructure;
  revisions?: RawTableRevision[];
  number?: string | number;
  title?: string;
  caption?: string;
};

/**
 * Renders a figure within a table cell
 */
const TableCellFigure: React.FC<{ figure: TableCellContent }> = ({ figure }) => {
  if (!figure.graphic) return null;

  const getImagePath = (src: string): string => {
    if (src.startsWith('/')) {
      return src;
    }

    const normalizedSrc = src.replace(/^\/?bc-graphics\//i, '');
    const convertedSrc = normalizedSrc.replace(/\.eps$/i, '.jpg');
    return `/${convertedSrc}`;
  };

  const imagePath = getImagePath(figure.graphic.src);

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

  const tokenRegex = /(<italic>[\s\S]*?<\/italic>|<bold>[\s\S]*?<\/bold>|\^\{[\s\S]*?\})/gi;
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

const normalizeRows = (rows: RawTableRow[], isHeader: boolean, effectiveDate?: string) =>
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
      id: rowObject.id || `row-${rowIndex}`,
      type: rowObject.type,
      cells,
    };
    })
    .filter(Boolean) as Array<{
      id?: string;
      type?: 'header_row' | 'body_row';
      cells: ReturnType<typeof normalizeCell>[];
    }>;

export const TableBlock: React.FC<TableBlockProps> = ({
  table,
  interactive = true,
  effectiveDate,
}) => {
  const rawTable = table as TableWithRawSupport;
  const activeRevision = getActiveRevision(rawTable.revisions, effectiveDate);
  const resolvedTitle = activeRevision?.title ?? rawTable.title ?? '';
  const resolvedCaption = activeRevision?.caption ?? rawTable.caption;

  const structure = activeRevision?.structure ?? rawTable.structure;
  const normalizedRows = table.rows && Array.isArray(table.rows)
    ? table.rows
    : [
        ...normalizeRows(structure?.header_rows || [], true, effectiveDate),
        ...normalizeRows(structure?.body_rows || [], false, effectiveDate),
      ];

  return (
    <div className="table-block">
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
      <div className="table-block__wrapper">
        <table className="table-block__table">
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
    </div>
  );
};
