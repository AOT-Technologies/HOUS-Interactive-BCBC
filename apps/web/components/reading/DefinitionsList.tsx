/**
 * DefinitionsList - Renders a list of term definitions
 * 
 * Displays definitions that appear in "Defined Terms" articles
 * with proper formatting and glossary term parsing
 */

import React from 'react';
import type { Definition } from '@bc-building-code/bcbc-parser';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import './DefinitionsList.css';

export interface DefinitionsListProps {
  definitions: Definition[];
  interactive?: boolean;
  renderContext?: ReferenceRenderContext;
}

export const DefinitionsList: React.FC<DefinitionsListProps> = ({ 
  definitions,
  interactive = true,
  renderContext,
}) => {
  if (!definitions || definitions.length === 0) {
    return null;
  }

  return (
    <div className="definitionsList">
      <dl className="definitionsList__list">
        {definitions.map((def) => (
          <div key={def.id} className="definitionsList__item" id={def.id}>
            <dt className="definitionsList__term">{def.term}</dt>
            <dd className="definitionsList__definition">
              {parseTextWithMarkers(def.definition, [], interactive, [], [], renderContext)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
