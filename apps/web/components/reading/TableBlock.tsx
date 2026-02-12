import React from 'react';
import type { Table, TableCellContent } from '@bc-building-code/bcbc-parser';
import './TableBlock.css';

export interface TableBlockProps {
  table: Table;
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
const renderCellContent = (content: string | TableCellContent[]): React.ReactNode => {
  // Legacy format: plain string
  if (typeof content === 'string') {
    return content;
  }

  // New format: array of content items
  return content.map((item, index) => {
    if (item.type === 'text') {
      return <span key={index}>{item.value}</span>;
    } else if (item.type === 'figure') {
      return <TableCellFigure key={index} figure={item} />;
    }
    return null;
  });
};

export const TableBlock: React.FC<TableBlockProps> = ({ table }) => {
  return (
    <div className="table-block">
      {table.title && (
        <div className="table-block__title">
          Table {table.number} {table.title}
        </div>
      )}
      {table.caption && (
        <div className="table-block__caption">
          {table.caption}
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
                      {renderCellContent(cell.content)}
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
