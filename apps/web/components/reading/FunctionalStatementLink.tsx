/**
 * FunctionalStatementLink - Displays a clickable functional statement reference
 * 
 * Shows the functional statement key (e.g., "F03") in a compact format
 * with tooltip on hover showing the full definition.
 * 
 * Designed to match the visual style of the printed BC Building Code tables.
 */

'use client';

import React, { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFunctionalStatements } from '../../hooks/useFunctionalStatements';
import './FunctionalStatementLink.css';

export interface FunctionalStatementLinkProps {
  statementId: string;
  displayText?: string;
  interactive?: boolean;
}

export const FunctionalStatementLink: React.FC<FunctionalStatementLinkProps> = ({
  statementId,
  displayText,
  interactive = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [tooltipPlacement, setTooltipPlacement] = useState<'top' | 'bottom'>('top');
  const linkRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const { getStatement } = useFunctionalStatements();
  
  const statement = getStatement(statementId);
  
  // Format the display text to match the printed format (e.g., "F03" not "FS03")
  const formattedText = displayText || (statement?.key || statementId.toUpperCase().replace('FS', ''));
  
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

  // If statement not found or not interactive, render as plain text
  if (!statement || !interactive) {
    return <span className="functional-statement-ref">{formattedText}</span>;
  }
  
  return (
    <span
      ref={linkRef}
      className="functional-statement-link"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`Functional Statement ${statement.key}: ${statement.definition}`}
    >
      <span className="functional-statement-link__text">
        {formattedText}
      </span>
      
      {showTooltip && typeof document !== 'undefined' &&
        createPortal(
          <span
            ref={tooltipRef}
            className={`functional-statement-link__tooltip functional-statement-link__tooltip--portal functional-statement-link__tooltip--${tooltipPlacement}`}
            role="tooltip"
            style={{ top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px` }}
          >
            <span className="functional-statement-link__tooltip-title">
              Functional Statement {statement.key}
            </span>
            <span className="functional-statement-link__tooltip-definition">
              {statement.definition}
            </span>
            {statement.source === 'bc' && (
              <span className="functional-statement-link__tooltip-badge">BC</span>
            )}
          </span>,
          document.body
        )}
    </span>
  );
};
