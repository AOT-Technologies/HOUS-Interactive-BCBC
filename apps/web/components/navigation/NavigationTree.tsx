'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useNavigationStore, NavigationNode } from '@/stores/navigation-store';
import { TESTID_NAV_TREE, TESTID_NAV_NODE } from '@repo/constants/src/testids';
import { formatNavigationNodeTitle } from '../../lib/title-formatting';
import './NavigationTree.css';

interface NavigationTreeProps {
  /**
   * Optional CSS class name for styling
   */
  className?: string;

  /**
   * Optional callback when a node is clicked
   */
  onNodeClick?: (node: NavigationNode) => void;
}

/**
 * NavigationTree Component
 * 
 * Displays a hierarchical navigation tree matching Figma design specifications.
 * Integrates with the navigation store for state management.
 * 
 * Features:
 * - Recursive tree rendering
 * - Expand/collapse controls
 * - Click handlers for navigation
 * - Keyboard navigation support
 * - Active node highlighting with blue background
 * - Hierarchical indentation (16px per level for children, 24px for parent)
 * - Scroll-to-active functionality
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1
 */
export function NavigationTree({ className = '', onNodeClick }: NavigationTreeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    navigationTree,
    expandedNodes,
    currentPath,
    toggleNode,
    setCurrentPath,
    loading,
    searchQuery,
    filteredTree,
    matchingNodeIds,
  } = useNavigationStore();
  const treeRef = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLButtonElement>(null);

  // Use filtered tree when search is active, otherwise use full tree
  const displayTree = searchQuery ? filteredTree : navigationTree;

  const buildTargetUrl = useCallback(
    (path: string): string => {
      const queryString = searchParams.toString();
      return queryString ? `${path}?${queryString}` : path;
    },
    [searchParams]
  );

  const scrollExpandedChildrenIntoView = useCallback((triggerElement: HTMLElement) => {
    if (!treeRef.current) {
      return;
    }

    const treeElement = treeRef.current;

    // Wait until the expanded children are rendered before measuring.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const treeItem = triggerElement.closest('.nav-tree-item') as HTMLElement | null;
        const childrenContainer = treeItem?.querySelector(':scope > .nav-tree-children') as HTMLElement | null;

        if (!childrenContainer) {
          return;
        }

        const treeRect = treeElement.getBoundingClientRect();
        const childrenRect = childrenContainer.getBoundingClientRect();

        const overflowBottom = childrenRect.bottom - treeRect.bottom;
        if (overflowBottom > 0) {
          treeElement.scrollBy({
            top: overflowBottom + 12,
            behavior: 'smooth',
          });
        }
      });
    });
  }, []);

  const scrollActiveNodeIntoView = useCallback((attempt: number = 0) => {
    const treeElement = treeRef.current;
    const activeElement = activeNodeRef.current;

    // During route/state transitions, active node can be missing for a frame.
    if (!treeElement || !activeElement) {
      if (attempt < 6) {
        requestAnimationFrame(() => scrollActiveNodeIntoView(attempt + 1));
      }
      return;
    }

    const treeRect = treeElement.getBoundingClientRect();
    const nodeRect = activeElement.getBoundingClientRect();

    // Keep the active row slightly below top for context (not pinned at top edge).
    const desiredTop = treeRect.top + 72;
    const desiredBottom = treeRect.bottom - 24;

    let delta = 0;
    const isOutsideViewport = nodeRect.top < desiredTop || nodeRect.bottom > desiredBottom;
    if (isOutsideViewport) {
      // Always align active item near the top offset for better reading context.
      delta = nodeRect.top - desiredTop;
    }

    if (Math.abs(delta) > 1) {
      const nextTop = treeElement.scrollTop + delta;
      if (typeof treeElement.scrollTo === 'function') {
        treeElement.scrollTo({
          top: nextTop,
          behavior: 'smooth',
        });
      } else {
        treeElement.scrollTop = nextTop;
      }
    }
  }, []);

  /**
   * Scroll to the active node when navigation or tree search changes.
   * Do not rerun this for every expand/collapse action, otherwise opening an
   * unrelated branch can snap the tree back to the current article.
   */
  useEffect(() => {
    scrollActiveNodeIntoView();
  }, [currentPath, searchQuery, scrollActiveNodeIntoView]);

  const handleNodeAction = useCallback(
    (node: NavigationNode, triggerElement?: HTMLElement) => {
      const isNavigable =
        node.type === 'part' ||
        node.type === 'spectables' ||
        node.type === 'part_appendix' ||
        node.type === 'division_appendix' ||
        node.type === 'section' ||
        node.type === 'subsection' ||
        node.type === 'article' ||
        node.type === 'index' ||
        node.type === 'conversions';
      const wasExpanded = expandedNodes.has(node.id);

      // Toggle expansion if node has children
      if (node.children && node.children.length > 0) {
        toggleNode(node.id);

        // If expanding near the bottom of the scroll area, keep new children visible.
        if (!wasExpanded && triggerElement) {
          scrollExpandedChildrenIntoView(triggerElement);
        }
      }

      // Only part and deeper levels are routable content pages.
      if (isNavigable) {
        const targetUrl = buildTargetUrl(node.path);
        const currentUrl = buildTargetUrl(pathname);
        const isReadingPage = pathname.startsWith('/code');

        // In reading page, update only the reading view state and URL (no route transition).
        // From homepage/other pages, perform normal route navigation to reading page.
        if (isReadingPage) {
          setCurrentPath(node.path, false);
          if (targetUrl !== currentUrl && typeof window !== 'undefined') {
            window.history.pushState({}, '', targetUrl);
          }
        } else if (targetUrl !== currentUrl) {
          setCurrentPath(node.path, false);
          router.push(targetUrl);
        }
      }

      // Call optional callback
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [toggleNode, setCurrentPath, buildTargetUrl, pathname, router, onNodeClick, expandedNodes, scrollExpandedChildrenIntoView]
  );

  /**
   * Handle node click - toggle expansion and navigate
   */
  const handleNodeClick = useCallback(
    (node: NavigationNode, event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      handleNodeAction(node, event.currentTarget);
    },
    [handleNodeAction]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (node: NavigationNode, event: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleNodeAction(node, event.currentTarget);
          break;
        case 'ArrowRight':
          // Expand node if it has children and is collapsed
          if (node.children && node.children.length > 0 && !expandedNodes.has(node.id)) {
            event.preventDefault();
            toggleNode(node.id);
            scrollExpandedChildrenIntoView(event.currentTarget);
          }
          break;
        case 'ArrowLeft':
          // Collapse node if it has children and is expanded
          if (node.children && node.children.length > 0 && expandedNodes.has(node.id)) {
            event.preventDefault();
            toggleNode(node.id);
          }
          break;
      }
    },
    [handleNodeAction, expandedNodes, toggleNode, scrollExpandedChildrenIntoView]
  );

  /**
   * Calculate padding based on level and node type
   * Parent (level 0): 0px (handled by wrapper)
   * Child levels: 32px, 48px, 64px (16px increment per level)
   */
  const getPaddingLeft = (level: number): string => {
    if (level === 0) {
      return '0px';
    }
    return `${32 + (level - 1) * 16}px`;
  };

  /**
   * Render a single navigation node
   */
  const renderNode = useCallback(
    (node: NavigationNode, level: number = 0): React.ReactNode => {
      const isExpanded = expandedNodes.has(node.id);
      const isActive = currentPath === node.path;
      const isMatching = matchingNodeIds.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      const paddingLeft = getPaddingLeft(level);
      const displayTitle = formatNavigationNodeTitle(node.type, node.title, node.number);

      return (
        <div
          key={node.id}
          className={`nav-tree-item`}
          data-testid={`${TESTID_NAV_NODE}-${node.id}`}
        >
          <div
            className={`nav-tree-link-wrapper ${isActive ? 'nav-tree-link-wrapper--active' : ''} ${isMatching ? 'nav-tree-link-wrapper--matching' : ''}`}
            style={{ paddingLeft }}
          >
            {/* Selection indicator - 4px blue bar for active, 1px gray for inactive children */}
            {isActive ? (
              <div className="nav-tree-selection nav-tree-selection--active" />
            ) : level > 0 ? (
              <div className="nav-tree-selection nav-tree-selection--inactive" />
            ) : null}

            {/* Link label */}
            <button
              ref={isActive ? activeNodeRef : null}
              className={`nav-tree-link nav-tree-link--${node.type} ${isActive ? 'nav-tree-link--active' : ''} ${isMatching ? 'nav-tree-link--matching' : ''}`}
              onClick={(e) => handleNodeClick(node, e)}
              onKeyDown={(e) => handleKeyDown(node, e)}
              aria-expanded={hasChildren ? isExpanded : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-tree-text">
                <span className="nav-tree-title">{displayTitle}</span>
              </span>
            </button>
          </div>

          {/* Render children if expanded */}
          {hasChildren && isExpanded && (
            <div className="nav-tree-children" role="group">
              {node.children!.map((child) => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    },
    [expandedNodes, currentPath, matchingNodeIds, handleNodeClick, handleKeyDown]
  );

  if (loading) {
    return (
      <div className={`nav-tree nav-tree--loading ${className}`} data-testid={TESTID_NAV_TREE}>
        <p className="nav-tree-loading-message">Loading navigation...</p>
      </div>
    );
  }

  if (!displayTree || displayTree.length === 0) {
    // Show different message for search with no results vs empty tree
    const message = searchQuery
      ? `No results found for "${searchQuery}"`
      : 'No navigation data available';

    return (
      <div className={`nav-tree nav-tree--empty ${className}`} data-testid={TESTID_NAV_TREE}>
        <p className="nav-tree-empty-message">{message}</p>
      </div>
    );
  }

  return (
    <nav
      ref={treeRef}
      className={`nav-tree ${className}`}
      data-testid={TESTID_NAV_TREE}
      aria-label="Building code navigation"
    >
      {displayTree.map((node) => renderNode(node, 0))}
    </nav>
  );
}
