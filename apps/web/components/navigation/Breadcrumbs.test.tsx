import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';
import { useNavigationStore, NavigationNode } from '@/stores/navigation-store';
import { TESTID_BREADCRUMBS } from '@repo/constants/src/testids';

// Mock the navigation store
vi.mock('@/stores/navigation-store');

// Mock the Link component
vi.mock('@repo/ui/link', () => ({
  __esModule: true,
  default: ({ children, href, onClick, className, 'aria-label': ariaLabel }: any) => (
    <a href={href} onClick={onClick} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

describe('Breadcrumbs', () => {
  const mockNavigationTree: NavigationNode[] = [
    {
      id: 'division-a',
      number: 'Division A',
      title: 'Compliance, Objectives and Functional Statements',
      type: 'division',
      path: '/code/division-a',
      children: [
        {
          id: 'part-1',
          number: 'Part 1',
          title: 'Compliance',
          type: 'part',
          path: '/code/division-a/part-1',
          children: [
            {
              id: 'section-1-1',
              number: 'Section 1.1',
              title: 'General',
              type: 'section',
              path: '/code/division-a/part-1/section-1-1',
              children: [
                {
                  id: 'subsection-1-1-1',
                  number: 'Subsection 1.1.1',
                  title: 'Application',
                  type: 'subsection',
                  path: '/code/division-a/part-1/section-1-1/subsection-1-1-1',
                  children: [
                    {
                      id: 'article-1-1-1-1',
                      number: 'Article 1.1.1.1',
                      title: 'Scope',
                      type: 'article',
                      path: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render breadcrumbs for article level', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
      });

      render(<Breadcrumbs />);

      expect(screen.getByTestId(TESTID_BREADCRUMBS)).toBeInTheDocument();
      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Section 1.1')).toBeInTheDocument();
      expect(screen.getByText('Subsection 1.1.1')).toBeInTheDocument();
      expect(screen.getByText('Article 1.1.1.1')).toBeInTheDocument();
    });

    it('should render breadcrumbs for section level', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs />);

      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Section 1.1')).toBeInTheDocument();
      expect(screen.queryByText('Subsection 1.1.1')).not.toBeInTheDocument();
    });

    it('should render breadcrumbs for part level', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1',
      });

      render(<Breadcrumbs />);

      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.queryByText('Section 1.1')).not.toBeInTheDocument();
    });

    it('should not render when currentPath is empty', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '',
      });

      const { container } = render(<Breadcrumbs />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when navigationTree is empty', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: [],
        currentPath: '/code/division-a/part-1',
      });

      const { container } = render(<Breadcrumbs />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Breadcrumb Structure', () => {
    it('should display separators between breadcrumb items', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs />);

      const separators = screen.getAllByText('>', { exact: false });
      // Should have 2 separators for 3 items (Division > Part > Section)
      expect(separators.length).toBe(2);
    });

    it('should render breadcrumb numbers and titles', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1',
      });

      render(<Breadcrumbs />);

      // Check that both number and title are rendered
      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Compliance, Objectives and Functional Statements')).toBeInTheDocument();
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Compliance')).toBeInTheDocument();
    });

    it('should mark the last breadcrumb as current page', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs />);

      // The current element should have the breadcrumbs-current class and aria-current attribute
      const currentElements = screen.getAllByText('Section 1.1');
      const currentElement = currentElements.find(el => 
        el.closest('.breadcrumbs-current')
      );
      
      expect(currentElement?.closest('.breadcrumbs-current')).toHaveAttribute('aria-current', 'page');
    });

    it('should render non-current breadcrumbs as links', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs />);

      const divisionLink = screen.getByText('Division A').closest('a');
      const partLink = screen.getByText('Part 1').closest('a');

      expect(divisionLink).toHaveAttribute('href', '/code/division-a');
      expect(partLink).toHaveAttribute('href', '/code/division-a/part-1');
    });
  });

  describe('Interaction', () => {
    it('should call onBreadcrumbClick when a breadcrumb is clicked', () => {
      const mockOnClick = vi.fn();
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs onBreadcrumbClick={mockOnClick} />);

      const divisionLink = screen.getByText('Division A').closest('a');
      fireEvent.click(divisionLink!);

      expect(mockOnClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'division-a',
          path: '/code/division-a',
        })
      );
    });

    it('should prevent default link behavior on click', () => {
      const mockOnClick = vi.fn();
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs onBreadcrumbClick={mockOnClick} />);

      const divisionLink = screen.getByText('Division A').closest('a');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      fireEvent(divisionLink!, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs />);

      const nav = screen.getByRole('navigation', { name: 'Breadcrumb navigation' });
      expect(nav).toBeInTheDocument();
    });

    it('should have aria-label on breadcrumb links', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs />);

      const divisionLink = screen.getByLabelText(
        'Navigate to Compliance, Objectives and Functional Statements'
      );
      expect(divisionLink).toBeInTheDocument();
    });

    it('should mark separators as aria-hidden', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      const { container } = render(<Breadcrumbs />);

      const separators = container.querySelectorAll('.breadcrumbs-separator');
      separators.forEach((separator) => {
        expect(separator).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should use semantic list structure', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1',
      });

      render(<Breadcrumbs />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list.tagName).toBe('OL');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1',
      });

      render(<Breadcrumbs className="custom-breadcrumbs" />);

      const breadcrumbs = screen.getByTestId(TESTID_BREADCRUMBS);
      expect(breadcrumbs).toHaveClass('breadcrumbs');
      expect(breadcrumbs).toHaveClass('custom-breadcrumbs');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single breadcrumb (division only)', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a',
      });

      render(<Breadcrumbs />);

      expect(screen.getByText('Division A')).toBeInTheDocument();
      // Should not have separators for single item
      expect(screen.queryByText('>', { exact: false })).not.toBeInTheDocument();
    });

    it('should handle invalid path gracefully', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/invalid-path',
      });

      const { container } = render(<Breadcrumbs />);

      // Should not render anything for invalid path
      expect(container.firstChild).toBeNull();
    });

    it('should handle deeply nested navigation tree', () => {
      (useNavigationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
      });

      render(<Breadcrumbs />);

      // Should render all 5 levels
      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Section 1.1')).toBeInTheDocument();
      expect(screen.getByText('Subsection 1.1.1')).toBeInTheDocument();
      expect(screen.getByText('Article 1.1.1.1')).toBeInTheDocument();
    });
  });
});

