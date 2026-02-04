'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigationStore, NavigationNode } from '@/stores/navigation-store';
import { TESTID_NAV_TREE, TESTID_NAV_NODE } from '@repo/constants/src/testids';
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

  /**
   * Scroll to active node when current path changes
   */
  useEffect(() => {
    if (activeNodeRef.current && treeRef.current) {
      const treeRect = treeRef.current.getBoundingClientRect();
      const nodeRect = activeNodeRef.current.getBoundingClientRect();
      
      // Check if node is outside visible area
      if (nodeRect.top < treeRect.top || nodeRect.bottom > treeRect.bottom) {
        activeNodeRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentPath]);

  /**
   * Handle node click - toggle expansion and navigate
   */
  const handleNodeClick = useCallback(
    (node: NavigationNode, event: React.MouseEvent) => {
      event.preventDefault();
      
      // Toggle expansion if node has children
      if (node.children && node.children.length > 0) {
        toggleNode(node.id);
      }
      
      // Update current path
      setCurrentPath(node.path);
      
      // Call optional callback
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [toggleNode, setCurrentPath, onNodeClick]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (node: NavigationNode, event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleNodeClick(node, event as any);
          break;
        case 'ArrowRight':
          // Expand node if it has children and is collapsed
          if (node.children && node.children.length > 0 && !expandedNodes.has(node.id)) {
            event.preventDefault();
            toggleNode(node.id);
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
    [handleNodeClick, expandedNodes, toggleNode]
  );

  /**
   * Calculate padding based on level and node type
   * Parent (level 0): 0px (handled by wrapper)
   * Child levels: 32px, 48px, 64px (16px increment per level)
   */
  const getPaddingLeft = (level: number): string => {
    if (level === 0) {
      return '0px'; // Parent level - no padding on container
    }
    return `${32 + (level - 1) * 16}px`; // Child levels: 32px, 48px, 64px, etc.
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
              className={`nav-tree-link ${isActive ? 'nav-tree-link--active' : ''} ${isMatching ? 'nav-tree-link--matching' : ''}`}
              onClick={(e) => handleNodeClick(node, e)}
              onKeyDown={(e) => handleKeyDown(node, e)}
              aria-expanded={hasChildren ? isExpanded : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-tree-text">
                {node.number && (
                  <>
                    <span className="nav-tree-number">
                      {node.type === 'division' && `Division ${node.number}`}
                      {node.type === 'part' && `Part ${node.number}`}
                      {node.type === 'section' && `Section ${node.number}`}
                      {node.type === 'subsection' && `Subsection ${node.number}`}
                      {node.type === 'article' && `Article ${node.number}`}
                    </span>
                    <span className="nav-tree-separator"> - </span>
                  </>
                )}
                <span className="nav-tree-title">{node.title}</span>
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
