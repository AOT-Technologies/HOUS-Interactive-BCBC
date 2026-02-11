import React from 'react';
import type { ClauseRendererProps, InlineContent } from '@repo/data';
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

// Helper to render inline content (text only for now, glossary terms and links will be added later)
const renderInlineContent = (content: InlineContent[]): React.ReactNode => {
  return content.map((item, index) => {
    if (item.type === 'text') {
      return <span key={index}>{item.text}</span>;
    }
    // Placeholder for glossary terms and cross-references (will be implemented in later tasks)
    if (item.type === 'glossary-term') {
      return <em key={index}>{item.text}</em>;
    }
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
          {renderInlineContent(clause.content)}
        </span>
        
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
