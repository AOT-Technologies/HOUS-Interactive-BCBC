import React from 'react';
import type { ClauseRendererProps, InlineContent } from '@repo/data';
import { GlossaryTerm } from './GlossaryTerm';
import { TableBlock } from './TableBlock';
import { FigureBlock } from './FigureBlock';
import './ClauseRenderer.css';

// Helper to get the list type attribute for semantic HTML
const getListType = (level: number): '1' | 'a' | 'i' | 'A' => {
  const listTypes: ('1' | 'a' | 'i' | 'A')[] = [
    '1',  // Level 0: 1), 2), 3)
    'a',  // Level 1: a), b), c)
    'i',  // Level 2: i), ii), iii)
    'A'   // Level 3: A), B), C)
  ];
  return listTypes[level] || '1';
};

// Helper to render inline content with glossary terms and cross-references
const renderInlineContent = (content: InlineContent[], interactive: boolean): React.ReactNode => {
  return content.map((item, index) => {
    if (item.type === 'text') {
      return <span key={index}>{item.text}</span>;
    }
    if (item.type === 'glossary-term') {
      return (
        <GlossaryTerm
          key={index}
          termId={item.termId || item.text}
          text={item.text}
          interactive={interactive}
        />
      );
    }
    // Cross-references will be implemented in Task 8
    if (item.type === 'cross-reference') {
      return <span key={index}>{item.text}</span>;
    }
    return <span key={index}>{item.text}</span>;
  });
};

export const ClauseRenderer: React.FC<ClauseRendererProps> = ({ 
  clause, 
  level, 
  interactive = true 
}) => {
  const listType = getListType(level);
  const levelClass = `level${level}`;

  return (
    <ol className="clauseList" type={listType}>
      <li className={`clauseItem ${levelClass}`}>
        <span className="clauseNumber">{clause.number}</span>
        <span className="clauseContent">
          {renderInlineContent(clause.content, interactive)}
        </span>
        
        {/* Render tables if present (from sentences) */}
        {clause.tables && clause.tables.length > 0 && (
          <div className="clause-tables">
            {clause.tables.map((table) => (
              <TableBlock key={table.id} table={table} />
            ))}
          </div>
        )}
        
        {/* Render figures if present (from sentences) */}
        {clause.figures && clause.figures.length > 0 && (
          <div className="clause-figures">
            {clause.figures.map((figure) => (
              <FigureBlock key={figure.id} figure={figure} />
            ))}
          </div>
        )}
        
        {/* Recursively render sub-clauses */}
        {clause.subClauses && clause.subClauses.length > 0 && (
          <div className="subClauses">
            {clause.subClauses.map((subClause, index) => (
              <ClauseRenderer
                key={`subclause-${index}`}
                clause={subClause}
                level={subClause.level}
                interactive={interactive}
              />
            ))}
          </div>
        )}
      </li>
    </ol>
  );
};
