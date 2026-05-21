import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationTree } from './NavigationTree';
import { useNavigationStore, NavigationNode } from '@/stores/navigation-store';
import { TESTID_NAV_TREE } from '@repo/constants/src/testids';

// Mock the navigation store
vi.mock('@/stores/navigation-store', () => ({
  useNavigationStore: vi.fn(),
  NavigationNode: {} as any,
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/code/test'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => ({ toString: () => '' })),
}));

describe('NavigationTree', () => {
  const mockNavigationTree: NavigationNode[] = [
    {
      id: 'division-a',
      number: 'A',
      title: 'Division A',
      type: 'division',
      path: '/division-a',
      children: [
        {
          id: 'part-1',
          number: '1',
          title: 'Part 1',
          type: 'part',
          path: '/division-a/part-1',
          children: [
            {
              id: 'section-1-1',
              number: '1.1',
              title: 'Section 1.1',
              type: 'section',
              path: '/division-a/part-1/section-1-1',
              children: [
                {
                  id: 'article-1-1-1-1',
                  number: '1.1.1.1',
                  title: 'Article 1.1.1.1',
                  type: 'article',
                  path: '/division-a/part-1/section-1-1/article-1-1-1-1',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'division-b',
      number: 'B',
      title: 'Division B',
      type: 'division',
      path: '/division-b',
      children: [
        {
          id: 'part-3',
          number: '3',
          title: 'Part 3',
          type: 'part',
          path: '/division-b/part-3',
        },
      ],
    },
  ];

  const mockToggleNode = vi.fn();
  const mockSetCurrentPath = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (useNavigationStore as any).mockReturnValue({
      navigationTree: mockNavigationTree,
      expandedNodes: new Set<string>(),
      currentPath: '',
      toggleNode: mockToggleNode,
      setCurrentPath: mockSetCurrentPath,
      loading: false,
      searchQuery: '',
      filteredTree: [],
      matchingNodeIds: new Set<string>(),
    });
  });

  describe('Rendering', () => {
    it('should render navigation tree with test ID', () => {
      render(<NavigationTree />);
      expect(screen.getByTestId(TESTID_NAV_TREE)).toBeInTheDocument();
    });

    it('should render all top-level nodes', () => {
      render(<NavigationTree />);
      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Division B')).toBeInTheDocument();
    });

    it('should render node titles (number is part of title text)', () => {
      render(<NavigationTree />);
      // Component renders node.title only, not node.number separately
      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Division B')).toBeInTheDocument();
    });

    it('should render empty state when no navigation tree', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: [],
        expandedNodes: new Set<string>(),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      expect(screen.getByText('No navigation data available')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<NavigationTree className="custom-class" />);
      const tree = screen.getByTestId(TESTID_NAV_TREE);
      expect(tree).toHaveClass('custom-class');
    });

    it('should have proper ARIA label', () => {
      render(<NavigationTree />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Building code navigation');
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('should not show children initially when node is collapsed', () => {
      render(<NavigationTree />);
      expect(screen.queryByText('Part 1')).not.toBeInTheDocument();
    });

    it('should show children when node is expanded', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      expect(screen.getByText('Part 1')).toBeInTheDocument();
    });

    it('should call toggleNode when clicking a node with children', () => {
      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.click(divisionAButton!);
      expect(mockToggleNode).toHaveBeenCalledWith('division-a');
    });

    it('should render button for nodes with children', () => {
      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      // Component uses buttons for all nodes, no separate icon element with .nav-tree-icon
      expect(divisionAButton).toBeInTheDocument();
      expect(divisionAButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should render button for child nodes with children', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      const part1Button = screen.getByText('Part 1').closest('button');
      expect(part1Button).toBeInTheDocument();
      expect(part1Button).toHaveAttribute('aria-expanded', 'false'); // Part 1 has children but is collapsed
    });

    it('should have correct aria-expanded attribute', () => {
      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      expect(divisionAButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when expanded', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      expect(divisionAButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should render nested children when multiple levels expanded', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a', 'part-1', 'section-1-1']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Section 1.1')).toBeInTheDocument();
      expect(screen.getByText('Article 1.1.1.1')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call toggleNode when clicking a division (non-navigable type)', () => {
      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.click(divisionAButton!);
      // Division is not a navigable type, so only toggleNode is called, not setCurrentPath
      expect(mockToggleNode).toHaveBeenCalledWith('division-a');
    });

    it('should call onNodeClick callback when provided', () => {
      const onNodeClick = vi.fn();
      render(<NavigationTree onNodeClick={onNodeClick} />);

      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.click(divisionAButton!);

      expect(onNodeClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'division-a',
          path: '/division-a',
        })
      );
    });

    it('should highlight active node', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '/division-a/part-1',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      const part1Button = screen.getByText('Part 1').closest('button');
      expect(part1Button).toHaveClass('nav-tree-link--active');
    });

    it('should have aria-current on active node', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '/division-a/part-1',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      const part1Button = screen.getByText('Part 1').closest('button');
      expect(part1Button).toHaveAttribute('aria-current', 'page');
    });

    it('should not have aria-current on inactive nodes', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '/division-a/part-1',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      expect(divisionAButton).not.toHaveAttribute('aria-current');
    });
  });

  describe('Keyboard Navigation (Requirement 10.1)', () => {
    it('should toggle node on Enter key', () => {
      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.keyDown(divisionAButton!, { key: 'Enter' });
      expect(mockToggleNode).toHaveBeenCalledWith('division-a');
      // Division is not navigable, so setCurrentPath is not called
    });

    it('should toggle node on Space key', () => {
      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.keyDown(divisionAButton!, { key: ' ' });
      expect(mockToggleNode).toHaveBeenCalledWith('division-a');
    });

    it('should expand node on ArrowRight when collapsed', () => {
      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.keyDown(divisionAButton!, { key: 'ArrowRight' });
      expect(mockToggleNode).toHaveBeenCalledWith('division-a');
    });

    it('should not expand node on ArrowRight when already expanded', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.keyDown(divisionAButton!, { key: 'ArrowRight' });
      expect(mockToggleNode).not.toHaveBeenCalled();
    });

    it('should collapse node on ArrowLeft when expanded', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.keyDown(divisionAButton!, { key: 'ArrowLeft' });
      expect(mockToggleNode).toHaveBeenCalledWith('division-a');
    });

    it('should not collapse node on ArrowLeft when already collapsed', () => {
      render(<NavigationTree />);
      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.keyDown(divisionAButton!, { key: 'ArrowLeft' });
      expect(mockToggleNode).not.toHaveBeenCalled();
    });

    it('should not handle ArrowRight/Left for nodes without children', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-b']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      const part3Button = screen.getByText('Part 3').closest('button');

      fireEvent.keyDown(part3Button!, { key: 'ArrowRight' });
      expect(mockToggleNode).not.toHaveBeenCalled();

      fireEvent.keyDown(part3Button!, { key: 'ArrowLeft' });
      expect(mockToggleNode).not.toHaveBeenCalled();
    });
  });

  describe('Hierarchical Structure (Requirement 4.2)', () => {
    it('should render Division → Part → Section → Article hierarchy', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a', 'part-1', 'section-1-1']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);

      // Verify all levels are rendered
      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Section 1.1')).toBeInTheDocument();
      expect(screen.getByText('Article 1.1.1.1')).toBeInTheDocument();
    });

    it('should apply correct indentation levels via wrapper', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a', 'part-1', 'section-1-1']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);

      // Padding is applied to the wrapper div, not the button itself
      const divisionWrapper = screen.getByText('Division A').closest('button')!.closest('.nav-tree-link-wrapper');
      const partWrapper = screen.getByText('Part 1').closest('button')!.closest('.nav-tree-link-wrapper');
      const sectionWrapper = screen.getByText('Section 1.1').closest('button')!.closest('.nav-tree-link-wrapper');
      const articleWrapper = screen.getByText('Article 1.1.1.1').closest('button')!.closest('.nav-tree-link-wrapper');

      // Level 0: 0px, Level 1: 32px, Level 2: 48px, Level 3: 64px
      expect(divisionWrapper).toHaveStyle({ paddingLeft: '0px' });
      expect(partWrapper).toHaveStyle({ paddingLeft: '32px' });
      expect(sectionWrapper).toHaveStyle({ paddingLeft: '48px' });
      expect(articleWrapper).toHaveStyle({ paddingLeft: '64px' });
    });
  });

  describe('Accessibility', () => {
    it('should have role="navigation"', () => {
      render(<NavigationTree />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have role="group" for children containers', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);
      const groups = screen.getAllByRole('group');
      expect(groups.length).toBeGreaterThan(0);
    });

    it('should have buttons that are keyboard focusable', () => {
      render(<NavigationTree />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('should be keyboard focusable', () => {
      render(<NavigationTree />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 4.1: Display collapsible navigation tree', () => {
      render(<NavigationTree />);

      // Tree is displayed
      expect(screen.getByTestId(TESTID_NAV_TREE)).toBeInTheDocument();

      // Nodes are collapsible (have expand/collapse controls)
      const divisionAButton = screen.getByText('Division A').closest('button');
      expect(divisionAButton).toHaveAttribute('aria-expanded');
    });

    it('should satisfy Requirement 4.3: Expand/collapse on click', () => {
      render(<NavigationTree />);

      const divisionAButton = screen.getByText('Division A').closest('button');
      fireEvent.click(divisionAButton!);

      expect(mockToggleNode).toHaveBeenCalledWith('division-a');
    });

    it('should satisfy Requirement 4.4: Navigate to corresponding content for navigable types', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);

      // Part is a navigable type
      const part1Button = screen.getByText('Part 1').closest('button');
      fireEvent.click(part1Button!);

      expect(mockSetCurrentPath).toHaveBeenCalledWith('/division-a/part-1', false);
    });

    it('should navigate when clicking index or conversions nodes', () => {
      const treeWithIndexAndConversions: NavigationNode[] = [
        {
          id: 'volume-1',
          number: '1',
          title: 'Volume 1',
          type: 'volume',
          path: '/volume/1',
          children: [
            {
              id: 'division-a',
              number: 'A',
              title: 'Division A',
              type: 'division',
              path: '/division-a',
            },
            {
              id: 'vol-1-index',
              number: '',
              title: 'Index',
              type: 'index',
              path: '/code/index/volume-1',
            },
            {
              id: 'vol-1-conversions',
              number: '',
              title: 'Conversion Factors',
              type: 'conversions',
              path: '/code/conversions/volume-1',
            },
          ],
        },
      ];

      (useNavigationStore as any).mockReturnValue({
        navigationTree: treeWithIndexAndConversions,
        expandedNodes: new Set(['volume-1']),
        currentPath: '',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);

      // Index is a navigable type
      const indexButton = screen.getByText('Index').closest('button');
      fireEvent.click(indexButton!);
      expect(mockSetCurrentPath).toHaveBeenCalledWith('/code/index/volume-1', false);

      vi.clearAllMocks();

      // Conversion Factors is a navigable type
      const conversionsButton = screen.getByText('Conversion Factors').closest('button');
      fireEvent.click(conversionsButton!);
      expect(mockSetCurrentPath).toHaveBeenCalledWith('/code/conversions/volume-1', false);
    });

    it('should satisfy Requirement 4.5: Highlight current location', () => {
      (useNavigationStore as any).mockReturnValue({
        navigationTree: mockNavigationTree,
        expandedNodes: new Set(['division-a']),
        currentPath: '/division-a/part-1',
        toggleNode: mockToggleNode,
        setCurrentPath: mockSetCurrentPath,
        loading: false,
        searchQuery: '',
        filteredTree: [],
        matchingNodeIds: new Set<string>(),
      });

      render(<NavigationTree />);

      const part1Button = screen.getByText('Part 1').closest('button');
      expect(part1Button).toHaveClass('nav-tree-link--active');
      expect(part1Button).toHaveAttribute('aria-current', 'page');
    });

    it('should satisfy Requirement 10.1: Full keyboard navigation', () => {
      render(<NavigationTree />);

      const divisionAButton = screen.getByText('Division A').closest('button');

      // Test Enter key
      fireEvent.keyDown(divisionAButton!, { key: 'Enter' });
      expect(mockToggleNode).toHaveBeenCalled();

      vi.clearAllMocks();

      // Test Space key
      fireEvent.keyDown(divisionAButton!, { key: ' ' });
      expect(mockToggleNode).toHaveBeenCalled();

      vi.clearAllMocks();

      // Test Arrow keys
      fireEvent.keyDown(divisionAButton!, { key: 'ArrowRight' });
      expect(mockToggleNode).toHaveBeenCalled();
    });
  });
});
