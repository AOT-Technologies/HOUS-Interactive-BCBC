/**
 * ReadingView Container Component
 * 
 * Top-level container that manages content loading, URL synchronization, and state.
 * Fetches section JSON, extracts subtree based on URL depth, and renders content.
 * 
 * URL Change Handling:
 * - Listens for changes to slug and version props (updated by Next.js router)
 * - Automatically fetches new content when URL changes
 * - Supports browser back/forward navigation
 * - Updates content without full page reload
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReadingViewProps } from '@repo/data';
import { useContentStore } from '../../lib/stores/content-store';
import { useNavigationStore, NavigationNode } from '../../stores/navigation-store';
import { transformNavigationUrlToFileSystem, isNavigationFormat } from '../../lib/url-adapter';
import { ContentRenderer } from './ContentRenderer';
import { ReadingViewHeader } from './ReadingViewHeader';
import './ReadingView.css';

export const ReadingView: React.FC<ReadingViewProps> = ({
  slug: initialSlug,
  version: initialVersion,
  // effectiveDate: initialDate, // TODO: Implement effective date filtering
  // modalRef: initialModalRef, // TODO: Implement modal handling
}) => {
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Extract version from URL query parameters if available
  const urlVersion = searchParams.get('version');
  
  // Use version from URL, fallback to props, then default to '2024'
  const version = urlVersion || initialVersion || '2024';
  // const effectiveDate = initialDate; // TODO: Implement effective date filtering
  // const modalRef = initialModalRef; // TODO: Implement modal handling
  
  // Transform URL if it's in navigation format (nbc.divA/1/4)
  const slug = isNavigationFormat(initialSlug) 
    ? transformNavigationUrlToFileSystem(initialSlug)
    : initialSlug;
  
  const {
    currentContent,
    loading,
    error,
    fetchContent,
    extractSubtree,
    clearError,
  } = useContentStore();

  // Create stable slug key for useEffect dependencies
  const slugKey = slug.join('/');

  // Sync navigation state from URL on mount and when path changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initializeNavigation = async () => {
      const navStore = useNavigationStore.getState();
      
      // Ensure navigation tree is loaded for the current version
      if (navStore.navigationTree.length === 0 || navStore.currentVersion !== version) {
        await navStore.loadNavigationTree(version);
      }
      
      const { navigationTree, setCurrentPath, expandToNode } = useNavigationStore.getState();
      
      // Set current path from the URL pathname (without updating URL back)
      // Normalize by stripping trailing slash to match node.path format
      const normalizedPathname = pathname.replace(/\/$/, '');
      setCurrentPath(normalizedPathname, false);
      
      // Find the node whose path matches the current URL pathname
      const findNodeIdByPath = (nodes: NavigationNode[]): string | null => {
        for (const node of nodes) {
          const normalizedNodePath = node.path.replace(/\/$/, '');
          if (normalizedNodePath === normalizedPathname) {
            return node.id;
          }
          if (node.children) {
            const found = findNodeIdByPath(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const nodeId = findNodeIdByPath(navigationTree);
      if (nodeId) {
        expandToNode(nodeId);
      }
    };
    
    initializeNavigation();
  }, [pathname, slugKey, version]); // Re-run when pathname, slug, or version changes

  // Fetch content when slug or version changes
  // This effect handles URL changes including browser back/forward navigation
  useEffect(() => {
    const loadContent = async () => {
      try {
        // Fetch section-level content
        await fetchContent(version, slug);
      } catch (err) {
        console.error('Failed to load content:', err);
      }
    };

    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey, version]); // Use slugKey for stable comparison, fetchContent is stable from Zustand

  // Listen for URL changes (pathname)
  // This ensures content updates when navigating via browser controls
  useEffect(() => {
    // URL has changed, content will be reloaded by the effect above
    // This effect is primarily for logging and debugging
    console.log('URL changed:', pathname);
  }, [pathname]);

  // Scroll to top when navigation occurs
  useEffect(() => {
    if (contentContainerRef.current && currentContent) {
      contentContainerRef.current.scrollTop = 0;
    }
  }, [slugKey, currentContent]); // Use slugKey for stable comparison

  // Extract subtree based on URL depth
  const renderData = React.useMemo(() => {
    if (!currentContent) return null;

    try {
      // Check if currentContent is a SectionContent (has subsections)
      if ('subsections' in currentContent) {
        return extractSubtree(currentContent, slug);
      }
      
      // If it's already a subsection or article, render it directly
      if ('articles' in currentContent) {
        return {
          content: currentContent,
          renderLevel: 'subsection' as const,
          context: null,
        };
      }
      
      if ('clauses' in currentContent) {
        return {
          content: currentContent,
          renderLevel: 'article' as const,
          context: null,
        };
      }
    } catch (err) {
      console.error('Failed to extract subtree:', err);
      return null;
    }

    return null;
  }, [currentContent, slug, extractSubtree]);

  // Loading state
  if (loading) {
    return (
      <div className="reading-view">
        <div className="reading-view__loading">
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="reading-view">
        <div className="reading-view__error">
          <h2>Unable to Load Content</h2>
          <p>{error}</p>
          <div className="reading-view__error-actions">
            <button
              onClick={() => {
                clearError();
                fetchContent(version, slug);
              }}
              className="reading-view__error-button"
            >
              Try Again
            </button>
            <a href="/" className="reading-view__error-link">
              Return to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  // No content state
  if (!renderData) {
    return (
      <div className="reading-view">
        <div className="reading-view__loading">
          <p>No content available</p>
        </div>
      </div>
    );
  }

  // Render content
  return (
    <div className="reading-view" ref={contentContainerRef}>
      <ReadingViewHeader />
      
      <div className="reading-view__content">
        <ContentRenderer
          content={renderData.content}
          renderLevel={renderData.renderLevel}
          context={renderData.context ?? undefined}
          interactive={true}
        />
      </div>
    </div>
  );
};
