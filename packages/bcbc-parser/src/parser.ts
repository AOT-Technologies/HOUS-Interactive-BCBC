/**
 * BCBC JSON parsing logic
 * 
 * This module handles parsing of BC Building Code JSON data from the source format
 * into the standardized BCBCDocument structure.
 */

import type {
  BCBCDocument,
  Division,
  Part,
  Section,
  Subsection,
  Article,
  Clause,
  Table,
  TableRow,
  TableCell,
  Figure,
  Equation,
  NoteReference,
  GlossaryEntry,
  AmendmentDate,
  DocumentMetadata,
} from './types';

/**
 * Raw source JSON structure (as it comes from data/source/bcbc-2024.json)
 */
interface RawBCBCDocument {
  document_type: string;
  version: string;
  canonical_version: string;
  generated_timestamp: string;
  metadata: {
    title: string;
    subtitle?: string;
    authority?: string;
    publication_date?: string;
    nrc_number?: string;
    isbn?: string;
    volumes: Array<{
      volume: string;
      title: string;
      subtitle?: string;
    }>;
  };
  volumes: RawVolume[];
  glossary: Record<string, RawGlossaryEntry>;
  bc_amendments?: any[];
  statistics?: any;
}

interface RawVolume {
  id: string;
  type: 'volume';
  number: number;
  title: string;
  preface?: {
    id: string;
    type: 'preface';
    content: any[];
  };
  divisions: RawDivision[];
  index?: {
    id: string;
    type: 'index';
    introduction: string;
    letters: any[];
  };
  conversions?: {
    id: string;
    type: 'conversions';
    table_id: string;
    table_title: string;
    table_structure: any;
  };
}

interface RawDivision {
  id: string;
  type: 'division';
  letter: string;
  title: string;
  number: string | number;
  parts: RawPart[];
}

interface RawPart {
  id: string;
  type: 'part';
  number: string | number;
  title: string;
  sections: RawSection[];
}

interface RawSection {
  id: string;
  type: 'section';
  number: string | number;
  title: string;
  subsections: RawSubsection[];
}

interface RawSubsection {
  id: string;
  type: 'subsection';
  number: string | number;
  title: string;
  articles: RawArticle[];
}

interface RawArticle {
  id: string;
  type: 'article';
  number: string | number;
  title: string;
  content: RawSentence[];
  effective_date?: string;
  amended_date?: string;
  revisions?: RawRevision[];
}

interface RawSentence {
  id: string;
  type: 'sentence';
  number: number;
  text: string;
  clauses?: RawClause[];
  tables?: RawTable[];
  figures?: RawFigure[];
  equations?: RawEquation[];
  revisions?: RawRevision[];
}

interface RawClause {
  id: string;
  type: 'clause';
  letter: string;
  text: string;
  subclauses?: RawSubclause[];
  tables?: RawTable[];
  figures?: RawFigure[];
  equations?: RawEquation[];
  revisions?: RawRevision[];
}

interface RawSubclause {
  id: string;
  type: 'subclause';
  number: number;
  text: string;
  tables?: RawTable[];
  figures?: RawFigure[];
  equations?: RawEquation[];
  revisions?: RawRevision[];
}

interface RawTable {
  id: string;
  type: 'table';
  title?: string;
  caption?: string;
  structure?: {
    columns: number;
    column_specs?: Array<{ name: string; width: string }>;
    header_rows?: Array<Array<{ content: string; colspan?: number; rowspan?: number }>>;
    body_rows?: Array<Array<{ content: string; colspan?: number; rowspan?: number }>>;
  };
  revisions?: RawRevision[];
}

interface RawFigure {
  id: string;
  type: 'figure';
  number?: string;
  title?: string;
  caption?: string;
  image_url?: string;
  alt_text?: string;
}

interface RawEquation {
  id: string;
  type: 'equation';
  number?: string;
  latex?: string;
  description?: string;
}

interface RawGlossaryEntry {
  term: string;
  definition: string;
  location_id?: string;
  related_terms?: string[];
}

interface RawAmendment {
  date: string;
  description?: string;
  affected_sections?: string[];
  change_summary?: string;
  note?: string;
}

interface RawRevision {
  type: 'original' | 'revision';
  effective_date: string;
  revision_id?: string;
  sequence?: number;
  status?: string;
  deleted?: boolean;
  text?: string;
  title?: string;
  content?: string;
}

/**
 * Parse BCBC JSON data from source format
 * @param jsonData - Raw JSON data from source file
 * @returns Parsed BCBC document
 */
export function parseBCBC(jsonData: unknown): BCBCDocument {
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Invalid BCBC JSON data: expected object');
  }

  const raw = jsonData as RawBCBCDocument;

  // Validate required fields
  if (!raw.metadata) {
    throw new Error('Invalid BCBC JSON: missing metadata');
  }
  if (!raw.volumes || !Array.isArray(raw.volumes)) {
    throw new Error('Invalid BCBC JSON: missing or invalid volumes array');
  }

  // Parse metadata
  const metadata: DocumentMetadata = {
    title: raw.metadata.title || 'BC Building Code',
    version: raw.version || 'unknown',
    effectiveDate: raw.metadata.publication_date || 'unknown',
    jurisdiction: 'British Columbia',
    volumes: raw.metadata.volumes || [],
  };

  // Parse volumes
  const volumes = raw.volumes.map(parseVolumeData);

  // Parse glossary
  const glossary: GlossaryEntry[] = parseGlossary(raw.glossary || {});

  // Extract amendment dates from bc_amendments
  const amendmentDates: AmendmentDate[] = raw.bc_amendments 
    ? extractAmendmentDatesFromBCAmendments(raw.bc_amendments)
    : [];

  return {
    document_type: raw.document_type,
    version: raw.version,
    canonical_version: raw.canonical_version,
    generated_timestamp: raw.generated_timestamp,
    metadata,
    volumes,
    glossary,
    amendmentDates,
    bc_amendments: raw.bc_amendments,
    statistics: raw.statistics,
  };
}

/**
 * Parse a volume from raw data
 */
function parseVolumeData(raw: RawVolume): any {
  return {
    id: raw.id,
    type: raw.type,
    number: raw.number,
    title: raw.title,
    preface: raw.preface,
    divisions: raw.divisions.map(parseDivisionData),
    index: raw.index,
    conversions: raw.conversions,
  };
}

/**
 * Parse a division from raw data
 */
function parseDivisionData(raw: RawDivision): Division {
  return {
    id: raw.id,
    type: 'division',
    letter: raw.letter,
    title: raw.title,
    number: String(raw.number),
    parts: raw.parts.map(parsePartData),
  };
}

/**
 * Parse a part from raw data
 */
function parsePartData(raw: RawPart): Part {
  return {
    id: raw.id,
    number: String(raw.number),
    title: raw.title,
    type: 'part',
    sections: raw.sections.map(parseSectionData),
  };
}

/**
 * Parse a section from raw data
 */
function parseSectionData(raw: RawSection): Section {
  return {
    id: raw.id,
    number: String(raw.number),
    title: raw.title,
    type: 'section',
    subsections: raw.subsections.map(parseSubsectionData),
  };
}

/**
 * Parse a subsection from raw data
 */
function parseSubsectionData(raw: RawSubsection): Subsection {
  return {
    id: raw.id,
    number: String(raw.number),
    title: raw.title,
    type: 'subsection',
    articles: raw.articles.map(parseArticleData),
  };
}

/**
 * Parse an article from raw data
 */
function parseArticleData(raw: RawArticle): Article {
  const clauses: Clause[] = [];
  const notes: NoteReference[] = [];

  // Parse content (sentences with clauses)
  if (raw.content && Array.isArray(raw.content)) {
    for (const sentence of raw.content) {
      // Add sentence text as a clause if it has text
      if (sentence.text && sentence.text.trim()) {
        clauses.push({
          id: sentence.id,
          number: String(sentence.number),
          text: sentence.text,
          glossaryTerms: extractGlossaryTerms(sentence.text),
          tables: sentence.tables?.map(parseTableData),
          figures: sentence.figures?.map(parseFigureData),
          equations: sentence.equations?.map(parseEquationData),
        });
      }

      // Parse clauses within the sentence
      if (sentence.clauses && Array.isArray(sentence.clauses)) {
        for (const clause of sentence.clauses) {
          clauses.push(parseClauseData(clause));
        }
      }

      // Extract note references from sentence
      const sentenceNotes = extractNoteReferences(sentence.text);
      notes.push(...sentenceNotes);
    }
  }

  return {
    id: raw.id,
    number: String(raw.number),
    title: raw.title,
    type: 'article',
    clauses,
    notes,
    effectiveDate: raw.effective_date,
    amendedDate: raw.amended_date,
  };
}

/**
 * Parse a clause from raw data
 */
function parseClauseData(raw: RawClause): Clause {
  const subclauses: Clause[] = [];

  // Parse subclauses if present
  if (raw.subclauses && Array.isArray(raw.subclauses)) {
    for (const subclause of raw.subclauses) {
      subclauses.push({
        id: subclause.id,
        number: String(subclause.number),
        text: subclause.text,
        glossaryTerms: extractGlossaryTerms(subclause.text),
        tables: subclause.tables?.map(parseTableData),
        figures: subclause.figures?.map(parseFigureData),
        equations: subclause.equations?.map(parseEquationData),
      });
    }
  }

  return {
    id: raw.id,
    number: raw.letter,
    text: raw.text,
    glossaryTerms: extractGlossaryTerms(raw.text),
    subclauses: subclauses.length > 0 ? subclauses : undefined,
    tables: raw.tables?.map(parseTableData),
    figures: raw.figures?.map(parseFigureData),
    equations: raw.equations?.map(parseEquationData),
  };
}

/**
 * Parse a table from raw data
 */
function parseTableData(raw: RawTable): Table {
  const rows: TableRow[] = [];

  // Parse header rows
  if (raw.structure?.header_rows) {
    for (const headerRow of raw.structure.header_rows) {
      rows.push({
        cells: headerRow.map((cell) => ({
          content: cell.content || '',
          colspan: cell.colspan,
          rowspan: cell.rowspan,
          isHeader: true,
        })),
      });
    }
  }

  // Parse body rows
  if (raw.structure?.body_rows) {
    for (const bodyRow of raw.structure.body_rows) {
      rows.push({
        cells: bodyRow.map((cell) => ({
          content: cell.content || '',
          colspan: cell.colspan,
          rowspan: cell.rowspan,
          isHeader: false,
        })),
      });
    }
  }

  return {
    id: raw.id,
    number: extractNumberFromId(raw.id),
    title: raw.title || '',
    caption: raw.caption,
    headers: raw.structure?.header_rows?.map((row) => row.map((cell) => cell.content || '')) || [],
    rows,
  };
}

/**
 * Parse a figure from raw data
 */
function parseFigureData(raw: RawFigure): Figure {
  return {
    id: raw.id,
    number: raw.number || extractNumberFromId(raw.id),
    title: raw.title || '',
    caption: raw.caption,
    imageUrl: raw.image_url || '',
    altText: raw.alt_text || raw.title || 'Figure',
  };
}

/**
 * Parse an equation from raw data
 */
function parseEquationData(raw: RawEquation): Equation {
  return {
    id: raw.id,
    number: raw.number || extractNumberFromId(raw.id),
    latex: raw.latex || '',
    description: raw.description,
  };
}

/**
 * Parse glossary from raw object format to array
 */
function parseGlossary(raw: Record<string, RawGlossaryEntry>): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];

  for (const [key, value] of Object.entries(raw)) {
    entries.push({
      id: key,
      term: value.term,
      definition: value.definition,
      relatedTerms: value.related_terms,
    });
  }

  return entries;
}

/**
 * Parse amendment dates from raw data
 */
function parseAmendmentDates(raw: RawAmendment[]): AmendmentDate[] {
  return raw.map((amendment) => ({
    date: amendment.date,
    description: amendment.description || amendment.change_summary || '',
    affectedSections: amendment.affected_sections || [],
  }));
}

/**
 * Extract amendment dates from bc_amendments array
 */
function extractAmendmentDatesFromBCAmendments(bcAmendments: any[]): AmendmentDate[] {
  const datesMap = new Map<string, { date: string; count: number; sections: Set<string> }>();
  
  for (const amendment of bcAmendments) {
    if (amendment.effective_date || amendment.date) {
      const date = amendment.effective_date || amendment.date;
      const existing = datesMap.get(date);
      
      if (existing) {
        existing.count++;
        if (amendment.location_id) {
          existing.sections.add(amendment.location_id);
        }
      } else {
        const sections = new Set<string>();
        if (amendment.location_id) {
          sections.add(amendment.location_id);
        }
        datesMap.set(date, { date, count: 1, sections });
      }
    }
  }
  
  // Convert map to array and sort by date
  const dates = Array.from(datesMap.entries())
    .map(([date, { count, sections }]) => ({
      date,
      description: `${count} amendment${count > 1 ? 's' : ''} effective on this date`,
      affectedSections: Array.from(sections),
      isLatest: false,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Mark the latest date
  if (dates.length > 0) {
    dates[dates.length - 1].isLatest = true;
  }
  
  return dates;
}

/**
 * Extract amendment dates from revisions throughout the document (DEPRECATED - kept for reference)
 * Scans all articles, sentences, clauses, and tables for revision effective dates
 */
function extractAmendmentDatesFromRevisions(raw: RawBCBCDocument): AmendmentDate[] {
  const datesMap = new Map<string, { date: string; count: number; isLatest: boolean }>();
  
  // Helper function to collect dates from revisions array
  const collectDatesFromRevisions = (revisions?: RawRevision[]) => {
    if (!revisions || !Array.isArray(revisions)) return;
    
    for (const revision of revisions) {
      if (revision.effective_date) {
        const existing = datesMap.get(revision.effective_date);
        if (existing) {
          existing.count++;
        } else {
          datesMap.set(revision.effective_date, {
            date: revision.effective_date,
            count: 1,
            isLatest: false,
          });
        }
      }
    }
  };
  
  // Get divisions from volumes
  const divisions = raw.volumes?.flatMap(v => v.divisions) || [];
  
  // Recursively scan all divisions, parts, sections, subsections, articles
  for (const division of divisions) {
    for (const part of division.parts || []) {
      for (const section of part.sections || []) {
        for (const subsection of section.subsections || []) {
          for (const article of subsection.articles || []) {
            // Collect from article revisions
            collectDatesFromRevisions(article.revisions);
            
            // Collect from article content (sentences)
            for (const sentence of article.content || []) {
              collectDatesFromRevisions(sentence.revisions);
              
              // Collect from clauses
              for (const clause of sentence.clauses || []) {
                collectDatesFromRevisions(clause.revisions);
                
                // Collect from subclauses
                for (const subclause of clause.subclauses || []) {
                  collectDatesFromRevisions(subclause.revisions);
                  
                  // Collect from tables in subclauses
                  for (const table of subclause.tables || []) {
                    collectDatesFromRevisions(table.revisions);
                  }
                }
                
                // Collect from tables in clauses
                for (const table of clause.tables || []) {
                  collectDatesFromRevisions(table.revisions);
                }
              }
              
              // Collect from tables in sentences
              for (const table of sentence.tables || []) {
                collectDatesFromRevisions(table.revisions);
              }
            }
          }
        }
      }
    }
  }
  
  // Convert map to array and sort by date
  const dates = Array.from(datesMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Mark the latest date
  if (dates.length > 0) {
    dates[dates.length - 1].isLatest = true;
  }
  
  // Convert to AmendmentDate format
  return dates.map(({ date, count, isLatest }) => ({
    date,
    description: `${count} revision${count > 1 ? 's' : ''} effective on this date`,
    affectedSections: [],
    isLatest,
  }));
}

/**
 * Extract glossary term references from text
 * Format: [REF:term:termId]termText
 */
function extractGlossaryTerms(text: string): string[] {
  const terms: string[] = [];
  const regex = /\[REF:term:([^\]]+)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    terms.push(match[1]);
  }

  return terms;
}

/**
 * Extract note references from text
 * Format: [REF:internal:noteId:short] or [REF:internal:noteId:long]
 */
function extractNoteReferences(text: string): NoteReference[] {
  const notes: NoteReference[] = [];
  const regex = /\[REF:internal:([^:\]]+):(short|long)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const noteId = match[1];
    // Create a basic note reference (full note content would be extracted separately)
    notes.push({
      id: noteId,
      noteNumber: extractNumberFromId(noteId),
      noteTitle: '',
      noteContent: '',
    });
  }

  return notes;
}

/**
 * Extract number from ID string
 * Example: "nbc.divA.part1.sect1.subsect1.art1" -> "1.1.1.1"
 */
function extractNumberFromId(id: string): string {
  const parts = id.split('.');
  const numbers: string[] = [];

  for (const part of parts) {
    // Extract numbers from parts like "part1", "sect2", "art3"
    const match = part.match(/\d+/);
    if (match) {
      numbers.push(match[0]);
    }
  }

  return numbers.join('.') || id;
}

/**
 * Parse a specific division from BCBC JSON
 * @param jsonData - Raw JSON data
 * @param divisionId - Division ID to parse
 * @returns Parsed division or null if not found
 */
export function parseDivision(jsonData: unknown, divisionId: string): Division | null {
  const document = parseBCBC(jsonData);
  
  // Get divisions from volumes
  const divisions = document.volumes?.flatMap(v => v.divisions) || [];
    
  return divisions.find((d) => d.id === divisionId) || null;
}

/**
 * Extract all content IDs from a BCBC document
 * @param document - BCBC document
 * @returns Array of content IDs
 */
export function extractContentIds(document: BCBCDocument): string[] {
  const ids: string[] = [];

  // Get divisions from volumes
  const divisions = document.volumes?.flatMap(v => v.divisions) || [];

  for (const division of divisions) {
    ids.push(division.id);
    for (const part of division.parts) {
      ids.push(part.id);
      for (const section of part.sections) {
        ids.push(section.id);
        for (const subsection of section.subsections) {
          ids.push(subsection.id);
          for (const article of subsection.articles) {
            ids.push(article.id);
            for (const clause of article.clauses) {
              ids.push(clause.id);
            }
          }
        }
      }
    }
  }

  return ids;
}

/**
 * Get all glossary terms from a document
 * @param document - BCBC document
 * @returns Map of term ID to glossary entry
 */
export function getGlossaryMap(document: BCBCDocument): Map<string, GlossaryEntry> {
  const map = new Map<string, GlossaryEntry>();

  for (const entry of document.glossary) {
    map.set(entry.id, entry);
    // Also map by lowercase term for easy lookup
    map.set(entry.term.toLowerCase(), entry);
  }

  return map;
}

/**
 * Get all amendment dates from a document
 * @param document - BCBC document
 * @returns Array of unique amendment dates sorted chronologically
 */
export function getAmendmentDates(document: BCBCDocument): string[] {
  const dates = new Set<string>();

  for (const amendment of (document.amendmentDates || [])) {
    dates.add(amendment.date);
  }

  return Array.from(dates).sort();
}
