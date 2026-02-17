export interface ParsedReferenceId {
  raw: string;
  division: string;
  part: string;
  section: string;
  subsection?: string;
  article?: string;
  sentence?: string;
  clause?: string;
  subclause?: string;
  table?: string;
  appnote?: string;
}

const REF_REGEX =
  /^nbc\.div([A-Za-z0-9]+)\.part(\d+)\.sect(\d+)(?:\.subsect(\d+))?(?:\.art(\d+))?(?:\.sent(\d+))?(?:\.clause(\d+))?(?:\.subclause(\d+))?(?:\.table(\d+))?(?:\.appnote(\d+))?/i;

export function parseReferenceId(referenceId: string): ParsedReferenceId | null {
  const match = referenceId.match(REF_REGEX);
  if (!match) return null;

  return {
    raw: referenceId,
    division: `nbc.div${match[1]}`,
    part: match[2],
    section: match[3],
    subsection: match[4] || undefined,
    article: match[5] || undefined,
    sentence: match[6] || undefined,
    clause: match[7] || undefined,
    subclause: match[8] || undefined,
    table: match[9] || undefined,
    appnote: match[10] || undefined,
  };
}

export function isModalReference(referenceId: string): boolean {
  const parsed = parseReferenceId(referenceId);
  // All parseable internal references support modal preview
  // (section/subsection/article/sentence/clause/subclause/table/appnote).
  return Boolean(parsed);
}

export function getNavigationSlug(referenceId: string): string[] | null {
  const parsed = parseReferenceId(referenceId);
  if (!parsed) return null;

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

  return `/data/${version}/content/${transformedDivision}/part-${parsed.part}/section-${parsed.section}.json`;
}
