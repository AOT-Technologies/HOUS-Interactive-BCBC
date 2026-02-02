/**
 * BCBC Search Index Builder
 * 
 * Generates search documents and metadata from BCBC JSON source.
 * Outputs:
 * - documents.json: Flat array of searchable documents
 * - metadata.json: Unified metadata (TOC, revisions, divisions, stats)
 * - Individual files: navigation-tree.json, amendment-dates.json, etc.
 */

import type {
  IndexerConfig,
  SearchDocument,
  SearchMetadata,
  RevisionDate,
  TableOfContentsItem,
  IndexableContentType,
} from './config';
import {
  DEFAULT_INDEXER_CONFIG,
} from './config';
import {
  extractArticleText,
  extractTableText,
  generateSnippet,
  hasTablesInContent,
  hasFiguresInContent,
  hasInternalRefs,
  hasExternalRefs,
  hasTermRefs,
  normalizeWhitespace,
  stripReferences,
} from './text-extractor';

/**
 * BCBC JSON structure types (simplified for indexing)
 */
interface BCBCDivision {
  id: string;
  type: string;
  letter: string;
  title: string;
  parts: BCBCPart[];
}

interface BCBCPart {
  id: string;
  type: string;
  number: number;
  title: string;
  sections: BCBCSection[];
}

interface BCBCSection {
  id: string;
  type: string;
  number: number;
  title: string;
  subsections: BCBCSubsection[];
}

interface BCBCSubsection {
  id: string;
  type: string;
  number: number;
  title: string;
  articles: BCBCArticle[];
}

interface BCBCArticle {
  id: string;
  type: string;
  number: number;
  title: string;
  content: BCBCContent[];
  revisions?: BCBCRevision[];
}

interface BCBCContent {
  id?: string;
  type: string;
  number?: number | string;
  text?: string;
  title?: string;
  clauses?: any[];
  structure?: any;
  revisions?: BCBCRevision[];
}

interface BCBCRevision {
  type: 'original' | 'revision';
  revision_type?: 'amendment' | 'add' | 'replace' | 'delete';
  effective_date: string;
  status?: string;
  text?: string;
  title?: string;
  content?: any[];
}

interface BCBCGlossaryEntry {
  term: string;
  definition: string;
  location_id?: string;
}

interface BCBCFrontMatterContent {
  type: string;
  id: string;
  content?: string;
  level?: number;
}

interface BCBCPreface {
  id: string;
  type: string;
  content: BCBCFrontMatterContent[];
}

interface BCBCFrontMatter {
  id: string;
  preface?: BCBCPreface;
}

interface BCBCDocument {
  document_type: string;
  version: string;
  divisions: BCBCDivision[];
  glossary?: Record<string, BCBCGlossaryEntry>;
  front_matter?: BCBCFrontMatter;
}

/**
 * Index builder result
 */
export interface IndexBuilderResult {
  documents: SearchDocument[];
  metadata: SearchMetadata;
}

/**
 * Build search index from BCBC document
 * 
 * @param bcbcData - Parsed BCBC JSON document
 * @param config - Indexer configuration (optional, uses defaults)
 * @returns Index builder result with documents and metadata
 */
export function buildSearchIndex(
  bcbcData: BCBCDocument,
  config: Partial<IndexerConfig> = {}
): IndexBuilderResult {
  // Merge with defaults
  const fullConfig: IndexerConfig = {
    ...DEFAULT_INDEXER_CONFIG,
    ...config,
    references: { ...DEFAULT_INDEXER_CONFIG.references, ...config.references },
    contentTypes: { ...DEFAULT_INDEXER_CONFIG.contentTypes, ...config.contentTypes },
    textExtraction: { ...DEFAULT_INDEXER_CONFIG.textExtraction, ...config.textExtraction },
    output: { ...DEFAULT_INDEXER_CONFIG.output, ...config.output },
  };

  const documents: SearchDocument[] = [];
  const revisionDatesMap = new Map<string, { count: number; types: Set<string> }>();
  const tableOfContents: TableOfContentsItem[] = [];
  const contentTypesFound = new Set<IndexableContentType>();

  // Process front matter (preface) if present
  if (bcbcData.front_matter?.preface && fullConfig.contentTypes.article.enabled) {
    const frontMatterTocItem = processFrontMatter(bcbcData.front_matter, documents, fullConfig);
    if (frontMatterTocItem) {
      tableOfContents.push(frontMatterTocItem);
    }
    contentTypesFound.add('article');
  }

  // Process divisions
  for (const division of bcbcData.divisions) {
    const divisionTocItem = processDivision(
      division,
      documents,
      revisionDatesMap,
      contentTypesFound,
      fullConfig
    );
    tableOfContents.push(divisionTocItem);
  }

  // Process glossary (glossary is an object with IDs as keys)
  if (bcbcData.glossary && fullConfig.contentTypes.glossary.enabled) {
    const glossaryEntries = Object.entries(bcbcData.glossary).map(([id, entry]) => ({
      id,
      ...entry,
    }));
    processGlossary(glossaryEntries, documents, fullConfig);
    contentTypesFound.add('glossary');
  }

  // Build revision dates array
  const revisionDates = buildRevisionDates(revisionDatesMap);

  // Build metadata
  const metadata: SearchMetadata = {
    version: bcbcData.version || '1.0',
    generatedAt: new Date().toISOString(),
    statistics: {
      totalDocuments: documents.length,
      totalArticles: documents.filter(d => d.type === 'article').length,
      totalTables: documents.filter(d => d.type === 'table').length,
      totalFigures: documents.filter(d => d.type === 'figure').length,
      totalParts: documents.filter(d => d.type === 'part').length,
      totalSections: documents.filter(d => d.type === 'section').length,
      totalSubsections: documents.filter(d => d.type === 'subsection').length,
      totalAmendments: documents.filter(d => d.hasAmendment).length,
      totalRevisionDates: revisionDates.length,
      totalGlossaryTerms: documents.filter(d => d.type === 'glossary').length,
    },
    divisions: bcbcData.divisions.map(d => ({
      id: d.id,
      letter: d.letter,
      title: d.title,
      parts: d.parts.map(p => ({
        id: p.id,
        number: p.number,
        title: p.title,
      })),
    })),
    revisionDates,
    tableOfContents,
    contentTypes: Array.from(contentTypesFound),
  };

  return { documents, metadata };
}

/**
 * Process a division and its children
 */
function processDivision(
  division: BCBCDivision,
  documents: SearchDocument[],
  revisionDatesMap: Map<string, { count: number; types: Set<string> }>,
  contentTypesFound: Set<IndexableContentType>,
  config: IndexerConfig
): TableOfContentsItem {
  const tocItem: TableOfContentsItem = {
    id: division.id,
    type: 'division',
    number: division.letter,
    title: division.title,
    level: 0,
    children: [],
    hasRevisions: false,
  };

  for (const part of division.parts) {
    const partTocItem = processPart(
      division,
      part,
      documents,
      revisionDatesMap,
      contentTypesFound,
      config
    );
    tocItem.children!.push(partTocItem);
    if (partTocItem.hasRevisions) {
      tocItem.hasRevisions = true;
    }
  }

  return tocItem;
}

/**
 * Process a part
 */
function processPart(
  division: BCBCDivision,
  part: BCBCPart,
  documents: SearchDocument[],
  revisionDatesMap: Map<string, { count: number; types: Set<string> }>,
  contentTypesFound: Set<IndexableContentType>,
  config: IndexerConfig
): TableOfContentsItem {
  // Add part document if enabled
  if (config.contentTypes.part.enabled) {
    documents.push(createPartDocument(division, part, config));
    contentTypesFound.add('part');
  }

  const tocItem: TableOfContentsItem = {
    id: part.id,
    type: 'part',
    number: part.number,
    title: part.title,
    level: 1,
    children: [],
    hasRevisions: false,
  };

  for (const section of part.sections) {
    const sectionTocItem = processSection(
      division,
      part,
      section,
      documents,
      revisionDatesMap,
      contentTypesFound,
      config
    );
    tocItem.children!.push(sectionTocItem);
    if (sectionTocItem.hasRevisions) {
      tocItem.hasRevisions = true;
    }
  }

  return tocItem;
}

/**
 * Process a section
 */
function processSection(
  division: BCBCDivision,
  part: BCBCPart,
  section: BCBCSection,
  documents: SearchDocument[],
  revisionDatesMap: Map<string, { count: number; types: Set<string> }>,
  contentTypesFound: Set<IndexableContentType>,
  config: IndexerConfig
): TableOfContentsItem {
  // Add section document if enabled
  if (config.contentTypes.section.enabled) {
    documents.push(createSectionDocument(division, part, section, config));
    contentTypesFound.add('section');
  }

  const tocItem: TableOfContentsItem = {
    id: section.id,
    type: 'section',
    number: section.number,
    title: section.title,
    level: 2,
    children: [],
    hasRevisions: false,
  };

  for (const subsection of section.subsections) {
    const subsectionTocItem = processSubsection(
      division,
      part,
      section,
      subsection,
      documents,
      revisionDatesMap,
      contentTypesFound,
      config
    );
    tocItem.children!.push(subsectionTocItem);
    if (subsectionTocItem.hasRevisions) {
      tocItem.hasRevisions = true;
    }
  }

  return tocItem;
}

/**
 * Process a subsection
 */
function processSubsection(
  division: BCBCDivision,
  part: BCBCPart,
  section: BCBCSection,
  subsection: BCBCSubsection,
  documents: SearchDocument[],
  revisionDatesMap: Map<string, { count: number; types: Set<string> }>,
  contentTypesFound: Set<IndexableContentType>,
  config: IndexerConfig
): TableOfContentsItem {
  // Add subsection document if enabled
  if (config.contentTypes.subsection.enabled) {
    documents.push(createSubsectionDocument(division, part, section, subsection, config));
    contentTypesFound.add('subsection');
  }

  const tocItem: TableOfContentsItem = {
    id: subsection.id,
    type: 'subsection',
    number: subsection.number,
    title: subsection.title,
    level: 3,
    children: [],
    hasRevisions: false,
  };

  for (const article of subsection.articles) {
    const articleTocItem = processArticle(
      division,
      part,
      section,
      subsection,
      article,
      documents,
      revisionDatesMap,
      contentTypesFound,
      config
    );
    tocItem.children!.push(articleTocItem);
    if (articleTocItem.hasRevisions) {
      tocItem.hasRevisions = true;
    }
  }

  return tocItem;
}

/**
 * Process an article and its content (tables, figures)
 */
function processArticle(
  division: BCBCDivision,
  part: BCBCPart,
  section: BCBCSection,
  subsection: BCBCSubsection,
  article: BCBCArticle,
  documents: SearchDocument[],
  revisionDatesMap: Map<string, { count: number; types: Set<string> }>,
  contentTypesFound: Set<IndexableContentType>,
  config: IndexerConfig
): TableOfContentsItem {
  // Check for revisions
  const revisionInfo = extractRevisionInfo(article, revisionDatesMap);
  
  // Add article document if enabled
  if (config.contentTypes.article.enabled) {
    documents.push(createArticleDocument(
      division, part, section, subsection, article, revisionInfo, config
    ));
    contentTypesFound.add('article');
  }

  // Process tables and figures within article content
  if (article.content) {
    for (const content of article.content) {
      if (content.type === 'table' && config.contentTypes.table.enabled) {
        const tableRevInfo = extractContentRevisionInfo(content, revisionDatesMap);
        documents.push(createTableDocument(
          division, part, section, subsection, article, content, tableRevInfo, config
        ));
        contentTypesFound.add('table');
      }
      
      if (content.type === 'figure' && config.contentTypes.figure.enabled) {
        const figureRevInfo = extractContentRevisionInfo(content, revisionDatesMap);
        documents.push(createFigureDocument(
          division, part, section, subsection, article, content, figureRevInfo, config
        ));
        contentTypesFound.add('figure');
      }
    }
  }

  return {
    id: article.id,
    type: 'article',
    number: article.number,
    title: article.title,
    level: 4,
    hasRevisions: revisionInfo.hasAmendment,
  };
}

/**
 * Extract revision information from an article
 */
function extractRevisionInfo(
  article: BCBCArticle,
  revisionDatesMap: Map<string, { count: number; types: Set<string> }>
): { hasAmendment: boolean; amendmentType?: string; latestDate?: string } {
  let hasAmendment = false;
  let amendmentType: string | undefined;
  let latestDate: string | undefined;

  // Check article-level revisions
  if (article.revisions) {
    for (const rev of article.revisions) {
      trackRevisionDate(rev, revisionDatesMap);
      if (rev.type === 'revision') {
        hasAmendment = true;
        amendmentType = rev.revision_type;
        if (!latestDate || rev.effective_date > latestDate) {
          latestDate = rev.effective_date;
        }
      }
    }
  }

  // Check content-level revisions
  if (article.content) {
    for (const content of article.content) {
      if (content.revisions) {
        for (const rev of content.revisions) {
          trackRevisionDate(rev, revisionDatesMap);
          if (rev.type === 'revision') {
            hasAmendment = true;
            if (!amendmentType) amendmentType = rev.revision_type;
            if (!latestDate || rev.effective_date > latestDate) {
              latestDate = rev.effective_date;
            }
          }
        }
      }
    }
  }

  return { hasAmendment, amendmentType, latestDate };
}

/**
 * Extract revision info from content item (table, figure)
 */
function extractContentRevisionInfo(
  content: BCBCContent,
  revisionDatesMap: Map<string, { count: number; types: Set<string> }>
): { hasAmendment: boolean; amendmentType?: string; latestDate?: string } {
  let hasAmendment = false;
  let amendmentType: string | undefined;
  let latestDate: string | undefined;

  if (content.revisions) {
    for (const rev of content.revisions) {
      trackRevisionDate(rev, revisionDatesMap);
      if (rev.type === 'revision') {
        hasAmendment = true;
        amendmentType = rev.revision_type;
        if (!latestDate || rev.effective_date > latestDate) {
          latestDate = rev.effective_date;
        }
      }
    }
  }

  return { hasAmendment, amendmentType, latestDate };
}

/**
 * Track revision date in the map
 */
function trackRevisionDate(
  revision: BCBCRevision,
  revisionDatesMap: Map<string, { count: number; types: Set<string> }>
): void {
  if (!revision.effective_date) return;
  
  const existing = revisionDatesMap.get(revision.effective_date) || { 
    count: 0, 
    types: new Set<string>() 
  };
  existing.count++;
  existing.types.add(revision.type);
  revisionDatesMap.set(revision.effective_date, existing);
}

/**
 * Build revision dates array from map
 */
function buildRevisionDates(
  revisionDatesMap: Map<string, { count: number; types: Set<string> }>
): RevisionDate[] {
  return Array.from(revisionDatesMap.entries())
    .map(([date, info]) => ({
      effectiveDate: date,
      displayDate: formatDisplayDate(date),
      count: info.count,
      type: determineRevisionType(info.types),
    }))
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
}

/**
 * Format date for display
 */
function formatDisplayDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Determine revision type from set of types
 */
function determineRevisionType(types: Set<string>): 'original' | 'amendment' | 'mixed' {
  if (types.size > 1) return 'mixed';
  const type = Array.from(types)[0];
  if (type === 'original') return 'original';
  return 'amendment';
}

/**
 * Create base document fields
 */
function createBaseDocument(
  division: BCBCDivision,
  part: BCBCPart,
  section: BCBCSection | null,
  subsection: BCBCSubsection | null,
  _config: IndexerConfig
): Partial<SearchDocument> {
  return {
    divisionId: division.id,
    divisionLetter: division.letter,
    divisionTitle: division.title,
    partId: part.id,
    partNumber: part.number,
    partTitle: part.title,
    sectionId: section?.id || '',
    sectionNumber: section?.number || 0,
    sectionTitle: section?.title || '',
    subsectionId: subsection?.id || '',
    subsectionNumber: subsection?.number || 0,
    subsectionTitle: subsection?.title || '',
    hasAmendment: false,
    hasInternalRefs: false,
    hasExternalRefs: false,
    hasTermRefs: false,
    hasTables: false,
    hasFigures: false,
  };
}

/**
 * Create part document
 */
function createPartDocument(
  division: BCBCDivision,
  part: BCBCPart,
  config: IndexerConfig
): SearchDocument {
  const articleNumber = `${division.letter}.${part.number}`;
  const urlPath = `/code/${division.id}/${part.number}`;
  
  return {
    ...createBaseDocument(division, part, null, null, config),
    id: part.id,
    type: 'part',
    articleNumber,
    title: part.title,
    text: part.title,
    snippet: part.title,
    path: `Division ${division.letter} > Part ${part.number}`,
    breadcrumbs: [division.title, part.title],
    urlPath,
    searchPriority: config.contentTypes.part.priority,
  } as SearchDocument;
}

/**
 * Create section document
 */
function createSectionDocument(
  division: BCBCDivision,
  part: BCBCPart,
  section: BCBCSection,
  config: IndexerConfig
): SearchDocument {
  const articleNumber = `${division.letter}.${part.number}.${section.number}`;
  const urlPath = `/code/${division.id}/${part.number}/${section.number}`;
  
  return {
    ...createBaseDocument(division, part, section, null, config),
    id: section.id,
    type: 'section',
    articleNumber,
    title: section.title,
    text: section.title,
    snippet: section.title,
    path: `Division ${division.letter} > Part ${part.number} > Section ${section.number}`,
    breadcrumbs: [division.title, part.title, section.title],
    urlPath,
    searchPriority: config.contentTypes.section.priority,
  } as SearchDocument;
}

/**
 * Create subsection document
 */
function createSubsectionDocument(
  division: BCBCDivision,
  part: BCBCPart,
  section: BCBCSection,
  subsection: BCBCSubsection,
  config: IndexerConfig
): SearchDocument {
  const articleNumber = `${division.letter}.${part.number}.${section.number}.${subsection.number}`;
  const urlPath = `/code/${division.id}/${part.number}/${section.number}/${subsection.number}`;
  
  return {
    ...createBaseDocument(division, part, section, subsection, config),
    id: subsection.id,
    type: 'subsection',
    articleNumber,
    title: subsection.title,
    text: subsection.title,
    snippet: subsection.title,
    path: `Division ${division.letter} > Part ${part.number} > Section ${section.number} > Subsection ${subsection.number}`,
    breadcrumbs: [division.title, part.title, section.title, subsection.title],
    urlPath,
    searchPriority: config.contentTypes.subsection.priority,
  } as SearchDocument;
}

/**
 * Create article document
 */
function createArticleDocument(
  division: BCBCDivision,
  part: BCBCPart,
  section: BCBCSection,
  subsection: BCBCSubsection,
  article: BCBCArticle,
  revisionInfo: { hasAmendment: boolean; amendmentType?: string; latestDate?: string },
  config: IndexerConfig
): SearchDocument {
  const articleNumber = `${division.letter}.${part.number}.${section.number}.${subsection.number}.${article.number}`;
  const urlPath = `/code/${division.id}/${part.number}/${section.number}/${subsection.number}/${article.number}`;
  
  // Extract text from content
  const { text, referenceIds } = extractArticleText(
    article.content,
    config.textExtraction,
    config.references
  );
  
  // Check for references in raw text (before stripping)
  const rawText = article.content?.map(c => c.text || '').join(' ') || '';
  
  // Calculate priority with amendment boost
  let priority = config.contentTypes.article.priority;
  if (revisionInfo.hasAmendment) {
    priority *= config.contentTypes.article.amendmentBoost;
  }
  
  return {
    ...createBaseDocument(division, part, section, subsection, config),
    id: article.id,
    type: 'article',
    articleNumber,
    title: article.title,
    text,
    snippet: generateSnippet(text, config.textExtraction.snippetLength),
    path: `Division ${division.letter} > Part ${part.number} > Section ${section.number} > ${subsection.number}.${article.number}`,
    breadcrumbs: [division.title, part.title, section.title, subsection.title, article.title],
    urlPath,
    hasAmendment: revisionInfo.hasAmendment,
    amendmentType: revisionInfo.amendmentType as any,
    latestAmendmentDate: revisionInfo.latestDate,
    hasInternalRefs: hasInternalRefs(rawText),
    hasExternalRefs: hasExternalRefs(rawText),
    hasTermRefs: hasTermRefs(rawText),
    hasTables: hasTablesInContent(article.content),
    hasFigures: hasFiguresInContent(article.content),
    searchPriority: priority,
    referenceIds: config.references.preserveReferenceIds ? referenceIds : undefined,
  } as SearchDocument;
}

/**
 * Create table document
 */
function createTableDocument(
  division: BCBCDivision,
  part: BCBCPart,
  section: BCBCSection,
  subsection: BCBCSubsection,
  article: BCBCArticle,
  table: BCBCContent,
  revisionInfo: { hasAmendment: boolean; amendmentType?: string; latestDate?: string },
  config: IndexerConfig
): SearchDocument {
  const tableNum = table.number || '1';
  const articleNumber = `${division.letter}.${part.number}.${section.number}.${subsection.number}.${article.number}`;
  const fullNumber = `${articleNumber} Table ${tableNum}`;
  const urlPath = `/code/${division.id}/${part.number}/${section.number}/${subsection.number}/${article.number}#${table.id}`;
  
  // Extract text from table
  const { text, referenceIds } = extractTableText(table, config.textExtraction, config.references);
  const title = table.title || `Table ${tableNum}`;
  
  // Calculate priority
  let priority = config.contentTypes.table.priority;
  if (revisionInfo.hasAmendment) {
    priority *= config.contentTypes.table.amendmentBoost;
  }
  
  return {
    ...createBaseDocument(division, part, section, subsection, config),
    id: table.id || `${article.id}.table${tableNum}`,
    type: 'table',
    articleNumber: fullNumber,
    title: stripReferences(title, config.references),
    text,
    snippet: generateSnippet(text, config.textExtraction.snippetLength),
    path: `Division ${division.letter} > Part ${part.number} > Section ${section.number} > ${subsection.number}.${article.number} > Table ${tableNum}`,
    breadcrumbs: [division.title, part.title, section.title, subsection.title, article.title, `Table ${tableNum}`],
    urlPath,
    hasAmendment: revisionInfo.hasAmendment,
    amendmentType: revisionInfo.amendmentType as any,
    latestAmendmentDate: revisionInfo.latestDate,
    hasTables: true,
    searchPriority: priority,
    referenceIds: config.references.preserveReferenceIds ? referenceIds : undefined,
  } as SearchDocument;
}

/**
 * Create figure document
 */
function createFigureDocument(
  division: BCBCDivision,
  part: BCBCPart,
  section: BCBCSection,
  subsection: BCBCSubsection,
  article: BCBCArticle,
  figure: BCBCContent,
  revisionInfo: { hasAmendment: boolean; amendmentType?: string; latestDate?: string },
  config: IndexerConfig
): SearchDocument {
  const figureNum = figure.number || '1';
  const articleNumber = `${division.letter}.${part.number}.${section.number}.${subsection.number}.${article.number}`;
  const fullNumber = `${articleNumber} Figure ${figureNum}`;
  const urlPath = `/code/${division.id}/${part.number}/${section.number}/${subsection.number}/${article.number}#${figure.id}`;
  
  const title = figure.title || `Figure ${figureNum}`;
  const text = normalizeWhitespace(stripReferences(title, config.references));
  
  // Calculate priority
  let priority = config.contentTypes.figure.priority;
  if (revisionInfo.hasAmendment) {
    priority *= config.contentTypes.figure.amendmentBoost;
  }
  
  return {
    ...createBaseDocument(division, part, section, subsection, config),
    id: figure.id || `${article.id}.figure${figureNum}`,
    type: 'figure',
    articleNumber: fullNumber,
    title: stripReferences(title, config.references),
    text,
    snippet: text,
    path: `Division ${division.letter} > Part ${part.number} > Section ${section.number} > ${subsection.number}.${article.number} > Figure ${figureNum}`,
    breadcrumbs: [division.title, part.title, section.title, subsection.title, article.title, `Figure ${figureNum}`],
    urlPath,
    hasAmendment: revisionInfo.hasAmendment,
    amendmentType: revisionInfo.amendmentType as any,
    latestAmendmentDate: revisionInfo.latestDate,
    hasFigures: true,
    searchPriority: priority,
  } as SearchDocument;
}

/**
 * Process front matter (preface)
 */
function processFrontMatter(
  frontMatter: BCBCFrontMatter,
  documents: SearchDocument[],
  config: IndexerConfig
): TableOfContentsItem | null {
  if (!frontMatter.preface) return null;

  const preface = frontMatter.preface;
  
  // Extract text from all content items
  const textParts: string[] = [];
  for (const item of preface.content) {
    if (item.content) {
      textParts.push(item.content);
    }
  }
  
  const fullText = textParts.join(' ');
  const text = stripReferences(fullText, config.references);
  
  // Create a single document for the preface
  documents.push({
    id: preface.id,
    type: 'article',
    articleNumber: 'Preface',
    title: 'Preface',
    text,
    snippet: generateSnippet(text, config.textExtraction.snippetLength),
    divisionId: 'front-matter',
    divisionLetter: '',
    divisionTitle: 'Front Matter',
    partId: '',
    partNumber: 0,
    partTitle: '',
    sectionId: '',
    sectionNumber: 0,
    sectionTitle: '',
    subsectionId: '',
    subsectionNumber: 0,
    subsectionTitle: '',
    path: 'Front Matter > Preface',
    breadcrumbs: ['Front Matter', 'Preface'],
    urlPath: '/preface',
    hasAmendment: false,
    hasInternalRefs: hasInternalRefs(fullText),
    hasExternalRefs: hasExternalRefs(fullText),
    hasTermRefs: hasTermRefs(fullText),
    hasTables: false,
    hasFigures: false,
    searchPriority: config.contentTypes.article.priority,
  });

  // Create TOC item for front matter
  return {
    id: 'front-matter',
    type: 'division',
    number: '',
    title: 'Front Matter',
    level: 0,
    children: [
      {
        id: preface.id,
        type: 'article',
        number: '',
        title: 'Preface',
        level: 1,
        hasRevisions: false,
      }
    ],
    hasRevisions: false,
  };
}

/**
 * Process glossary entries
 */
function processGlossary(
  glossary: Array<{ id: string; term: string; definition: string }>,
  documents: SearchDocument[],
  config: IndexerConfig
): void {
  for (const entry of glossary) {
    const text = stripReferences(entry.definition, config.references);
    
    documents.push({
      id: entry.id,
      type: 'glossary',
      articleNumber: '',
      title: entry.term,
      text,
      snippet: generateSnippet(text, config.textExtraction.snippetLength),
      divisionId: '',
      divisionLetter: '',
      divisionTitle: '',
      partId: '',
      partNumber: 0,
      partTitle: '',
      sectionId: '',
      sectionNumber: 0,
      sectionTitle: '',
      subsectionId: '',
      subsectionNumber: 0,
      subsectionTitle: '',
      path: 'Glossary',
      breadcrumbs: ['Glossary'],
      urlPath: `/glossary/${entry.id}`,
      hasAmendment: false,
      hasInternalRefs: false,
      hasExternalRefs: false,
      hasTermRefs: false,
      hasTables: false,
      hasFigures: false,
      searchPriority: config.contentTypes.glossary.priority,
    });
  }
}

// Re-export types
export type { IndexerConfig, SearchDocument, SearchMetadata };
