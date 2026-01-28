/**
 * FlexSearch index creation logic
 * 
 * Requirements: 2.2, 3.2
 */

import { Document } from 'flexsearch';
import type {
  BCBCDocument,
  Division,
  Part,
  Section,
  Subsection,
  Article,
  Clause,
  GlossaryEntry,
  NoteReference,
} from '@bc-building-code/bcbc-parser';
import type { SearchResult } from './config';

/**
 * Create FlexSearch index from BCBC document
 * @param document - BCBC document
 * @returns FlexSearch Document index
 */
export function createSearchIndex(document: BCBCDocument) {
  // Create FlexSearch Document index with simplified configuration
  // We'll store the full items separately and just index the searchable fields
  const index = new Document<SearchResult>({
    preset: 'match',
    tokenize: 'forward',
    cache: true,
    resolution: 9,
    document: {
      id: 'id',
      index: ['title', 'number'],
    },
  });

  // Extract all searchable content
  const searchableItems = extractSearchableContent(document);

  // Add all items to the index
  for (const item of searchableItems) {
    index.add(item);
  }

  return index;
}

/**
 * Extract searchable content from BCBC document
 * Includes articles, sections, notes, and glossary terms
 * 
 * @param document - BCBC document
 * @returns Array of searchable items
 */
export function extractSearchableContent(document: BCBCDocument): SearchResult[] {
  const items: SearchResult[] = [];

  // Process each division
  for (const division of document.divisions) {
    processDivision(division, items);
  }

  // Process glossary terms
  for (const glossaryEntry of document.glossary) {
    items.push(createGlossarySearchResult(glossaryEntry));
  }

  return items;
}

/**
 * Process a division and extract searchable content
 */
function processDivision(division: Division, items: SearchResult[]): void {
  for (const part of division.parts) {
    processPart(division, part, items);
  }
}

/**
 * Process a part and extract searchable content
 */
function processPart(division: Division, part: Part, items: SearchResult[]): void {
  for (const section of part.sections) {
    processSection(division, part, section, items);
  }
}

/**
 * Process a section and extract searchable content
 */
function processSection(
  division: Division,
  part: Part,
  section: Section,
  items: SearchResult[]
): void {
  // Add section as searchable item
  items.push({
    id: section.id,
    type: 'section',
    number: section.number,
    title: section.title,
    snippet: section.title,
    breadcrumb: generateBreadcrumb(division.title, part.title, section.title),
    path: generatePath(division.id, part.number, section.number),
    score: 0,
  });

  // Process subsections
  for (const subsection of section.subsections) {
    processSubsection(division, part, section, subsection, items);
  }
}

/**
 * Process a subsection and extract searchable content
 */
function processSubsection(
  division: Division,
  part: Part,
  section: Section,
  subsection: Subsection,
  items: SearchResult[]
): void {
  // Process articles in subsection
  for (const article of subsection.articles) {
    processArticle(division, part, section, subsection, article, items);
  }
}

/**
 * Process an article and extract searchable content
 */
function processArticle(
  division: Division,
  part: Part,
  section: Section,
  subsection: Subsection,
  article: Article,
  items: SearchResult[]
): void {
  // Extract content text from clauses
  const contentText = extractClauseText(article.clauses);

  // Create snippet (first 200 characters of content)
  const snippet = contentText.substring(0, 200) + (contentText.length > 200 ? '...' : '');

  // Add article as searchable item
  items.push({
    id: article.id,
    type: 'article',
    number: article.number,
    title: article.title,
    snippet,
    breadcrumb: generateBreadcrumb(
      division.title,
      part.title,
      section.title,
      subsection.title
    ),
    path: generatePath(
      division.id,
      part.number,
      section.number,
      subsection.number,
      article.number
    ),
    score: 0,
  });

  // Process notes
  for (const note of article.notes) {
    items.push(createNoteSearchResult(note, division, part, section, subsection));
  }
}

/**
 * Extract text content from clauses recursively
 */
function extractClauseText(clauses: Clause[]): string {
  let text = '';

  for (const clause of clauses) {
    text += clause.text + ' ';

    // Recursively extract from subclauses
    if (clause.subclauses && clause.subclauses.length > 0) {
      text += extractClauseText(clause.subclauses);
    }
  }

  return text.trim();
}

/**
 * Create search result for a note
 */
function createNoteSearchResult(
  note: NoteReference,
  division: Division,
  part: Part,
  section: Section,
  subsection: Subsection
): SearchResult {
  // Create snippet from note content
  const snippet =
    note.noteContent.substring(0, 200) +
    (note.noteContent.length > 200 ? '...' : '');

  return {
    id: note.id,
    type: 'note',
    number: note.noteNumber,
    title: note.noteTitle,
    snippet,
    breadcrumb: generateBreadcrumb(
      division.title,
      part.title,
      section.title,
      subsection.title
    ),
    path: generatePath(division.id, part.number, section.number, subsection.number),
    score: 0,
  };
}

/**
 * Create search result for a glossary entry
 */
function createGlossarySearchResult(glossaryEntry: GlossaryEntry): SearchResult {
  // Create snippet from definition
  const snippet =
    glossaryEntry.definition.substring(0, 200) +
    (glossaryEntry.definition.length > 200 ? '...' : '');

  return {
    id: glossaryEntry.id,
    type: 'glossary',
    number: '', // Glossary entries don't have numbers
    title: glossaryEntry.term,
    snippet,
    breadcrumb: ['Glossary'],
    path: `/glossary/${glossaryEntry.id}`,
    score: 0,
  };
}

/**
 * Generate breadcrumb path for a content item
 * @param divisionTitle - Division title
 * @param partTitle - Part title
 * @param sectionTitle - Section title
 * @param subsectionTitle - Subsection title (optional)
 * @returns Breadcrumb array
 */
export function generateBreadcrumb(
  divisionTitle: string,
  partTitle: string,
  sectionTitle: string,
  subsectionTitle?: string
): string[] {
  const breadcrumb = [divisionTitle, partTitle, sectionTitle];
  if (subsectionTitle) {
    breadcrumb.push(subsectionTitle);
  }
  return breadcrumb;
}

/**
 * Generate URL path for a content item
 * @param divisionId - Division ID
 * @param partNumber - Part number
 * @param sectionNumber - Section number
 * @param subsectionNumber - Subsection number (optional)
 * @param articleNumber - Article number (optional)
 * @returns URL path
 */
export function generatePath(
  divisionId: string,
  partNumber: string,
  sectionNumber: string,
  subsectionNumber?: string,
  articleNumber?: string
): string {
  let path = `/code/${divisionId}/${partNumber}/${sectionNumber}`;
  if (subsectionNumber) {
    path += `/${subsectionNumber}`;
  }
  if (articleNumber) {
    path += `/${articleNumber}`;
  }
  return path;
}
