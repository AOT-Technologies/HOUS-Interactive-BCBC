import React from 'react';
import type { Subsection } from '@bc-building-code/bcbc-parser';
import { ArticleBlock } from './ArticleBlock';
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

  return (
    <div className="subsectionBlock">
      <h3 className="subsectionHeading">
        {fullSubsectionNumber} {titleText}
      </h3>
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
