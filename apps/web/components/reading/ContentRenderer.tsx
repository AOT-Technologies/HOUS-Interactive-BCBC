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

export interface ContentRendererProps {
  node: ArticleContentNode | SentenceContentNode | ClauseContentNode | Sentence | Clause | Subclause | Table | Figure | Equation | NoteReference;
  effectiveDate?: string;
  interactive?: boolean;
}

/**
 * Type-driven content renderer
 * Dispatches to appropriate component based on node.type
 */
export const ContentRenderer: React.FC<ContentRendererProps> = ({ 
  node, 
  effectiveDate,
  interactive = true 
}) => {
  switch (node.type) {
    case 'sentence':
      return <SentenceBlock sentence={node as Sentence} effectiveDate={effectiveDate} interactive={interactive} />;
    
    case 'clause':
      return <ClauseBlock clause={node as Clause} effectiveDate={effectiveDate} interactive={interactive} />;
    
    case 'subclause':
      return <SubclauseBlock subclause={node as Subclause} effectiveDate={effectiveDate} interactive={interactive} />;
    
    case 'table':
      return <TableBlock table={node as Table} interactive={interactive} />;
    
    case 'figure':
      return <FigureBlock figure={node as Figure} />;
    
    case 'equation':
      return <EquationBlock equation={node as Equation} />;
    
    case 'note':
      return <NoteBlock note={node as NoteReference} interactive={interactive} />;
    
    default:
      console.warn('Unknown content node type:', (node as any).type);
      return null;
  }
};
