import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  parseContentPath,
  buildContentPath,
  updateUrlWithoutNavigation,
  type ContentPathParams,
} from '../lib/url-utils';

/**
 * Navigation node interface
 */
export interface NavigationNode {
  id: string;
  number: string;
  title: string;
  type: 'division' | 'part' | 'section' | 'subsection' | 'article';
  path: string;
  children?: NavigationNode[];
}

/**
 * Navigation store state interface
 */
interface NavigationStore {
  navigationTree: NavigationNode[];
  expandedNodes: Set<string>;
  currentPath: string;
  loading: boolean;
  toggleNode: (nodeId: string) => void;
  setCurrentPath: (path: string, updateUrl?: boolean) => void;
  expandToNode: (nodeId: string) => void;
  loadNavigationTree: () => Promise<void>;
  collapseAll: () => void;
  syncFromUrl: () => void;
  navigateToPath: (params: ContentPathParams, queryParams?: Record<string, string>) => void;
}

/**
 * Navigation store
 * Manages navigation tree, expanded nodes, and current path
 */
export const useNavigationStore = create<NavigationStore>()(
  devtools(
    (set, get) => ({
      navigationTree: [],
      expandedNodes: new Set<string>(),
      currentPath: '',
      loading: false,

      toggleNode: (nodeId) =>
        set((state) => {
          const newExpandedNodes = new Set(state.expandedNodes);
          if (newExpandedNodes.has(nodeId)) {
            newExpandedNodes.delete(nodeId);
          } else {
            newExpandedNodes.add(nodeId);
          }
          return { expandedNodes: newExpandedNodes };
        }),

      setCurrentPath: (path, updateUrl = true) => {
        set({ currentPath: path });
        
        // Optionally sync URL without navigation
        if (updateUrl && typeof window !== 'undefined') {
          updateUrlWithoutNavigation(path);
        }
      },

      expandToNode: (nodeId) => {
        // Find the path to the node and expand all parent nodes
        const findPath = (
          nodes: NavigationNode[],
          targetId: string,
          path: string[] = []
        ): string[] | null => {
          for (const node of nodes) {
            if (node.id === targetId) {
              return [...path, node.id];
            }
            if (node.children) {
              const result = findPath(node.children, targetId, [...path, node.id]);
              if (result) return result;
            }
          }
          return null;
        };

        const { navigationTree } = get();
        const pathToNode = findPath(navigationTree, nodeId);
        if (pathToNode) {
          set((state) => ({
            expandedNodes: new Set([...state.expandedNodes, ...pathToNode]),
          }));
        }
      },

      loadNavigationTree: async () => {
        set({ loading: true });
        try {
          // TODO: Load navigation tree from /public/data/navigation-tree.json
          // This will be implemented in Sprint 1 after the build pipeline is set up
          const response = await fetch('/data/navigation-tree.json');
          if (response.ok) {
            const data = await response.json();
            set({ navigationTree: data.divisions || [], loading: false });
          } else {
            console.error('Failed to load navigation tree');
            set({ loading: false });
          }
        } catch (error) {
          console.error('Error loading navigation tree:', error);
          set({ loading: false });
        }
      },

      collapseAll: () => set({ expandedNodes: new Set() }),

      /**
       * Sync navigation state from current URL
       * Called on page load and browser back/forward navigation
       */
      syncFromUrl: () => {
        if (typeof window === 'undefined') return;
        
        const pathname = window.location.pathname;
        const search = window.location.search;
        const params = parseContentPath(pathname);
        
        if (params) {
          // Build the path from params, including query string
          const path = buildContentPath(params) + search;
          
          // Update current path without triggering URL update
          set({ currentPath: path });
          
          // Find and expand to the current node
          const nodeId = params.article || params.subsection || params.section || params.part;
          
          if (nodeId) {
            get().expandToNode(nodeId);
          }
        }
      },

      /**
       * Navigate to a content path and update URL
       * 
       * @param params - Content path parameters
       * @param queryParams - Optional query parameters (e.g., date filter)
       */
      navigateToPath: (params, queryParams) => {
        const path = buildContentPath(params, queryParams);
        
        // Update store state
        set({ currentPath: path });
        
        // Update URL and trigger navigation
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', path);
          // Dispatch popstate to trigger any navigation listeners
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        
        // Expand to the target node
        const nodeId = params.article || params.subsection || params.section || params.part;
        if (nodeId) {
          get().expandToNode(nodeId);
        }
      },
    }),
    { name: 'navigation-store' }
  )
);
