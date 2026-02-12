/**
 * Reading Page Content Types
 * 
 * These types define the structure for rendering BC Building Code content
 * at various hierarchical levels (Section, Subsection, Article).
 */

// ============================================================================
// Content Data Structures
// ============================================================================

/**
 * Top-level section content loaded from JSON
 */
export interface SectionContent {
  id: string;                    // "section-1-1"
  reference: string;             // "1.1"
  title: string;                 // "General"
  partTitle: string;             // "Part 1 General"
  partReference: string;         // "1"
  divisionTitle: string;         // "Division A - Compliance, Objectives..."
  divisionReference: string;     // "A"
  source?: 'bcbc' | 'nbc';      // Content source indicator
  subsections: SubsectionContent[];
  tables?: TableContent[];
  figures?: FigureContent[];
  notes?: NoteContent[];
}

/**
 * Subsection within a section
 */
export interface SubsectionContent {
  id: string;                    // "subsection-1-1-1"
  reference: string;             // "1.1.1"
  title: string;                 // "Application"
  source?: 'bcbc' | 'nbc';
  articles: ArticleContent[];
}

/**
 * Article within a subsection
 */
export interface ArticleContent {
  id: string;                    // "article-1-1-1-1"
  reference: string;             // "1.1.1.1"
  title: string;                 // "Application"
  source?: 'bcbc' | 'nbc';
  clauses: ClauseContent[];
  crossReferences?: CrossReference[];
  tables?: TableContent[];
  figures?: FigureContent[];
  notes?: NoteContent[];
}

/**
 * Numbered clause with hierarchical nesting
 */
export interface ClauseContent {
  number: string;                // "1)", "a)", "i)", "A)"
  level: number;                 // 0-3 for indentation depth
  content: InlineContent[];      // Mixed text, glossary terms, links
  subClauses?: ClauseContent[];  // Recursive nesting
  tables?: any[];                // Tables attached to this clause (from sentences)
  figures?: any[];               // Figures attached to this clause (from sentences)
}

/**
 * Inline content elements (text, glossary terms, cross-references)
 */
export interface InlineContent {
  type: 'text' | 'glossary-term' | 'cross-reference' | 'internal-link' | 'note-reference';
  text: string;
  termId?: string;               // For glossary terms
  referenceId?: string;          // For cross-references
  targetUrl?: string;            // For navigation links
  title?: string;                // For cross-references
}

/**
 * Cross-reference metadata for modal previews
 */
export interface CrossReference {
  id: string;                    // "A-1.1.2.1.(1)"
  reference: string;             // Display reference
  title: string;                 // Full title
  targetUrl: string;             // Navigation URL
  content: ArticleContent | SubsectionContent;  // Preview content
}

/**
 * Table structure with headers and rows
 */
export interface TableContent {
  id: string;
  caption?: string;
  headers: string[];
  rows: TableRow[];
}

export interface TableRow {
  id?: string;
  type?: 'header_row' | 'body_row';
  cells: TableCell[];
}

/**
 * Content item within a table cell (text or figure)
 */
export interface TableCellContent {
  type: 'text' | 'figure';
  value?: string; // For text content
  id?: string; // For figure content
  source?: 'nbc' | 'bc';
  title?: string;
  graphic?: {
    src: string;
    alt_text: string;
  };
}

export interface TableCell {
  content: string | InlineContent[] | TableCellContent[];
  align?: 'left' | 'center' | 'right';
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

/**
 * Figure/Image structure
 */
export interface FigureContent {
  id: string;
  src: string;                   // Path to image file
  alt: string;                   // Accessibility text
  caption?: string;
  width?: number;
  height?: number;
}

/**
 * Equation structure (LaTeX or image)
 */
export interface EquationContent {
  id: string;
  latex?: string;                // LaTeX representation
  imageSrc?: string;             // Fallback image
  display: 'inline' | 'block';
  alt: string;                   // Accessibility text
}

/**
 * Note structure
 */
export interface NoteContent {
  id: string;
  reference: string;
  content: InlineContent[];
}

/**
 * Glossary term definition
 */
export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  relatedTerms?: string[];
}

// ============================================================================
// State Models
// ============================================================================

/**
 * Content store state for managing loaded content and cache
 */
export interface ContentState {
  cache: Map<string, SectionContent>;  // Keyed by "${version}/${path}"
  currentContent: SectionContent | SubsectionContent | ArticleContent | null;
  currentPath: string[];               // [division, part, section, subsection?, article?]
  renderLevel: 'section' | 'subsection' | 'article';
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchContent: (version: string, path: string[]) => Promise<void>;
  extractSubtree: (content: SectionContent, path: string[]) => {
    content: SectionContent | SubsectionContent | ArticleContent;
    renderLevel: 'section' | 'subsection' | 'article';
    context: SectionContent | null;
  };
  clearError: () => void;
  reset: () => void;
}

/**
 * UI store state for managing modals, sidebars, and PDF generation
 */
export interface UIState {
  // Modal state
  modalOpen: boolean;
  modalReferenceId: string | null;
  modalContent: CrossReference | null;
  
  // Glossary sidebar state
  glossarySidebarOpen: boolean;
  activeGlossaryTermId: string | null;
  
  // PDF generation state
  pdfGenerating: boolean;
  pdfError: string | null;
  
  // Actions
  openModal: (referenceId: string, content: CrossReference) => void;
  closeModal: () => void;
  openGlossarySidebar: (termId?: string) => void;
  closeGlossarySidebar: () => void;
  generatePdf: (content: SectionContent | SubsectionContent | ArticleContent, renderLevel: string) => Promise<void>;
  reset: () => void;
}

/**
 * URL parameter models for reading view
 */
export interface URLParams {
  slug: string[];              // Path segments [division, part, section, subsection?, article?]
  version?: string;            // Query param
  date?: string;               // Query param (ISO format)
  modal?: string;              // Query param (reference ID)
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for ContentRenderer component
 */
export interface ContentRendererProps {
  content: SectionContent | SubsectionContent | ArticleContent;
  renderLevel: 'section' | 'subsection' | 'article';
  context?: SectionContent;  // Parent context for breadcrumb titles
  interactive?: boolean;     // false for modal preview mode
}

/**
 * Props for SubsectionBlock component
 */
export interface SubsectionBlockProps {
  subsection: SubsectionContent;
  interactive?: boolean;
}

/**
 * Props for ArticleBlock component
 */
export interface ArticleBlockProps {
  article: ArticleContent;
  interactive?: boolean;
}

/**
 * Props for ClauseRenderer component
 */
export interface ClauseRendererProps {
  clause: ClauseContent;
  level: number;            // 0-3 for indentation depth
  interactive?: boolean;
}

/**
 * Props for GlossaryTerm component
 */
export interface GlossaryTermProps {
  termId: string;
  text: string;
  interactive?: boolean;  // false in modal preview
}

/**
 * Props for CrossReferenceLink component
 */
export interface CrossReferenceLinkProps {
  referenceId: string;
  title: string;
  targetUrl: string;
  interactive?: boolean;  // false in modal preview
}

/**
 * Props for CrossReferenceModal component
 */
export interface CrossReferenceModalProps {
  referenceId: string;
  title: string;
  content: ArticleContent | SubsectionContent;
  targetUrl: string;
  onClose: () => void;
  onGoToSection: () => void;
}

/**
 * Props for TableBlock component
 */
export interface TableBlockProps {
  table: TableContent;
}

/**
 * Props for FigureBlock component
 */
export interface FigureBlockProps {
  figure: FigureContent;
}

/**
 * Props for EquationBlock component
 */
export interface EquationBlockProps {
  equation: EquationContent;
}

/**
 * Props for NoteBlock component
 */
export interface NoteBlockProps {
  note: NoteContent;
}

/**
 * Props for PdfDownloadButton component
 */
export interface PdfDownloadButtonProps {
  label: string;           // Dynamic based on render level
  content: SectionContent | SubsectionContent | ArticleContent;
  renderLevel: 'section' | 'subsection' | 'article';
}

/**
 * Props for ContentSourceIndicator wrapper component
 */
export interface ContentSourceIndicatorProps {
  source?: 'bcbc' | 'nbc';
  children: React.ReactNode;
}

/**
 * Props for ReadingView container component
 */
export interface ReadingViewProps {
  slug: string[];           // [division, part, section, subsection?, article?]
  version: string;          // From URL query or version store
  effectiveDate?: string;   // From URL query or amendment store
  modalRef?: string;        // From URL query for auto-opening modal
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Indentation configuration for clause rendering
 */
export interface ClauseIndentationConfig {
  indent: string;
  numberStyle: string;
  listType: 'decimal' | 'lower-alpha' | 'lower-roman' | 'upper-alpha';
}

/**
 * Render context for subtree extraction
 */
export interface RenderContext {
  content: SectionContent | SubsectionContent | ArticleContent;
  renderLevel: 'section' | 'subsection' | 'article';
  context: SectionContent | null;
}
