import React from 'react';
import type { Subsection } from '@bc-building-code/bcbc-parser';
import { ArticleBlock } from './ArticleBlock';
import { formatNumberedTitle } from '../../lib/title-formatting';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './SubsectionBlock.css';

export interface SubsectionBlockProps {
  subsection: Subsection;
  sectionNumberPrefix?: string;
  effectiveDate?: string;
  interactive?: boolean;
}

export const SubsectionBlock: React.FC<SubsectionBlockProps> = ({ 
  subsection,
  sectionNumberPrefix,
  effectiveDate,
  interactive = true 
}) => {
  const fullSubsectionNumber = sectionNumberPrefix
    ? `${sectionNumberPrefix}.${subsection.number}`
    : subsection.number;

  // Handle title - after revision resolution it should be a string,
  // but handle object case for safety
  let titleText: string;
  if (typeof subsection.title === 'string') {
    titleText = subsection.title;
  } else if (subsection.title && typeof subsection.title === 'object' && 'text' in subsection.title) {
    titleText = (subsection.title as any).text;
  } else {
    titleText = '';
  }

  // CLAUDE-AUTOFIX CL-067 CF-00874 | issue 2900 | The PDF prints "(See Note ...)" after the subsection title; the JSON has it as see_also.
  const seeAlsoText = (subsection as Subsection & { see_also?: string }).see_also?.trim();

  return (
    <div className="subsectionBlock">
      <h3 className="subsectionHeading">
        {formatNumberedTitle(fullSubsectionNumber, titleText)}
      </h3>
      {seeAlsoText ? (
        <p className="articleSeeAlso">
          {parseTextWithMarkers(seeAlsoText, [], interactive, [], [], { kind: 'article', referenceId: subsection.id })}
        </p>
      ) : null}
      <div className="articles">
        {subsection.articles.map((article) => (
          <ArticleBlock 
            key={article.id} 
            article={article}
            subsectionNumberPrefix={fullSubsectionNumber}
            effectiveDate={effectiveDate}
            interactive={interactive} 
          />
        ))}
      </div>
    </div>
  );
};
