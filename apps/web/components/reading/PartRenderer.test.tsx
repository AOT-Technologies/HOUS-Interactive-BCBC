import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PartRenderer } from './PartRenderer';
import type { NavigationNode } from '../../stores/navigation-store';

// Mock Next.js Link
vi.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

describe('PartRenderer', () => {
    const basePart: NavigationNode = {
        id: 'nbc.divA.1',
        number: 'Part 1',
        title: 'Part 1 – Compliance',
        type: 'part',
        path: '/code/nbc.divA/1',
        children: [
            {
                id: 'nbc.divA.1.sec1.1',
                number: '1.1',
                title: '1.1 General',
                type: 'section',
                path: '/code/nbc.divA/1/1.1',
            },
            {
                id: 'nbc.divA.1.sec1.2',
                number: '1.2',
                title: '1.2 Compliance',
                type: 'section',
                path: '/code/nbc.divA/1/1.2',
            },
            {
                id: 'nbc.divA.1.sec1.3',
                number: '1.3',
                title: '1.3 Divisions A, B and C of this Code',
                type: 'section',
                path: '/code/nbc.divA/1/1.3',
            },
        ],
    };

    it('renders section cards with number and title', () => {
        render(<PartRenderer part={basePart} />);

        expect(screen.getByText('1.1')).toBeInTheDocument();
        expect(screen.getByText('General')).toBeInTheDocument();
        expect(screen.getByText('1.2')).toBeInTheDocument();
        expect(screen.getByText('Compliance')).toBeInTheDocument();
        expect(screen.getByText('1.3')).toBeInTheDocument();
        expect(screen.getByText('Divisions A, B and C of this Code')).toBeInTheDocument();
    });

    it('renders part_appendix nodes as cards', () => {
        const partWithAppendix: NavigationNode = {
            ...basePart,
            children: [
                ...basePart.children!,
                {
                    id: 'nbc.divA.1.appendix',
                    type: 'part_appendix',
                    title: 'Notes to Part 1',
                    path: '/code/nbc.divA/1/appendix',
                    number: '',
                },
            ],
        };

        render(<PartRenderer part={partWithAppendix} />);

        expect(screen.getByText('Notes to Part 1')).toBeInTheDocument();
        const link = screen.getByRole('link', { name: 'Open Notes to Part 1' });
        expect(link).toHaveAttribute('href', '/code/nbc.divA/1/appendix');
    });

    it('renders spectables nodes as cards', () => {
        const partWithSpectables: NavigationNode = {
            ...basePart,
            children: [
                ...basePart.children!,
                {
                    id: 'nbc.divB.9.spectables1',
                    type: 'spectables',
                    number: '1',
                    title: 'Fire and Sound Resistance Tables',
                    path: '/code/nbc.divB/9/spectables/1',
                },
                {
                    id: 'nbc.divB.9.spectables2',
                    type: 'spectables',
                    number: '2',
                    title: 'Span Tables',
                    path: '/code/nbc.divB/9/spectables/2',
                },
            ],
        };

        render(<PartRenderer part={partWithSpectables} />);

        expect(screen.getByText('Fire and Sound Resistance Tables')).toBeInTheDocument();
        expect(screen.getByText('Span Tables')).toBeInTheDocument();
        const link1 = screen.getByRole('link', {
            name: 'Open Fire and Sound Resistance Tables',
        });
        expect(link1).toHaveAttribute('href', '/code/nbc.divB/9/spectables/1');
        const link2 = screen.getByRole('link', { name: 'Open Span Tables' });
        expect(link2).toHaveAttribute('href', '/code/nbc.divB/9/spectables/2');
    });

    it('does not show section number heading for part_appendix cards', () => {
        const partWithAppendix: NavigationNode = {
            ...basePart,
            children: [
                {
                    id: 'nbc.divA.1.appendix',
                    type: 'part_appendix',
                    title: 'Notes to Part 1',
                    path: '/code/nbc.divA/1/appendix',
                    number: '',
                },
            ],
        };

        const { container } = render(<PartRenderer part={partWithAppendix} />);

        // The card should not have a number heading
        const numberHeadings = container.querySelectorAll('.partSectionCardNumber');
        expect(numberHeadings).toHaveLength(0);
    });

    it('does not show section number heading for spectables cards', () => {
        const partWithSpectables: NavigationNode = {
            ...basePart,
            children: [
                {
                    id: 'nbc.divB.9.spectables1',
                    type: 'spectables',
                    number: '1',
                    title: 'Fire and Sound Resistance Tables',
                    path: '/code/nbc.divB/9/spectables/1',
                },
            ],
        };

        const { container } = render(<PartRenderer part={partWithSpectables} />);

        // Spectables have a number but it's an ordinal index, not a section number
        const numberHeadings = container.querySelectorAll('.partSectionCardNumber');
        expect(numberHeadings).toHaveLength(0);
    });

    it('shows section number heading only for section-type cards', () => {
        const partWithAll: NavigationNode = {
            ...basePart,
            children: [
                {
                    id: 'nbc.divB.9.sec9.1',
                    number: '9.1',
                    title: '9.1 General',
                    type: 'section',
                    path: '/code/nbc.divB/9/9.1',
                },
                {
                    id: 'nbc.divB.9.appendix',
                    type: 'part_appendix',
                    title: 'Notes to Part 9',
                    path: '/code/nbc.divB/9/appendix',
                    number: '',
                },
                {
                    id: 'nbc.divB.9.spectables1',
                    type: 'spectables',
                    number: '1',
                    title: 'Span Tables',
                    path: '/code/nbc.divB/9/spectables/1',
                },
            ],
        };

        const { container } = render(<PartRenderer part={partWithAll} />);

        const numberHeadings = container.querySelectorAll('.partSectionCardNumber');
        expect(numberHeadings).toHaveLength(1);
        expect(numberHeadings[0]).toHaveTextContent('9.1');
    });

    it('does not render cards for non-section/appendix/spectables children', () => {
        const partWithArticle: NavigationNode = {
            ...basePart,
            children: [
                {
                    id: 'nbc.divA.1.sec1.1',
                    number: '1.1',
                    title: '1.1 General',
                    type: 'section',
                    path: '/code/nbc.divA/1/1.1',
                },
                {
                    id: 'nbc.divA.1.sec1.1.sub1.1.1',
                    number: '1.1.1',
                    title: '1.1.1 Application',
                    type: 'subsection',
                    path: '/code/nbc.divA/1/1.1/1.1.1',
                },
            ],
        };

        render(<PartRenderer part={partWithArticle} />);

        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(1);
        expect(links[0]).toHaveAttribute('href', '/code/nbc.divA/1/1.1');
    });

    it('appends query string to card links when provided', () => {
        render(<PartRenderer part={basePart} queryString="version=2024&date=2025-06-16" />);

        const link = screen.getByRole('link', { name: 'Open Section 1.1 General' });
        expect(link).toHaveAttribute('href', '/code/nbc.divA/1/1.1?version=2024&date=2025-06-16');
    });

    it('uses correct aria-label for section vs non-section cards', () => {
        const partWithAll: NavigationNode = {
            ...basePart,
            children: [
                {
                    id: 'nbc.divA.1.sec1.1',
                    number: '1.1',
                    title: '1.1 General',
                    type: 'section',
                    path: '/code/nbc.divA/1/1.1',
                },
                {
                    id: 'nbc.divA.1.appendix',
                    type: 'part_appendix',
                    title: 'Notes to Part 1',
                    path: '/code/nbc.divA/1/appendix',
                    number: '',
                },
            ],
        };

        render(<PartRenderer part={partWithAll} />);

        // Section cards get "Open Section ..." aria-label
        expect(
            screen.getByRole('link', { name: 'Open Section 1.1 General' })
        ).toBeInTheDocument();
        // Non-section cards get "Open {title}" aria-label
        expect(
            screen.getByRole('link', { name: 'Open Notes to Part 1' })
        ).toBeInTheDocument();
    });

    it('renders description text', () => {
        render(<PartRenderer part={basePart} />);

        expect(screen.getByText('Select a section to start reading.')).toBeInTheDocument();
    });

    it('handles part with no children gracefully', () => {
        const emptyPart: NavigationNode = {
            id: 'nbc.divA.1',
            number: 'Part 1',
            title: 'Part 1 – Compliance',
            type: 'part',
            path: '/code/nbc.divA/1',
        };

        const { container } = render(<PartRenderer part={emptyPart} />);

        const grid = container.querySelector('.partSectionsGrid');
        expect(grid).toBeInTheDocument();
        expect(grid?.children).toHaveLength(0);
    });
});
