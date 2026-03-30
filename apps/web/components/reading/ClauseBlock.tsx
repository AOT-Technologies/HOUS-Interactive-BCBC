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
import type { Clause, StructuredList } from '@bc-building-code/bcbc-parser';
import { filterClause } from '@bc-building-code/bcbc-parser';
import { ContentRenderer } from './ContentRenderer';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import './ClauseBlock.css';

export interface ClauseBlockProps {
  clause: Clause;
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

export const ClauseBlock: React.FC<ClauseBlockProps> = ({ 
  clause, 
  effectiveDate,
  interactive = true,
  parentHasBcSource = false,
  renderContext,
}) => {
  const filteredClause = effectiveDate ? filterClause(clause, effectiveDate) : clause;
  if (!filteredClause) return null;

  const clauseEquations = (filteredClause as { equations?: Array<{ id: string; type?: string; latex?: string; plainText?: string; mathml?: string; image?: string; imageSrc?: string }> }).equations || [];
  const clauseLists = (filteredClause as Clause & { lists?: StructuredList[] }).lists || [];
  const clauseSeeAlso = resolveSeeAlsoText(
    (filteredClause as Clause & { see_also?: string | Array<{ content?: string }> }).see_also
  );

  return (
    <div className="clauseBlock" id={filteredClause.id}>
      <span className="clauseNumber">{filteredClause.number})</span>
      <div className="clauseContent">
        <div className="clauseText">
          {parseTextWithMarkers(
            filteredClause.text,
            filteredClause.glossaryTerms || [],
            interactive,
            clauseEquations,
            clauseLists,
            renderContext
          )}
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
                renderContext={renderContext}
              />
            ))}
          </div>
        )}

        {clauseSeeAlso ? (
          <div className="clauseSeeAlso">
            {parseTextWithMarkers(clauseSeeAlso, [], interactive, [], [], renderContext)}
          </div>
        ) : null}
      </div>
    </div>
  );
};
