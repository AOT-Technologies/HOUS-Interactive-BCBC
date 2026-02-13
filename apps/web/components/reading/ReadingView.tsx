/**
 * ReadingView Container Component
 * 
 * Top-level container that manages content loading, URL synchronization, and state.
 * Fetches section JSON and renders content using type-driven recursive rendering.
 * 
 * URL Change Handling:
 * - Listens for changes to slug and version props (updated by Next.js router)
 * - Automatically fetches new content when URL changes
 * - Supports browser back/forward navigation
 * - Updates content without full page reload
 */

'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReadingViewProps } from '@repo/data';
import type { Subsection, Article } from '@bc-building-code/bcbc-parser';
import { useSectionStore } from '../../lib/stores/section-store';
import { useNavigationStore, NavigationNode } from '../../stores/navigation-store';
import { parseContentPath } from '../../lib/url-utils';
import { SectionRenderer } from './SectionRenderer';
import { ReadingViewHeader } from './ReadingViewHeader';
import { PartRenderer } from './PartRenderer';
import { SubsectionBlock } from './SubsectionBlock';
import { ArticleBlock } from './ArticleBlock';
import './ReadingView.css';

export const ReadingView: React.FC<ReadingViewProps> = ({
  slug: initialSlug,
  version: initialVersion,
}) => {
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  
  // Extract version and date from URL query parameters
  const urlVersion = searchParams.get('version');
  const urlDate = searchParams.get('date');
  
  // Use version from URL, fallback to props, then default to '2024'
  const version = urlVersion || initialVersion || '2024';
  
  // Use date from URL, or undefined to show latest
  const effectiveDate = urlDate || undefined;
  
  const {
    currentSection,
    loading,
    error,
    fetchSection,
    clearError,
  } = useSectionStore();

  const {
    navigationTree,
    currentVersion,
    currentPath: navigationCurrentPath,
    setCurrentPath,
  } = useNavigationStore();

  const getSlugFromPath = (path: string): string[] | null => {
    const params = parseContentPath(path);
    if (!params) return null;

    const nextSlug = [
      params.division,
      params.part,
      params.section,
      params.subsection,
      params.article,
    ].filter(Boolean) as string[];

    return nextSlug.length > 0 ? nextSlug : null;
  };

  const liveSlug = useMemo(
    () => (navigationCurrentPath ? getSlugFromPath(navigationCurrentPath) : null),
    [navigationCurrentPath]
  );

  const slug = liveSlug || initialSlug;
  const isPartLevel = slug.length === 2;
  const isSectionLevelOrDeeper = slug.length >= 3;

  // Create stable slug key for useEffect dependencies
  const slugKey = slug.join('/');
  const normalizedPathname = pathname.replace(/\/$/, '');

  const findNodeByPath = (nodes: NavigationNode[], path: string): NavigationNode | null => {
    for (const node of nodes) {
      const normalizedNodePath = node.path.replace(/\/$/, '');
      if (normalizedNodePath === path) {
        return node;
      }

      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }

    return null;
  };

  const currentPartNode = isPartLevel
    ? findNodeByPath(navigationTree, normalizedPathname)
    : null;

  const getSubtreeForSlug = (
    section: NonNullable<typeof currentSection>,
    path: string[]
  ): { mode: 'section' | 'subsection' | 'article'; subsection?: Subsection; article?: Article } => {
    // /code/{division}/{part}/{section}
    if (path.length === 3) {
      return { mode: 'section' };
    }

    const subsectionNumber = path[3];
    const subsection = section.subsections.find((sub) => sub.number === subsectionNumber);

    // /code/{division}/{part}/{section}/{subsection}
    if (path.length === 4) {
      return { mode: 'subsection', subsection };
    }

    // /code/{division}/{part}/{section}/{subsection}/{article}
    const articleNumber = path[4];
    const article = subsection?.articles.find((art) => art.number === articleNumber);
    return { mode: 'article', subsection, article };
  };

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
      if (useNavigationStore.getState().currentPath !== normalizedPathname) {
        setCurrentPath(normalizedPathname, false);
      }
      
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
  }, [pathname, version, setCurrentPath]);

  // Keep reading view in sync with browser back/forward while staying on /code.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPopState = () => {
      const nextPath = window.location.pathname.replace(/\/$/, '');
      if (useNavigationStore.getState().currentPath !== nextPath) {
        setCurrentPath(nextPath, false);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setCurrentPath]);

  // Fetch content when slug or version changes
  useEffect(() => {
    if (!isSectionLevelOrDeeper) {
      return;
    }

    const loadContent = async () => {
      try {
        await fetchSection(version, slug);
      } catch (err) {
        console.error('Failed to load content:', err);
      }
    };

    loadContent();
  }, [slugKey, version, fetchSection, isSectionLevelOrDeeper]);

  // Scroll to top when navigation occurs
  useEffect(() => {
    if (contentContainerRef.current && (currentSection || isPartLevel)) {
      contentContainerRef.current.scrollTop = 0;
    }
  }, [slugKey, currentSection, isPartLevel]);

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

  if (isPartLevel) {
    // Navigation tree is still loading for this version
    if ((navigationTree.length === 0 && currentVersion !== version) || (navigationTree.length === 0 && !currentPartNode)) {
      return (
        <div className="reading-view">
          <div className="reading-view__loading">
            <p>Loading content...</p>
          </div>
        </div>
      );
    }

    if (!currentPartNode || currentPartNode.type !== 'part') {
      return (
        <div className="reading-view">
          <div className="reading-view__error">
            <h2>Unable to Load Content</h2>
            <p>Part content is not available for this URL.</p>
            <div className="reading-view__error-actions">
              <a href="/" className="reading-view__error-link">
                Return to Homepage
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="reading-view" ref={contentContainerRef}>
        <ReadingViewHeader />

        <div className="reading-view__content">
          <PartRenderer
            part={currentPartNode}
            queryString={queryString}
          />
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
                fetchSection(version, slug);
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
  if (!currentSection) {
    return (
      <div className="reading-view">
        <div className="reading-view__loading">
          <p>No content available</p>
        </div>
      </div>
    );
  }

  const subtree = getSubtreeForSlug(currentSection, slug);

  if (subtree.mode === 'subsection' && !subtree.subsection) {
    return (
      <div className="reading-view">
        <div className="reading-view__error">
          <h2>Unable to Load Content</h2>
          <p>Subsection content is not available for this URL.</p>
        </div>
      </div>
    );
  }

  if (subtree.mode === 'article' && (!subtree.subsection || !subtree.article)) {
    return (
      <div className="reading-view">
        <div className="reading-view__error">
          <h2>Unable to Load Content</h2>
          <p>Article content is not available for this URL.</p>
        </div>
      </div>
    );
  }

  // Render content
  return (
    <div className="reading-view" ref={contentContainerRef}>
      <ReadingViewHeader />
      
      <div className="reading-view__content">
        {subtree.mode === 'section' && (
          <SectionRenderer
            section={currentSection}
            effectiveDate={effectiveDate}
            interactive={true}
          />
        )}
        {subtree.mode === 'subsection' && subtree.subsection && (
          <div className="sectionRenderer">
            <SubsectionBlock
              subsection={subtree.subsection}
              effectiveDate={effectiveDate}
              interactive={true}
            />
          </div>
        )}
        {subtree.mode === 'article' && subtree.article && (
          <div className="sectionRenderer">
            <ArticleBlock
              article={subtree.article}
              effectiveDate={effectiveDate}
              interactive={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};
