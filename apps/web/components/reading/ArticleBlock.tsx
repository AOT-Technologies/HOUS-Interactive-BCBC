import React from 'react';
import type { ArticleBlockProps } from '@repo/data';
import { ClauseRenderer } from './ClauseRenderer';
import './ArticleBlock.css';

export const ArticleBlock: React.FC<ArticleBlockProps> = ({ 
  article, 
  interactive = true 
}) => {
  return (
    <div className="articleBlock">
      <h4 className="articleHeading">
        {article.reference} {article.title}
      </h4>
      <div className="clauses">
        {article.clauses.map((clause, index) => (
          <ClauseRenderer 
            key={`${article.id}-clause-${index}`}
            clause={clause} 
            level={clause.level}
            interactive={interactive} 
          />
        ))}
      </div>
    </div>
  );
};
