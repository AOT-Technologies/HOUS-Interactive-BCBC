/**
 * SentenceBlock - Renders a sentence with its nested content
 * 
 * Sentences contain:
 * - Text with glossary term markers
 * - Optional nested clauses, tables, figures, equations
 * 
 * Supports effective date filtering to show correct revision
 */

import React from 'react';
import type { Sentence } from '@bc-building-code/bcbc-parser';
import { filterSentence } from '@bc-building-code/bcbc-parser';
import { ContentRenderer } from './ContentRenderer';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './SentenceBlock.css';

export interface SentenceBlockProps {
  sentence: Sentence;
  effectiveDate?: string;
  interactive?: boolean;
  parentHasBcSource?: boolean;
}

export const SentenceBlock: React.FC<SentenceBlockProps> = ({ 
  sentence, 
  effectiveDate,
  interactive = true,
  parentHasBcSource = false,
}) => {
  const filteredSentence = effectiveDate ? filterSentence(sentence, effectiveDate) : sentence;
  if (!filteredSentence) return null;

  const sentenceEquations = (filteredSentence as { equations?: Array<{ id: string; type?: string; latex?: string; plainText?: string; mathml?: string; image?: string; imageSrc?: string }> }).equations || [];

  return (
    <div className="sentenceBlock">
      <span className="sentenceNumber">{filteredSentence.number})</span>
      <div className="sentenceContent">
        <div className="sentenceText">
          {parseTextWithMarkers(filteredSentence.text, filteredSentence.glossaryTerms || [], interactive, sentenceEquations)}
        </div>
        
        {/* Render nested content (clauses, tables, figures, equations) */}
        {filteredSentence.content && filteredSentence.content.length > 0 && (
          <div className="sentenceNestedContent">
            {filteredSentence.content.map((item, index) => (
              <ContentRenderer 
                key={`${filteredSentence.id}-content-${index}`}
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
