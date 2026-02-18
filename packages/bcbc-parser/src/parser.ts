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
  ArticleContentNode,
  Sentence,
  SentenceContentNode,
  Clause,
  ClauseContentNode,
  Subclause,
  Table,
  TableRow,
  Figure,
  Equation,
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
  content: (RawSentence | RawTable | RawFigure | RawEquation)[];
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

interface RawTableCell {
  content?: string | Array<{ type: 'text' | 'figure'; value?: string; id?: string; source?: string; title?: string; graphic?: { src: string; alt_text: string } }>;
  align?: 'left' | 'center' | 'right';
  colspan?: number;
  rowspan?: number;
}

interface RawTableRow {
  id?: string;
  type?: 'header_row' | 'body_row';
  cells: RawTableCell[];
}

interface RawTable {
  id: string;
  type: 'table';
  title?: string;
  caption?: string;
  number?: string;
  // New structure with rows array
  rows?: RawTableRow[];
  // Structure with header_rows and body_rows (can be new or legacy format)
  structure?: {
    columns: number;
    column_specs?: Array<{ name: string; width: string }>;
    // New format: array of objects with id, type, cells
    // Legacy format: array of arrays of cells
    header_rows?: Array<RawTableRow | Array<{ content: string; colspan?: number; rowspan?: number }>>;
    body_rows?: Array<RawTableRow | Array<{ content: string; colspan?: number; rowspan?: number }>>;
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

// TODO: Use this interface when implementing amendment date parsing
// interface RawAmendment {
//   date: string;
//   description?: string;
//   affected_sections?: string[];
//   change_summary?: string;
//   note?: string;
// }

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
  const content: ArticleContentNode[] = [];

  // Parse content in source order - preserve exact structure
  if (raw.content && Array.isArray(raw.content)) {
    for (const item of raw.content) {
      if (item.type === 'sentence') {
        const sentence = parseSentenceData(item as RawSentence);
        if (sentence) {
          content.push(sentence);
        }
      } else if (item.type === 'table') {
        content.push(parseTableData(item as RawTable));
      } else if (item.type === 'figure') {
        content.push(parseFigureData(item as RawFigure));
      } else if (item.type === 'equation') {
        content.push(parseEquationData(item as RawEquation));
      }
      // Note: NoteReferences are extracted from text, not from content array
    }
  }

  // Extract note references from all text content
  // TODO: Use notes for future note reference implementation
  // const notes = extractNoteReferencesFromArticle(raw);

  return {
    id: raw.id,
    number: String(raw.number),
    title: raw.title,
    type: 'article',
    content,
    effectiveDate: raw.effective_date,
    amendedDate: raw.amended_date,
  };
}

/**
 * Parse a sentence from raw data
 */
function parseSentenceData(raw: RawSentence): Sentence | null {
  // Skip empty sentences
  if (!raw.text || !raw.text.trim()) {
    return null;
  }

  const content: SentenceContentNode[] = [];

  // Parse clauses
  if (raw.clauses && Array.isArray(raw.clauses)) {
    for (const clause of raw.clauses) {
      content.push(parseClauseData(clause));
    }
  }

  // Parse tables
  if (raw.tables && Array.isArray(raw.tables)) {
    for (const table of raw.tables) {
      content.push(parseTableData(table));
    }
  }

  // Parse figures
  if (raw.figures && Array.isArray(raw.figures)) {
    for (const figure of raw.figures) {
      content.push(parseFigureData(figure));
    }
  }

  // Parse equations
  if (raw.equations && Array.isArray(raw.equations)) {
    for (const equation of raw.equations) {
      content.push(parseEquationData(equation));
    }
  }

  return {
    id: raw.id,
    number: String(raw.number),
    type: 'sentence',
    text: raw.text,
    glossaryTerms: extractGlossaryTerms(raw.text),
    content: content.length > 0 ? content : undefined,
    revisions: raw.revisions,
    revised: (raw as any).revised,
    source: (raw as any).source,
  };
}

/**
 * Parse a clause from raw data
 */
function parseClauseData(raw: RawClause): Clause {
  const content: ClauseContentNode[] = [];

  // Parse subclauses
  if (raw.subclauses && Array.isArray(raw.subclauses)) {
    for (const subclause of raw.subclauses) {
      content.push(parseSubclauseData(subclause));
    }
  }

  // Parse tables
  if (raw.tables && Array.isArray(raw.tables)) {
    for (const table of raw.tables) {
      content.push(parseTableData(table));
    }
  }

  // Parse figures
  if (raw.figures && Array.isArray(raw.figures)) {
    for (const figure of raw.figures) {
      content.push(parseFigureData(figure));
    }
  }

  // Parse equations
  if (raw.equations && Array.isArray(raw.equations)) {
    for (const equation of raw.equations) {
      content.push(parseEquationData(equation));
    }
  }

  return {
    id: raw.id,
    number: raw.letter,
    type: 'clause',
    text: raw.text,
    glossaryTerms: extractGlossaryTerms(raw.text),
    content: content.length > 0 ? content : undefined,
    revisions: raw.revisions,
    revised: (raw as any).revised,
    source: (raw as any).source,
  };
}

/**
 * Parse a subclause from raw data
 */
function parseSubclauseData(raw: RawSubclause): Subclause {
  const content: (Table | Figure | Equation)[] = [];

  // Parse tables
  if (raw.tables && Array.isArray(raw.tables)) {
    for (const table of raw.tables) {
      content.push(parseTableData(table));
    }
  }

  // Parse figures
  if (raw.figures && Array.isArray(raw.figures)) {
    for (const figure of raw.figures) {
      content.push(parseFigureData(figure));
    }
  }

  // Parse equations
  if (raw.equations && Array.isArray(raw.equations)) {
    for (const equation of raw.equations) {
      content.push(parseEquationData(equation));
    }
  }

  return {
    id: raw.id,
    number: String(raw.number),
    type: 'subclause',
    text: raw.text,
    glossaryTerms: extractGlossaryTerms(raw.text),
    content: content.length > 0 ? content : undefined,
    revisions: raw.revisions,
    revised: (raw as any).revised,
    source: (raw as any).source,
  };
}

/**
 * Parse a table from raw data
 */
function parseTableData(raw: RawTable): Table {
  const rows: TableRow[] = [];
  const headers: string[][] = [];

  // New structure: rows array with type field (direct rows property)
  if (raw.rows && Array.isArray(raw.rows)) {
    for (const row of raw.rows) {
      const isHeader = row.type === 'header_row';
      
      const parsedRow: TableRow = {
        id: row.id,
        type: row.type,
        cells: row.cells.map((cell) => ({
          content: Array.isArray(cell.content)
            ? cell.content.map((item) => ({
                ...item,
                source: item.source as 'nbc' | 'bc' | undefined,
              }))
            : cell.content || '',
          align: cell.align,
          colspan: cell.colspan,
          rowspan: cell.rowspan,
          isHeader,
        })),
      };
      
      rows.push(parsedRow);
      
      // Build headers array for backward compatibility
      if (isHeader) {
        headers.push(
          row.cells.map((cell) => {
            if (typeof cell.content === 'string') {
              return cell.content;
            } else if (Array.isArray(cell.content)) {
              // Extract text from content array
              return cell.content
                .filter((item) => item.type === 'text')
                .map((item) => item.value || '')
                .join(' ');
            }
            return '';
          })
        );
      }
    }
  }
  // Structure with header_rows and body_rows
  else if (raw.structure) {
    // Parse header rows - can be array of objects (new) or array of arrays (legacy)
    if (raw.structure.header_rows && Array.isArray(raw.structure.header_rows)) {
      for (const headerRow of raw.structure.header_rows) {
        // New format: object with id, type, cells
        if (headerRow && typeof headerRow === 'object' && 'cells' in headerRow) {
          const parsedRow: TableRow = {
            id: (headerRow as any).id,
            type: 'header_row',
            cells: (headerRow as any).cells.map((cell: any) => ({
              content: cell.content || '',
              align: cell.align,
              colspan: cell.colspan,
              rowspan: cell.rowspan,
              isHeader: true,
            })),
          };
          
          rows.push(parsedRow);
          
          // Build headers array
          headers.push(
            (headerRow as any).cells.map((cell: any) => {
              if (typeof cell.content === 'string') {
                return cell.content;
              } else if (Array.isArray(cell.content)) {
                return cell.content
                  .filter((item: any) => item.type === 'text')
                  .map((item: any) => item.value || '')
                  .join(' ');
              }
              return '';
            })
          );
        }
        // Legacy format: array of cells
        else if (Array.isArray(headerRow)) {
          rows.push({
            type: 'header_row',
            cells: headerRow.map((cell) => ({
              content: cell.content || '',
              colspan: cell.colspan,
              rowspan: cell.rowspan,
              isHeader: true,
            })),
          });
          
          headers.push(headerRow.map((cell) => cell.content || ''));
        }
      }
    }

    // Parse body rows - can be array of objects (new) or array of arrays (legacy)
    if (raw.structure.body_rows && Array.isArray(raw.structure.body_rows)) {
      for (const bodyRow of raw.structure.body_rows) {
        // New format: object with id, type, cells
        if (bodyRow && typeof bodyRow === 'object' && 'cells' in bodyRow) {
          rows.push({
            id: (bodyRow as any).id,
            type: 'body_row',
            cells: (bodyRow as any).cells.map((cell: any) => ({
              content: cell.content || '',
              align: cell.align,
              colspan: cell.colspan,
              rowspan: cell.rowspan,
              isHeader: false,
            })),
          });
        }
        // Legacy format: array of cells
        else if (Array.isArray(bodyRow)) {
          rows.push({
            type: 'body_row',
            cells: bodyRow.map((cell) => ({
              content: cell.content || '',
              colspan: cell.colspan,
              rowspan: cell.rowspan,
              isHeader: false,
            })),
          });
        }
      }
    }
  }

  return {
    id: raw.id,
    type: 'table',
    number: raw.number || extractNumberFromId(raw.id),
    title: raw.title || '',
    caption: raw.caption,
    headers,
    rows,
  };
}

/**
 * Parse a figure from raw data
 */
function parseFigureData(raw: RawFigure): Figure {
  return {
    id: raw.id,
    type: 'figure',
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
    type: 'equation',
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
 * TODO: Use this function when implementing amendment date parsing
 */
// function parseAmendmentDates(raw: RawAmendment[]): AmendmentDate[] {
//   return raw.map((amendment) => ({
//     date: amendment.date,
//     description: amendment.description || amendment.change_summary || '',
//     affectedSections: amendment.affected_sections || [],
//   }));
// }

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
 * TODO: Re-enable when implementing revision-based amendment date extraction
 */
// function extractAmendmentDatesFromRevisions(raw: RawBCBCDocument): AmendmentDate[] {
//   const datesMap = new Map<string, { date: string; count: number; isLatest: boolean }>();
//   
//   // Helper function to collect dates from revisions array
//   const collectDatesFromRevisions = (revisions?: RawRevision[]) => {
//     if (!revisions || !Array.isArray(revisions)) return;
//     
//     for (const revision of revisions) {
//       if (revision.effective_date) {
//         const existing = datesMap.get(revision.effective_date);
//         if (existing) {
//           existing.count++;
//         } else {
//           datesMap.set(revision.effective_date, {
//             date: revision.effective_date,
//             count: 1,
//             isLatest: false,
//           });
//         }
//       }
//     }
//   };
//   
//   // Get divisions from volumes
//   const divisions = raw.volumes?.flatMap(v => v.divisions) || [];
//   
//   // Recursively scan all divisions, parts, sections, subsections, articles
//   for (const division of divisions) {
//     for (const part of division.parts || []) {
//       for (const section of part.sections || []) {
//         for (const subsection of section.subsections || []) {
//           for (const article of subsection.articles || []) {
//             // Collect from article revisions
//             collectDatesFromRevisions(article.revisions);
//             
//             // Collect from article content (sentences)
//             for (const sentence of article.content || []) {
//               collectDatesFromRevisions(sentence.revisions);
//               
//               // Collect from clauses
//               for (const clause of sentence.clauses || []) {
//                 collectDatesFromRevisions(clause.revisions);
//                 
//                 // Collect from subclauses
//                 for (const subclause of clause.subclauses || []) {
//                   collectDatesFromRevisions(subclause.revisions);
//                   
//                   // Collect from tables in subclauses
//                   for (const table of subclause.tables || []) {
//                     collectDatesFromRevisions(table.revisions);
//                   }
//                 }
//                 
//                 // Collect from tables in clauses
//                 for (const table of clause.tables || []) {
//                   collectDatesFromRevisions(table.revisions);
//                 }
//               }
//               
//               // Collect from tables in sentences
//               for (const table of sentence.tables || []) {
//                 collectDatesFromRevisions(table.revisions);
//               }
//             }
//           }
//         }
//       }
//     }
//   }
//   
//   // Convert map to array and sort by date
//   const dates = Array.from(datesMap.values())
//     .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
//   
//   // Mark the latest date
//   if (dates.length > 0) {
//     dates[dates.length - 1].isLatest = true;
//   }
//   
//   // Convert to AmendmentDate format
//   return dates.map(({ date, count, isLatest }) => ({
//     date,
//     description: `${count} revision${count > 1 ? 's' : ''} effective on this date`,
//     affectedSections: [],
//     isLatest,
//   }));
// }

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
 * TODO: Re-enable when implementing note reference extraction
 */
// function extractNoteReferences(text: string): NoteReference[] {
//   const notes: NoteReference[] = [];
//   const regex = /\[REF:internal:([^:\]]+):(short|long)\]/g;
//   let match;

//   while ((match = regex.exec(text)) !== null) {
//     const noteId = match[1];
//     // Create a basic note reference (full note content would be extracted separately)
//     notes.push({
//       id: noteId,
//       type: 'note',
//       noteNumber: extractNumberFromId(noteId),
//       noteTitle: '',
//       noteContent: '',
//     });
//   }

//   return notes;
// }

/**
 * Extract all note references from an article's content
 * TODO: Re-enable when implementing note reference extraction
 */
// function extractNoteReferencesFromArticle(raw: RawArticle): NoteReference[] {
//   const notesMap = new Map<string, NoteReference>();

//   // Helper to collect notes from text
//   const collectNotes = (text: string) => {
//     const notes = extractNoteReferences(text);
//     for (const note of notes) {
//       notesMap.set(note.id, note);
//     }
//   };

//   // Scan all content for note references
//   if (raw.content && Array.isArray(raw.content)) {
//     for (const item of raw.content) {
//       if (item.type === 'sentence') {
//         const sentence = item as RawSentence;
//         collectNotes(sentence.text);

//         // Check clauses
//         if (sentence.clauses) {
//           for (const clause of sentence.clauses) {
//             collectNotes(clause.text);

//             // Check subclauses
//             if (clause.subclauses) {
//               for (const subclause of clause.subclauses) {
//                 collectNotes(subclause.text);
//               }
//             }
//           }
//         }
//       }
//     }
//   }

//   return Array.from(notesMap.values());
// }

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
            // Article.content is an array of ArticleContentNode (Sentence | Table | Figure | Equation | NoteReference)
            for (const contentNode of article.content) {
              ids.push(contentNode.id);
              // If it's a sentence, check for clauses
              if (contentNode.type === 'sentence' && 'content' in contentNode && contentNode.content) {
                for (const clauseNode of contentNode.content) {
                  ids.push(clauseNode.id);
                  // If it's a clause, check for subclauses
                  if (clauseNode.type === 'clause' && 'content' in clauseNode && clauseNode.content) {
                    for (const subclauseNode of clauseNode.content) {
                      ids.push(subclauseNode.id);
                    }
                  }
                }
              }
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
