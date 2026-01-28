import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
  setCurrentPath: (path: string) => void;
  expandToNode: (nodeId: string) => void;
  loadNavigationTree: () => Promise<void>;
  collapseAll: () => void;
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

      setCurrentPath: (path) => set({ currentPath: path }),

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
    }),
    { name: 'navigation-store' }
  )
);
