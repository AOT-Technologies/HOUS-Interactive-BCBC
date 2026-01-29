import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContentPanel from './ContentPanel';
import { TESTID_CONTENT_PANEL } from '@repo/constants/src/testids';

describe('ContentPanel', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(
        <ContentPanel>
          <div>Test Content</div>
        </ContentPanel>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with default test ID', () => {
      render(
        <ContentPanel>
          <div>Content</div>
        </ContentPanel>
      );

      expect(screen.getByTestId(TESTID_CONTENT_PANEL)).toBeInTheDocument();
    });

    it('should render with custom test ID', () => {
      render(
        <ContentPanel data-testid="custom-panel">
          <div>Content</div>
        </ContentPanel>
      );

      expect(screen.getByTestId('custom-panel')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <ContentPanel className="custom-class">
          <div>Content</div>
        </ContentPanel>
      );

      const panel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(panel).toHaveClass('ui-ContentPanel');
      expect(panel).toHaveClass('custom-class');
    });

    it('should render as main element', () => {
      const { container } = render(
        <ContentPanel>
          <div>Content</div>
        </ContentPanel>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
      expect(mainElement).toHaveClass('ui-ContentPanel');
    });
  });

  describe('Content Container', () => {
    it('should wrap children in container div', () => {
      const { container } = render(
        <ContentPanel>
          <div data-testid="child">Content</div>
        </ContentPanel>
      );

      const containerDiv = container.querySelector('.ui-ContentPanel--Container');
      expect(containerDiv).toBeInTheDocument();
      expect(containerDiv).toContainElement(screen.getByTestId('child'));
    });

    it('should render multiple children', () => {
      render(
        <ContentPanel>
          <div>First</div>
          <div>Second</div>
          <div>Third</div>
        </ContentPanel>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have responsive CSS classes', () => {
      const { container } = render(
        <ContentPanel>
          <div>Content</div>
        </ContentPanel>
      );

      const panel = container.querySelector('.ui-ContentPanel');
      expect(panel).toBeInTheDocument();

      const containerDiv = container.querySelector('.ui-ContentPanel--Container');
      expect(containerDiv).toBeInTheDocument();
    });

    it('should support full-width modifier class', () => {
      render(
        <ContentPanel className="--full-width">
          <div>Content</div>
        </ContentPanel>
      );

      const panel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(panel).toHaveClass('--full-width');
    });

    it('should support loading state modifier class', () => {
      render(
        <ContentPanel className="--loading">
          <div>Content</div>
        </ContentPanel>
      );

      const panel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(panel).toHaveClass('--loading');
    });

    it('should support error state modifier class', () => {
      render(
        <ContentPanel className="--error">
          <div>Error Message</div>
        </ContentPanel>
      );

      const panel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(panel).toHaveClass('--error');
    });
  });

  describe('Accessibility', () => {
    it('should use semantic main element', () => {
      const { container } = render(
        <ContentPanel>
          <div>Content</div>
        </ContentPanel>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(
        <ContentPanel>
          <button>Interactive Element</button>
        </ContentPanel>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should support ARIA attributes through children', () => {
      render(
        <ContentPanel>
          <article aria-label="Building Code Article">
            <h1>Article Title</h1>
          </article>
        </ContentPanel>
      );

      const article = screen.getByLabelText('Building Code Article');
      expect(article).toBeInTheDocument();
    });
  });

  describe('Content Types', () => {
    it('should render breadcrumbs', () => {
      render(
        <ContentPanel>
          <nav aria-label="Breadcrumb">
            <ol>
              <li>Division A</li>
              <li>Part 1</li>
            </ol>
          </nav>
        </ContentPanel>
      );

      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    });

    it('should render article content', () => {
      render(
        <ContentPanel>
          <article>
            <h1>Article 1.1.1.1</h1>
            <p>Article content goes here</p>
          </article>
        </ContentPanel>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Article 1.1.1.1');
      expect(screen.getByText('Article content goes here')).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(
        <ContentPanel>
          <nav>
            <button>Previous</button>
            <button>Next</button>
          </nav>
        </ContentPanel>
      );

      expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <ContentPanel>
          <div>
            <button>Export PDF</button>
            <button>Print</button>
          </div>
        </ContentPanel>
      );

      expect(screen.getByRole('button', { name: 'Export PDF' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    });
  });

  describe('Layout Integration', () => {
    it('should work with sidebar layout', () => {
      const { container } = render(
        <div style={{ display: 'flex' }}>
          <aside data-testid="sidebar">Sidebar</aside>
          <ContentPanel>
            <div>Main Content</div>
          </ContentPanel>
        </div>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });

    it('should work in full-width layout without sidebar', () => {
      render(
        <ContentPanel className="--full-width">
          <div>Full Width Content</div>
        </ContentPanel>
      );

      const panel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(panel).toHaveClass('--full-width');
      expect(screen.getByText('Full Width Content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<ContentPanel>{null}</ContentPanel>);

      const panel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(panel).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<ContentPanel>{undefined}</ContentPanel>);

      const panel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(panel).toBeInTheDocument();
    });

    it('should handle string children', () => {
      render(<ContentPanel>Plain text content</ContentPanel>);

      expect(screen.getByText('Plain text content')).toBeInTheDocument();
    });

    it('should handle fragment children', () => {
      render(
        <ContentPanel>
          <>
            <div>First</div>
            <div>Second</div>
          </>
        </ContentPanel>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });
});
