/**
 * ContentRenderer - Type-driven recursive content dispatcher
 * 
 * This component inspects the `type` field of content nodes and dispatches
 * to the appropriate specialized component. It enables recursive rendering
 * of nested content structures while preserving source order.
 */

import React from 'react';
import type {
  ArticleContentNode,
  SentenceContentNode,
  ClauseContentNode,
  Sentence,
  Clause,
  Subclause,
  Table,
  Figure,
  Equation,
  NoteReference,
} from '@bc-building-code/bcbc-parser';

import { SentenceBlock } from './SentenceBlock';
import { ClauseBlock } from './ClauseBlock';
import { SubclauseBlock } from './SubclauseBlock';
import { TableBlock } from './TableBlock';
import { FigureBlock } from './FigureBlock';
import { EquationBlock } from './EquationBlock';
import { NoteBlock } from './NoteBlock';
import './ContentRenderer.css';

export interface ContentRendererProps {
  node: ArticleContentNode | SentenceContentNode | ClauseContentNode | Sentence | Clause | Subclause | Table | Figure | Equation | NoteReference;
  effectiveDate?: string;
  interactive?: boolean;
  parentHasBcSource?: boolean;
}

/**
 * Type-driven content renderer
 * Dispatches to appropriate component based on node.type
 */
export const ContentRenderer: React.FC<ContentRendererProps> = ({ 
  node, 
  effectiveDate,
  interactive = true,
  parentHasBcSource = false,
}) => {
  const source = (node as { source?: string }).source;
  const hasBcSource = source?.toLowerCase() === 'bc';
  const hasBcSourceInTree = parentHasBcSource || hasBcSource;

  const withSourceIndicator = (content: React.ReactNode) =>
    hasBcSource && !parentHasBcSource ? (
      <div className="content-renderer__source-indicator content-renderer__source-indicator--bc">
        {content}
      </div>
    ) : content;

  switch (node.type) {
    case 'sentence':
      return withSourceIndicator(
        <SentenceBlock
          sentence={node as Sentence}
          effectiveDate={effectiveDate}
          interactive={interactive}
          parentHasBcSource={hasBcSourceInTree}
        />
      );
    
    case 'clause':
      return withSourceIndicator(
        <ClauseBlock
          clause={node as Clause}
          effectiveDate={effectiveDate}
          interactive={interactive}
          parentHasBcSource={hasBcSourceInTree}
        />
      );
    
    case 'subclause':
      return withSourceIndicator(
        <SubclauseBlock
          subclause={node as Subclause}
          effectiveDate={effectiveDate}
          interactive={interactive}
          parentHasBcSource={hasBcSourceInTree}
        />
      );
    
    case 'table':
      return withSourceIndicator(
        <TableBlock table={node as Table} interactive={interactive} />
      );
    
    case 'figure':
      return withSourceIndicator(<FigureBlock figure={node as Figure} />);
    
    case 'equation':
      return withSourceIndicator(<EquationBlock equation={node as Equation} />);
    
    case 'note':
      return withSourceIndicator(
        <NoteBlock note={node as NoteReference} interactive={interactive} />
      );
    
    default:
      console.warn('Unknown content node type:', (node as any).type);
      return null;
  }
};
