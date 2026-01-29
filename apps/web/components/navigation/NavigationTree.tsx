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
 * Displays a hierarchical navigation tree with expand/collapse functionality.
 * Integrates with the navigation store for state management.
 * 
 * Features:
 * - Recursive tree rendering
 * - Expand/collapse controls
 * - Click handlers for navigation
 * - Keyboard navigation support
 * - Active node highlighting
 * - Scroll-to-active functionality
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1
 */
export function NavigationTree({ className = '', onNodeClick }: NavigationTreeProps) {
  const { navigationTree, expandedNodes, currentPath, toggleNode, setCurrentPath } = useNavigationStore();
  const treeRef = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLButtonElement>(null);

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
   * Render a single navigation node
   */
  const renderNode = useCallback(
    (node: NavigationNode, level: number = 0): React.ReactNode => {
      const isExpanded = expandedNodes.has(node.id);
      const isActive = currentPath === node.path;
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div
          key={node.id}
          className={`nav-tree-node nav-tree-node--level-${level}`}
          data-testid={`${TESTID_NAV_NODE}-${node.id}`}
        >
          <button
            ref={isActive ? activeNodeRef : null}
            className={`nav-tree-button ${isActive ? 'nav-tree-button--active' : ''}`}
            onClick={(e) => handleNodeClick(node, e)}
            onKeyDown={(e) => handleKeyDown(node, e)}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-current={isActive ? 'page' : undefined}
            style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
          >
            {hasChildren && (
              <span
                className={`nav-tree-icon ${isExpanded ? 'nav-tree-icon--expanded' : ''}`}
                aria-hidden="true"
              >
                ▶
              </span>
            )}
            <span className="nav-tree-number">{node.number}</span>
            <span className="nav-tree-title">{node.title}</span>
          </button>

          {hasChildren && isExpanded && (
            <div className="nav-tree-children" role="group">
              {node.children!.map((child) => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    },
    [expandedNodes, currentPath, handleNodeClick, handleKeyDown]
  );

  if (!navigationTree || navigationTree.length === 0) {
    return (
      <div className={`nav-tree nav-tree--empty ${className}`} data-testid={TESTID_NAV_TREE}>
        <p className="nav-tree-empty-message">No navigation data available</p>
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
      {navigationTree.map((node) => renderNode(node, 0))}
    </nav>
  );
}
