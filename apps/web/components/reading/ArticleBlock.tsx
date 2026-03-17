/**
 * ArticleBlock - Renders an article with its content
 * 
 * Uses type-driven recursive rendering to handle all content types
 * in source order (sentences, tables, figures, equations, notes)
 */

import React from 'react';
import type { Article } from '@bc-building-code/bcbc-parser';
import { ContentRenderer } from './ContentRenderer';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import { formatNumberedTitle } from '../../lib/title-formatting';
import './ArticleBlock.css';

export interface ArticleBlockProps {
  article: Article;
  subsectionNumberPrefix?: string;
  effectiveDate?: string;
  interactive?: boolean;
}

export const ArticleBlock: React.FC<ArticleBlockProps> = ({ 
  article,
  subsectionNumberPrefix,
  effectiveDate,
  interactive = true 
}) => {
  const articleWithSeeAlso = article as Article & { see_also?: string };
  const seeAlsoText = articleWithSeeAlso.see_also?.trim();
  const fullArticleNumber = subsectionNumberPrefix
    ? `${subsectionNumberPrefix}.${article.number}`
    : article.number;
  const renderContext: ReferenceRenderContext = {
    kind: 'article',
    referenceId: article.id,
  };

  return (
    <div className="articleBlock">
      <h4 className="articleHeading">
        {formatNumberedTitle(fullArticleNumber, article.title)}
      </h4>
      {seeAlsoText ? (
        <p className="articleSeeAlso">
          {parseTextWithMarkers(seeAlsoText, [], interactive, [], [], renderContext)}
        </p>
      ) : null}
      
      {/* Render all content in source order using type-driven dispatcher */}
      <div className="articleContent">
        {(article.content || []).map((item, index) => (
          <ContentRenderer 
            key={`${article.id}-content-${index}`}
            node={item}
            effectiveDate={effectiveDate}
            interactive={interactive}
            renderContext={renderContext}
          />
        ))}
      </div>
    </div>
  );
};
