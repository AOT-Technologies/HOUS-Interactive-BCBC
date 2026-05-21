import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IndexRenderer, ConversionsRenderer } from './IndexConversionsRenderer';
import type { IndexSectionData, ConversionsSectionData } from '../../lib/stores/index-conversions-store';

// Mock parseTextWithMarkers to return plain text for testing
vi.mock('../../lib/text-parsing', () => ({
    parseTextWithMarkers: (text: string) => text.replace(/<\/?[^>]+>/g, ''),
}));

describe('IndexRenderer', () => {
    const mockIndexData: IndexSectionData = {
        id: 'nbc.2020.vol1.index',
        type: 'index',
        introduction: 'This is the index introduction.',
        letters: [
            {
                id: 'nbc.2020.vol1.index.A',
                letter: 'A',
                groups: [
                    {
                        id: 'nbc.2020.vol1.index.A.group1',
                        term_id: 'nbc.2020.vol1.index.A.group1.term1',
                        term: 'Access',
                        references: [
                            { target: 'nbc.divA.part1.sect1.subsect1.art1', vendor_target: 'ea000001' },
                        ],
                    },
                    {
                        id: 'nbc.2020.vol1.index.A.group2',
                        term_id: 'nbc.2020.vol1.index.A.group2.term1',
                        term: 'Adhesives',
                        subterms: [
                            {
                                id: 'nbc.2020.vol1.index.A.group2.subterm1',
                                term: 'structural',
                                references: [
                                    { target: 'nbc.divB.part5.sect9.subsect1.art1', vendor_target: 'ea004629' },
                                    { target: 'nbc.divBV2.part9.sect27.subsect2.art4', vendor_target: 'ea004868' },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'nbc.2020.vol1.index.B',
                letter: 'B',
                groups: [],
            },
        ],
    };

    it('renders the Index title', () => {
        render(<IndexRenderer data={mockIndexData} />);
        expect(screen.getByText('Index')).toBeInTheDocument();
    });

    it('renders the introduction text', () => {
        render(<IndexRenderer data={mockIndexData} />);
        expect(screen.getByText('This is the index introduction.')).toBeInTheDocument();
    });

    it('renders letter headings', () => {
        render(<IndexRenderer data={mockIndexData} />);
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('renders group terms', () => {
        render(<IndexRenderer data={mockIndexData} />);
        expect(screen.getByText('Access')).toBeInTheDocument();
        expect(screen.getByText('Adhesives')).toBeInTheDocument();
    });

    it('renders subterms', () => {
        render(<IndexRenderer data={mockIndexData} />);
        expect(screen.getByText('structural')).toBeInTheDocument();
    });

    it('renders references as clickable links with article numbers', () => {
        render(<IndexRenderer data={mockIndexData} />);
        // "Access" has reference to nbc.divA.part1.sect1.subsect1.art1 → "1.1.1.1."
        const link = screen.getByText('1.1.1.1.');
        expect(link).toBeInTheDocument();
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', '/code/nbc.divA/1/1/1/1');
    });

    it('renders subterm references as clickable links', () => {
        render(<IndexRenderer data={mockIndexData} />);
        // "structural" subterm has reference to nbc.divB.part5.sect9.subsect1.art1 → "5.9.1.1."
        const link = screen.getByText('5.9.1.1.');
        expect(link).toBeInTheDocument();
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', '/code/nbc.divB/5/9/1/1');
    });

    it('renders multiple references separated by commas', () => {
        render(<IndexRenderer data={mockIndexData} />);
        // Second reference: nbc.divBV2.part9.sect27.subsect2.art4 → "9.27.2.4."
        const link = screen.getByText('9.27.2.4.');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/code/nbc.divBV2/9/27/2/4');
    });

    it('renders subsection-level references correctly', () => {
        const dataWithSubsectionRef: IndexSectionData = {
            id: 'test-index',
            type: 'index',
            letters: [
                {
                    id: 'test-letter-W',
                    letter: 'W',
                    groups: [
                        {
                            id: 'test-group',
                            term_id: 'test-term',
                            term: 'Walls',
                            references: [
                                { target: 'nbc.divBV2.part9.sect27.subsect5', vendor_target: 'ep001029.27.5' },
                            ],
                        },
                    ],
                },
            ],
        };
        render(<IndexRenderer data={dataWithSubsectionRef} />);
        const link = screen.getByText('9.27.5.');
        expect(link).toHaveAttribute('href', '/code/nbc.divBV2/9/27/5');
    });
});

describe('ConversionsRenderer', () => {
    const mockConversionsData: ConversionsSectionData = {
        id: 'nbc.2020.vol1.conversions',
        type: 'conversions',
        table_id: 'conv-table-1',
        table_title: 'Conversion Factors',
        table_structure: {
            columns: 6,
            column_specs: [
                { name: 'col1', width: '5%' },
                { name: 'col2', width: '20%' },
                { name: 'col3', width: '5%' },
                { name: 'col4', width: '20%' },
                { name: 'col5', width: '20%' },
                { name: 'col6', width: '5%' },
            ],
            header_rows: [
                {
                    id: 'header-row-1',
                    type: 'header_row',
                    cells: [
                        { content: [{ type: 'text', value: '<bold>To Convert</bold>' }], colspan: 2 },
                        { content: [{ type: 'text', value: '<bold>To</bold>' }], colspan: 2 },
                        { content: [{ type: 'text', value: '<bold>Multiply by</bold>' }], colspan: 2 },
                    ],
                },
            ],
            body_rows: [
                {
                    id: 'body-row-1',
                    type: 'body_row',
                    cells: [
                        { content: [{ type: 'text', value: '' }] },
                        { content: [{ type: 'text', value: '°C' }], colname: 'col2' },
                        { content: [{ type: 'text', value: '' }] },
                        { content: [{ type: 'text', value: '°F' }], colname: 'col4' },
                        { content: [{ type: 'text', value: '1.8 and add 32' }] },
                        { content: [{ type: 'text', value: '' }] },
                    ],
                },
                {
                    id: 'body-row-2',
                    type: 'body_row',
                    cells: [
                        { content: [{ type: 'text', value: '' }] },
                        { content: [{ type: 'text', value: 'kPa' }], colname: 'col2' },
                        { content: [{ type: 'text', value: '' }] },
                        { content: [{ type: 'text', value: 'lbf/in.^{2}(psi)' }], colname: 'col4' },
                        { content: [{ type: 'text', value: '0.1450' }] },
                        { content: [{ type: 'text', value: '' }] },
                    ],
                },
            ],
        },
    };

    it('renders the Conversion Factors title', () => {
        render(<ConversionsRenderer data={mockConversionsData} />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Conversion Factors');
    });

    it('renders a table with 3 columns (collapsed from 6)', () => {
        render(<ConversionsRenderer data={mockConversionsData} />);
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        // Should have 3 header cells
        const headerCells = table.querySelectorAll('thead th');
        expect(headerCells).toHaveLength(3);
    });

    it('renders header cells with centered text', () => {
        render(<ConversionsRenderer data={mockConversionsData} />);
        const table = screen.getByRole('table');
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach((cell) => {
            expect(cell).toHaveStyle({ textAlign: 'center' });
        });
    });

    it('renders body rows with only meaningful columns (indices 1, 3, 4)', () => {
        render(<ConversionsRenderer data={mockConversionsData} />);
        const table = screen.getByRole('table');
        const bodyRows = table.querySelectorAll('tbody tr');
        expect(bodyRows).toHaveLength(2);

        // First row should have 3 cells with content from indices 1, 3, 4
        const firstRowCells = bodyRows[0].querySelectorAll('td');
        expect(firstRowCells).toHaveLength(3);
        expect(firstRowCells[0]).toHaveTextContent('°C');
        expect(firstRowCells[1]).toHaveTextContent('°F');
        expect(firstRowCells[2]).toHaveTextContent('1.8 and add 32');
    });

    it('renders superscript markers via parseTextWithMarkers', () => {
        render(<ConversionsRenderer data={mockConversionsData} />);
        // The mock strips HTML tags, so ^{2} should be processed by parseTextWithMarkers
        // In the mock, parseTextWithMarkers just strips tags, so we check the text is present
        expect(screen.getByText((content) => content.includes('lbf/in.'))).toBeInTheDocument();
    });

    it('uses table-block CSS classes for consistent styling', () => {
        render(<ConversionsRenderer data={mockConversionsData} />);
        const tableBlock = document.querySelector('.table-block');
        expect(tableBlock).toBeInTheDocument();

        const tableElement = document.querySelector('.table-block__table');
        expect(tableElement).toBeInTheDocument();

        const headerCells = document.querySelectorAll('.table-block__header-cell');
        expect(headerCells.length).toBeGreaterThan(0);

        const bodyCells = document.querySelectorAll('.table-block__cell');
        expect(bodyCells.length).toBeGreaterThan(0);
    });
});
