/**
 * GlossaryTerm Component
 *
 * Inline component for glossary terms with hover tooltip and click interaction.
 * - Renders term in italic font style with blue color #1A5A96
 * - Displays info icon (ⓘ) before term in interactive mode
 * - Supports interactive (full reading view) and non-interactive (modal preview) modes
 * - Desktop: shows tooltip on hover after 200ms delay
 * - All devices: opens glossary sidebar on click
 *
 * Requirements: 11.1, 11.2, 11.3, 11.8, 11.17
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Icon from '@repo/ui/icon';
import type { GlossaryTermProps } from '@repo/data';
import { useGlossaryStore } from '../../stores/glossary-store';
import { useUIStore } from '../../lib/stores/ui-store';
import './GlossaryTerm.css';

export const GlossaryTerm: React.FC<GlossaryTermProps> = ({
  termId,
  text,
  interactive = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const termRef = useRef<HTMLSpanElement>(null);

  const getTerm = useGlossaryStore((s) => s.getTerm);
  const loadGlossary = useGlossaryStore((s) => s.loadGlossary);
  const glossaryMap = useGlossaryStore((s) => s.glossaryMap);

  const openGlossarySidebar = useUIStore((s) => s.openGlossarySidebar);

  // Ensure glossary data is loaded
  useEffect(() => {
    if (interactive && glossaryMap.size === 0) {
      loadGlossary();
    }
  }, [interactive, glossaryMap.size, loadGlossary]);

  const definition = getTerm(termId);

  const handleMouseEnter = useCallback(() => {
    if (!interactive || !definition) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 200);
  }, [interactive, definition]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!interactive) return;
    // Close tooltip if open
    setShowTooltip(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    openGlossarySidebar(termId);
  }, [interactive, termId, openGlossarySidebar]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!interactive) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [interactive, handleClick]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Non-interactive mode: plain italic text, no icon, no interactions
  if (!interactive) {
    return (
      <span className="glossary-term glossary-term--non-interactive">
        {text}
      </span>
    );
  }

  return (
    <span
      ref={termRef}
      className="glossary-term glossary-term--interactive"
      role="button"
      tabIndex={0}
      aria-label={`Glossary term: ${text}${definition ? `. ${definition.definition}` : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span className="glossary-term__icon" aria-hidden="true">
        <Icon type="info" style={{ color: '#1A5A96' }} />
      </span>
      {text}
      {showTooltip && definition && (
        <span className="glossary-tooltip" role="tooltip">
          <span className="glossary-tooltip__term">{definition.term}</span>
          <span className="glossary-tooltip__definition">
            {definition.definition}
          </span>
        </span>
      )}
    </span>
  );
};
