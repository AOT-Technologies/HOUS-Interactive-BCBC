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
import './SubclauseBlock.css';

export interface SubclauseBlockProps {
  subclause: Subclause;
  effectiveDate?: string;
  interactive?: boolean;
}

/**
 * Parse text with glossary term markers
 * Format: "text [REF:term:termId]term text[/REF] more text"
 */
function parseTextWithGlossary(text: string, _glossaryTerms: string[]): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  
  // Simple implementation for now - just render text
  // TODO: Implement proper parsing of [REF:term:...] markers in future task
  nodes.push(text);
  
  return nodes;
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
          {parseTextWithGlossary(filteredSubclause.text, filteredSubclause.glossaryTerms)}
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
