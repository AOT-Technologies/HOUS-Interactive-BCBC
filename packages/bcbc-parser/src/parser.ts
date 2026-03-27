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
  Spectables,
  PartAppendix,
  Section,
  Subsection,
  DivisionAppendix,
  DivisionAppendixSection,
  DivisionAppendixSubsection,
  DivisionAppendixArticle,
  ApplicationNote,
  AppendixDivision,
  AppendixParagraph,
  Article,
  ArticleContentNode,
  Sentence,
  SentenceContentNode,
  Clause,
  ClauseContentNode,
  Subclause,
  Table,
  TableCellContent,
  TableRow,
  Figure,
  Equation,
  GlossaryEntry,
  AmendmentDate,
  DocumentMetadata,
  Definition,
  Organization,
  StructuredList,
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
  front_matter?: {
    id: string;
    preface?: {
      id: string;
      type: 'preface';
      content: any[];
    };
    introduction?: {
      id: string;
      type: 'introduction';
      title?: string;
      content: any[];
    };
    committees?: {
      id: string;
      type: 'committees';
      title?: string;
      tables?: any[];
      notes?: any[];
    };
  };
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
  appendices?: RawDivisionAppendix[];
}

interface RawPart {
  id: string;
  type: 'part';
  number: string | number;
  title: string;
  sections: RawSection[];
  appendix?: RawPartAppendix;
  spectables?: RawSpectables[];
  special_tables?: RawSpectables[];
}

interface RawSpectables {
  id: string;
  type: 'spectables';
  title: string;
  table_prefix?: string;
  toc_entry?: string;
  tables?: RawTable[];
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
  lists?: RawStructuredList[];
  definitions?: Definition[];
  organizations?: Organization[];
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
  lists?: RawStructuredList[];
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
  lists?: RawStructuredList[];
  tables?: RawTable[];
  figures?: RawFigure[];
  equations?: RawEquation[];
  revisions?: RawRevision[];
}

interface RawTextListItem {
  id?: string;
  content: string;
}

interface RawVariableListItem {
  id?: string;
  symbol: string;
  description: string;
}

interface RawDefinitionList {
  type: 'definition';
  items: Definition[];
}

interface RawOrganizationList {
  type: 'organization';
  items: Organization[];
}

interface RawBibliographyList {
  type: 'bibliography';
  header?: string;
  items: RawTextListItem[];
}

interface RawTextList {
  type: 'bulleted' | 'numbered' | 'alphabetic';
  items: RawTextListItem[];
}

interface RawVariableList {
  type: 'variable';
  items: RawVariableListItem[];
}

type RawStructuredList =
  | RawTextList
  | RawVariableList
  | RawDefinitionList
  | RawOrganizationList
  | RawBibliographyList;

type RawTableCellContentItem =
  | {
      type: 'text';
      value?: string;
    }
  | {
      type: 'figure';
      id?: string;
      source?: string;
      title?: string;
      graphic?: { src: string; alt_text: string };
    }
  | {
      type: 'list';
      list_type?: 'bulleted' | 'numbered' | 'alphabetic' | 'variable' | 'definition' | 'organization';
      items?: unknown[];
    };

interface RawTableCell {
  content?: string | RawTableCellContentItem[];
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
  source?: string;
  title?: string;
  caption?: string;
  number?: string;
  forming_part?: Array<{
    type: string;
    target: string;
    display_type?: string;
  }>;
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
  notes?: Array<{
    id: string;
    content?: string;
  }>;
}

interface RawEquation {
  id: string;
  type: 'equation' | 'display' | 'inline';
  number?: string;
  latex?: string;
  description?: string;
  plainText?: string;
  mathml?: string;
  htmlSrc?: string;
  image?: string;
  imageSrc?: string;
}

interface RawGlossaryEntry {
  term: string;
  definition: string;
  location_id?: string;
  related_terms?: string[];
}

interface RawAppendixParagraph {
  id: string;
  type?: 'paragraph';
  content: string;
  equations?: RawEquation[];
  lists?: RawStructuredList[];
}

interface RawAppendixDivision {
  id: string;
  title?: string;
  paragraphs?: RawAppendixParagraph[];
  tables?: RawTable[];
  figures?: RawFigure[];
}

interface RawApplicationNote {
  id: string;
  type: 'application_note';
  number?: string;
  title?: string;
  paragraphs?: RawAppendixParagraph[];
  tables?: RawTable[];
  figures?: RawFigure[];
  divisions?: RawAppendixDivision[];
}

interface RawPartAppendix {
  id: string;
  type: 'part_appendix';
  introduction?: string;
  application_notes?: RawApplicationNote[];
}

interface RawDivisionAppendixArticle {
  id: string;
  type: 'appendix_article';
  title: string;
  paragraphs?: RawAppendixParagraph[];
  content?: Array<RawAppendixParagraph | RawTable | RawFigure>;
  see_also?: string;
}

interface RawDivisionAppendixSubsection {
  id: string;
  type: 'appendix_subsection';
  title: string;
  paragraphs?: RawAppendixParagraph[];
  articles: RawDivisionAppendixArticle[];
}

interface RawDivisionAppendixSection {
  id: string;
  type: 'appendix_section';
  title: string;
  paragraphs?: RawAppendixParagraph[];
  subsections?: RawDivisionAppendixSubsection[];
}

interface RawDivisionAppendix {
  id: string;
  type: 'appendix';
  letter: string;
  number: string | number;
  title: string;
  introduction?: string;
  sections?: RawDivisionAppendixSection[];
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
    frontMatter: raw.front_matter,  // New: front matter with preface, introduction, committees
    preface: raw.preface,  // Legacy: keep for backward compatibility
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
    appendices: raw.appendices?.map(parseDivisionAppendixData),
  };
}

/**
 * Parse a part from raw data
 */
function parsePartData(raw: RawPart): Part {
  const spectables = raw.spectables || raw.special_tables;
  return {
    id: raw.id,
    number: String(raw.number),
    title: raw.title,
    type: 'part',
    sections: raw.sections.map(parseSectionData),
    appendix: raw.appendix ? parsePartAppendixData(raw.appendix) : undefined,
    spectables: spectables?.map(parseSpectablesData),
  };
}

function parseSpectablesData(raw: RawSpectables): Spectables {
  return {
    id: raw.id,
    type: 'spectables',
    title: raw.title,
    table_prefix: raw.table_prefix,
    toc_entry: raw.toc_entry,
    tables: (raw.tables || []).map(parseTableData),
  };
}

function parseAppendixParagraph(raw: RawAppendixParagraph): AppendixParagraph {
  return {
    id: raw.id,
    content: raw.content,
    equations: raw.equations?.map(parseEquationData),
    lists: parseStructuredLists(raw.lists),
  };
}

function parseStructuredLists(
  rawLists?: RawStructuredList[],
  legacyDefinitions?: Definition[],
  legacyOrganizations?: Organization[]
): StructuredList[] | undefined {
  const parsedLists: StructuredList[] = [];

  if (Array.isArray(rawLists)) {
    for (const list of rawLists) {
      if (!list || typeof list !== 'object' || !Array.isArray(list.items)) {
        continue;
      }

      switch (list.type) {
        case 'bulleted':
        case 'numbered':
        case 'alphabetic':
          parsedLists.push({
            type: list.type,
            items: list.items
              .filter((item) => item && typeof item.content === 'string')
              .map((item) => ({
                id: item.id,
                content: item.content,
              })),
          });
          break;
        case 'variable':
          parsedLists.push({
            type: 'variable',
            items: list.items
              .filter(
                (item) =>
                  item &&
                  typeof item.symbol === 'string' &&
                  typeof item.description === 'string'
              )
              .map((item) => ({
                id: item.id,
                symbol: item.symbol,
                description: item.description,
              })),
          });
          break;
        case 'definition':
          parsedLists.push({
            type: 'definition',
            items: list.items
              .filter(
                (item) =>
                  item &&
                  typeof item.id === 'string' &&
                  typeof item.term === 'string' &&
                  typeof item.definition === 'string'
              )
              .map((item) => ({
                id: item.id,
                term: item.term,
                definition: item.definition,
              })),
          });
          break;
        case 'organization':
          parsedLists.push({
            type: 'organization',
            items: list.items
              .filter(
                (item) =>
                  item &&
                  typeof item.id === 'string' &&
                  typeof item.abbreviation === 'string' &&
                  typeof item.fullName === 'string'
              )
              .map((item) => ({
                id: item.id,
                abbreviation: item.abbreviation,
                fullName: item.fullName,
                website: item.website,
              })),
          });
          break;
        case 'bibliography':
          parsedLists.push({
            type: 'bibliography',
            header: (list as RawBibliographyList).header,
            items: list.items
              .filter((item) => item && typeof item.content === 'string')
              .map((item) => ({
                id: item.id,
                content: item.content,
              })),
          });
          break;
      }
    }
  }

  if (Array.isArray(legacyDefinitions) && legacyDefinitions.length > 0) {
    parsedLists.push({
      type: 'definition',
      items: legacyDefinitions,
    });
  }

  if (Array.isArray(legacyOrganizations) && legacyOrganizations.length > 0) {
    parsedLists.push({
      type: 'organization',
      items: legacyOrganizations,
    });
  }

  return parsedLists.length > 0 ? parsedLists : undefined;
}

function parseTableCellContentItem(item: RawTableCellContentItem): TableCellContent | null {
  if (!item || typeof item !== 'object' || typeof item.type !== 'string') {
    return null;
  }

  switch (item.type) {
    case 'text':
      return {
        type: 'text',
        value: item.value || '',
      };
    case 'figure':
      return {
        type: 'figure',
        id: item.id,
        source: item.source as 'nbc' | 'bc' | undefined,
        title: item.title,
        graphic: item.graphic,
      };
    case 'list': {
      if (!item.list_type || !Array.isArray(item.items)) {
        return null;
      }

      const parsedList = parseStructuredLists([
        {
          type: item.list_type,
          items: item.items as never[],
        } as RawStructuredList,
      ])?.[0];

      if (!parsedList) {
        return null;
      }

      return {
        type: 'list',
        list: parsedList,
      };
    }
    default:
      return null;
  }
}

function extractTableCellContentText(content: string | TableCellContent[]): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((item) => {
      if (item.type === 'text') {
        return item.value || '';
      }

      if (item.type === 'figure') {
        return [item.title || '', item.graphic?.alt_text || ''].filter(Boolean).join(' ');
      }

      if (item.type === 'list') {
        switch (item.list.type) {
          case 'bulleted':
          case 'numbered':
          case 'alphabetic':
            return item.list.items.map((entry) => entry.content).join(' ');
          case 'variable':
            return item.list.items
              .map((entry) => `${entry.symbol} ${entry.description}`.trim())
              .join(' ');
          case 'definition':
            return item.list.items
              .map((entry) => `${entry.term} ${entry.definition}`.trim())
              .join(' ');
          case 'organization':
            return item.list.items
              .map((entry) => `${entry.abbreviation} ${entry.fullName} ${entry.website || ''}`.trim())
              .join(' ');
          default:
            return '';
        }
      }

      return '';
    })
    .join(' ')
    .trim();
}

function parseAppendixDivision(raw: RawAppendixDivision): AppendixDivision {
  return {
    id: raw.id,
    title: raw.title,
    paragraphs: raw.paragraphs?.map(parseAppendixParagraph),
    tables: raw.tables?.map(parseTableData),
    figures: raw.figures?.map(parseFigureData),
  };
}

function parseApplicationNote(raw: RawApplicationNote): ApplicationNote {
  return {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    paragraphs: raw.paragraphs?.map(parseAppendixParagraph),
    tables: raw.tables?.map(parseTableData),
    figures: raw.figures?.map(parseFigureData),
    divisions: raw.divisions?.map(parseAppendixDivision),
  };
}

function parsePartAppendixData(raw: RawPartAppendix): PartAppendix {
  return {
    id: raw.id,
    type: 'part_appendix',
    introduction: raw.introduction,
    application_notes: raw.application_notes?.map(parseApplicationNote),
  };
}

function parseDivisionAppendixArticleData(raw: RawDivisionAppendixArticle): DivisionAppendixArticle {
  // Support both unified content array (new) and separate paragraphs+content (legacy)
  const unifiedContent: Array<AppendixParagraph | Table | Figure> = [];

  if (raw.content && raw.content.length > 0) {
    for (const item of raw.content) {
      const itemType = (item as { type?: string }).type;
      if (itemType === 'table') {
        unifiedContent.push(parseTableData(item as RawTable));
      } else if (itemType === 'figure') {
        unifiedContent.push(parseFigureData(item as RawFigure));
      } else {
        // paragraph (type === 'paragraph' or no type in legacy data)
        unifiedContent.push(parseAppendixParagraph(item as RawAppendixParagraph));
      }
    }
  } else if (raw.paragraphs) {
    // Legacy: separate paragraphs array
    for (const p of raw.paragraphs) {
      unifiedContent.push(parseAppendixParagraph(p));
    }
  }

  return {
    id: raw.id,
    type: 'appendix_article',
    title: raw.title,
    content: unifiedContent.length > 0 ? unifiedContent : undefined,
    see_also: raw.see_also,
  };
}

function parseDivisionAppendixSubsectionData(raw: RawDivisionAppendixSubsection): DivisionAppendixSubsection {
  return {
    id: raw.id,
    type: 'appendix_subsection',
    title: raw.title,
    paragraphs: raw.paragraphs?.map(parseAppendixParagraph),
    articles: raw.articles.map(parseDivisionAppendixArticleData),
  };
}

function parseDivisionAppendixSectionData(raw: RawDivisionAppendixSection): DivisionAppendixSection {
  return {
    id: raw.id,
    type: 'appendix_section',
    title: raw.title,
    paragraphs: raw.paragraphs?.map(parseAppendixParagraph),
    subsections: raw.subsections?.map(parseDivisionAppendixSubsectionData),
  };
}

function parseDivisionAppendixData(raw: RawDivisionAppendix): DivisionAppendix {
  return {
    id: raw.id,
    type: 'appendix',
    letter: raw.letter,
    number: String(raw.number),
    title: raw.title,
    introduction: raw.introduction,
    sections: raw.sections?.map(parseDivisionAppendixSectionData) || [],
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
  const equations = raw.equations?.map(parseEquationData);
  const hasInlineEquationMarkers = /\[EQ:(?:display|inline)(?::[^\]]*)?\]/i.test(raw.text);

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
  if (!hasInlineEquationMarkers && raw.equations && Array.isArray(raw.equations)) {
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
    equations: equations && equations.length > 0 ? equations : undefined,
    lists: parseStructuredLists(raw.lists, raw.definitions, raw.organizations),
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
  const equations = raw.equations?.map(parseEquationData);
  const hasInlineEquationMarkers = /\[EQ:(?:display|inline)(?::[^\]]*)?\]/i.test(raw.text);

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
  if (!hasInlineEquationMarkers && raw.equations && Array.isArray(raw.equations)) {
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
    equations: equations && equations.length > 0 ? equations : undefined,
    lists: parseStructuredLists(raw.lists),
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
  const equations = raw.equations?.map(parseEquationData);
  const hasInlineEquationMarkers = /\[EQ:(?:display|inline)(?::[^\]]*)?\]/i.test(raw.text);

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
  if (!hasInlineEquationMarkers && raw.equations && Array.isArray(raw.equations)) {
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
    equations: equations && equations.length > 0 ? equations : undefined,
    lists: parseStructuredLists(raw.lists),
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
                ? cell.content
                    .map(parseTableCellContentItem)
                    .filter((item): item is TableCellContent => item !== null)
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
              const parsedContent = Array.isArray(cell.content)
                ? cell.content
                    .map(parseTableCellContentItem)
                    .filter((item): item is TableCellContent => item !== null)
                : cell.content || '';
              return extractTableCellContentText(parsedContent);
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
              content: Array.isArray(cell.content)
                ? cell.content
                    .map(parseTableCellContentItem)
                    .filter((item: TableCellContent | null): item is TableCellContent => item !== null)
                : cell.content || '',
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
              const parsedContent = Array.isArray(cell.content)
                ? cell.content
                    .map(parseTableCellContentItem)
                    .filter((item: TableCellContent | null): item is TableCellContent => item !== null)
                : cell.content || '';
              return extractTableCellContentText(parsedContent);
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
              content: Array.isArray(cell.content)
                ? cell.content
                    .map(parseTableCellContentItem)
                    .filter((item: TableCellContent | null): item is TableCellContent => item !== null)
                : cell.content || '',
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
    number: raw.number || extractTableNumber(raw.id, raw.forming_part),
    title: raw.title || '',
    source: raw.source,
    caption: raw.caption,
    headers,
    rows,
    formingPart: raw.forming_part,
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
    notes: Array.isArray(raw.notes)
      ? raw.notes
          .filter((note) => note && typeof note.id === 'string')
          .map((note) => ({
            id: note.id,
            content: note.content || '',
          }))
      : undefined,
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
    latex: raw.latex || raw.plainText || '',
    description: raw.description,
    plainText: raw.plainText,
    mathml: raw.mathml,
    htmlSrc: raw.htmlSrc,
    image: raw.image,
    imageSrc: raw.imageSrc,
    display: raw.type === 'inline' ? 'inline' : 'block',
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
 * Formats:
 * - Legacy: [REF:term:termId]termText
 * - Current: [REF:term:termId:term label]
 */
function extractGlossaryTerms(text: string): string[] {
  const terms: string[] = [];
  const regex = /\[REF:term:([^\]]+)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const payload = (match[1] || '').trim();
    const separatorIndex = payload.indexOf(':');
    const termId = separatorIndex === -1 ? payload : payload.slice(0, separatorIndex).trim();

    if (termId) {
      terms.push(termId);
    }
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

function extractArticleReference(targetId: string): string | null {
  const part = targetId.match(/\.part(\d+)/i)?.[1];
  const section = targetId.match(/\.sect(\d+)/i)?.[1];
  const subsection = targetId.match(/\.subsect(\d+)/i)?.[1];
  const article = targetId.match(/\.art(\d+)/i)?.[1];

  if (!part || !section || !subsection || !article) {
    return null;
  }

  return `${part}.${section}.${subsection}.${article}`;
}

function extractTableNumber(
  id: string,
  formingPart?: Array<{ target: string }>
): string {
  const formingPartTarget = formingPart?.find((entry) => typeof entry?.target === 'string')?.target;
  const targetReference = formingPartTarget ? extractArticleReference(formingPartTarget) : null;
  if (targetReference) {
    return targetReference;
  }

  const idReference = extractArticleReference(id);
  if (idReference) {
    return idReference;
  }

  return extractNumberFromId(id);
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
