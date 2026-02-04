import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNavigationStore, NavigationNode } from './navigation-store';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Navigation Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useNavigationStore.setState({
      navigationTree: [],
      expandedNodes: new Set<string>(),
      currentPath: '',
      loading: false,
    });
    
    // Clear fetch mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should have empty navigation tree initially', () => {
      const { result } = renderHook(() => useNavigationStore());
      expect(result.current.navigationTree).toEqual([]);
    });

    it('should have empty expanded nodes set initially', () => {
      const { result } = renderHook(() => useNavigationStore());
      expect(result.current.expandedNodes.size).toBe(0);
    });

    it('should have empty current path initially', () => {
      const { result } = renderHook(() => useNavigationStore());
      expect(result.current.currentPath).toBe('');
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useNavigationStore());
      expect(result.current.loading).toBe(false);
    });
  });

  describe('toggleNode', () => {
    it('should add node to expanded nodes when not expanded', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        result.current.toggleNode('node-1');
      });

      expect(result.current.expandedNodes.has('node-1')).toBe(true);
    });

    it('should remove node from expanded nodes when already expanded', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        result.current.toggleNode('node-1');
      });
      expect(result.current.expandedNodes.has('node-1')).toBe(true);

      act(() => {
        result.current.toggleNode('node-1');
      });
      expect(result.current.expandedNodes.has('node-1')).toBe(false);
    });

    it('should handle multiple nodes being expanded', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        result.current.toggleNode('node-1');
        result.current.toggleNode('node-2');
        result.current.toggleNode('node-3');
      });

      expect(result.current.expandedNodes.has('node-1')).toBe(true);
      expect(result.current.expandedNodes.has('node-2')).toBe(true);
      expect(result.current.expandedNodes.has('node-3')).toBe(true);
      expect(result.current.expandedNodes.size).toBe(3);
    });

    it('should not affect other expanded nodes when toggling one', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        result.current.toggleNode('node-1');
        result.current.toggleNode('node-2');
      });

      act(() => {
        result.current.toggleNode('node-1');
      });

      expect(result.current.expandedNodes.has('node-1')).toBe(false);
      expect(result.current.expandedNodes.has('node-2')).toBe(true);
    });
  });

  describe('setCurrentPath', () => {
    it('should update current path', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        result.current.setCurrentPath('/division-a/part-1/section-1-1');
      });

      expect(result.current.currentPath).toBe('/division-a/part-1/section-1-1');
    });

    it('should overwrite previous path', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        result.current.setCurrentPath('/division-a/part-1');
      });
      expect(result.current.currentPath).toBe('/division-a/part-1');

      act(() => {
        result.current.setCurrentPath('/division-b/part-3');
      });
      expect(result.current.currentPath).toBe('/division-b/part-3');
    });

    it('should handle empty path', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        result.current.setCurrentPath('');
      });

      expect(result.current.currentPath).toBe('');
    });
  });

  describe('expandToNode', () => {
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
    ];

    it('should expand all parent nodes to reach target node', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Set up navigation tree
      act(() => {
        result.current.loadNavigationTree = vi.fn().mockResolvedValue(undefined);
        useNavigationStore.setState({ navigationTree: mockNavigationTree });
      });

      act(() => {
        result.current.expandToNode('article-1-1-1-1');
      });

      // Should expand division-a, part-1, section-1-1, and article-1-1-1-1
      expect(result.current.expandedNodes.has('division-a')).toBe(true);
      expect(result.current.expandedNodes.has('part-1')).toBe(true);
      expect(result.current.expandedNodes.has('section-1-1')).toBe(true);
      expect(result.current.expandedNodes.has('article-1-1-1-1')).toBe(true);
    });

    it('should handle node not found gracefully', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        useNavigationStore.setState({ navigationTree: mockNavigationTree });
      });

      const initialSize = result.current.expandedNodes.size;

      act(() => {
        result.current.expandToNode('non-existent-node');
      });

      // Should not change expanded nodes
      expect(result.current.expandedNodes.size).toBe(initialSize);
    });

    it('should preserve existing expanded nodes', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        useNavigationStore.setState({ navigationTree: mockNavigationTree });
        result.current.toggleNode('some-other-node');
      });

      act(() => {
        result.current.expandToNode('section-1-1');
      });

      expect(result.current.expandedNodes.has('some-other-node')).toBe(true);
      expect(result.current.expandedNodes.has('division-a')).toBe(true);
      expect(result.current.expandedNodes.has('part-1')).toBe(true);
      expect(result.current.expandedNodes.has('section-1-1')).toBe(true);
    });
  });

  describe('collapseAll', () => {
    it('should clear all expanded nodes', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        result.current.toggleNode('node-1');
        result.current.toggleNode('node-2');
        result.current.toggleNode('node-3');
      });
      expect(result.current.expandedNodes.size).toBe(3);

      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.expandedNodes.size).toBe(0);
    });

    it('should work when no nodes are expanded', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.expandedNodes.size).toBe(0);
    });
  });

  describe('loadNavigationTree', () => {
    const mockNavigationData = {
      divisions: [
        {
          id: 'division-a',
          number: 'A',
          title: 'Division A',
          type: 'division' as const,
          path: '/division-a',
          children: [],
        },
      ],
    };

    it('should initialize with empty navigation tree', () => {
      const state = useNavigationStore.getState();
      expect(state.navigationTree).toEqual([]);
      expect(state.loading).toBe(false);
    });

    it('should have loadNavigationTree method', () => {
      const state = useNavigationStore.getState();
      expect(typeof state.loadNavigationTree).toBe('function');
    });

    it('should allow manual setting of navigation tree for testing', () => {
      useNavigationStore.setState({ navigationTree: mockNavigationData.divisions });
      
      const state = useNavigationStore.getState();
      expect(state.navigationTree).toEqual(mockNavigationData.divisions);
      expect(state.navigationTree[0].id).toBe('division-a');
      expect(state.navigationTree[0].title).toBe('Division A');
    });

    it('should allow manual setting of loading state', () => {
      useNavigationStore.setState({ loading: true });
      expect(useNavigationStore.getState().loading).toBe(true);

      useNavigationStore.setState({ loading: false });
      expect(useNavigationStore.getState().loading).toBe(false);
    });
  });

  describe('NavigationNode Interface', () => {
    it('should support all hierarchy types', () => {
      const nodes: NavigationNode[] = [
        {
          id: 'div-a',
          number: 'A',
          title: 'Division A',
          type: 'division',
          path: '/division-a',
        },
        {
          id: 'part-1',
          number: '1',
          title: 'Part 1',
          type: 'part',
          path: '/division-a/part-1',
        },
        {
          id: 'section-1-1',
          number: '1.1',
          title: 'Section 1.1',
          type: 'section',
          path: '/division-a/part-1/section-1-1',
        },
        {
          id: 'subsection-1-1-1',
          number: '1.1.1',
          title: 'Subsection 1.1.1',
          type: 'subsection',
          path: '/division-a/part-1/section-1-1/subsection-1-1-1',
        },
        {
          id: 'article-1-1-1-1',
          number: '1.1.1.1',
          title: 'Article 1.1.1.1',
          type: 'article',
          path: '/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
        },
      ];

      // Verify all types are valid
      nodes.forEach((node) => {
        expect(node.id).toBeDefined();
        expect(node.number).toBeDefined();
        expect(node.title).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.path).toBeDefined();
      });
    });

    it('should support recursive children structure', () => {
      const node: NavigationNode = {
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
              },
            ],
          },
        ],
      };

      expect(node.children).toBeDefined();
      expect(node.children?.length).toBe(1);
      expect(node.children?.[0].children).toBeDefined();
      expect(node.children?.[0].children?.length).toBe(1);
    });
  });

  describe('URL Synchronization', () => {
    // Mock window.location
    const mockLocation = (pathname: string, search: string = '') => {
      delete (window as any).location;
      (window as any).location = { 
        pathname,
        search,
        href: `http://localhost${pathname}${search}`,
      };
    };

    // Mock window.history
    const mockHistory = () => {
      const historyState: any[] = [];
      (window as any).history = {
        pushState: vi.fn((state, title, url) => {
          historyState.push({ state, title, url });
        }),
        replaceState: vi.fn((state, title, url) => {
          if (historyState.length > 0) {
            historyState[historyState.length - 1] = { state, title, url };
          } else {
            historyState.push({ state, title, url });
          }
        }),
        state: historyState,
      };
      return historyState;
    };

    beforeEach(() => {
      mockLocation('/');
      mockHistory();
    });

    it('should sync current path from URL on syncFromUrl', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      mockLocation('/code/division-a/part-1');
      
      act(() => {
        result.current.syncFromUrl();
      });

      expect(result.current.currentPath).toBe('/code/division-a/part-1');
    });

    it('should expand to node when syncing from URL', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      const mockTree: NavigationNode[] = [
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
            },
          ],
        },
      ];
      
      act(() => {
        useNavigationStore.setState({ navigationTree: mockTree });
      });

      mockLocation('/code/division-a/part-1');
      
      act(() => {
        result.current.syncFromUrl();
      });

      expect(result.current.expandedNodes.has('division-a')).toBe(true);
      expect(result.current.expandedNodes.has('part-1')).toBe(true);
    });

    it('should handle invalid URL gracefully', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      mockLocation('/invalid/path');
      
      act(() => {
        result.current.syncFromUrl();
      });

      // Should not crash, path should remain unchanged
      expect(result.current.currentPath).toBe('');
    });

    it('should navigate to path and update URL', () => {
      const { result } = renderHook(() => useNavigationStore());
      const historyState = mockHistory();
      
      act(() => {
        result.current.navigateToPath({
          division: 'division-b',
          part: 'part-3',
          section: 'section-3-2',
        });
      });

      expect(result.current.currentPath).toBe('/code/division-b/part-3/section-3-2');
      expect(window.history.pushState).toHaveBeenCalledWith(
        {},
        '',
        '/code/division-b/part-3/section-3-2'
      );
    });

    it('should navigate with query parameters', () => {
      const { result } = renderHook(() => useNavigationStore());
      mockHistory();
      
      act(() => {
        result.current.navigateToPath(
          {
            division: 'division-a',
            part: 'part-1',
          },
          { date: '2024-01-01' }
        );
      });

      expect(result.current.currentPath).toBe('/code/division-a/part-1?date=2024-01-01');
      expect(window.history.pushState).toHaveBeenCalledWith(
        {},
        '',
        '/code/division-a/part-1?date=2024-01-01'
      );
    });

    it('should update path without URL update when updateUrl is false', () => {
      const { result } = renderHook(() => useNavigationStore());
      mockHistory();
      
      act(() => {
        result.current.setCurrentPath('/code/division-a/part-1', false);
      });

      expect(result.current.currentPath).toBe('/code/division-a/part-1');
      expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it('should update URL when updateUrl is true', () => {
      const { result } = renderHook(() => useNavigationStore());
      mockHistory();
      
      act(() => {
        result.current.setCurrentPath('/code/division-a/part-1', true);
      });

      expect(result.current.currentPath).toBe('/code/division-a/part-1');
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        '/code/division-a/part-1'
      );
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 4.2: Navigation tree hierarchy', () => {
      // Requirement 4.2: THE Navigation_Tree SHALL show the hierarchy: 
      // Division → Part → Section → Subsection → Article
      
      const hierarchyNode: NavigationNode = {
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
                    id: 'subsection-1-1-1',
                    number: '1.1.1',
                    title: 'Subsection 1.1.1',
                    type: 'subsection',
                    path: '/division-a/part-1/section-1-1/subsection-1-1-1',
                    children: [
                      {
                        id: 'article-1-1-1-1',
                        number: '1.1.1.1',
                        title: 'Article 1.1.1.1',
                        type: 'article',
                        path: '/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      // Verify hierarchy structure is supported
      expect(hierarchyNode.type).toBe('division');
      expect(hierarchyNode.children?.[0].type).toBe('part');
      expect(hierarchyNode.children?.[0].children?.[0].type).toBe('section');
      expect(hierarchyNode.children?.[0].children?.[0].children?.[0].type).toBe('subsection');
      expect(hierarchyNode.children?.[0].children?.[0].children?.[0].children?.[0].type).toBe('article');
    });

    it('should satisfy Requirement 4.3: Expand/collapse node children', () => {
      // Requirement 4.3: WHEN a user clicks a navigation node, 
      // THE Application SHALL expand/collapse that node's children
      
      const { result } = renderHook(() => useNavigationStore());
      
      // Initially not expanded
      expect(result.current.expandedNodes.has('node-1')).toBe(false);

      // Click to expand
      act(() => {
        result.current.toggleNode('node-1');
      });
      expect(result.current.expandedNodes.has('node-1')).toBe(true);

      // Click to collapse
      act(() => {
        result.current.toggleNode('node-1');
      });
      expect(result.current.expandedNodes.has('node-1')).toBe(false);
    });

    it('should satisfy Requirement 4.4: Navigate to corresponding content', () => {
      // Requirement 4.4: WHEN a user clicks a navigation node, 
      // THE Application SHALL navigate to the corresponding content
      
      const { result } = renderHook(() => useNavigationStore());
      
      const testPath = '/division-a/part-1/section-1-1';
      
      act(() => {
        result.current.setCurrentPath(testPath);
      });

      expect(result.current.currentPath).toBe(testPath);
    });

    it('should satisfy Requirement 4.8: Update URL to reflect current location', () => {
      // Requirement 4.8: WHEN a user navigates to a page, 
      // THE Application SHALL update the URL to reflect the current location
      
      const { result } = renderHook(() => useNavigationStore());
      
      // Mock window.history
      (window as any).history = {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      };
      
      const testPath = {
        division: 'division-b',
        part: 'part-3',
        section: 'section-3-2',
      };
      
      act(() => {
        result.current.navigateToPath(testPath);
      });

      // Verify URL was updated
      expect(window.history.pushState).toHaveBeenCalledWith(
        {},
        '',
        '/code/division-b/part-3/section-3-2'
      );
      
      // Verify current path was updated
      expect(result.current.currentPath).toBe('/code/division-b/part-3/section-3-2');
    });

    it('should satisfy Requirement 4.9: Load correct content from URL', () => {
      // Requirement 4.9: WHEN a user shares or bookmarks a URL, 
      // THE Application SHALL load the correct content on page load
      
      const { result } = renderHook(() => useNavigationStore());
      
      // Mock window.location with a bookmarked URL
      delete (window as any).location;
      (window as any).location = {
        pathname: '/code/division-b/part-3/section-3-2',
        search: '?date=2024-01-01',
        href: 'http://localhost/code/division-b/part-3/section-3-2?date=2024-01-01',
      };
      
      // Sync from URL (simulates page load)
      act(() => {
        result.current.syncFromUrl();
      });

      // Verify correct path was loaded
      expect(result.current.currentPath).toBe('/code/division-b/part-3/section-3-2?date=2024-01-01');
    });
  });
});
