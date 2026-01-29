'use client';

import React, { useMemo, useEffect } from 'react';
import { Button } from '@repo/ui/button';
import { useNavigationStore, NavigationNode } from '@/stores/navigation-store';
import { TESTID_PREV_BUTTON, TESTID_NEXT_BUTTON } from '@repo/constants/src/testids';
import './PrevNextNav.css';

interface PrevNextNavProps {
  /**
   * Optional CSS class name for styling
   */
  className?: string;
  
  /**
   * Optional callback when previous button is clicked
   */
  onPrevClick?: (node: NavigationNode) => void;
  
  /**
   * Optional callback when next button is clicked
   */
  onNextClick?: (node: NavigationNode) => void;
}

/**
 * PrevNextNav Component
 * 
 * Provides Previous and Next navigation buttons for sequential browsing through
 * the building code structure at the current hierarchy level.
 * 
 * Features:
 * - Sequential navigation at current hierarchy level
 * - Disabled state at boundaries (first/last item)
 * - Keyboard shortcuts (arrow keys)
 * - Displays title of previous/next item
 * - Respects hierarchical order
 * 
 * Behavior by Level:
 * - Part Level: Previous/Next Part within Division
 * - Section Level: Previous/Next Section within Part
 * - Subsection Level: Previous/Next Subsection within Section
 * - Article Level: Previous/Next Article within Subsection
 * 
 * Requirements: 4.7, 10.1
 */
export function PrevNextNav({ className = '', onPrevClick, onNextClick }: PrevNextNavProps) {
  const { navigationTree, currentPath, setCurrentPath } = useNavigationStore();

  /**
   * Flatten the navigation tree to get all nodes in sequential order
   */
  const flattenedNodes = useMemo(() => {
    const nodes: NavigationNode[] = [];
    
    const flatten = (nodeList: NavigationNode[]) => {
      for (const node of nodeList) {
        nodes.push(node);
        if (node.children && node.children.length > 0) {
          flatten(node.children);
        }
      }
    };
    
    if (navigationTree && navigationTree.length > 0) {
      flatten(navigationTree);
    }
    
    return nodes;
  }, [navigationTree]);

  /**
   * Find current node and calculate previous/next nodes at the same hierarchy level
   */
  const { currentNode, prevNode, nextNode } = useMemo(() => {
    if (!currentPath || flattenedNodes.length === 0) {
      return { currentNode: null, prevNode: null, nextNode: null };
    }

    // Find current node
    const currentIndex = flattenedNodes.findIndex(node => node.path === currentPath);
    if (currentIndex === -1) {
      return { currentNode: null, prevNode: null, nextNode: null };
    }

    const current = flattenedNodes[currentIndex];
    
    // Find previous node at the same hierarchy level
    let prev: NavigationNode | null = null;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (flattenedNodes[i].type === current.type) {
        // Check if they share the same parent by comparing path structure
        const currentPathParts = current.path.split('/').slice(0, -1);
        const candidatePathParts = flattenedNodes[i].path.split('/').slice(0, -1);
        
        if (currentPathParts.join('/') === candidatePathParts.join('/')) {
          prev = flattenedNodes[i];
          break;
        }
      }
    }

    // Find next node at the same hierarchy level
    let next: NavigationNode | null = null;
    for (let i = currentIndex + 1; i < flattenedNodes.length; i++) {
      if (flattenedNodes[i].type === current.type) {
        // Check if they share the same parent by comparing path structure
        const currentPathParts = current.path.split('/').slice(0, -1);
        const candidatePathParts = flattenedNodes[i].path.split('/').slice(0, -1);
        
        if (currentPathParts.join('/') === candidatePathParts.join('/')) {
          next = flattenedNodes[i];
          break;
        }
      }
    }

    return { currentNode: current, prevNode: prev, nextNode: next };
  }, [currentPath, flattenedNodes]);

  /**
   * Handle previous button click
   */
  const handlePrevClick = () => {
    if (prevNode) {
      setCurrentPath(prevNode.path);
      if (onPrevClick) {
        onPrevClick(prevNode);
      }
    }
  };

  /**
   * Handle next button click
   */
  const handleNextClick = () => {
    if (nextNode) {
      setCurrentPath(nextNode.path);
      if (onNextClick) {
        onNextClick(nextNode);
      }
    }
  };

  /**
   * Keyboard shortcuts for arrow key navigation
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if not in an input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Alt + Left Arrow for previous
      if (event.altKey && event.key === 'ArrowLeft' && prevNode) {
        event.preventDefault();
        handlePrevClick();
      }
      
      // Alt + Right Arrow for next
      if (event.altKey && event.key === 'ArrowRight' && nextNode) {
        event.preventDefault();
        handleNextClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevNode, nextNode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if no navigation tree or current path
  if (!currentNode) {
    return null;
  }

  return (
    <nav
      className={`prev-next-nav ${className}`}
      aria-label="Sequential navigation"
    >
      <Button
        variant="secondary"
        onClick={handlePrevClick}
        disabled={!prevNode}
        className="prev-next-nav__button prev-next-nav__button--prev"
        data-testid={TESTID_PREV_BUTTON}
        aria-label={prevNode ? `Previous: ${prevNode.title}` : 'No previous item'}
      >
        <span className="prev-next-nav__arrow" aria-hidden="true">←</span>
        <span className="prev-next-nav__content">
          <span className="prev-next-nav__label">Previous</span>
          {prevNode && (
            <span className="prev-next-nav__title">
              {prevNode.number} {prevNode.title}
            </span>
          )}
        </span>
      </Button>

      <Button
        variant="secondary"
        onClick={handleNextClick}
        disabled={!nextNode}
        className="prev-next-nav__button prev-next-nav__button--next"
        data-testid={TESTID_NEXT_BUTTON}
        aria-label={nextNode ? `Next: ${nextNode.title}` : 'No next item'}
      >
        <span className="prev-next-nav__content">
          <span className="prev-next-nav__label">Next</span>
          {nextNode && (
            <span className="prev-next-nav__title">
              {nextNode.number} {nextNode.title}
            </span>
          )}
        </span>
        <span className="prev-next-nav__arrow" aria-hidden="true">→</span>
      </Button>
    </nav>
  );
}
