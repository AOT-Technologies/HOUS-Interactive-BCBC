import React from 'react';
import './TableBlock.css';

interface TableCell {
  content: string | InlineContent[];
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

interface TableRow {
  cells: TableCell[];
}

interface TableContent {
  id: string;
  caption?: string;
  headers: string[];
  rows: TableRow[];
}

interface InlineContent {
  type: 'text' | 'glossary-term' | 'cross-reference' | 'internal-link' | 'note-reference';
  text: string;
  termId?: string;
  referenceId?: string;
  targetUrl?: string;
  title?: string;
}

interface TableBlockProps {
  table: TableContent;
}

export function TableBlock({ table }: TableBlockProps) {
  const renderCellContent = (content: string | InlineContent[]): React.ReactNode => {
    if (typeof content === 'string') {
      return content;
    }
    
    return content.map((item, index) => {
      if (item.type === 'text') {
        return <span key={index}>{item.text}</span>;
      }
      // For now, render other inline content types as plain text
      // These will be enhanced when interactive features are added
      return <span key={index}>{item.text}</span>;
    });
  };

  return (
    <div className="table-block">
      {table.caption && (
        <div className="table-block__caption table-block__caption--above">
          {table.caption}
        </div>
      )}
      <div className="table-block__wrapper">
        <table className="table-block__table">
          {table.headers && table.headers.length > 0 && (
            <thead>
              <tr>
                {table.headers.map((header, index) => (
                  <th key={index} className="table-block__header-cell">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.cells.map((cell, cellIndex) => {
                  const CellTag = cell.isHeader ? 'th' : 'td';
                  return (
                    <CellTag
                      key={cellIndex}
                      className={cell.isHeader ? 'table-block__header-cell' : 'table-block__cell'}
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
}
