/**
 * Core data types for BC Building Code application
 */

// Export reading page types
export * from './reading';

// Document structure types
export interface BCBCDocument {
  metadata: DocumentMetadata;
  divisions: Division[];
  glossary: GlossaryEntry[];
  amendmentDates: AmendmentDate[];
}

export interface DocumentMetadata {
  title: string;
  version: string;
  effectiveDate: string;
  publisher: string;
}

export interface Division {
  id: string;
  title: string;
  type: 'division';
  parts: Part[];
}

export interface Part {
  id: string;
  number: string;
  title: string;
  type: 'part';
  sections: Section[];
}

export interface Section {
  id: string;
  number: string;
  title: string;
  type: 'section';
  subsections: Subsection[];
}

export interface Subsection {
  id: string;
  number: string;
  title: string;
  type: 'subsection';
  articles: Article[];
}

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

// Content types
export interface Table {
  id: string;
  number: string;
  title: string;
  headers: TableHeader[];
  rows: TableRow[];
  notes?: string[];
}

export interface TableHeader {
  text: string;
  colspan?: number;
  rowspan?: number;
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableCell {
  text: string;
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

export interface Figure {
  id: string;
  number: string;
  title: string;
  imageUrl: string;
  caption?: string;
}

export interface Equation {
  id: string;
  number: string;
  latex: string;
  display: 'inline' | 'block';
}

// Glossary and notes
export interface GlossaryEntry {
  term: string;
  definition: string;
  relatedTerms?: string[];
}

export interface NoteReference {
  id: string;
  number: string;
  title: string;
  content: string;
}

export interface AmendmentDate {
  date: string;
  label: string;
  description?: string;
}

// Search types
export interface SearchResult {
  id: string;
  type: 'article' | 'section' | 'note' | 'glossary';
  number: string;
  title: string;
  snippet: string;
  breadcrumb: string[];
  path: string;
  score: number;
}

export interface SearchFilters {
  amendmentDate?: string;
  division?: string;
  contentType?: ('article' | 'note' | 'glossary')[];
}

// Navigation types
export interface NavigationNode {
  id: string;
  number: string;
  title: string;
  type: 'division' | 'part' | 'section' | 'subsection' | 'article';
  path: string;
  children?: NavigationNode[];
}

// Content node type union
export type ContentNode = Division | Part | Section | Subsection | Article;

// Type guards
export function isDivision(node: ContentNode): node is Division {
  return node.type === 'division';
}

export function isPart(node: ContentNode): node is Part {
  return node.type === 'part';
}

export function isSection(node: ContentNode): node is Section {
  return node.type === 'section';
}

export function isSubsection(node: ContentNode): node is Subsection {
  return node.type === 'subsection';
}

export function isArticle(node: ContentNode): node is Article {
  return node.type === 'article';
}
