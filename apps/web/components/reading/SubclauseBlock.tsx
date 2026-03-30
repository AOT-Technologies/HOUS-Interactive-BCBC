/**
 * SubclauseBlock - Renders a subclause with its nested content
 * 
 * Subclauses contain:
 * - Text with glossary term markers
 * - Optional tables, figures, equations
 * 
 * Supports effective date filtering to show correct revision
 */

import React from 'react';
import type { StructuredList, Subclause } from '@bc-building-code/bcbc-parser';
import { filterSubclause } from '@bc-building-code/bcbc-parser';
import { ContentRenderer } from './ContentRenderer';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import './SubclauseBlock.css';

export interface SubclauseBlockProps {
  subclause: Subclause;
  effectiveDate?: string;
  interactive?: boolean;
  parentHasBcSource?: boolean;
  renderContext?: ReferenceRenderContext;
}

function resolveSeeAlsoText(
  value: string | Array<{ content?: string }> | undefined
): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const joined = value
    .map((entry) => (entry && typeof entry.content === 'string' ? entry.content.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .trim();

  return joined || undefined;
}

const toLowerRoman = (value: number): string => {
  const romanMap: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];

  let remaining = value;
  let result = '';

  for (const [arabic, roman] of romanMap) {
    while (remaining >= arabic) {
      result += roman;
      remaining -= arabic;
    }
  }

  return result;
};

const formatSubclauseNumber = (value: string): string => {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const numericValue = Number.parseInt(trimmedValue, 10);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return trimmedValue;
  }

  return toLowerRoman(numericValue);
};

export const SubclauseBlock: React.FC<SubclauseBlockProps> = ({ 
  subclause, 
  effectiveDate,
  interactive = true,
  parentHasBcSource = false,
  renderContext,
}) => {
  const filteredSubclause = effectiveDate ? filterSubclause(subclause, effectiveDate) : subclause;
  if (!filteredSubclause) return null;

  const subclauseEquations = (filteredSubclause as { equations?: Array<{ id: string; type?: string; latex?: string; plainText?: string; mathml?: string; image?: string; imageSrc?: string }> }).equations || [];
  const subclauseLists = (filteredSubclause as Subclause & { lists?: StructuredList[] }).lists || [];
  const subclauseSeeAlso = resolveSeeAlsoText(
    (filteredSubclause as Subclause & { see_also?: string | Array<{ content?: string }> }).see_also
  );

  return (
    <div className="subclauseBlock" id={filteredSubclause.id}>
      <span className="subclauseNumber">{formatSubclauseNumber(filteredSubclause.number)})</span>
      <div className="subclauseContent">
        <div className="subclauseText">
          {parseTextWithMarkers(
            filteredSubclause.text,
            filteredSubclause.glossaryTerms || [],
            interactive,
            subclauseEquations,
            subclauseLists,
            renderContext
          )}
        </div>

        {/* Render nested content (tables, figures, equations) */}
        {filteredSubclause.content && filteredSubclause.content.length > 0 && (
          <div className="subclauseNestedContent">
            {filteredSubclause.content.map((item, index) => (
              <ContentRenderer 
                key={`${filteredSubclause.id}-content-${index}`}
                node={item}
                effectiveDate={effectiveDate}
                interactive={interactive}
                parentHasBcSource={parentHasBcSource}
                renderContext={renderContext}
              />
            ))}
          </div>
        )}

        {subclauseSeeAlso ? (
          <div className="subclauseSeeAlso">
            {parseTextWithMarkers(subclauseSeeAlso, [], interactive, [], [], renderContext)}
          </div>
        ) : null}
      </div>
    </div>
  );
};
