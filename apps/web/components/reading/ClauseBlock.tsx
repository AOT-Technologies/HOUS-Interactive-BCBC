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
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './ClauseBlock.css';

export interface ClauseBlockProps {
  clause: Clause;
  effectiveDate?: string;
  interactive?: boolean;
  parentHasBcSource?: boolean;
}

export const ClauseBlock: React.FC<ClauseBlockProps> = ({ 
  clause, 
  effectiveDate,
  interactive = true,
  parentHasBcSource = false,
}) => {
  const filteredClause = effectiveDate ? filterClause(clause, effectiveDate) : clause;
  if (!filteredClause) return null;

  const clauseEquations = (filteredClause as { equations?: Array<{ id: string; type?: string; latex?: string; plainText?: string; mathml?: string; image?: string; imageSrc?: string }> }).equations || [];

  return (
    <div className="clauseBlock">
      <span className="clauseNumber">{filteredClause.number})</span>
      <div className="clauseContent">
        <div className="clauseText">
          {parseTextWithMarkers(filteredClause.text, filteredClause.glossaryTerms || [], interactive, clauseEquations)}
        </div>
        
        {/* Render nested content (subclauses, tables, figures, equations) */}
        {filteredClause.content && filteredClause.content.length > 0 && (
          <div className="clauseNestedContent">
            {filteredClause.content.map((item, index) => (
              <ContentRenderer 
                key={`${filteredClause.id}-content-${index}`}
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
