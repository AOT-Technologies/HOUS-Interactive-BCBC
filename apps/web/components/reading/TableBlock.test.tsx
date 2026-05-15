import React from 'react';
import { render, screen } from '@testing-library/react';
import { TableBlock } from './TableBlock';
import type { Table } from '@bc-building-code/bcbc-parser';

const mockElementWidth = (width: number) => {
  const clientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return width;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return width;
    },
  });

  return () => {
    if (clientWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidthDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (HTMLElement.prototype as Partial<HTMLElement>).clientWidth;
    }

    if (offsetWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidthDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (HTMLElement.prototype as Partial<HTMLElement>).offsetWidth;
    }
  };
};

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

  it('renders structured list content embedded in a table cell', () => {
    const table: Table = {
      id: 'test-table-list-cell',
      type: 'table',
      number: '9.36.1.3',
      title: 'List Cell Table',
      headers: [['Building Types and Sizes']],
      rows: [
        {
          id: 'row-1',
          type: 'body_row',
          cells: [
            {
              content: [
                {
                  type: 'list',
                  list: {
                    type: 'bulleted',
                    items: [
                      { content: 'Houses with or without a secondary suite' },
                      { content: 'Buildings containing only dwelling units' },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    render(<TableBlock table={table} />);

    expect(screen.getByText('Houses with or without a secondary suite')).toBeInTheDocument();
    expect(screen.getByText('Buildings containing only dwelling units')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders raw list_type table cell content from generated appendix data', () => {
    const table = {
      id: 'test-table-raw-list-cell',
      type: 'table' as const,
      number: '9.36.1.3',
      title: 'Raw List Cell Table',
      headers: [],
      rows: [],
      structure: {
        body_rows: [
          {
            id: 'row-1',
            type: 'body_row' as const,
            cells: [
              {
                content: [
                  {
                    type: 'list' as const,
                    list_type: 'bulleted' as const,
                    items: [
                      { content: 'Houses with or without a secondary suite' },
                      { content: 'Buildings containing only dwelling units' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    render(<TableBlock table={table as unknown as Table} />);

    expect(screen.getByText('Houses with or without a secondary suite')).toBeInTheDocument();
    expect(screen.getByText('Buildings containing only dwelling units')).toBeInTheDocument();
  });

  it('renders raw symbol list_type table cell content from generated appendix data', () => {
    const table = {
      id: 'test-table-raw-symbol-list-cell',
      type: 'table' as const,
      number: '4.1.1.3',
      title: 'Raw Symbol List Cell Table',
      headers: [],
      rows: [],
      structure: {
        body_rows: [
          {
            id: 'row-1',
            type: 'body_row' as const,
            cells: [
              {
                content: [
                  {
                    type: 'list' as const,
                    list_type: 'symbol' as const,
                    items: [
                      { symbol: 'D', description: 'dead load' },
                      { symbol: 'L', description: 'live load' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    render(<TableBlock table={table as unknown as Table} />);

    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('dead load')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('live load')).toBeInTheDocument();
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

  it('does not leak unresolved list placeholders in table cells', () => {
    const table: Table = {
      id: 'test-table-list-placeholder',
      type: 'table',
      number: '9.36.1.3',
      title: 'Placeholder Handling',
      headers: [['Building Type']],
      rows: [
        {
          cells: [{ content: [{ type: 'text', value: '[LIST:bulleted]' }] }],
        },
      ],
    };

    const { container } = render(<TableBlock table={table} />);

    expect(container.textContent).not.toContain('[LIST:bulleted]');
  });

  it('prefers horizontal scroll for content-heavy tables even with fewer columns', () => {
    const restoreWidths = mockElementWidth(320);
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
    const bodyViewport = container.querySelector('.table-block__body-viewport');
    const splitLayout = container.querySelector('.table-block__split-scroll');
    // Split layout produces 3 <table> elements:
    //   [0] scrolling header track  (.table-block__table--split-header)
    //   [1] pinned first-column overlay (.table-block__table--pinned-col)
    //   [2] scrollable body  (.table-block__table--split-body)
    const splitTables = container.querySelectorAll('.table-block__table');

    expect(wrapper).toHaveClass('table-block__wrapper--scroll');
    expect(wrapper).toHaveClass('table-block__wrapper--split');
    expect(splitLayout).toBeInTheDocument();
    expect(bodyViewport).toBeInTheDocument();
    expect(splitTables).toHaveLength(3);
    // The split-header and pinned-col tables both carry explicit min-width styles.
    expect(splitTables[0]?.getAttribute('style')).toMatch(/min-width:\s*\d+(\.\d+)?rem/i);
    restoreWidths();
  });

  it('assigns print-specific column widths for wide tables', () => {
    const table: Table = {
      id: 'test-table-print-widths',
      type: 'table',
      number: '9.99.1.1',
      title: 'Print Width Balancing',
      rows: [
        {
          type: 'header_row',
          cells: [
            { content: 'Short', isHeader: true },
            {
              content:
                'Very Long Descriptive Header For Content That Needs More Room In The Printed PDF',
              isHeader: true,
            },
            { content: 'Ref', isHeader: true },
            { content: 'Value', isHeader: true },
          ],
        },
        {
          type: 'body_row',
          cells: [
            { content: [{ type: 'text', value: 'A' }] },
            {
              content: [
                {
                  type: 'text',
                  value:
                    'This body cell contains substantially more text so the print view should allocate more width to this column than the others.',
                },
              ],
            },
            { content: [{ type: 'text', value: '9.10.3.1.' }] },
            { content: [{ type: 'text', value: '12.5' }] },
          ],
        },
      ],
    };

    const { container } = render(<TableBlock table={table} />);
    const columns = Array.from(container.querySelectorAll('.table-block__col'));

    expect(columns.length).toBeGreaterThanOrEqual(4);
    expect(columns[0]?.style.getPropertyValue('--table-column-width-rem')).not.toBe('');
    expect(columns[0]?.style.getPropertyValue('--table-column-width-print')).not.toBe('');

    const firstPrintWidth = Number.parseFloat(
      columns[0]?.style.getPropertyValue('--table-column-width-print') || '0'
    );
    const secondPrintWidth = Number.parseFloat(
      columns[1]?.style.getPropertyValue('--table-column-width-print') || '0'
    );

    expect(secondPrintWidth).toBeGreaterThan(firstPrintWidth);
  });

  it('marks extra-wide print tables for landscape scaling', () => {
    const table: Table = {
      id: 'test-table-print-scale',
      type: 'table',
      number: '9.99.2.2',
      title: 'Landscape Scale',
      rows: [
        {
          type: 'header_row',
          cells: Array.from({ length: 10 }, (_, index) => ({
            content: `Long Descriptive Header Column ${index + 1} For Print Scaling`,
            isHeader: true,
          })),
        },
        {
          type: 'body_row',
          cells: Array.from({ length: 10 }, (_, index) => ({
            content: [
              {
                type: 'text' as const,
                value: `Extended table content ${index + 1} that forces a very wide natural print width`,
              },
            ],
          })),
        },
      ],
    };

    const { container } = render(<TableBlock table={table} />);
    const root = container.querySelector('.table-block');

    expect(root).toHaveClass('table-block--landscape');
    expect(root).toHaveClass('table-block--print-scaled');
    expect(root?.getAttribute('style')).toContain('--table-print-natural-width');
    expect(root?.getAttribute('style')).toContain('--table-print-scale');
  });

  it('infers grouped header colspans from contiguous child header codes', () => {
    const restoreWidths = mockElementWidth(320);
    const table = {
      id: 'test-table-braced-wall-panels',
      type: 'table' as const,
      title: 'Minimum Total Length of Braced Wall Panels where HWP <= 0.5 kPa and Smax <= 0.3',
      headers: [],
      rows: [],
      structure: {
        header_rows: [
          {
            id: 'header-1',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: '<italic>Storey</italic>' }] },
              {
                content: [
                  {
                    type: 'text' as const,
                    value: '<italic>Minimum Total Length Braced Wall Panels</italic>, m',
                  },
                ],
              },
            ],
          },
          {
            id: 'header-2',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: '' }] },
              {
                content: [
                  {
                    type: 'text' as const,
                    value:
                      '<bold>Diagonal-Lumber-Sheathed Framing Type (with gypsum board on opposite side)^{(1)}</bold>',
                  },
                ],
              },
              {
                content: [
                  {
                    type: 'text' as const,
                    value:
                      '<bold>Gypsum-Sheathed Framing Type (with gypsum board on only one side)^{(1)(2)}</bold>',
                  },
                ],
              },
              {
                content: [
                  {
                    type: 'text' as const,
                    value:
                      '<bold>Wood-Sheathed Framing Type (with gypsum board on opposite side)^{(1)}</bold>',
                  },
                ],
              },
            ],
          },
          {
            id: 'header-3',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: '' }] },
              { content: [{ type: 'text' as const, value: 'DWB' }] },
              { content: [{ type: 'text' as const, value: 'GWB-A' }] },
              { content: [{ type: 'text' as const, value: 'GWB-B' }] },
              { content: [{ type: 'text' as const, value: 'GWB-C' }] },
              { content: [{ type: 'text' as const, value: 'GWB-D' }] },
              { content: [{ type: 'text' as const, value: 'WSP-A' }] },
              { content: [{ type: 'text' as const, value: 'WSP-B' }] },
              { content: [{ type: 'text' as const, value: 'WSP-C' }] },
              { content: [{ type: 'text' as const, value: 'WSP-D' }] },
              { content: [{ type: 'text' as const, value: 'WSP-E' }] },
            ],
          },
        ],
        body_rows: [
          {
            id: 'body-1',
            type: 'body_row' as const,
            cells: Array.from({ length: 11 }, (_, index) => ({
              content: [{ type: 'text' as const, value: `Cell ${index + 1}` }],
            })),
          },
        ],
      },
    };

    render(<TableBlock table={table as unknown as Table} />);

    const storeyHeader = screen.getAllByText('Storey')[0]?.closest('th');
    const allPanelsHeader = screen.getAllByText('Minimum Total Length Braced Wall Panels')[0]?.closest('th');
    const diagonalHeader = screen
      .getAllByText(/Diagonal-Lumber-Sheathed Framing Type/i)[0]
      ?.closest('th');
    const gypsumHeader = screen
      .getAllByText(/Gypsum-Sheathed Framing Type/i)[0]
      ?.closest('th');
    const woodHeader = screen
      .getAllByText(/Wood-Sheathed Framing Type/i)[0]
      ?.closest('th');

    expect(storeyHeader).toHaveAttribute('rowspan', '3');
    expect(allPanelsHeader).toHaveAttribute('colspan', '10');
    expect(diagonalHeader).not.toHaveAttribute('colspan');
    expect(gypsumHeader).toHaveAttribute('colspan', '4');
    expect(woodHeader).toHaveAttribute('colspan', '5');
    restoreWidths();
  });

  it('keeps header rows outside the scrollable body region for overflow tables', () => {
    const restoreWidths = mockElementWidth(320);
    const table: Table = {
      id: 'test-table-split-header',
      type: 'table',
      number: '9.99.9.9',
      title: 'Pinned Header',
      rows: [
        {
          type: 'header_row',
          cells: [
            { content: 'Extremely Long Header Column One', isHeader: true },
            { content: 'Extremely Long Header Column Two', isHeader: true },
            { content: 'Extremely Long Header Column Three', isHeader: true },
            { content: 'Extremely Long Header Column Four', isHeader: true },
          ],
        },
        {
          type: 'body_row',
          cells: [
            { content: [{ type: 'text', value: 'Body value 1' }] },
            { content: [{ type: 'text', value: 'Body value 2' }] },
            {
              content: [
                {
                  type: 'text',
                  value:
                    'This row is intentionally long enough to keep the table in overflow mode and trigger the split layout.',
                },
              ],
            },
            { content: [{ type: 'text', value: 'Body value 4' }] },
          ],
        },
      ],
    };

    const { container } = render(<TableBlock table={table} />);
    const headerViewport = container.querySelector('.table-block__header-viewport');
    const bodyViewport = container.querySelector('.table-block__body-viewport');

    expect(headerViewport).toBeInTheDocument();
    expect(bodyViewport).toBeInTheDocument();
    expect(headerViewport?.textContent).toContain('Extremely Long Header Column One');
    expect(bodyViewport?.textContent).not.toContain('Extremely Long Header Column One');
    expect(bodyViewport?.textContent).toContain('Body value 1');
    restoreWidths();
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

    expect(screen.getByText('Table D-1.1.2-A.')).toBeInTheDocument();
  });

  it('renders top-level appendix table numbering and forming part labels', () => {
    const table: Table = {
      id: 'nbc.divB.appendixC.table1',
      type: 'table',
      title: 'Wind Speeds',
      headers: [['qkPa', 'Vm/s']],
      rows: [
        {
          cells: [{ content: '0.15' }, { content: '15.2' }],
        },
      ],
      formingPart: [
        {
          type: 'internal',
          target: 'nbc.divB.appendixC',
          display_type: 'long',
        },
      ],
    };

    render(<TableBlock table={table} />);

    expect(screen.getByText('Table C-1')).toBeInTheDocument();
    expect(screen.getByText('Forming Part of Appendix C')).toBeInTheDocument();
    expect(screen.getByText('Wind Speeds')).toBeInTheDocument();
  });

  it('does not render unresolved table ids as table numbers', () => {
    const table: Table = {
      id: 'nbc.2020.preface.div6.sub1.table1',
      type: 'table',
      headers: [['Header']],
      rows: [
        {
          cells: [{ content: 'Data' }],
        },
      ],
    };

    const { container } = render(<TableBlock table={table} />);

    expect(container.textContent).not.toContain('Table nbc.2020.preface.div6.sub1.table1.');
    expect(container.querySelector('.table-block__number')).toBeNull();
    expect(screen.getByText('Data')).toBeInTheDocument();
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

  it('infers header spans for legacy multi-row headers that omit colspan and rowspan', () => {
    const restoreWidths = mockElementWidth(320);
    const table = {
      id: 'test-table-infer-spans',
      type: 'table' as const,
      number: '9.36.1.3',
      title: 'Inferred Span Header',
      headers: [],
      rows: [],
      structure: {
        header_rows: [
          {
            id: 'header-1',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'Assembly Type' }] },
              { content: [{ type: 'text' as const, value: 'Heating Degree-Days' }] },
            ],
          },
          {
            id: 'header-2',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'Zone 4' }] },
              { content: [{ type: 'text' as const, value: 'Zone 5' }] },
              { content: [{ type: 'text' as const, value: 'Zone 6' }] },
              { content: [{ type: 'text' as const, value: 'Zone 7A' }] },
              { content: [{ type: 'text' as const, value: 'Zone 7B' }] },
              { content: [{ type: 'text' as const, value: 'Zone 8' }] },
            ],
          },
          {
            id: 'header-3',
            type: 'header_row' as const,
            cells: [{ content: [{ type: 'text' as const, value: 'Minimum Effective Thermal Resistance' }] }],
          },
        ],
        body_rows: [
          {
            id: 'body-1',
            type: 'body_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'Foundation walls' }] },
              { content: [{ type: 'text' as const, value: '3.46' }] },
              { content: [{ type: 'text' as const, value: '3.97' }] },
              { content: [{ type: 'text' as const, value: '3.97' }] },
              { content: [{ type: 'text' as const, value: '3.97' }] },
              { content: [{ type: 'text' as const, value: '3.97' }] },
              { content: [{ type: 'text' as const, value: '3.97' }] },
            ],
          },
        ],
      },
    };

    const { container } = render(<TableBlock table={table as unknown as Table} />);
    const assemblyHeader = screen.getAllByText('Assembly Type')[0]?.closest('th');
    const heatingHeader = screen.getAllByText('Heating Degree-Days')[0]?.closest('th');
    const minimumHeader = screen.getAllByText('Minimum Effective Thermal Resistance')[0]?.closest('th');

    expect(assemblyHeader).toHaveAttribute('rowspan', '3');
    expect(heatingHeader).toHaveAttribute('colspan', '6');
    expect(minimumHeader).toHaveAttribute('colspan', '6');
    expect(container.querySelector('.table-block__wrapper--split')).toBeInTheDocument();
    restoreWidths();
  });

  it('applies table-block__cell--first-col only to cells at visual column 0, not rowspan sub-rows', () => {
    // Table where column 0 uses rowspan grouping. Sub-rows have their first DOM
    // child at visual column 1+, so first-col must not be applied there.
    const table = {
      id: 'test-first-col-rowspan',
      type: 'table' as const,
      number: '9.36.3.9',
      title: 'First Col Rowspan Test',
      headers: [],
      rows: [],
      structure: {
        header_rows: [
          {
            id: 'header-1',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'Type of Equipment' }] },
              { content: [{ type: 'text' as const, value: 'Capacity' }] },
              { content: [{ type: 'text' as const, value: 'Standard' }] },
              { content: [{ type: 'text' as const, value: 'Performance' }] },
            ],
          },
        ],
        body_rows: [
          {
            // Anchor row: column 0 has rowspan=3
            id: 'body-1',
            type: 'body_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'Split system' }], rowspan: 3 },
              { content: [{ type: 'text' as const, value: '< 19' }], rowspan: 3 },
              { content: [{ type: 'text' as const, value: 'CSA C656' }], rowspan: 3 },
              { content: [{ type: 'text' as const, value: 'SEER = 14.5' }] },
            ],
          },
          {
            // Sub-row 1: column 0 covered by rowspan — first DOM child is at col 3
            id: 'body-2',
            type: 'body_row' as const,
            cells: [{ content: [{ type: 'text' as const, value: 'EER = 11.5' }] }],
          },
          {
            // Sub-row 2 (last): the off-by-one bug caused this to get first-col incorrectly
            id: 'body-3',
            type: 'body_row' as const,
            cells: [{ content: [{ type: 'text' as const, value: 'HSPF = 7.1' }] }],
          },
          {
            // New anchor: column 0 is free again
            id: 'body-4',
            type: 'body_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'Single-package system' }], rowspan: 2 },
              { content: [{ type: 'text' as const, value: '< 19' }], rowspan: 2 },
              { content: [{ type: 'text' as const, value: 'CSA C656' }], rowspan: 2 },
              { content: [{ type: 'text' as const, value: 'SEER = 14.0' }] },
            ],
          },
          {
            // Last sub-row of second group
            id: 'body-5',
            type: 'body_row' as const,
            cells: [{ content: [{ type: 'text' as const, value: 'EER = 10.0' }] }],
          },
        ],
      },
    };

    const { container } = render(<TableBlock table={table as unknown as Table} />);
    const firstColCells = container.querySelectorAll('.table-block__cell--first-col');

    // Only the 2 anchor rows (visual col 0) should carry the class
    expect(firstColCells).toHaveLength(2);
    expect(firstColCells[0]?.textContent).toContain('Split system');
    expect(firstColCells[1]?.textContent).toContain('Single-package system');

    // Middle sub-rows must NOT have the class
    expect(screen.getByText('EER = 11.5').closest('td')).not.toHaveClass('table-block__cell--first-col');
    // Last sub-row of each group must also NOT have the class (off-by-one fix)
    expect(screen.getByText('HSPF = 7.1').closest('td')).not.toHaveClass('table-block__cell--first-col');
    expect(screen.getByText('EER = 10.0').closest('td')).not.toHaveClass('table-block__cell--first-col');
  });

  it('renders a pinned first-column header overlay inside the split layout header viewport', () => {
    const restoreWidths = mockElementWidth(320);
    const table = {
      id: 'test-pinned-header-overlay',
      type: 'table' as const,
      number: '9.99.9.8',
      title: 'Pinned Overlay',
      headers: [],
      rows: [],
      structure: {
        header_rows: [
          {
            id: 'header-1',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'Type of Assembly' }] },
              { content: [{ type: 'text' as const, value: 'Heating or Cooling Capacity, kW' }] },
              { content: [{ type: 'text' as const, value: 'Performance Testing Standard' }] },
              { content: [{ type: 'text' as const, value: 'Minimum Performance' }] },
            ],
          },
        ],
        body_rows: [
          {
            id: 'body-1',
            type: 'body_row' as const,
            cells: [
              {
                content: [
                  { type: 'text' as const, value: 'Extremely Long Equipment Name That Forces Scroll Mode' },
                ],
              },
              { content: [{ type: 'text' as const, value: '< 19' }] },
              { content: [{ type: 'text' as const, value: 'CSA C656, Standard for split-system air conditioners' }] },
              { content: [{ type: 'text' as const, value: 'SEER = 14.5' }] },
            ],
          },
        ],
      },
    };

    const { container } = render(<TableBlock table={table as unknown as Table} />);
    const headerViewport = container.querySelector('.table-block__header-viewport');
    const pinnedOverlay = container.querySelector('.table-block__pinned-header-col');
    const pinnedTable = container.querySelector('.table-block__table--pinned-col');

    // Overlay and its inner table must be present inside the header viewport
    expect(pinnedOverlay).toBeInTheDocument();
    expect(pinnedTable).toBeInTheDocument();
    expect(headerViewport?.contains(pinnedOverlay)).toBe(true);

    // The overlay must reproduce the first-column header text
    expect(pinnedOverlay?.textContent).toContain('Type of Assembly');

    // The overlay must NOT contain other column headers
    expect(pinnedOverlay?.textContent).not.toContain('Heating or Cooling Capacity');
    expect(pinnedOverlay?.textContent).not.toContain('Performance Testing Standard');
    restoreWidths();
  });

  it('infers rowspans for placeholder header cells in appendix tables', () => {
    const table = {
      id: 'nbc.divA.part1.appendix.appnote7.div5.table1',
      type: 'table' as const,
      title:
        'Table A-1.4.1.2.(1) TDGR, WHMIS and British Columbia Building Code Class Descriptors for Dangerous Goods',
      headers: [],
      rows: [],
      structure: {
        header_rows: [
          {
            id: 'header-1',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'TDGR' }], colspan: 2 },
              { content: [{ type: 'text' as const, value: 'WHMIS' }] },
              { content: [{ type: 'text' as const, value: 'British Columbia Building Code' }] },
            ],
          },
          {
            id: 'header-2',
            type: 'header_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: 'Class' }] },
              { content: [{ type: 'text' as const, value: 'Descriptor' }] },
              { content: [{ type: 'text' as const, value: '' }] },
              { content: [{ type: 'text' as const, value: '' }] },
            ],
          },
        ],
        body_rows: [
          {
            id: 'body-1',
            type: 'body_row' as const,
            cells: [
              { content: [{ type: 'text' as const, value: '1' }] },
              { content: [{ type: 'text' as const, value: 'Explosives' }] },
              { content: [{ type: 'text' as const, value: 'Explosives' }] },
              { content: [{ type: 'text' as const, value: 'Explosives' }] },
            ],
          },
        ],
      },
    };

    render(<TableBlock table={table as unknown as Table} />);

    const tdgrHeader = screen.getByText('TDGR').closest('th');
    const whmisHeader = screen.getByText('WHMIS').closest('th');
    const bcbcHeader = screen.getByText('British Columbia Building Code').closest('th');

    expect(tdgrHeader).toHaveAttribute('colspan', '2');
    expect(whmisHeader).toHaveAttribute('rowspan', '2');
    expect(bcbcHeader).toHaveAttribute('rowspan', '2');
    expect(screen.getByText('Class')).toBeInTheDocument();
    expect(screen.getByText('Descriptor')).toBeInTheDocument();
  });

  it('adds sentence suffix from own-article forming_part for single tables', () => {
    const table = {
      id: 'nbc.divA.part1.sect1.subsect1.art1.table1',
      type: 'table' as const,
      title: 'Heritage Buildings',
      headers: [['Col']],
      rows: [{ cells: [{ content: 'Data' }] }],
      formingPart: [
        { type: 'internal', target: 'nbc.divA.part1.sect1.subsect1.art1.sent5', display_type: 'long' },
      ],
    };

    render(<TableBlock table={table as unknown as Table} />);

    // getTableNumberDisplay omits trailing dot when number ends with ')'
    expect(screen.getByText('Table 1.1.1.1.(5)')).toBeInTheDocument();
  });

  it('does not use forming_part from a different article for the table number', () => {
    const table = {
      id: 'nbc.divB.part3.sect2.subsect3.art1.table4',
      type: 'table' as const,
      title: 'Unprotected Openings',
      headers: [['Col']],
      rows: [{ cells: [{ content: 'Data' }] }],
      formingPart: [
        { type: 'internal', target: 'nbc.divB.part3.sect1.subsect6.art9.sent5', display_type: 'long' },
        { type: 'internal', target: 'nbc.divB.part3.sect2.subsect3.art1', display_type: 'long' },
      ],
    };

    render(<TableBlock table={table as unknown as Table} />);

    // Must derive number from own ID (3.2.3.1), not the wrong-article forming_part target
    expect(screen.getByText('Table 3.2.3.1.')).toBeInTheDocument();
  });

  it('uses tableNumberOverride when provided', () => {
    const table = {
      id: 'nbc.divB.part3.sect3.subsect1.art5.table1',
      type: 'table' as const,
      title: 'Egress',
      headers: [['Col']],
      rows: [{ cells: [{ content: 'Data' }] }],
      formingPart: [
        { type: 'internal', target: 'nbc.divB.part3.sect3.subsect1.art5.sent1', display_type: 'long' },
      ],
    };

    render(<TableBlock table={table as unknown as Table} tableNumberOverride="3.3.1.5.-A" />);

    expect(screen.getByText('Table 3.3.1.5.-A.')).toBeInTheDocument();
  });
});
