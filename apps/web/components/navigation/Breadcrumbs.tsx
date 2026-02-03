'use client';

import React, { useMemo } from 'react';
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
export function Breadcrumbs({ className = '', onBreadcrumbClick }: BreadcrumbsProps) {
  const pathname = usePathname();
  const { navigationTree, currentPath } = useNavigationStore();

  /**
   * Build breadcrumb trail based on current page
   */
  const breadcrumbs = useMemo(() => {
    const trail: Array<{ id: string; title: string; path: string; number?: string }> = [];

    // Always start with Home
    trail.push({ id: 'home', title: 'Home', path: '/' });

    // Determine page type and build appropriate breadcrumbs
    if (pathname === '/') {
      // Homepage - only show Home (current page)
      return trail;
    } else if (pathname?.startsWith('/search')) {
      // Search Results Page
      trail.push({ id: 'search', title: 'Search Results', path: '/search' });
      return trail;
    } else if (pathname?.startsWith('/download')) {
      // Download Page
      trail.push({ id: 'download', title: 'Download', path: '/download' });
      return trail;
    } else if (pathname?.startsWith('/code') && currentPath && navigationTree && navigationTree.length > 0) {
      // Content Reading Page - build from navigation tree
      const findPath = (nodes: NavigationNode[], targetPath: string): boolean => {
        for (const node of nodes) {
          if (node.path === targetPath) {
            trail.push({ id: node.id, title: node.title, path: node.path, number: node.number });
            return true;
          }

          if (node.children && node.children.length > 0) {
            trail.push({ id: node.id, title: node.title, path: node.path, number: node.number });
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
    }

    // Default: just show Home
    return trail;
  }, [pathname, navigationTree, currentPath]);

  /**
   * Handle breadcrumb click
   */
  const handleClick = (item: typeof breadcrumbs[0], event: React.MouseEvent) => {
    event.preventDefault();
    
    if (onBreadcrumbClick) {
      onBreadcrumbClick(item);
    }
  };

  // Always render breadcrumbs (at minimum shows "Home")
  return (
    <nav
      className={`breadcrumbs ${className}`}
      data-testid={TESTID_BREADCRUMBS}
      aria-label="Breadcrumb navigation"
    >
      <ol className="breadcrumbs-list">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={item.id} className="breadcrumbs-item">
              <Link
                href={item.path}
                className={`breadcrumbs-link ${isLast ? 'breadcrumbs-link--current' : ''}`}
                onClick={(e) => handleClick(item, e as any)}
                aria-label={`Navigate to ${item.title}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.number && <span className="breadcrumbs-number">{item.number}</span>}
                <span className="breadcrumbs-title">{item.title}</span>
              </Link>
              {!isLast && (
                <span className="breadcrumbs-separator" aria-hidden="true">
                  &gt;
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
