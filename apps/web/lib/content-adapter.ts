/**
 * Content Adapter
 * 
 * Transforms the generated JSON structure from content-chunker
 * to match the TypeScript interfaces expected by the reading components.
 * 
 * Generated JSON uses:
 * - `number` instead of `reference`
 * - `text` instead of `content`
 * - Different clause structure
 * 
 * This adapter normalizes the data to match our component interfaces.
 */

import type {
  SectionContent,
  SubsectionContent,
  ArticleContent,
  ClauseContent,
  InlineContent,
} from '@repo/data';

/**
 * Raw JSON structure from generated content files
 */
interface RawSectionContent {
  id: string;
  number: string;
  title: string;
  type: 'section';
  subsections: RawSubsectionContent[];
  tables?: any[];
  figures?: any[];
  notes?: any[];
}

interface RawSubsectionContent {
  id: string;
  number: string;
  title: string;
  type: 'subsection';
  articles: RawArticleContent[];
}

interface RawArticleContent {
  id: string;
  number: string;
  title: string;
  type: 'article';
  clauses: RawClauseContent[];
  tables?: any[];
  figures?: any[];
  notes?: any[];
}

interface RawClauseContent {
  id: string;
  number: string;
  text: string;
  glossaryTerms?: string[];
  subClauses?: RawClauseContent[];
}

/**
 * Parse inline content from text with glossary term markers
 * Format: "text [REF:term:termId]term text[/REF] more text"
 */
function parseInlineContent(text: string, glossaryTerms: string[] = []): InlineContent[] {
  const content: InlineContent[] = [];
  
  // Simple implementation: split by glossary term markers
  // For now, just return the text as-is
  // TODO: Implement proper parsing of [REF:term:...] markers
  
  if (glossaryTerms.length > 0) {
    // For now, just return text content
    // Glossary term parsing will be implemented in Task 7
    content.push({
      type: 'text',
      text: text,
    });
  } else {
    content.push({
      type: 'text',
      text: text,
    });
  }
  
  return content;
}

/**
 * Determine clause level based on number format
 * "1" -> level 0
 * "a" -> level 1
 * "i" -> level 2
 * "A" -> level 3
 */
function getClauseLevel(number: string): number {
  // Remove parentheses if present
  const cleanNumber = number.replace(/[()]/g, '');
  
  // Check if it's a digit (level 0)
  if (/^\d+$/.test(cleanNumber)) {
    return 0;
  }
  
  // Check if it's lowercase letter (level 1)
  if (/^[a-z]+$/.test(cleanNumber)) {
    return 1;
  }
  
  // Check if it's lowercase roman numeral (level 2)
  if (/^[ivxlcdm]+$/.test(cleanNumber)) {
    return 2;
  }
  
  // Check if it's uppercase letter (level 3)
  if (/^[A-Z]+$/.test(cleanNumber)) {
    return 3;
  }
  
  // Default to level 0
  return 0;
}

/**
 * Transform raw clause to ClauseContent
 */
function transformClause(rawClause: RawClauseContent): ClauseContent {
  const level = getClauseLevel(rawClause.number);
  
  return {
    number: rawClause.number + ')',
    level,
    content: parseInlineContent(rawClause.text, rawClause.glossaryTerms),
    subClauses: rawClause.subClauses?.map(transformClause),
  };
}

/**
 * Transform raw article to ArticleContent
 */
function transformArticle(rawArticle: RawArticleContent, sectionRef: string, subsectionRef: string): ArticleContent {
  return {
    id: rawArticle.id,
    reference: `${sectionRef}.${subsectionRef}.${rawArticle.number}`,
    title: rawArticle.title,
    clauses: rawArticle.clauses.map(transformClause),
    tables: rawArticle.tables,
    figures: rawArticle.figures,
    notes: rawArticle.notes,
  };
}

/**
 * Transform raw subsection to SubsectionContent
 */
function transformSubsection(rawSubsection: RawSubsectionContent, sectionRef: string): SubsectionContent {
  const subsectionRef = `${sectionRef}.${rawSubsection.number}`;
  
  return {
    id: rawSubsection.id,
    reference: subsectionRef,
    title: rawSubsection.title,
    articles: rawSubsection.articles.map(article => 
      transformArticle(article, sectionRef, rawSubsection.number)
    ),
  };
}

/**
 * Extract division and part info from section ID
 * Format: "nbc.divA.part1.sect1" -> { division: "A", part: "1" }
 */
function extractDivisionAndPart(sectionId: string): { division: string; part: string } {
  const parts = sectionId.split('.');
  
  // Extract division (e.g., "divA" -> "A")
  const divMatch = parts[1]?.match(/div([A-Z])/);
  const division = divMatch ? divMatch[1] : 'A';
  
  // Extract part (e.g., "part1" -> "1")
  const partMatch = parts[2]?.match(/part(\d+)/);
  const part = partMatch ? partMatch[1] : '1';
  
  return { division, part };
}

/**
 * Transform raw section JSON to SectionContent
 * This is the main adapter function called by the content store
 */
export function adaptSectionContent(rawSection: RawSectionContent): SectionContent {
  const { division, part } = extractDivisionAndPart(rawSection.id);
  const sectionRef = `${division}.${part}.${rawSection.number}`;
  
  return {
    id: rawSection.id,
    reference: sectionRef,
    title: rawSection.title,
    partTitle: `Part ${part}`,
    partReference: part,
    divisionTitle: `Division ${division}`,
    divisionReference: division,
    subsections: rawSection.subsections.map(subsection => 
      transformSubsection(subsection, sectionRef)
    ),
    tables: rawSection.tables,
    figures: rawSection.figures,
    notes: rawSection.notes,
  };
}

/**
 * Fetch and adapt section content from JSON file
 */
export async function fetchAndAdaptSectionContent(
  version: string,
  division: string,
  part: string,
  section: string,
  signal?: AbortSignal
): Promise<SectionContent> {
  const response = await fetch(
    `/data/${version}/content/${division}/${part}/${section}.json`,
    { signal }
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Content not found: ${division}/${part}/${section}`);
    }
    throw new Error(`Failed to load content: ${response.statusText}`);
  }
  
  const rawSection: RawSectionContent = await response.json();
  return adaptSectionContent(rawSection);
}
