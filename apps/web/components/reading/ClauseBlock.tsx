/**
 * ClauseBlock - Renders a clause with its nested content
 * 
 * Clauses contain:
 * - Text with glossary term markers
 * - Optional nested subclauses, tables, figures, equations
 * 
 * Supports effective date filtering to show correct revision
 */

import React from 'react';
import type { Clause } from '@bc-building-code/bcbc-parser';
import { filterClause } from '@bc-building-code/bcbc-parser';
import { ContentRenderer } from './ContentRenderer';
import './ClauseBlock.css';

export interface ClauseBlockProps {
  clause: Clause;
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

export const ClauseBlock: React.FC<ClauseBlockProps> = ({ 
  clause, 
  effectiveDate,
  interactive = true 
}) => {
  // Apply effective date filtering if date is provided
  const filteredClause = effectiveDate 
    ? filterClause(clause, effectiveDate)
    : clause;
  
  // If clause is deleted on this date, don't render
  if (!filteredClause) {
    return null;
  }
  
  return (
    <div className="clauseBlock">
      <span className="clauseNumber">{filteredClause.number})</span>
      <div className="clauseContent">
        <p className="clauseText">
          {parseTextWithGlossary(filteredClause.text, filteredClause.glossaryTerms)}
        </p>
        
        {/* Render nested content (subclauses, tables, figures, equations) */}
        {filteredClause.content && filteredClause.content.length > 0 && (
          <div className="clauseNestedContent">
            {filteredClause.content.map((item, index) => (
              <ContentRenderer 
                key={`${filteredClause.id}-content-${index}`}
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
