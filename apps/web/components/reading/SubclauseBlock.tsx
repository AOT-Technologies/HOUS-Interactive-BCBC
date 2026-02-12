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
}

export const SubclauseBlock: React.FC<SubclauseBlockProps> = ({ 
  subclause, 
  effectiveDate,
  interactive = true 
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
      <span className="subclauseNumber">{filteredSubclause.number})</span>
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
