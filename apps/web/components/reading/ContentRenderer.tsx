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
  const nodeType = (node as { type?: string }).type;
  const hasBcSource = source?.toLowerCase() === 'bc';
  const hasBcSourceInTree = parentHasBcSource || hasBcSource;

  const withSourceIndicator = (content: React.ReactNode) =>
    hasBcSource && !parentHasBcSource ? (
      <div className="content-renderer__source-indicator content-renderer__source-indicator--bc">
        {content}
      </div>
    ) : content;

  const toEquationNode = (rawNode: any): Equation => ({
    id: rawNode?.id || '',
    type: 'equation',
    number: rawNode?.number || rawNode?.id || '',
    latex: rawNode?.latex || rawNode?.plainText || '',
    description: rawNode?.plainText,
  });

  switch (nodeType) {
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
        <TableBlock
          table={node as Table}
          interactive={interactive}
          effectiveDate={effectiveDate}
        />
      );
    
    case 'figure':
      return withSourceIndicator(<FigureBlock figure={node as Figure} />);
    
    case 'equation':
      return withSourceIndicator(<EquationBlock equation={node as Equation} />);

    // Some generated content can emit equation objects as `type: "display"` or
    // `type: "inline"` instead of `type: "equation"`.
    case 'display':
    case 'inline': {
      const displayType = nodeType === 'inline' ? 'inline' : 'block';
      return withSourceIndicator(
        <EquationBlock
          equation={{
            ...toEquationNode(node as any),
            plainText: (node as any).plainText,
            mathml: (node as any).mathml,
            htmlSrc: (node as any).htmlSrc,
            image: (node as any).image,
            imageSrc: (node as any).imageSrc,
            display: displayType,
          }}
          displayMode={displayType}
        />
      );
    }
    
    case 'note':
      return withSourceIndicator(
        <NoteBlock note={node as NoteReference} interactive={interactive} />
      );
    
    default:
      console.warn('Unknown content node type:', (node as any).type);
      return null;
  }
};
