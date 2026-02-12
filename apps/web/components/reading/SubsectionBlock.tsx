import React from 'react';
import type { Subsection } from '@bc-building-code/bcbc-parser';
import { ArticleBlock } from './ArticleBlock';
import './SubsectionBlock.css';

export interface SubsectionBlockProps {
  subsection: Subsection;
  effectiveDate?: string;
  interactive?: boolean;
}

export const SubsectionBlock: React.FC<SubsectionBlockProps> = ({ 
  subsection,
  effectiveDate,
  interactive = true 
}) => {
  return (
    <div className="subsectionBlock">
      <h3 className="subsectionHeading">
        {subsection.number} {subsection.title}
      </h3>
      <div className="articles">
        {subsection.articles.map((article) => (
          <ArticleBlock 
            key={article.id} 
            article={article}
            effectiveDate={effectiveDate}
            interactive={interactive} 
          />
        ))}
      </div>
    </div>
  );
};
