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

import React, { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReadingViewProps } from '@repo/data';
import { useSectionStore } from '../../lib/stores/section-store';
import { useNavigationStore, NavigationNode } from '../../stores/navigation-store';
import { SectionRenderer } from './SectionRenderer';
import { ReadingViewHeader } from './ReadingViewHeader';
import './ReadingView.css';

export const ReadingView: React.FC<ReadingViewProps> = ({
  slug: initialSlug,
  version: initialVersion,
}) => {
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Extract version and date from URL query parameters
  const urlVersion = searchParams.get('version');
  const urlDate = searchParams.get('date');
  
  // Use version from URL, fallback to props, then default to '2024'
  const version = urlVersion || initialVersion || '2024';
  
  // Use date from URL, or undefined to show latest
  const effectiveDate = urlDate || undefined;
  
  // URL is always in navigation format now (nbc.divA/1/1)
  const slug = initialSlug;
  
  const {
    currentSection,
    loading,
    error,
    fetchSection,
    clearError,
  } = useSectionStore();

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
  }, [pathname, slugKey, version]);

  // Fetch content when slug or version changes
  useEffect(() => {
    const loadContent = async () => {
      try {
        await fetchSection(version, slug);
      } catch (err) {
        console.error('Failed to load content:', err);
      }
    };

    loadContent();
  }, [slugKey, version, fetchSection]);

  // Scroll to top when navigation occurs
  useEffect(() => {
    if (contentContainerRef.current && currentSection) {
      contentContainerRef.current.scrollTop = 0;
    }
  }, [slugKey, currentSection]);

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

  // Render content
  return (
    <div className="reading-view" ref={contentContainerRef}>
      <ReadingViewHeader />
      
      <div className="reading-view__content">
        <SectionRenderer
          section={currentSection}
          effectiveDate={effectiveDate}
          interactive={true}
        />
      </div>
    </div>
  );
};
