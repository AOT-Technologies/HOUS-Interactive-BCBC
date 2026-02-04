import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MainLayout from './MainLayout';
import { TESTID_MAIN_LAYOUT, TESTID_SIDEBAR, TESTID_CONTENT_PANEL } from '@repo/constants/src/testids';

// Mock the UI components
vi.mock('@repo/ui/sidebar', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <aside data-testid={TESTID_SIDEBAR}>{children}</aside>
  ),
}));

vi.mock('@repo/ui/content-panel', () => ({
  default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <main data-testid={TESTID_CONTENT_PANEL} className={className}>
      {children}
    </main>
  ),
}));

describe('MainLayout', () => {
  describe('Full-width layout (no sidebar)', () => {
    it('should render content without sidebar when showSidebar is false', () => {
      render(
        <MainLayout showSidebar={false}>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getByTestId(TESTID_MAIN_LAYOUT)).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.queryByTestId(TESTID_SIDEBAR)).not.toBeInTheDocument();
    });

    it('should apply full-width class when showSidebar is false', () => {
      render(
        <MainLayout showSidebar={false}>
          <div>Test Content</div>
        </MainLayout>
      );

      const layout = screen.getByTestId(TESTID_MAIN_LAYOUT);
      expect(layout).toHaveClass('MainLayout--full-width');
    });

    it('should apply full-width class to ContentPanel when showSidebar is false', () => {
      render(
        <MainLayout showSidebar={false}>
          <div>Test Content</div>
        </MainLayout>
      );

      const contentPanel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(contentPanel).toHaveClass('--full-width');
    });

    it('should render without sidebar by default', () => {
      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.queryByTestId(TESTID_SIDEBAR)).not.toBeInTheDocument();
      expect(screen.getByTestId(TESTID_MAIN_LAYOUT)).toHaveClass('MainLayout--full-width');
    });
  });

  describe('Three-panel layout (with sidebar)', () => {
    it('should render sidebar and content when showSidebar is true', () => {
      render(
        <MainLayout showSidebar sidebarContent={<div>Navigation Tree</div>}>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getByTestId(TESTID_MAIN_LAYOUT)).toBeInTheDocument();
      expect(screen.getByTestId(TESTID_SIDEBAR)).toBeInTheDocument();
      expect(screen.getByText('Navigation Tree')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should apply with-sidebar class when showSidebar is true', () => {
      render(
        <MainLayout showSidebar sidebarContent={<div>Navigation Tree</div>}>
          <div>Test Content</div>
        </MainLayout>
      );

      const layout = screen.getByTestId(TESTID_MAIN_LAYOUT);
      expect(layout).toHaveClass('MainLayout--with-sidebar');
      expect(layout).not.toHaveClass('MainLayout--full-width');
    });

    it('should not apply full-width class to ContentPanel when showSidebar is true', () => {
      render(
        <MainLayout showSidebar sidebarContent={<div>Navigation Tree</div>}>
          <div>Test Content</div>
        </MainLayout>
      );

      const contentPanel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(contentPanel).not.toHaveClass('--full-width');
    });

    it('should render sidebar content in sidebar', () => {
      const sidebarContent = (
        <nav>
          <ul>
            <li>Division A</li>
            <li>Division B</li>
            <li>Division C</li>
          </ul>
        </nav>
      );

      render(
        <MainLayout showSidebar sidebarContent={sidebarContent}>
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Division B')).toBeInTheDocument();
      expect(screen.getByText('Division C')).toBeInTheDocument();
    });
  });

  describe('Custom props', () => {
    it('should apply custom className', () => {
      render(
        <MainLayout className="custom-class">
          <div>Test Content</div>
        </MainLayout>
      );

      const layout = screen.getByTestId(TESTID_MAIN_LAYOUT);
      expect(layout).toHaveClass('custom-class');
      expect(layout).toHaveClass('MainLayout');
    });

    it('should use custom test ID', () => {
      render(
        <MainLayout data-testid="custom-layout">
          <div>Test Content</div>
        </MainLayout>
      );

      expect(screen.getByTestId('custom-layout')).toBeInTheDocument();
      expect(screen.queryByTestId(TESTID_MAIN_LAYOUT)).not.toBeInTheDocument();
    });
  });

  describe('Content rendering', () => {
    it('should render children in content panel', () => {
      render(
        <MainLayout>
          <h1>Page Title</h1>
          <p>Page content goes here</p>
        </MainLayout>
      );

      expect(screen.getByText('Page Title')).toBeInTheDocument();
      expect(screen.getByText('Page content goes here')).toBeInTheDocument();
    });

    it('should render complex children', () => {
      render(
        <MainLayout showSidebar sidebarContent={<div>Sidebar</div>}>
          <article>
            <header>
              <h1>Article Title</h1>
            </header>
            <section>
              <h2>Section 1</h2>
              <p>Content</p>
            </section>
          </article>
        </MainLayout>
      );

      expect(screen.getByText('Article Title')).toBeInTheDocument();
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Layout structure', () => {
    it('should have correct DOM structure for full-width layout', () => {
      const { container } = render(
        <MainLayout showSidebar={false}>
          <div>Content</div>
        </MainLayout>
      );

      const layout = container.querySelector('.MainLayout--full-width');
      expect(layout).toBeInTheDocument();
      
      const contentPanel = layout?.querySelector('[data-testid="content-panel"]');
      expect(contentPanel).toBeInTheDocument();
      
      const sidebar = layout?.querySelector('[data-testid="sidebar"]');
      expect(sidebar).not.toBeInTheDocument();
    });

    it('should have correct DOM structure for three-panel layout', () => {
      const { container } = render(
        <MainLayout showSidebar sidebarContent={<div>Nav</div>}>
          <div>Content</div>
        </MainLayout>
      );

      const layout = container.querySelector('.MainLayout--with-sidebar');
      expect(layout).toBeInTheDocument();
      
      const sidebar = layout?.querySelector('[data-testid="sidebar"]');
      expect(sidebar).toBeInTheDocument();
      
      const contentPanel = layout?.querySelector('[data-testid="content-panel"]');
      expect(contentPanel).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(
        <MainLayout showSidebar sidebarContent={<nav>Navigation</nav>}>
          <main>
            <h1>Main Content</h1>
          </main>
        </MainLayout>
      );

      // Sidebar should contain nav element
      const sidebar = screen.getByTestId(TESTID_SIDEBAR);
      expect(sidebar.querySelector('nav')).toBeInTheDocument();

      // Content panel should be a main element
      const contentPanel = screen.getByTestId(TESTID_CONTENT_PANEL);
      expect(contentPanel.tagName).toBe('MAIN');
    });

    it('should render without accessibility violations', () => {
      const { container } = render(
        <MainLayout showSidebar sidebarContent={<nav aria-label="Main navigation">Nav</nav>}>
          <main>
            <h1>Content</h1>
          </main>
        </MainLayout>
      );

      // Check for basic accessibility structure
      expect(container.querySelector('nav')).toHaveAttribute('aria-label');
      expect(container.querySelector('main')).toBeInTheDocument();
    });
  });
});
