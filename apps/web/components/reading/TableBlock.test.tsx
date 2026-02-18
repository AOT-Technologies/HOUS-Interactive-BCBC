import React from 'react';
import { render, screen } from '@testing-library/react';
import { TableBlock } from './TableBlock';
import type { Table } from '@bc-building-code/bcbc-parser';

describe('TableBlock', () => {
  it('renders table with legacy string content', () => {
    const table: Table = {
      id: 'test-table-1',
      type: 'table',
      number: '1',
      title: 'Test Table',
      headers: [['Header 1', 'Header 2']],
      rows: [
        {
          cells: [
            { content: 'Cell 1', isHeader: false },
            { content: 'Cell 2', isHeader: false },
          ],
        },
      ],
    };

    render(<TableBlock table={table} />);
    
    expect(screen.getByText('Table 1 Test Table')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 2')).toBeInTheDocument();
  });

  it('renders table with mixed content (text and figures)', () => {
    const table: Table = {
      id: 'test-table-2',
      type: 'table',
      number: '2',
      title: 'Mixed Content Table',
      headers: [['Configuration', 'Value']],
      rows: [
        {
          id: 'row-1',
          type: 'body_row',
          cells: [
            {
              content: [
                {
                  type: 'figure',
                  id: 'fig-1',
                  source: 'bc',
                  graphic: {
                    src: 'bc-graphics/gg00554a.eps',
                    alt_text: 'Single storey building configuration',
                  },
                },
              ],
            },
            {
              content: [{ type: 'text', value: '8.08' }],
              align: 'center',
            },
          ],
        },
        {
          id: 'row-2',
          type: 'body_row',
          cells: [
            {
              content: [
                { type: 'text', value: 'Text before image' },
                {
                  type: 'figure',
                  id: 'fig-2',
                  source: 'bc',
                  title: 'Figure 9.23.13.7.-A Building Configuration',
                  graphic: {
                    src: 'bc-graphics/gg00555a.eps',
                    alt_text: 'Two storey building configuration',
                  },
                },
                { type: 'text', value: 'Text after image' },
              ],
            },
            {
              content: [{ type: 'text', value: '10.5' }],
              align: 'center',
            },
          ],
        },
      ],
    };

    render(<TableBlock table={table} />);
    
    expect(screen.getByText('Table 2 Mixed Content Table')).toBeInTheDocument();
    expect(screen.getByText('8.08')).toBeInTheDocument();
    expect(screen.getByText('Text before image')).toBeInTheDocument();
    expect(screen.getByText('Text after image')).toBeInTheDocument();
    expect(screen.getByText('10.5')).toBeInTheDocument();
    
    // Check for figures
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('alt', 'Single storey building configuration');
    expect(images[1]).toHaveAttribute('alt', 'Two storey building configuration');
  });

  it('applies text alignment classes', () => {
    const table: Table = {
      id: 'test-table-3',
      type: 'table',
      number: '3',
      title: 'Alignment Test',
      headers: [['Left', 'Center', 'Right']],
      rows: [
        {
          cells: [
            { content: [{ type: 'text', value: 'Left' }], align: 'left' },
            { content: [{ type: 'text', value: 'Center' }], align: 'center' },
            { content: [{ type: 'text', value: 'Right' }], align: 'right' },
          ],
        },
      ],
    };

    const { container } = render(<TableBlock table={table} />);
    
    const cells = container.querySelectorAll('td');
    expect(cells[0]).toHaveClass('table-block__cell--left');
    expect(cells[1]).toHaveClass('table-block__cell--center');
    expect(cells[2]).toHaveClass('table-block__cell--right');
  });

  it('renders table with caption', () => {
    const table: Table = {
      id: 'test-table-4',
      type: 'table',
      number: '4',
      title: 'Table with Caption',
      caption: 'This is a caption',
      headers: [['Header']],
      rows: [
        {
          cells: [{ content: 'Data' }],
        },
      ],
    };

    render(<TableBlock table={table} />);
    
    expect(screen.getByText('This is a caption')).toBeInTheDocument();
  });
});
