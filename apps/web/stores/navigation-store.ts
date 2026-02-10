import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  parseContentPath,
  buildContentPath,
  updateUrlWithoutNavigation,
  type ContentPathParams,
} from '../lib/url-utils';
import { useVersionStore } from './version-store';
import { useAmendmentDateStore } from './amendment-date-store';

/**
 * Navigation node interface
 */
export interface NavigationNode {
  id: string;
  number: string;
  title: string;
  type: 'volume' | 'division' | 'part' | 'section' | 'subsection' | 'article';
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
  currentVersion: string | null;
  loading: boolean;
  searchQuery: string;
  filteredTree: NavigationNode[];
  matchingNodeIds: Set<string>;
  preSearchExpandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
  setCurrentPath: (path: string, updateUrl?: boolean) => void;
  expandToNode: (nodeId: string) => void;
  loadNavigationTree: (version?: string) => Promise<void>;
  collapseAll: () => void;
  syncFromUrl: () => void;
  navigateToPath: (params: ContentPathParams, queryParams?: Record<string, string>) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

/**
 * Navigation store
 * Manages navigation tree, expanded nodes, current path, and TOC search
 * Now version-aware: loads navigation tree from version-specific paths
 */
export const useNavigationStore = create<NavigationStore>()(
  devtools(
    (set, get) => ({
      navigationTree: [],
      expandedNodes: new Set<string>(),
      currentPath: '',
      currentVersion: null,
      loading: false,
      searchQuery: '',
      filteredTree: [],
      matchingNodeIds: new Set<string>(),
      preSearchExpandedNodes: new Set<string>(),

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
          // Preserve existing query parameters (version, date, etc.)
          const currentUrl = new URL(window.location.href);
          const searchParams = currentUrl.searchParams;
          
          // Build new URL with path and preserved query params
          const newUrl = searchParams.toString() 
            ? `${path}?${searchParams.toString()}`
            : path;
          
          updateUrlWithoutNavigation(newUrl);
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

      loadNavigationTree: async (version?: string) => {
        set({ loading: true });
        
        // Get version data path from version store
        const versionStore = useVersionStore.getState();
        const dataPath = versionStore.getVersionDataPath(version);
        const versionId = version || versionStore.currentVersion || '2024';
        
        try {
          const response = await fetch(`${dataPath}/navigation-tree.json`);
          if (response.ok) {
            const data = await response.json();
            
            // Transform the data to add path property to each node
            const addPathToNodes = (nodes: any[], parentPath: string = ''): NavigationNode[] => {
              return nodes.map((node) => {
                // Use existing path from JSON if available, otherwise build it
                let path = node.path || parentPath;
                
                // Only build path if not provided in JSON
                if (!node.path) {
                  if (node.type === 'volume') {
                    path = `/volume/${node.number}`;
                  } else if (node.type === 'division') {
                    // Extract division letter from ID (e.g., "nbc.divA" -> "A")
                    const divMatch = node.id.match(/div([A-Z])/i);
                    const divLetter = divMatch ? divMatch[1].toLowerCase() : node.number?.toLowerCase() || '';
                    path = `/code/div${divLetter}`;
                  } else if (node.type === 'part') {
                    path = `${parentPath}/part-${node.number}`;
                  } else if (node.type === 'section') {
                    path = `${parentPath}/section-${node.number}`;
                  } else if (node.type === 'subsection') {
                    path = `${parentPath}/subsection-${node.number}`;
                  } else if (node.type === 'article') {
                    path = `${parentPath}/article-${node.number}`;
                  }
                }
                
                return {
                  id: node.id,
                  number: node.number?.toString() || '',
                  title: node.title,
                  type: node.type,
                  path,
                  children: node.children ? addPathToNodes(node.children, path) : undefined,
                };
              });
            };
            
            // Handle both old structure (data.divisions) and new structure (data.tree with volumes)
            const sourceNodes = data.tree || data.divisions || [];
            const transformedTree = addPathToNodes(sourceNodes);
            set({ 
              navigationTree: transformedTree, 
              currentVersion: versionId,
              loading: false 
            });
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
        // Get current version and effective date from stores
        const versionStore = useVersionStore.getState();
        const amendmentDateStore = useAmendmentDateStore.getState();
        const currentVersion = versionStore.currentVersion;
        const selectedDate = amendmentDateStore.selectedDate;
        
        // Merge provided query params with version and date
        const mergedQueryParams: Record<string, string> = {
          ...queryParams,
          version: currentVersion || '',
        };
        
        // Add date if selected
        if (selectedDate) {
          mergedQueryParams.date = selectedDate;
        }
        
        const path = buildContentPath(params, mergedQueryParams);
        
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

      /**
       * Set search query and filter navigation tree
       * Searches across all levels and auto-expands parent nodes to show matches
       */
      setSearchQuery: (query: string) => {
        const trimmedQuery = query.trim();
        
        if (!trimmedQuery) {
          // Clear search
          set({ 
            searchQuery: '', 
            filteredTree: [], 
            matchingNodeIds: new Set() 
          });
          return;
        }

        const { navigationTree, expandedNodes } = get();
        
        // Save current expanded state before first search
        if (!get().searchQuery) {
          set({ preSearchExpandedNodes: new Set(expandedNodes) });
        }
        
        const lowerQuery = trimmedQuery.toLowerCase();
        const matchingIds = new Set<string>();
        const nodesToExpand = new Set<string>();

        /**
         * Check if a node matches the search query
         */
        const nodeMatches = (node: NavigationNode): boolean => {
          // Match against title
          if (node.title.toLowerCase().includes(lowerQuery)) {
            return true;
          }
          
          // Match against number
          if (node.number && node.number.toString().includes(lowerQuery)) {
            return true;
          }
          
          // Match against type + number (e.g., "Part 3", "Section 2")
          const typeNumber = `${node.type} ${node.number}`.toLowerCase();
          if (typeNumber.includes(lowerQuery)) {
            return true;
          }
          
          return false;
        };

        /**
         * Recursively search tree and collect matching nodes and their parents
         * Returns true if this node or any descendant matches
         */
        const searchTree = (
          nodes: NavigationNode[], 
          parentIds: string[] = []
        ): NavigationNode[] => {
          const results: NavigationNode[] = [];

          for (const node of nodes) {
            const currentPath = [...parentIds, node.id];
            let includeNode = false;
            let filteredChildren: NavigationNode[] = [];

            // Check if current node matches
            if (nodeMatches(node)) {
              matchingIds.add(node.id);
              includeNode = true;
              
              // Add all parent IDs to expansion set
              parentIds.forEach(id => nodesToExpand.add(id));
              nodesToExpand.add(node.id);
            }

            // Recursively search children
            if (node.children && node.children.length > 0) {
              filteredChildren = searchTree(node.children, currentPath);
              
              // If any children match, include this node as parent
              if (filteredChildren.length > 0) {
                includeNode = true;
                // Add this node to expansion set
                nodesToExpand.add(node.id);
              }
            }

            // Include node if it matches or has matching descendants
            if (includeNode) {
              results.push({
                ...node,
                children: filteredChildren.length > 0 ? filteredChildren : node.children,
              });
            }
          }

          return results;
        };

        // Perform search
        const filtered = searchTree(navigationTree);

        // Update state with filtered tree and auto-expand matching nodes
        set((state) => ({
          searchQuery: trimmedQuery,
          filteredTree: filtered,
          matchingNodeIds: matchingIds,
          expandedNodes: new Set([...state.expandedNodes, ...nodesToExpand]),
        }));
      },

      /**
       * Clear search query and restore tree to pre-search state
       */
      clearSearch: () => {
        const { preSearchExpandedNodes } = get();
        set({ 
          searchQuery: '', 
          filteredTree: [], 
          matchingNodeIds: new Set(),
          expandedNodes: preSearchExpandedNodes,
          preSearchExpandedNodes: new Set(),
        });
      },
    }),
    { name: 'navigation-store' }
  )
);
