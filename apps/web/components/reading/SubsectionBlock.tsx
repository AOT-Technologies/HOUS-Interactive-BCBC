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

  return (
    <div className="subsectionBlock">
      <h3 className="subsectionHeading">
        {fullSubsectionNumber} {subsection.title}
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
