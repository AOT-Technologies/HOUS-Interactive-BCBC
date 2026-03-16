import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';
import { useNavigationStore, NavigationNode } from '@/stores/navigation-store';
import { usePathname } from 'next/navigation';
import { TESTID_BREADCRUMBS } from '@repo/constants/src/testids';

// Mock the navigation store
vi.mock('@/stores/navigation-store', () => ({
  useNavigationStore: vi.fn(),
  NavigationNode: {} as any,
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, onClick, ...props }: any) => (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

/**
 * Helper: query a .breadcrumbs-title span by its text content.
 * Each breadcrumb renders both a .breadcrumbs-title and a .breadcrumbs-tooltip
 * with the same text, so plain getByText hits duplicates.
 */
const getTitleByText = (container: HTMLElement, text: string) => {
  const titles = container.querySelectorAll('.breadcrumbs-title');
  const match = Array.from(titles).find(el => el.textContent === text);
  return match ?? null;
};

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
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      expect(screen.getByTestId(TESTID_BREADCRUMBS)).toBeInTheDocument();
      expect(getTitleByText(container, 'Compliance, Objectives a...')).toBeInTheDocument();
      expect(getTitleByText(container, 'Compliance')).toBeInTheDocument();
      expect(getTitleByText(container, 'General')).toBeInTheDocument();
      expect(getTitleByText(container, 'Application')).toBeInTheDocument();
      expect(getTitleByText(container, 'Scope')).toBeInTheDocument();
    });

    it('should render breadcrumbs for section level', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      expect(getTitleByText(container, 'Compliance, Objectives a...')).toBeInTheDocument();
      expect(getTitleByText(container, 'Compliance')).toBeInTheDocument();
      expect(getTitleByText(container, 'General')).toBeInTheDocument();
      expect(getTitleByText(container, 'Application')).toBeNull();
    });

    it('should render breadcrumbs for part level', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      expect(getTitleByText(container, 'Compliance, Objectives a...')).toBeInTheDocument();
      expect(getTitleByText(container, 'Compliance')).toBeInTheDocument();
      expect(getTitleByText(container, 'General')).toBeNull();
    });

    it('should not render when currentPath is empty', () => {
      (usePathname as any).mockReturnValue('/');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      // Should only render Home breadcrumb
      expect(getTitleByText(container, 'Home')).toBeInTheDocument();
    });

    it('should not render when navigationTree is empty', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: [],
        currentPath: '/code/division-a/part-1',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      // Should only render Home breadcrumb when tree is empty
      expect(getTitleByText(container, 'Home')).toBeInTheDocument();
    });
  });

  describe('Breadcrumb Structure', () => {
    it('should display separators between breadcrumb items', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs maxVisibleItems={10} />);

      // Component uses "/" as separator
      const separators = screen.getAllByText('/');
      // Home + Division + Part + Section = 4 items, 3 separators (last item has no separator)
      expect(separators.length).toBe(3);
    });

    it('should render breadcrumb titles', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      // Division title is shown (truncated in display, full in tooltip)
      expect(getTitleByText(container, 'Compliance, Objectives a...')).toBeInTheDocument();
      // Full title in tooltip
      const tooltips = container.querySelectorAll('.breadcrumbs-tooltip');
      const divisionTooltip = Array.from(tooltips).find(t => t.textContent === 'Compliance, Objectives and Functional Statements');
      expect(divisionTooltip).toBeTruthy();
      expect(getTitleByText(container, 'Compliance')).toBeInTheDocument();
    });

    it('should mark the last breadcrumb as current page', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      const currentElement = container.querySelector('.breadcrumbs-link--current');
      expect(currentElement).toBeTruthy();
      expect(currentElement).toHaveAttribute('aria-current', 'page');
      // The current item should contain "General"
      expect(getTitleByText(currentElement as HTMLElement, 'General')).toBeTruthy();
    });

    it('should render navigable breadcrumbs as links (part and below)', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      // Division is non-navigable on content pages (rendered as span, not link)
      const divisionTitle = getTitleByText(container, 'Compliance, Objectives a...');
      expect(divisionTitle!.closest('.breadcrumbs-link--non-navigable')).toBeTruthy();

      // Part is navigable (rendered as link) — use aria-label to find it uniquely
      const partLink = screen.getByLabelText('Navigate to Compliance');
      expect(partLink).toHaveAttribute('href', '/code/division-a/part-1');
    });
  });

  describe('Interaction', () => {
    it('should call onBreadcrumbClick when a navigable breadcrumb is clicked', () => {
      const mockOnClick = vi.fn();
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs onBreadcrumbClick={mockOnClick} maxVisibleItems={10} />);

      // Part is a navigable link — use aria-label to find it uniquely
      const partLink = screen.getByLabelText('Navigate to Compliance');
      fireEvent.click(partLink);

      expect(mockOnClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'part-1',
          path: '/code/division-a/part-1',
        })
      );
    });

    it('should preserve the breadcrumb href while invoking the click callback', () => {
      const mockOnClick = vi.fn();
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs onBreadcrumbClick={mockOnClick} maxVisibleItems={10} />);

      const partLink = screen.getByLabelText('Navigate to Compliance');
      fireEvent.click(partLink);

      expect(partLink).toHaveAttribute('href', '/code/division-a/part-1');
      expect(mockOnClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'part-1',
          path: '/code/division-a/part-1',
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs maxVisibleItems={10} />);

      const nav = screen.getByRole('navigation', { name: 'Breadcrumb navigation' });
      expect(nav).toBeInTheDocument();
    });

    it('should have aria-label on navigable breadcrumb links', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      render(<Breadcrumbs maxVisibleItems={10} />);

      // Part is navigable and should have aria-label
      const partLink = screen.getByLabelText('Navigate to Compliance');
      expect(partLink).toBeInTheDocument();
    });

    it('should mark separators as aria-hidden', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      const separators = container.querySelectorAll('.breadcrumbs-separator');
      separators.forEach((separator) => {
        expect(separator).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should use semantic list structure', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1',
      });

      render(<Breadcrumbs maxVisibleItems={10} />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list.tagName).toBe('OL');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1');
      (useNavigationStore as any).mockReturnValue({
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
      (usePathname as any).mockReturnValue('/code/division-a');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a',
      });

      render(<Breadcrumbs maxVisibleItems={10} />);

      // Division title is rendered (truncated)
      expect(screen.getByText('Compliance, Objectives a...')).toBeInTheDocument();
    });

    it('should handle invalid path gracefully', () => {
      (usePathname as any).mockReturnValue('/code/invalid-path');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/invalid-path',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      // Component always renders at minimum "Home"
      expect(getTitleByText(container, 'Home')).toBeTruthy();
      expect(container.firstChild).not.toBeNull();
    });

    it('should handle deeply nested navigation tree', () => {
      (usePathname as any).mockReturnValue('/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1');
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
      });

      const { container } = render(<Breadcrumbs maxVisibleItems={10} />);

      // Should render all 5 levels by title
      expect(getTitleByText(container, 'Compliance, Objectives a...')).toBeTruthy();
      expect(getTitleByText(container, 'Compliance')).toBeTruthy();
      expect(getTitleByText(container, 'General')).toBeTruthy();
      expect(getTitleByText(container, 'Application')).toBeTruthy();
      expect(getTitleByText(container, 'Scope')).toBeTruthy();
    });
  });
});
