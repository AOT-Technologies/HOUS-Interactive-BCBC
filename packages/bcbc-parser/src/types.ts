/**
 * TypeScript type definitions for BC Building Code data structures
 */

/**
 * Volume metadata
 */
export interface VolumeMetadata {
  volume: string;  // "1" or "2"
  title: string;
  subtitle?: string;  // Optional
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  title: string;
  version: string;
  effectiveDate: string;
  jurisdiction: string;
  volumes: VolumeMetadata[];
}

/**
 * Preface content (inside volume)
 */
export interface PrefaceContent {
  id: string;
  type: 'preface';
  content: PrefaceSection[];
}

export interface PrefaceSection {
  type: 'paragraph' | 'heading';
  id: string;
  content: string;
  level?: number;  // For headings
}

/**
 * Index structure (inside volume)
 */
export interface IndexSection {
  id: string;
  type: 'index';
  introduction: string;
  letters: IndexLetter[];
}

export interface IndexLetter {
  id: string;
  letter: string;
  groups: IndexGroup[];
}

export interface IndexGroup {
  id: string;
  term_id: string;
  term: string;
  subterms?: IndexSubterm[];
  references?: IndexReference[];
}

export interface IndexSubterm {
  id: string;
  term: string;
  references: IndexReference[];
}

export interface IndexReference {
  target: string;  // Article ID
  division?: string;
  vendor_target?: string;
}

/**
 * Conversions structure (inside volume)
 */
export interface ConversionsSection {
  id: string;
  type: 'conversions';
  table_id: string;
  table_title: string;
  table_structure: TableStructure;
}

export interface TableStructure {
  columns: number;
  column_specs: ColumnSpec[];
  rows: any[];  // Table row data
}

export interface ColumnSpec {
  name: string;
  width: string;
}

/**
 * Volume structure (contains preface, divisions, index, conversions)
 */
export interface Volume {
  id: string;
  type: 'volume';
  number: number;  // 1 or 2
  title: string;
  preface?: PrefaceContent;  // Only in Volume 1
  divisions: Division[];
  index?: IndexSection;
  conversions?: ConversionsSection;
}

/**
 * Root BCBC document structure
 */
export interface BCBCDocument {
  document_type?: string;
  version?: string;
  canonical_version?: string;
  generated_timestamp?: string;
  metadata: DocumentMetadata;
  volumes: Volume[];
  glossary: GlossaryEntry[];
  amendmentDates?: AmendmentDate[];
  bc_amendments?: any[];
  statistics?: any;
}

/**
 * Division (A, B, or C)
 */
export interface Division {
  id: string;
  type: 'division';
  letter: string;
  title: string;
  number: string;
  parts: Part[];
}

/**
 * Part within a division
 */
export interface Part {
  id: string;
  number: string;
  title: string;
  type: 'part';
  sections: Section[];
}

/**
 * Section within a part
 */
export interface Section {
  id: string;
  number: string;
  title: string;
  type: 'section';
  subsections: Subsection[];
}

/**
 * Subsection within a section
 */
export interface Subsection {
  id: string;
  number: string;
  title: string;
  type: 'subsection';
  articles: Article[];
}

/**
 * Content node types that can appear in article content array
 */
export type ArticleContentNode = Sentence | Table | Figure | Equation | NoteReference;

/**
 * Article with content array (preserves source order)
 */
export interface Article {
  id: string;
  number: string;
  title: string;
  type: 'article';
  content: ArticleContentNode[];
  effectiveDate?: string;
  amendedDate?: string;
}

/**
 * Content node types that can appear in sentence content array
 */
/**
 * Revision information for content nodes
 */
export interface Revision {
  type: 'original' | 'revision';
  effective_date: string;
  revision_id?: string;
  revision_type?: 'amendment' | 'add' | 'replace' | 'delete';
  sequence?: number;
  status?: string;
  text?: string;
  title?: string;
  content?: string;
  change_summary?: string;
  note?: string;
  deleted?: boolean;
}

/**
 * Content node types that can appear in sentence content array
 */
export type SentenceContentNode = Clause | Table | Figure | Equation;

/**
 * Sentence within an article
 */
export interface Sentence {
  id: string;
  number: string;
  type: 'sentence';
  text: string;
  glossaryTerms: string[];
  content?: SentenceContentNode[];
  revisions?: Revision[];
  revised?: boolean;
  source?: string;
}

/**
 * Content node types that can appear in clause content array
 */
export type ClauseContentNode = Subclause | Table | Figure | Equation;

/**
 * Clause with text and optional subclauses
 */
export interface Clause {
  id: string;
  number: string;
  type: 'clause';
  text: string;
  glossaryTerms: string[];
  content?: ClauseContentNode[];
  revisions?: Revision[];
  revised?: boolean;
  source?: string;
}

/**
 * Subclause within a clause
 */
export interface Subclause {
  id: string;
  number: string;
  type: 'subclause';
  text: string;
  glossaryTerms: string[];
  content?: (Table | Figure | Equation)[];
  revisions?: Revision[];
  revised?: boolean;
  source?: string;
}

/**
 * Table structure
 */
export interface Table {
  id: string;
  type: 'table';
  number: string;
  title: string;
  caption?: string;
  headers: string[][];
  rows: TableRow[];
}

/**
 * Table row with cells
 */
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

/**
 * Table cell with optional colspan/rowspan and mixed content
 */
export interface TableCell {
  content: string | TableCellContent[]; // Support both old and new formats
  align?: 'left' | 'center' | 'right';
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

/**
 * Figure/image
 */
export interface Figure {
  id: string;
  type: 'figure';
  number: string;
  title: string;
  caption?: string;
  imageUrl: string;
  altText: string;
}

/**
 * Mathematical equation
 */
export interface Equation {
  id: string;
  type: 'equation';
  number: string;
  latex: string;
  description?: string;
}

/**
 * Reference to an appendix note
 */
export interface NoteReference {
  id: string;
  type: 'note';
  noteNumber: string;
  noteTitle: string;
  noteContent: string;
  relatedSections?: string[];
}

/**
 * Glossary term definition
 */
export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  relatedTerms?: string[];
}

/**
 * Amendment date for filtering
 */
export interface AmendmentDate {
  date: string;
  description: string;
  affectedSections: string[];
  isLatest?: boolean;
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Content type for filtering
 */
export type ContentType = 'article' | 'table' | 'figure' | 'note' | 'application-note';

/**
 * Hierarchy level type
 */
export type HierarchyLevel = 'division' | 'part' | 'section' | 'subsection' | 'article';
