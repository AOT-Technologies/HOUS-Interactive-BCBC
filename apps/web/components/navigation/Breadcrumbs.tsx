'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  onBreadcrumbClick?: (node: NavigationNode | { path: string; title: string }) => void;
  
  /**
   * Maximum number of visible items before collapsing (default: 3)
   * Shows first item, ellipsis, and last item(s)
   */
  maxVisibleItems?: number;
}

/**
 * Breadcrumbs Component
 * 
 * Displays a hierarchical breadcrumb trail showing the current location in the site.
 * All breadcrumbs are clickable and navigable, including the current page.
 * 
 * Features:
 * - Appears on ALL pages (Homepage, Search Results, Download, Content Reading)
 * - Hierarchical path display starting with "Home"
 * - All breadcrumb items are clickable and navigable
 * - Current page is also clickable (blue color)
 * - Responsive truncation for mobile
 * - Integrates with navigation store for content pages
 * 
 * Breadcrumb Formats:
 * - Homepage: "Home"
 * - Search Results: "Home > Search Results"
 * - Download: "Home > Download"
 * - Content: "Home > Division > Part > Section > Subsection > Article"
 * 
 * Requirements: 4.6, 9.3
 */
export function Breadcrumbs({ className = '', onBreadcrumbClick, maxVisibleItems = 3 }: BreadcrumbsProps) {
  const pathname = usePathname();
  const { navigationTree, currentPath } = useNavigationStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const isContentPage = pathname?.startsWith('/code');

  /**
   * Build breadcrumb trail based on current page
   */
  const breadcrumbs = useMemo(() => {
    const trail: Array<{ id: string; title: string; path: string; number?: string; type?: NavigationNode['type'] | 'home' | 'search' | 'download' }> = [];

    // Always start with Home
    trail.push({ id: 'home', title: 'Home', path: '/', type: 'home' });

    // Determine page type and build appropriate breadcrumbs
    if (pathname === '/') {
      // Homepage - only show Home (current page)
      return trail;
    } else if (pathname?.startsWith('/search')) {
      // Search Results Page
      trail.push({ id: 'search', title: 'Search Results', path: '/search', type: 'search' });
      return trail;
    } else if (pathname?.startsWith('/download')) {
      // Download Page
      trail.push({ id: 'download', title: 'Download', path: '/download', type: 'download' });
      return trail;
    } else if (pathname?.startsWith('/code') && navigationTree && navigationTree.length > 0) {
      // Content Reading Page - build from navigation tree by matching node path to URL
      const contentPath = currentPath.startsWith('/code') ? currentPath : pathname;
      // Strip trailing slash for comparison: "/code/nbc.divB/1/1/1/" -> "/code/nbc.divB/1/1/1"
      const normalizedPathname = contentPath.replace(/\/$/, '');
      
      // Walk the tree and collect ancestors of the node whose path matches the URL
      const findAncestors = (nodes: NavigationNode[]): boolean => {
        for (const node of nodes) {
          const normalizedNodePath = node.path.replace(/\/$/, '');
          
          // Volume nodes have paths like "/volume/1" which don't match "/code/..." URLs
          // Skip them in the trail but always recurse into their children
          if (node.type === 'volume') {
            if (node.children && node.children.length > 0) {
              if (findAncestors(node.children)) {
                return true;
              }
            }
            continue;
          }
          
          // Check if the current URL starts with (or equals) this node's path
          // This means this node is an ancestor of the target
          if (normalizedPathname === normalizedNodePath || normalizedPathname.startsWith(normalizedNodePath + '/')) {
            trail.push({ id: node.id, title: node.title, path: node.path, number: node.number, type: node.type });
            
            // Exact match — we found the target node
            if (normalizedPathname === normalizedNodePath) {
              return true;
            }
            
            // Search children for a deeper match
            if (node.children && node.children.length > 0) {
              if (findAncestors(node.children)) {
                return true;
              }
            }
            
            // This node is the deepest match even if no child matched exactly
            return true;
          }
        }
        return false;
      };
      
      findAncestors(navigationTree);
      return trail;
    }

    // Default: just show Home
    return trail;
  }, [pathname, currentPath, navigationTree]);

  /**
   * Handle breadcrumb click - only prevent default if custom callback provided
   */
  const handleClick = (item: typeof breadcrumbs[0]) => {
    if (onBreadcrumbClick) {
      onBreadcrumbClick(item);
      // Don't prevent default - let the Link navigate
    }
    // If no callback, let the Link handle navigation normally
  };

  const isNonNavigableContentCrumb = (item: typeof breadcrumbs[0]): boolean => {
    // On reading pages, URL should only change from Part and below.
    // Division (and volume if ever present) should not navigate.
    if (!isContentPage) return false;
    return item.type === 'division' || item.type === 'volume';
  };

  /**
   * Handle ellipsis click to expand collapsed items
   */
  const handleEllipsisClick = () => {
    setIsExpanded(true);
  };

  /**
   * Get visible breadcrumbs (collapsed or expanded)
   */
  const getVisibleBreadcrumbs = () => {
    // If expanded or few items, show all
    if (isExpanded || breadcrumbs.length <= maxVisibleItems) {
      return { items: breadcrumbs, showEllipsis: false, collapsedItems: [] };
    }

    // Collapse middle items: show first, ellipsis, last two
    const first = breadcrumbs.slice(0, 1);
    const last = breadcrumbs.slice(-2); // Show last 2 items (parent + current)
    const collapsed = breadcrumbs.slice(1, -2);

    return {
      items: [...first, ...last],
      showEllipsis: true,
      collapsedItems: collapsed,
      ellipsisIndex: 1 // Insert ellipsis after first item
    };
  };

  const { items: visibleItems, showEllipsis, collapsedItems, ellipsisIndex } = getVisibleBreadcrumbs();

  // Always render breadcrumbs (at minimum shows "Home")
  return (
    <nav
      className={`breadcrumbs ${className}`}
      data-testid={TESTID_BREADCRUMBS}
      aria-label="Breadcrumb navigation"
    >
      <ol className="breadcrumbs-list">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const actualIndex = showEllipsis && index >= ellipsisIndex! ? index + collapsedItems.length : index;
          const isLastInFull = actualIndex === breadcrumbs.length - 1;
          
          return (
            <React.Fragment key={item.id}>
              {/* Show ellipsis before this item if needed */}
              {showEllipsis && index === ellipsisIndex && (
                <li className="breadcrumbs-item breadcrumbs-item--ellipsis">
                  <button
                    type="button"
                    className="breadcrumbs-ellipsis"
                    onClick={handleEllipsisClick}
                    aria-label={`Show ${collapsedItems.length} hidden breadcrumb items: ${collapsedItems.map(c => c.title).join(', ')}`}
                    title={collapsedItems.map(c => c.number ? `${c.number} ${c.title}` : c.title).join(' > ')}
                  >
                    ...
                  </button>
                  <span className="breadcrumbs-separator" aria-hidden="true">
                    /
                  </span>
                </li>
              )}
              <li className="breadcrumbs-item">
                {isNonNavigableContentCrumb(item) ? (
                  <span
                    className={`breadcrumbs-link ${isLastInFull ? 'breadcrumbs-link--current' : ''}`}
                    aria-current={isLastInFull ? 'page' : undefined}
                  >
                    <span className="breadcrumbs-title">{item.title}</span>
                  </span>
                ) : (
                  <Link
                    href={item.path}
                    className={`breadcrumbs-link ${isLastInFull ? 'breadcrumbs-link--current' : ''}`}
                    onClick={() => handleClick(item)}
                    aria-label={`Navigate to ${item.title}`}
                    aria-current={isLastInFull ? 'page' : undefined}
                  >
                    <span className="breadcrumbs-title">{item.title}</span>
                  </Link>
                )}
                {!isLast && (
                  <span className="breadcrumbs-separator" aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
