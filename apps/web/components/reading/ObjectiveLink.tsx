/**
 * ObjectiveLink - Displays a clickable objective or sub-objective reference
 * 
 * Shows the objective key (e.g., "OS1.2") in a compact format
 * with tooltip on hover showing the title and definition.
 * 
 * Designed to match the visual style of the printed BC Building Code tables.
 */

'use client';

import React, { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useObjectives } from '../../hooks/useObjectives';
import { GlossaryTerm } from './GlossaryTerm';
import './ObjectiveLink.css';

export interface ObjectiveLinkProps {
  objectiveId: string;
  displayText?: string;
  interactive?: boolean;
}

const GLOSSARY_SECOND_WORD_STOPWORDS = new Set([
  'shall',
  'must',
  'may',
  'can',
  'will',
  'is',
  'are',
  'was',
  'were',
  'be',
  'being',
  'been',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'to',
  'of',
  'and',
  'or',
  'in',
  'on',
  'by',
  'with',
  'for',
  'from',
  'that',
  'this',
  'these',
  'those',
  'as',
]);

const parseGlossaryMarkerPayload = (payload: string): { termId: string; label?: string } => {
  const firstColon = payload.indexOf(':');

  if (firstColon === -1) {
    return { termId: payload.trim() };
  }

  const termId = payload.slice(0, firstColon).trim();
  const label = payload.slice(firstColon + 1).trim();

  return {
    termId,
    label: label.length > 0 ? label : undefined,
  };
};

const parseDefinitionWithGlossary = (text: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const glossaryRegex = /\[REF:term:([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = glossaryRegex.exec(text)) !== null) {
    const marker = parseGlossaryMarkerPayload(match[1]);
    const termId = marker.termId;
    const matchStart = match.index;
    const matchEnd = glossaryRegex.lastIndex;

    if (matchStart > lastIndex) {
      nodes.push(text.substring(lastIndex, matchStart));
    }

    const remaining = text.slice(matchEnd);
    const immediateTermMatch = remaining.match(
      /^([A-Za-z][A-Za-z0-9'./-]*)(?:\s+([A-Za-z][A-Za-z0-9'./-]*))?/
    );

    let displayText = marker.label || termId.replace(/-/g, ' ');
    let consumed = 0;

    if (!marker.label && immediateTermMatch) {
      const firstWord = immediateTermMatch[1];
      const secondWord = immediateTermMatch[2];

      if (secondWord && !GLOSSARY_SECOND_WORD_STOPWORDS.has(secondWord.toLowerCase())) {
        displayText = `${firstWord} ${secondWord}`;
        consumed = firstWord.length + 1 + secondWord.length;
      } else {
        displayText = firstWord;
        consumed = firstWord.length;
      }
    }

    nodes.push(
      <GlossaryTerm
        key={`objective-tooltip-glossary-${matchStart}`}
        termId={termId}
        text={displayText}
        interactive={false}
      />
    );

    lastIndex = matchEnd + consumed;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  if (nodes.length === 0) {
    nodes.push(text);
  }

  return nodes;
};

export const ObjectiveLink: React.FC<ObjectiveLinkProps> = ({
  objectiveId,
  displayText,
  interactive = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [tooltipPlacement, setTooltipPlacement] = useState<'top' | 'bottom'>('top');
  const linkRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const { getObjective } = useObjectives();
  
  const objective = getObjective(objectiveId);
  
  // Format the display text to match the printed format (e.g., "OS1.2" not "NBC-OBJ-OS1.2")
  const formattedText = displayText || (objective?.key || objectiveId.toUpperCase().replace('NBC-OBJ-', ''));
  
  const handleMouseEnter = () => {
    setShowTooltip(true);
  };
  
  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const updateTooltipPosition = useCallback(() => {
    if (!showTooltip || !linkRef.current || !tooltipRef.current) return;

    const spacing = 8;
    const viewportPadding = 8;
    const linkRect = linkRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let left = linkRect.left + linkRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding)
    );

    const topPlacement = linkRect.top - tooltipRect.height - spacing;
    if (topPlacement >= viewportPadding) {
      setTooltipPlacement('top');
      setTooltipPosition({ top: topPlacement, left });
      return;
    }

    const bottomPlacement = linkRect.bottom + spacing;
    setTooltipPlacement('bottom');
    setTooltipPosition({ top: bottomPlacement, left });
  }, [showTooltip]);

  useLayoutEffect(() => {
    if (!showTooltip) return;
    updateTooltipPosition();
  }, [showTooltip, updateTooltipPosition]);

  useEffect(() => {
    if (!showTooltip) return;

    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [showTooltip, updateTooltipPosition]);

  // If objective not found or not interactive, render as plain text
  if (!objective || !interactive) {
    return <span className="objective-ref">{formattedText}</span>;
  }
  
  return (
    <span
      ref={linkRef}
      className="objective-link"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`Objective ${objective.key}: ${objective.title}`}
    >
      <span className="objective-link__text">
        {formattedText}
      </span>
      
      {showTooltip && typeof document !== 'undefined' &&
        createPortal(
          <span
            ref={tooltipRef}
            className={`objective-link__tooltip objective-link__tooltip--portal objective-link__tooltip--${tooltipPlacement}`}
            role="tooltip"
            style={{ top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px` }}
          >
            <span className="objective-link__tooltip-title">
              {objective.title} ({objective.key})
            </span>
            <span className="objective-link__tooltip-definition">
              {parseDefinitionWithGlossary(objective.definition)}
            </span>
            {objective.source === 'bc' && (
              <span className="objective-link__tooltip-badge">BC</span>
            )}
          </span>,
          document.body
        )}
    </span>
  );
};
