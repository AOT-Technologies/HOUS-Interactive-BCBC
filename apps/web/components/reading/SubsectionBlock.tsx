import React from 'react';
import type { SubsectionBlockProps } from '@repo/data';
import { ArticleBlock } from './ArticleBlock';
import './SubsectionBlock.css';

export const SubsectionBlock: React.FC<SubsectionBlockProps> = ({ 
  subsection, 
  interactive = true 
}) => {
  return (
    <div className="subsectionBlock">
      <h3 className="subsectionHeading">
        {subsection.reference} {subsection.title}
      </h3>
      <div className="articles">
        {subsection.articles.map((article) => (
          <ArticleBlock 
            key={article.id} 
            article={article} 
            interactive={interactive} 
          />
        ))}
      </div>
    </div>
  );
};
