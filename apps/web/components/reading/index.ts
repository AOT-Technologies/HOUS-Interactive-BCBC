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
