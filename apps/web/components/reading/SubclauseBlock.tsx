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
import type { Subclause } from '@bc-building-code/bcbc-parser';
import { filterSubclause } from '@bc-building-code/bcbc-parser';
import { ContentRenderer } from './ContentRenderer';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './SubclauseBlock.css';

export interface SubclauseBlockProps {
  subclause: Subclause;
  effectiveDate?: string;
  interactive?: boolean;
  parentHasBcSource?: boolean;
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
}) => {
  // Apply effective date filtering if date is provided
  const filteredSubclause = effectiveDate 
    ? filterSubclause(subclause, effectiveDate)
    : subclause;
  
  // If subclause is deleted on this date, don't render
  if (!filteredSubclause) {
    return null;
  }
  
  return (
    <div className="subclauseBlock">
      <span className="subclauseNumber">{formatSubclauseNumber(filteredSubclause.number)})</span>
      <div className="subclauseContent">
        <p className="subclauseText">
          {parseTextWithMarkers(filteredSubclause.text, filteredSubclause.glossaryTerms, interactive)}
        </p>
        
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
