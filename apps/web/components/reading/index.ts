/**
 * Reading Page Components
 * 
 * Export all reading page components and their types.
 */

// Core rendering components
export { PartTitle } from './PartTitle';
export { SectionTitle } from './SectionTitle';
export { SubsectionBlock } from './SubsectionBlock';
export { ArticleBlock } from './ArticleBlock';
export { ClauseRenderer } from './ClauseRenderer';
export { TableBlock } from './TableBlock';
export { FigureBlock } from './FigureBlock';
export { EquationBlock } from './EquationBlock';
export { NoteBlock } from './NoteBlock';
export { NoteReference } from './NoteReference';
export { NotesList } from './NotesList';

// Container components
export { ContentRenderer } from './ContentRenderer';
export { ReadingView } from './ReadingView';
export { ReadingViewHeader } from './ReadingViewHeader';

// Content source indicator components
export { ContentSourceIndicator } from './ContentSourceIndicator';
export { SourceBadges } from './SourceBadges';

// Re-export reading types from @repo/data
export type {
  SectionContent,
  SubsectionContent,
  ArticleContent,
  ClauseContent,
  InlineContent,
  CrossReference,
  TableContent,
  TableRow,
  TableCell,
  FigureContent,
  EquationContent,
  NoteContent,
  GlossaryTerm,
  ContentState,
  UIState,
  URLParams,
  ContentRendererProps,
  SubsectionBlockProps,
  ArticleBlockProps,
  ClauseRendererProps,
  GlossaryTermProps,
  CrossReferenceLinkProps,
  CrossReferenceModalProps,
  TableBlockProps,
  FigureBlockProps,
  EquationBlockProps,
  NoteBlockProps,
  PdfDownloadButtonProps,
  ContentSourceIndicatorProps,
  ReadingViewProps,
  ClauseIndentationConfig,
  RenderContext,
} from '@repo/data';
