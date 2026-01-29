/**
 * TypeScript type definitions for BC Building Code data structures
 */

/**
 * Document metadata
 */
export interface DocumentMetadata {
  title: string;
  version: string;
  effectiveDate: string;
  jurisdiction: string;
}

/**
 * Root BCBC document structure
 */
export interface BCBCDocument {
  metadata: DocumentMetadata;
  divisions: Division[];
  glossary: GlossaryEntry[];
  amendmentDates: AmendmentDate[];
}

/**
 * Division (A, B, or C)
 */
export interface Division {
  id: string;
  title: string;
  type: 'division';
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
 * Article with clauses
 */
export interface Article {
  id: string;
  number: string;
  title: string;
  type: 'article';
  clauses: Clause[];
  notes: NoteReference[];
  effectiveDate?: string;
  amendedDate?: string;
}

/**
 * Clause with text and optional subclauses
 */
export interface Clause {
  id: string;
  number: string;
  text: string;
  glossaryTerms: string[];
  subclauses?: Clause[];
  tables?: Table[];
  figures?: Figure[];
  equations?: Equation[];
}

/**
 * Table structure
 */
export interface Table {
  id: string;
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
  cells: TableCell[];
}

/**
 * Table cell with optional colspan/rowspan
 */
export interface TableCell {
  content: string;
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

/**
 * Figure/image
 */
export interface Figure {
  id: string;
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
  number: string;
  latex: string;
  description?: string;
}

/**
 * Reference to an appendix note
 */
export interface NoteReference {
  id: string;
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
