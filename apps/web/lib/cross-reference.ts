export interface ParsedReferenceId {
  raw: string;
  kind: 'part' | 'section' | 'part_appendix' | 'appendix_document' | 'spectables';
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
  spectables?: string;
}

export type ReferenceRenderContext =
  | {
      kind: 'article';
      referenceId: string;
    }
  | {
      kind: 'appendix';
      referenceId: string;
    }
  | {
      kind: 'application-note';
      referenceId: string;
    };

const PART_APPENDIX_REF_REGEX =
  /^nbc\.div([A-Za-z0-9]+)\.part(\d+)\.appendix(?:\.appnote([A-Za-z0-9]+))?/i;

const PART_REF_REGEX = /^nbc\.div([A-Za-z0-9]+)\.part(\d+)$/i;

const APPENDIX_DOCUMENT_REF_REGEX =
  /^nbc\.div([A-Za-z0-9]+)\.appendix([A-Za-z])(?:\.appsect(\d+))?(?:\.subsect(\d+))?(?:\.article(\d+))?(?:\.para(\d+))?(?:\.table(\d+))?(?:\.figure(\d+))?/i;

const SECTION_REF_REGEX =
  /^nbc\.div([A-Za-z0-9]+)\.part(\d+)\.sect(\d+)(?:\.subsect(\d+))?(?:\.art(\d+))?(?:\.sent(\d+))?(?:\.clause(\d+))?(?:\.subclause(\d+))?(?:\.table(\d+))?/i;

const SPECTABLE_REF_REGEX =
  /^nbc\.div([A-Za-z0-9]+)\.part(\d+)\.spectables(\d+)(?:\.table(\d+))?/i;

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

  const partMatch = referenceId.match(PART_REF_REGEX);
  if (partMatch) {
    return {
      raw: referenceId,
      kind: 'part',
      division: `nbc.div${partMatch[1]}`,
      part: partMatch[2],
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
  if (sectionMatch) {
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

  const spectablesMatch = referenceId.match(SPECTABLE_REF_REGEX);
  if (spectablesMatch) {
    return {
      raw: referenceId,
      kind: 'spectables',
      division: `nbc.div${spectablesMatch[1]}`,
      part: spectablesMatch[2],
      spectables: spectablesMatch[3],
      table: spectablesMatch[4] || undefined,
    };
  }

  return null;
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

  if (parsed.kind === 'part') {
    return parsed.part ? [parsed.division, parsed.part] : null;
  }

  if (parsed.kind === 'appendix_document') {
    return parsed.appendixLetter ? [parsed.division, 'appendix', parsed.appendixLetter] : null;
  }

  if (parsed.kind === 'spectables') {
    if (!parsed.part || !parsed.spectables) return null;
    return [parsed.division, parsed.part, 'spectables', parsed.spectables];
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

  if (parsed.kind === 'part') {
    return null;
  }

  if (parsed.kind === 'appendix_document') {
    if (!parsed.appendixLetter) return null;
    return `/data/${version}/content/${transformedDivision}/appendix-${parsed.appendixLetter.toLowerCase()}.json`;
  }

  if (parsed.kind === 'spectables') {
    if (!parsed.part || !parsed.spectables) return null;
    return `/data/${version}/content/${transformedDivision}/part-${parsed.part}/spectables-${parsed.spectables}.json`;
  }

  if (!parsed.part || !parsed.section) return null;

  return `/data/${version}/content/${transformedDivision}/part-${parsed.part}/section-${parsed.section}.json`;
}

export function shouldSuppressReferenceInContext(
  targetReferenceId: string,
  context?: ReferenceRenderContext
): boolean {
  if (!context || /^(standard|external):/i.test(targetReferenceId)) {
    return false;
  }

  const target = parseReferenceId(targetReferenceId);
  const current = parseReferenceId(context.referenceId);

  if (!target || !current) {
    return false;
  }

  if (context.kind === 'article') {
    return (
      target.kind === 'section' &&
      current.kind === 'section' &&
      Boolean(target.article) &&
      Boolean(current.article) &&
      target.division.toLowerCase() === current.division.toLowerCase() &&
      target.part === current.part &&
      target.section === current.section &&
      target.subsection === current.subsection &&
      target.article === current.article
    );
  }

  if (context.kind === 'appendix') {
    if (target.kind !== current.kind) {
      return false;
    }

    if (target.kind === 'appendix_document' && current.kind === 'appendix_document') {
      return (
        target.division.toLowerCase() === current.division.toLowerCase() &&
        target.appendixLetter === current.appendixLetter
      );
    }

    if (target.kind === 'part_appendix' && current.kind === 'part_appendix') {
      return (
        target.division.toLowerCase() === current.division.toLowerCase() &&
        target.part === current.part
      );
    }

    return false;
  }

  return (
    target.kind === 'part_appendix' &&
    current.kind === 'part_appendix' &&
    Boolean(target.appnote) &&
    Boolean(current.appnote) &&
    target.division.toLowerCase() === current.division.toLowerCase() &&
    target.part === current.part &&
    target.appnote === current.appnote
  );
}
