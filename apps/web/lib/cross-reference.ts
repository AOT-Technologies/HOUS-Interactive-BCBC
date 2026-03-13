export interface ParsedReferenceId {
  raw: string;
  kind: 'section' | 'part_appendix' | 'appendix_document';
  division: string;
  part?: string;
  section?: string;
  subsection?: string;
  article?: string;
  sentence?: string;
  clause?: string;
  subclause?: string;
  table?: string;
  appnote?: string;
  appendixLetter?: string;
  appendixSection?: string;
  paragraph?: string;
  figure?: string;
}

const PART_APPENDIX_REF_REGEX =
  /^nbc\.div([A-Za-z0-9]+)\.part(\d+)\.appendix(?:\.appnote([A-Za-z0-9]+))?/i;

const APPENDIX_DOCUMENT_REF_REGEX =
  /^nbc\.div([A-Za-z0-9]+)\.appendix([A-Za-z])(?:\.appsect(\d+))?(?:\.subsect(\d+))?(?:\.article(\d+))?(?:\.para(\d+))?(?:\.table(\d+))?(?:\.figure(\d+))?/i;

const SECTION_REF_REGEX =
  /^nbc\.div([A-Za-z0-9]+)\.part(\d+)\.sect(\d+)(?:\.subsect(\d+))?(?:\.art(\d+))?(?:\.sent(\d+))?(?:\.clause(\d+))?(?:\.subclause(\d+))?(?:\.table(\d+))?/i;

export function parseReferenceId(referenceId: string): ParsedReferenceId | null {
  const appendixMatch = referenceId.match(PART_APPENDIX_REF_REGEX);
  if (appendixMatch) {
    return {
      raw: referenceId,
      kind: 'part_appendix',
      division: `nbc.div${appendixMatch[1]}`,
      part: appendixMatch[2],
      appnote: appendixMatch[3] || undefined,
    };
  }

  const appendixDocumentMatch = referenceId.match(APPENDIX_DOCUMENT_REF_REGEX);
  if (appendixDocumentMatch) {
    return {
      raw: referenceId,
      kind: 'appendix_document',
      division: `nbc.div${appendixDocumentMatch[1]}`,
      appendixLetter: appendixDocumentMatch[2]?.toUpperCase(),
      appendixSection: appendixDocumentMatch[3] || undefined,
      subsection: appendixDocumentMatch[4] || undefined,
      article: appendixDocumentMatch[5] || undefined,
      paragraph: appendixDocumentMatch[6] || undefined,
      table: appendixDocumentMatch[7] || undefined,
      figure: appendixDocumentMatch[8] || undefined,
    };
  }

  const sectionMatch = referenceId.match(SECTION_REF_REGEX);
  if (!sectionMatch) return null;

  return {
    raw: referenceId,
    kind: 'section',
    division: `nbc.div${sectionMatch[1]}`,
    part: sectionMatch[2],
    section: sectionMatch[3],
    subsection: sectionMatch[4] || undefined,
    article: sectionMatch[5] || undefined,
    sentence: sectionMatch[6] || undefined,
    clause: sectionMatch[7] || undefined,
    subclause: sectionMatch[8] || undefined,
    table: sectionMatch[9] || undefined,
  };
}

export function isModalReference(referenceId: string): boolean {
  if (/^(standard|external):/i.test(referenceId)) {
    return true;
  }
  const parsed = parseReferenceId(referenceId);
  // All parseable internal references support modal preview
  // (section/subsection/article/sentence/clause/subclause/table/appnote).
  return Boolean(parsed);
}

export function getNavigationSlug(referenceId: string): string[] | null {
  const parsed = parseReferenceId(referenceId);
  if (!parsed) return null;

  if (parsed.kind === 'part_appendix') {
    if (!parsed.part) return null;
    return [parsed.division, parsed.part, 'appendix'];
  }

  if (parsed.kind === 'appendix_document') {
    return parsed.appendixLetter ? [parsed.division, 'appendix', parsed.appendixLetter] : null;
  }

  if (!parsed.part || !parsed.section) return null;

  const base = [parsed.division, parsed.part, parsed.section];

  if (parsed.subsection) {
    base.push(parsed.subsection);
  }

  if (parsed.article) {
    base.push(parsed.article);
  }

  return base;
}

export function getSectionFetchPath(version: string, referenceId: string): string | null {
  const parsed = parseReferenceId(referenceId);
  if (!parsed) return null;

  const transformedDivision = parsed.division.replace(/nbc\.div([A-Z0-9]+)/i, (_, suffix) =>
    `nbc-div${suffix.toLowerCase()}`
  );

  if (parsed.kind === 'part_appendix') {
    if (!parsed.part) return null;
    return `/data/${version}/content/${transformedDivision}/part-${parsed.part}/appendix.json`;
  }

  if (parsed.kind === 'appendix_document') {
    if (!parsed.appendixLetter) return null;
    return `/data/${version}/content/${transformedDivision}/appendix-${parsed.appendixLetter.toLowerCase()}.json`;
  }

  if (!parsed.part || !parsed.section) return null;

  return `/data/${version}/content/${transformedDivision}/part-${parsed.part}/section-${parsed.section}.json`;
}
