import React from 'react';
import type { Table, TableCellContent } from '@bc-building-code/bcbc-parser';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './TableBlock.css';

export interface TableBlockProps {
  table: Table;
  interactive?: boolean;
}

/**
 * Renders a figure within a table cell
 */
const TableCellFigure: React.FC<{ figure: TableCellContent }> = ({ figure }) => {
  if (!figure.graphic) return null;

  const getImagePath = (src: string): string => {
    if (src.startsWith('/')) {
      return src;
    }
    // Remove file extension and add appropriate path
    const baseName = src.replace(/\.(eps|png|jpg|jpeg|svg)$/i, '');
    return `/bc-graphics/${baseName}.png`;
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
  const italicRegex = /<italic>(.*?)<\/italic>/gi;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let chunkIndex = 0;

  while ((match = italicRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = italicRegex.lastIndex;
    const italicText = match[1] || '';

    if (matchStart > lastIndex) {
      nodes.push(
        <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
          {parseTextWithMarkers(text.slice(lastIndex, matchStart), [], interactive)}
        </React.Fragment>
      );
      chunkIndex += 1;
    }

    nodes.push(
      <em key={`table-italic-${chunkIndex}`}>
        {parseTextWithMarkers(italicText, [], interactive)}
      </em>
    );

    chunkIndex += 1;
    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
        {parseTextWithMarkers(text.slice(lastIndex), [], interactive)}
      </React.Fragment>
    );
    chunkIndex += 1;
  }

  if (nodes.length === 0) {
    nodes.push(
      <React.Fragment key={`table-text-chunk-${chunkIndex}`}>
        {parseTextWithMarkers(text, [], interactive)}
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

export const TableBlock: React.FC<TableBlockProps> = ({
  table,
  interactive = true,
}) => {
  return (
    <div className="table-block">
      {table.title && (
        <div className="table-block__title">
          {renderFormattedText(`Table ${table.number} ${table.title}`, interactive)}
        </div>
      )}
      {table.caption && (
        <div className="table-block__caption">
          {renderFormattedText(table.caption, interactive)}
        </div>
      )}
      <div className="table-block__wrapper">
        <table className="table-block__table">
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                {row.cells.map((cell, cellIndex) => {
                  const CellTag = cell.isHeader ? 'th' : 'td';
                  const alignClass = cell.align ? `table-block__cell--${cell.align}` : '';
                  
                  return (
                    <CellTag
                      key={cellIndex}
                      className={`${cell.isHeader ? 'table-block__header-cell' : 'table-block__cell'} ${alignClass}`.trim()}
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
