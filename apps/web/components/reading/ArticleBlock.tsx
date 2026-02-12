/**
 * ArticleBlock - Renders an article with its content
 * 
 * Uses type-driven recursive rendering to handle all content types
 * in source order (sentences, tables, figures, equations, notes)
 */

import React from 'react';
import type { Article } from '@bc-building-code/bcbc-parser';
import { ContentRenderer } from './ContentRenderer';
import './ArticleBlock.css';

export interface ArticleBlockProps {
  article: Article;
  effectiveDate?: string;
  interactive?: boolean;
}

export const ArticleBlock: React.FC<ArticleBlockProps> = ({ 
  article,
  effectiveDate,
  interactive = true 
}) => {
  return (
    <div className="articleBlock">
      <h4 className="articleHeading">
        {article.number} {article.title}
      </h4>
      
      {/* Render all content in source order using type-driven dispatcher */}
      <div className="articleContent">
        {article.content.map((item, index) => (
          <ContentRenderer 
            key={`${article.id}-content-${index}`}
            node={item}
            effectiveDate={effectiveDate}
            interactive={interactive}
          />
        ))}
      </div>
    </div>
  );
};
