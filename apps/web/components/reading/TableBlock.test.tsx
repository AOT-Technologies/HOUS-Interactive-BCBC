import React from 'react';
import { render, screen } from '@testing-library/react';
import { TableBlock } from './TableBlock';
import type { Table } from '@bc-building-code/bcbc-parser';

describe('TableBlock', () => {
  it('renders table with legacy string content', () => {
    const table: Table = {
      id: 'test-table-1',
      type: 'table',
      number: '1.3.1.2',
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
    
    expect(screen.getByText('Table 1.3.1.2.')).toBeInTheDocument();
    expect(screen.getByText('Test Table')).toBeInTheDocument();
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

    const { container } = render(<TableBlock table={table} />);
    
    expect(screen.getByText('Table 2.')).toBeInTheDocument();
    expect(screen.getByText('Mixed Content Table')).toBeInTheDocument();
    expect(screen.getByText('8.08')).toBeInTheDocument();
    expect(screen.getByText('10.5')).toBeInTheDocument();
    
    // Check for text content using container.textContent which includes all text
    expect(container.textContent).toContain('Text before image');
    expect(container.textContent).toContain('Text after image');
    
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

  it('prefers horizontal scroll for content-heavy tables even with fewer columns', () => {
    const table: Table = {
      id: 'test-table-5',
      type: 'table',
      number: '5',
      title: 'Compact but Wide',
      rows: [
        {
          type: 'header_row',
          cells: [
            { content: 'Issuing Agency', isHeader: true },
            { content: 'Document Number', isHeader: true },
            { content: 'Title of Document', isHeader: true },
            { content: 'Code Reference', isHeader: true },
          ],
        },
        {
          type: 'body_row',
          cells: [
            { content: [{ type: 'text', value: 'AAMA' }] },
            { content: [{ type: 'text', value: '501.1-05' }] },
            {
              content: [
                {
                  type: 'text',
                  value:
                    'Standard Test Method for Water Penetration of Windows Curtain Walls and Doors Using Dynamic Pressure',
                },
              ],
            },
            { content: [{ type: 'text', value: 'Note 5.9.3. (47)' }] },
          ],
        },
      ],
    };

    const { container } = render(<TableBlock table={table} />);
    const wrapper = container.querySelector('.table-block__wrapper');
    const renderedTable = container.querySelector('.table-block__table');

    expect(wrapper).toHaveClass('table-block__wrapper--scroll');
    expect(renderedTable?.getAttribute('style')).toMatch(/min-width:\s*\d+(\.\d+)?rem/i);
  });

  it('renders forming part information from internal targets', () => {
    const table: Table = {
      id: 'nbc.divB.part1.sect3.subsect1.art2.table1',
      type: 'table',
      number: '1.3.1.2',
      title: 'Documents Referenced in Book I',
      headers: [['Header']],
      rows: [
        {
          cells: [{ content: 'Data' }],
        },
      ],
      formingPart: [
        {
          type: 'internal',
          target: 'nbc.divB.part1.sect3.subsect1.art2.sent1',
          display_type: 'long',
        },
      ],
    };

    render(<TableBlock table={table} />);

    expect(screen.getByText('Table 1.3.1.2.')).toBeInTheDocument();
    expect(screen.getByText('Forming Part of Sentence 1.3.1.2.(1)')).toBeInTheDocument();
  });

  it('renders Appendix D table numbering from appendix-style ids when number is omitted', () => {
    const table: Table = {
      id: 'nbc.divB.appendixD.appsect1.subsect1.article2.table1',
      type: 'table',
      title: 'Appendix Table',
      headers: [['Header']],
      rows: [
        {
          cells: [{ content: 'Data' }],
        },
      ],
    };

    render(<TableBlock table={table} />);

    expect(screen.getByText('Table D.1.1.2.')).toBeInTheDocument();
  });

  it('normalizes em dash table values to hyphen', () => {
    const table: Table = {
      id: 'test-table-dash',
      type: 'table',
      number: '3.1.3.1',
      title: 'Dash Normalization',
      headers: [['Header']],
      rows: [
        {
          cells: [{ content: [{ type: 'text', value: '—' }] }],
        },
      ],
    };

    render(<TableBlock table={table} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('applies explicit colspan in raw table structure', () => {
    const table = {
      id: 'test-table-span',
      type: 'table' as const,
      number: '9.37.1.3',
      title: 'Span Test',
      headers: [],
      rows: [],
      structure: {
        header_rows: [
          {
            id: 'rowh1',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'A' }], align: 'center' as const },
              {
                content: [{ type: 'text' as const, value: 'Merged Header' }],
                align: 'center' as const,
                colspan: 4,
              },
            ],
          },
        ],
        body_rows: [],
      },
    };

    const { container } = render(<TableBlock table={table as Table} />);

    const mergedCell = screen.getByText('Merged Header').closest('th');
    expect(mergedCell).toHaveAttribute('colspan', '4');
    expect(mergedCell).toHaveClass('table-block__cell--spanned');
    expect(container.querySelectorAll('th')).toHaveLength(2);
  });

  it('renders table note labels using note id suffix when available', () => {
    const table = {
      id: 'nbc.divBV2.part9.spectables1.table1',
      type: 'table' as const,
      number: '9.10.3.1.-A',
      title: 'Spectable Note Labels',
      headers: [],
      rows: [],
      table_notes: [
        { id: 'nbc.divBV2.part9.spectables1.table1.note10', content: 'Note ten content' },
        { id: 'nbc.divBV2.part9.spectables1.table1.note2', content: 'Note two content' },
      ],
    };

    const { container } = render(<TableBlock table={table as unknown as Table} />);
    const labels = Array.from(container.querySelectorAll('.table-block__note-label')).map(
      (el) => el.textContent
    );

    expect(labels).toEqual(['(10)', '(2)']);
  });

  it('renders table notes heading with the resolved table number', () => {
    const table = {
      id: 'nbc.divB.part9.sect3.subsect1.art7.table1',
      type: 'table' as const,
      number: '9.3.1.7',
      title: 'Table Notes Heading',
      headers: [],
      rows: [],
      table_notes: [{ id: 'nbc.divB.part9.sect3.subsect1.art7.table1.note1', content: 'First note' }],
    };

    render(<TableBlock table={table as unknown as Table} />);

    expect(screen.getByText('Notes to Table 9.3.1.7.:')).toBeInTheDocument();
  });
});
