'use client';

import React, { useMemo } from 'react';
import Link from '@repo/ui/link';
import { useNavigationStore, NavigationNode } from '@/stores/navigation-store';
import { TESTID_BREADCRUMBS } from '@repo/constants/src/testids';
import './Breadcrumbs.css';

interface BreadcrumbsProps {
  /**
   * Optional CSS class name for styling
   */
  className?: string;
  
  /**
   * Optional callback when a breadcrumb is clicked
   */
  onBreadcrumbClick?: (node: NavigationNode) => void;
}

/**
 * Breadcrumbs Component
 * 
 * Displays a hierarchical breadcrumb trail showing the current location in the code structure.
 * Each breadcrumb is clickable and navigates to the corresponding parent level.
 * 
 * Features:
 * - Hierarchical path display (Division > Part > Section > Subsection > Article)
 * - Clickable breadcrumb items
 * - Responsive truncation for mobile
 * - Integrates with navigation store
 * 
 * Requirements: 4.6, 9.3
 */
export function Breadcrumbs({ className = '', onBreadcrumbClick }: BreadcrumbsProps) {
  const { navigationTree, currentPath } = useNavigationStore();

  /**
   * Build breadcrumb trail from navigation tree based on current path
   */
  const breadcrumbs = useMemo(() => {
    if (!currentPath || !navigationTree || navigationTree.length === 0) {
      return [];
    }

    const trail: NavigationNode[] = [];

    /**
     * Recursively find the path to the current node
     */
    const findPath = (nodes: NavigationNode[], targetPath: string): boolean => {
      for (const node of nodes) {
        if (node.path === targetPath) {
          trail.push(node);
          return true;
        }

        if (node.children && node.children.length > 0) {
          trail.push(node);
          if (findPath(node.children, targetPath)) {
            return true;
          }
          trail.pop();
        }
      }
      return false;
    };

    findPath(navigationTree, currentPath);
    return trail;
  }, [navigationTree, currentPath]);

  /**
   * Handle breadcrumb click
   */
  const handleClick = (node: NavigationNode, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (onBreadcrumbClick) {
      onBreadcrumbClick(node);
    }
  };

  // Don't render if no breadcrumbs
  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav
      className={`breadcrumbs ${className}`}
      data-testid={TESTID_BREADCRUMBS}
      aria-label="Breadcrumb navigation"
    >
      <ol className="breadcrumbs-list">
        {breadcrumbs.map((node, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={node.id} className="breadcrumbs-item">
              {!isLast ? (
                <>
                  <Link
                    href={node.path}
                    className="breadcrumbs-link"
                    onClick={(e) => handleClick(node, e as any)}
                    aria-label={`Navigate to ${node.title}`}
                  >
                    <span className="breadcrumbs-number">{node.number}</span>
                    <span className="breadcrumbs-title">{node.title}</span>
                  </Link>
                  <span className="breadcrumbs-separator" aria-hidden="true">
                    &gt;
                  </span>
                </>
              ) : (
                <span className="breadcrumbs-current" aria-current="page">
                  <span className="breadcrumbs-number">{node.number}</span>
                  <span className="breadcrumbs-title">{node.title}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
