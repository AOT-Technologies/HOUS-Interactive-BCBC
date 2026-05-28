/**
 * SentenceBlock - Renders a sentence with its nested content
 * 
 * Sentences contain:
 * - Text with glossary term markers
 * - Optional definitions list (for "Defined Terms" articles)
 * - Optional nested clauses, tables, figures, equations
 * 
 * Supports effective date filtering to show correct revision
 */

import React from 'react';
import type { Organization, Sentence, StructuredList } from '@bc-building-code/bcbc-parser';
import { filterSentence } from '@bc-building-code/bcbc-parser';
import { ContentRenderer } from './ContentRenderer';
import { DefinitionsList } from './DefinitionsList';
import { ObjectivesList } from './ObjectivesList';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import './SentenceBlock.css';

export interface SentenceBlockProps {
  sentence: Sentence;
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

export const SentenceBlock: React.FC<SentenceBlockProps> = ({
  sentence,
  effectiveDate,
  interactive = true,
  parentHasBcSource = false,
  renderContext,
}) => {
  const filteredSentence = effectiveDate ? filterSentence(sentence, effectiveDate) : sentence;
  if (!filteredSentence) return null;

  const sentenceOrganizations =
    (filteredSentence as Sentence & { organizations?: Organization[] }).organizations || [];
  const sentenceEquations = (filteredSentence as { equations?: Array<{ id: string; type?: string; latex?: string; plainText?: string; mathml?: string; image?: string; imageSrc?: string }> }).equations || [];
  const sentenceLists = (filteredSentence as Sentence & { lists?: StructuredList[] }).lists || [];
  const sentenceSeeAlso = resolveSeeAlsoText(
    (filteredSentence as Sentence & { see_also?: string | Array<{ content?: string }> }).see_also
  );

  return (
    <div className="sentenceBlock" id={filteredSentence.id}>
      <span className="sentenceNumber">{filteredSentence.number})</span>
      <div className="sentenceContent">
        <div className="sentenceText">
          {parseTextWithMarkers(
            filteredSentence.text,
            filteredSentence.glossaryTerms || [],
            interactive,
            sentenceEquations,
            sentenceLists,
            renderContext
          )}
        </div>

        {/* Render definitions list if present */}
        {filteredSentence.definitions && filteredSentence.definitions.length > 0 && (
          <DefinitionsList
            definitions={filteredSentence.definitions}
            interactive={interactive}
            renderContext={renderContext}
          />
        )}

        {/* Render objectives list if present */}
        {filteredSentence.objectives && filteredSentence.objectives.length > 0 && (
          <ObjectivesList
            objectives={filteredSentence.objectives}
            interactive={interactive}
            renderContext={renderContext}
          />
        )}

        {sentenceOrganizations.length > 0 && (
          <div className="sentenceOrganizations">
            <table className="sentenceOrganizationsTable">
              <caption className="sentenceOrganizationsTable__caption">Organizations</caption>
              <thead>
                <tr>
                  <th scope="col">Abbreviation</th>
                  <th scope="col">Organization</th>
                  <th scope="col">Website</th>
                </tr>
              </thead>
              <tbody>
                {sentenceOrganizations.map((organization) => (
                  <tr key={organization.id}>
                    <td>{organization.abbreviation}</td>
                    <td>{organization.fullName}</td>
                    <td>
                      {organization.website ? (
                        <a
                          href={organization.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {organization.website}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
                renderContext={renderContext}
              />
            ))}
          </div>
        )}

        {sentenceSeeAlso ? (
          <div className="sentenceSeeAlso">
            {parseTextWithMarkers(sentenceSeeAlso, [], interactive, [], [], renderContext)}
          </div>
        ) : null}
      </div>
    </div>
  );
};
