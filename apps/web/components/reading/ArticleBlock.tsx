import React from 'react';
import type { ArticleBlockProps } from '@repo/data';
import { ClauseRenderer } from './ClauseRenderer';
import { TableBlock } from './TableBlock';
import { FigureBlock } from './FigureBlock';
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
      
      {/* Render tables if present */}
      {article.tables && article.tables.length > 0 && (
        <div className="article-tables">
          {article.tables.map((table) => (
            <TableBlock key={table.id} table={table} />
          ))}
        </div>
      )}
      
      {/* Render figures if present */}
      {article.figures && article.figures.length > 0 && (
        <div className="article-figures">
          {article.figures.map((figure) => (
            <FigureBlock key={figure.id} figure={figure} />
          ))}
        </div>
      )}
    </div>
  );
};
