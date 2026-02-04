import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { PrevNextNav } from './PrevNextNav';
import { useNavigationStore, NavigationNode } from '@/stores/navigation-store';
import { TESTID_PREV_BUTTON, TESTID_NEXT_BUTTON } from '@repo/constants/src/testids';

// Mock the navigation store
vi.mock('@/stores/navigation-store');

// Mock the Button component
vi.mock('@repo/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, 'data-testid': testId, 'aria-label': ariaLabel, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={testId}
      aria-label={ariaLabel}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

describe('PrevNextNav', () => {
  const mockSetCurrentPath = vi.fn();
  
  // Sample navigation tree structure
  const mockNavigationTree: NavigationNode[] = [
    {
      id: 'div-a',
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
                    {
                      id: 'article-1-1-1-2',
                      number: 'Article 1.1.1.2',
                      title: 'Purpose',
                      type: 'article',
                      path: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2',
                    },
                  ],
                },
                {
                  id: 'subsection-1-1-2',
                  number: 'Subsection 1.1.2',
                  title: 'Definitions',
                  type: 'subsection',
                  path: '/code/division-a/part-1/section-1-1/subsection-1-1-2',
                },
              ],
            },
            {
              id: 'section-1-2',
              number: 'Section 1.2',
              title: 'Interpretation',
              type: 'section',
              path: '/code/division-a/part-1/section-1-2',
            },
          ],
        },
        {
          id: 'part-2',
          number: 'Part 2',
          title: 'Objectives',
          type: 'part',
          path: '/code/division-a/part-2',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStore = (overrides: Partial<ReturnType<typeof useNavigationStore>> = {}) => {
    vi.mocked(useNavigationStore).mockReturnValue({
      navigationTree: mockNavigationTree,
      currentPath: '',
      setCurrentPath: mockSetCurrentPath,
      expandedNodes: new Set<string>(),
      loading: false,
      toggleNode: vi.fn(),
      expandToNode: vi.fn(),
      loadNavigationTree: vi.fn(),
      collapseAll: vi.fn(),
      ...overrides,
    });
  };

  describe('Rendering', () => {
    it('should not render when no current path is set', () => {
      mockStore({ currentPath: '' });

      const { container } = render(<PrevNextNav />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when navigation tree is empty', () => {
      mockStore({
        navigationTree: [],
        currentPath: '/code/division-a/part-1',
      });

      const { container } = render(<PrevNextNav />);
      expect(container.firstChild).toBeNull();
    });

    it('should render both buttons when current path is valid', () => {
      mockStore({
        currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2',
      });

      render(<PrevNextNav />);
      
      expect(screen.getByTestId(TESTID_PREV_BUTTON)).toBeInTheDocument();
      expect(screen.getByTestId(TESTID_NEXT_BUTTON)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      mockStore({ currentPath: '/code/division-a/part-1' });

      const { container } = render(<PrevNextNav className="custom-class" />);
      expect(container.querySelector('.prev-next-nav')).toHaveClass('custom-class');
    });
  });

  describe('Navigation at Article Level', () => {
    it('should show previous article when not at first article', () => {
      mockStore({
        currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2',
      });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      expect(prevButton).not.toBeDisabled();
      expect(prevButton).toHaveTextContent('Article 1.1.1.1');
      expect(prevButton).toHaveTextContent('Scope');
    });

    it('should disable previous button at first article', () => {
      mockStore({
        currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
      });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      expect(prevButton).toBeDisabled();
    });

    it('should show next article when not at last article', () => {
      mockStore({
        currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
      });

      render(<PrevNextNav />);
      
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      expect(nextButton).not.toBeDisabled();
      expect(nextButton).toHaveTextContent('Article 1.1.1.2');
      expect(nextButton).toHaveTextContent('Purpose');
    });

    it('should disable next button at last article', () => {
      mockStore({
        currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2',
      });

      render(<PrevNextNav />);
      
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Navigation at Subsection Level', () => {
    it('should navigate between subsections within same section', () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-2' });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      expect(prevButton).not.toBeDisabled();
      expect(prevButton).toHaveTextContent('Subsection 1.1.1');
      expect(prevButton).toHaveTextContent('Application');
      
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      expect(nextButton).toBeDisabled(); // Last subsection in section
    });
  });

  describe('Navigation at Section Level', () => {
    it('should navigate between sections within same part', () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-2' });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      expect(prevButton).not.toBeDisabled();
      expect(prevButton).toHaveTextContent('Section 1.1');
      expect(prevButton).toHaveTextContent('General');
      
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      expect(nextButton).toBeDisabled(); // Last section in part
    });
  });

  describe('Navigation at Part Level', () => {
    it('should navigate between parts within same division', () => {
      mockStore({ currentPath: '/code/division-a/part-2' });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      expect(prevButton).not.toBeDisabled();
      expect(prevButton).toHaveTextContent('Part 1');
      expect(prevButton).toHaveTextContent('Compliance');
      
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      expect(nextButton).toBeDisabled(); // Last part in division
    });
  });

  describe('Button Interactions', () => {
    it('should call setCurrentPath when previous button is clicked', () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2' });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      fireEvent.click(prevButton);
      
      expect(mockSetCurrentPath).toHaveBeenCalledWith(
        '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1'
      );
    });

    it('should call setCurrentPath when next button is clicked', () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1' });

      render(<PrevNextNav />);
      
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      fireEvent.click(nextButton);
      
      expect(mockSetCurrentPath).toHaveBeenCalledWith(
        '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2'
      );
    });

    it('should call onPrevClick callback when provided', () => {
      const onPrevClick = vi.fn();
      
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2' });

      render(<PrevNextNav onPrevClick={onPrevClick} />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      fireEvent.click(prevButton);
      
      expect(onPrevClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'article-1-1-1-1',
          path: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
        })
      );
    });

    it('should call onNextClick callback when provided', () => {
      const onNextClick = vi.fn();
      
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1' });

      render(<PrevNextNav onNextClick={onNextClick} />);
      
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      fireEvent.click(nextButton);
      
      expect(onNextClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'article-1-1-1-2',
          path: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2',
        })
      );
    });

    it('should not navigate when disabled button is clicked', () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1' });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      fireEvent.click(prevButton);
      
      expect(mockSetCurrentPath).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should navigate to previous on Alt+ArrowLeft', async () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2' });

      render(<PrevNextNav />);
      
      fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
      
      await waitFor(() => {
        expect(mockSetCurrentPath).toHaveBeenCalledWith(
          '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1'
        );
      });
    });

    it('should navigate to next on Alt+ArrowRight', async () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1' });

      render(<PrevNextNav />);
      
      fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true });
      
      await waitFor(() => {
        expect(mockSetCurrentPath).toHaveBeenCalledWith(
          '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2'
        );
      });
    });

    it('should not navigate when no prev/next available', async () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1' });

      render(<PrevNextNav />);
      
      fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
      
      await waitFor(() => {
        expect(mockSetCurrentPath).not.toHaveBeenCalled();
      });
    });

    it('should not handle keyboard shortcuts in input fields', async () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2' });

      render(
        <>
          <input type="text" data-testid="test-input" />
          <PrevNextNav />
        </>
      );
      
      const input = screen.getByTestId('test-input');
      input.focus();
      
      fireEvent.keyDown(input, { key: 'ArrowLeft', altKey: true });
      
      await waitFor(() => {
        expect(mockSetCurrentPath).not.toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      mockStore({ currentPath: '/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-2' });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      expect(prevButton).toHaveAttribute('aria-label', 'Previous: Scope');
      
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      expect(nextButton).toHaveAttribute('aria-label', 'No next item');
    });

    it('should have semantic nav element', () => {
      mockStore({ currentPath: '/code/division-a/part-1' });

      const { container } = render(<PrevNextNav />);
      
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Sequential navigation');
    });

    it('should hide arrow icons from screen readers', () => {
      mockStore({ currentPath: '/code/division-a/part-1' });

      const { container } = render(<PrevNextNav />);
      
      const arrows = container.querySelectorAll('.prev-next-nav__arrow');
      arrows.forEach(arrow => {
        expect(arrow).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle first item in hierarchy', () => {
      mockStore({ currentPath: '/code/division-a/part-1' });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      expect(prevButton).toBeDisabled();
    });

    it('should handle last item in hierarchy', () => {
      mockStore({ currentPath: '/code/division-a/part-2' });

      render(<PrevNextNav />);
      
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      expect(nextButton).toBeDisabled();
    });

    it('should handle single item at a level', () => {
      const singleItemTree: NavigationNode[] = [
        {
          id: 'div-a',
          number: 'Division A',
          title: 'Compliance',
          type: 'division',
          path: '/code/division-a',
          children: [
            {
              id: 'part-1',
              number: 'Part 1',
              title: 'Compliance',
              type: 'part',
              path: '/code/division-a/part-1',
            },
          ],
        },
      ];

      mockStore({
        navigationTree: singleItemTree,
        currentPath: '/code/division-a/part-1',
        setCurrentPath: mockSetCurrentPath,
      });

      render(<PrevNextNav />);
      
      const prevButton = screen.getByTestId(TESTID_PREV_BUTTON);
      const nextButton = screen.getByTestId(TESTID_NEXT_BUTTON);
      
      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });
});


