/**
 * ContentRenderer Component
 * 
 * Recursive component that transforms JSON content tree into React elements.
 * Dispatches to specialized sub-components based on content type.
 * Handles interactive vs non-interactive mode for modal previews.
 */

import React from 'react';
import type { ContentRendererProps, SectionContent, SubsectionContent, ArticleContent } from '@repo/data';
import { PartTitle } from './PartTitle';
import { SectionTitle } from './SectionTitle';
import { SubsectionBlock } from './SubsectionBlock';
import { ArticleBlock } from './ArticleBlock';
import './ContentRenderer.css';

export const ContentRenderer: React.FC<ContentRendererProps> = ({
  content,
  renderLevel,
  context,
  interactive = true,
}) => {
  // Type guards to determine content type
  const isSectionContent = (c: any): c is SectionContent => {
    return 'subsections' in c && 'partTitle' in c;
  };

  const isSubsectionContent = (c: any): c is SubsectionContent => {
    return 'articles' in c && !('subsections' in c);
  };

  const isArticleContent = (c: any): c is ArticleContent => {
    return 'clauses' in c && !('articles' in c);
  };

  // Render based on content type and render level
  if (renderLevel === 'section' && isSectionContent(content)) {
    return (
      <div className="content-renderer">
        {/* Part Title */}
        <PartTitle title={content.partTitle} />
        
        {/* Section Title */}
        <SectionTitle title={`${content.reference}. ${content.title}`} />
        
        {/* Subsections */}
        {content.subsections.map((subsection) => (
          <div key={subsection.id} className="content-renderer__subsection">
            <SubsectionBlock subsection={subsection} interactive={interactive} />
          </div>
        ))}
      </div>
    );
  }

  if (renderLevel === 'subsection' && isSubsectionContent(content)) {
    return (
      <div className="content-renderer">
        {/* Show context if available */}
        {context && (
          <>
            <PartTitle title={context.partTitle} />
            <SectionTitle title={`${context.reference}. ${context.title}`} />
          </>
        )}
        
        {/* Subsection */}
        <div className="content-renderer__subsection">
          <SubsectionBlock subsection={content} interactive={interactive} />
        </div>
      </div>
    );
  }

  if (renderLevel === 'article' && isArticleContent(content)) {
    return (
      <div className="content-renderer">
        {/* Show context if available */}
        {context && (
          <>
            <PartTitle title={context.partTitle} />
            <SectionTitle title={`${context.reference}. ${context.title}`} />
          </>
        )}
        
        {/* Article */}
        <div className="content-renderer__article">
          <ArticleBlock article={content} interactive={interactive} />
        </div>
      </div>
    );
  }

  // Fallback for unexpected content type
  return (
    <div className="content-renderer">
      <p>Unable to render content: unexpected content type or render level</p>
    </div>
  );
};
