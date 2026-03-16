import type { Section } from '@bc-building-code/bcbc-parser';

type RevisionRecord = {
  effective_date?: string;
  deleted?: boolean;
  [key: string]: unknown;
};

type ContentNode = {
  id?: string;
  type?: string;
  title?: unknown;
  revisions?: RevisionRecord[];
  [key: string]: unknown;
};

type AppendixContentBlockNode = ContentNode & {
  paragraphs?: unknown[];
  tables?: ContentNode[];
  figures?: ContentNode[];
};

type AppendixDivisionNode = AppendixContentBlockNode & {
  title?: unknown;
};

type ApplicationNoteNode = AppendixContentBlockNode & {
  divisions?: AppendixDivisionNode[];
  number?: unknown;
  title?: unknown;
};

type PartAppendixNode = ContentNode & {
  type: 'part_appendix';
  introduction?: unknown;
  application_notes?: ApplicationNoteNode[];
};

function sortByEffectiveDateDesc(revisions: RevisionRecord[]): RevisionRecord[] {
  return [...revisions].sort((a, b) =>
    (b.effective_date || '').localeCompare(a.effective_date || '')
  );
}

function getApplicableRevision(
  revisions: RevisionRecord[] | undefined,
  effectiveDate?: string
): RevisionRecord | undefined {
  if (!revisions || revisions.length === 0) return undefined;

  const sorted = sortByEffectiveDateDesc(revisions);
  if (!effectiveDate) return sorted[0];

  return sorted.find((rev) => (rev.effective_date || '') <= effectiveDate) || sorted[sorted.length - 1];
}

function hasEquationPlaceholder(text: unknown): boolean {
  return typeof text === 'string' && /\[EQ:(?:display|inline)(?::[^\]]*)?\]/i.test(text);
}

function applyRevision<T extends ContentNode>(node: T, effectiveDate?: string): T | null {
  // First, handle title with revision history (before checking node-level revisions)
  let processedNode = { ...node };
  
  if (processedNode.title && typeof processedNode.title === 'object' && 'revised' in processedNode.title) {
    const titleObj = processedNode.title as any;
    if (titleObj.revised && Array.isArray(titleObj.revisions)) {
      // Find the appropriate title revision based on effective date
      const sortedTitleRevisions = [...titleObj.revisions].sort((a, b) =>
        (b.effective_date || '').localeCompare(a.effective_date || '')
      );
      
      if (effectiveDate) {
        const applicableTitleRevision = sortedTitleRevisions.find(
          (rev) => (rev.effective_date || '') <= effectiveDate
        ) || sortedTitleRevisions[sortedTitleRevisions.length - 1];
        
        processedNode.title = applicableTitleRevision.text || titleObj.text;
      } else {
        // No effective date specified, use current text
        processedNode.title = titleObj.text;
      }
    }
  }

  // Then handle node-level revisions
  const revision = getApplicableRevision(processedNode.revisions, effectiveDate);
  if (!revision) return processedNode as T;
  if (revision.deleted) return null;

  const {
    type: _revisionType,
    effective_date: _effectiveDate,
    revision_id: _revisionId,
    revision_type: _revisionTypeKind,
    sequence: _sequence,
    status: _status,
    change_summary: _changeSummary,
    note: _note,
    deleted: _deleted,
    ...revisionPayload
  } = revision as RevisionRecord & Record<string, unknown>;

  // Revision payload overrides content fields, but never node identity/type.
  return {
    ...processedNode,
    ...revisionPayload,
    id: processedNode.id,
    type: processedNode.type,
  } as T;
}

function resolveSubclause(node: ContentNode, effectiveDate?: string): ContentNode | null {
  const resolved = applyRevision(node, effectiveDate);
  if (!resolved) return null;
  const includeEquationContent = !hasEquationPlaceholder(resolved.text);

  const nestedSource = Array.isArray(resolved.content)
    ? resolved.content
    : [
        ...(Array.isArray(resolved.tables) ? resolved.tables : []),
        ...(Array.isArray(resolved.figures) ? resolved.figures : []),
        ...(includeEquationContent && Array.isArray(resolved.equations) ? resolved.equations : []),
      ];

  const nested = nestedSource
    .map((item) => resolveContentNode(item as ContentNode, effectiveDate))
    .filter(Boolean);

  return {
    ...resolved,
    number: String(resolved.number ?? ''),
    glossaryTerms: Array.isArray(resolved.glossaryTerms) ? resolved.glossaryTerms : [],
    content: nested.length > 0 ? nested : undefined,
  };
}

function resolveClause(node: ContentNode, effectiveDate?: string): ContentNode | null {
  const resolved = applyRevision(node, effectiveDate);
  if (!resolved) return null;
  const includeEquationContent = !hasEquationPlaceholder(resolved.text);

  let nestedSource: unknown[] = [];
  if (Array.isArray(resolved.content)) {
    nestedSource = resolved.content;
  } else if (Array.isArray(resolved.subclauses)) {
    nestedSource = [
      ...resolved.subclauses,
      ...(Array.isArray(resolved.tables) ? resolved.tables : []),
      ...(Array.isArray(resolved.figures) ? resolved.figures : []),
      ...(includeEquationContent && Array.isArray(resolved.equations) ? resolved.equations : []),
    ];
  } else {
    nestedSource = [
      ...(Array.isArray(resolved.tables) ? resolved.tables : []),
      ...(Array.isArray(resolved.figures) ? resolved.figures : []),
      ...(includeEquationContent && Array.isArray(resolved.equations) ? resolved.equations : []),
    ];
  }

  const nested = nestedSource
    .map((item) => resolveContentNode(item as ContentNode, effectiveDate))
    .filter(Boolean);

  return {
    ...resolved,
    number: String(resolved.number ?? resolved.letter ?? ''),
    glossaryTerms: Array.isArray(resolved.glossaryTerms) ? resolved.glossaryTerms : [],
    content: nested.length > 0 ? nested : undefined,
  };
}

function resolveSentence(node: ContentNode, effectiveDate?: string): ContentNode | null {
  const resolved = applyRevision(node, effectiveDate);
  if (!resolved) return null;
  const includeEquationContent = !hasEquationPlaceholder(resolved.text);

  let nestedSource: unknown[] = [];
  if (Array.isArray(resolved.content)) {
    nestedSource = resolved.content;
  } else if (Array.isArray(resolved.clauses)) {
    nestedSource = [
      ...resolved.clauses,
      ...(Array.isArray(resolved.tables) ? resolved.tables : []),
      ...(Array.isArray(resolved.figures) ? resolved.figures : []),
      ...(includeEquationContent && Array.isArray(resolved.equations) ? resolved.equations : []),
    ];
  } else {
    nestedSource = [
      ...(Array.isArray(resolved.tables) ? resolved.tables : []),
      ...(Array.isArray(resolved.figures) ? resolved.figures : []),
      ...(includeEquationContent && Array.isArray(resolved.equations) ? resolved.equations : []),
    ];
  }

  const nested = nestedSource
    .map((item) => resolveContentNode(item as ContentNode, effectiveDate))
    .filter(Boolean);

  return {
    ...resolved,
    number: String(resolved.number ?? ''),
    glossaryTerms: Array.isArray(resolved.glossaryTerms) ? resolved.glossaryTerms : [],
    content: nested.length > 0 ? nested : undefined,
  };
}

function resolveTableRows(rows: unknown[], effectiveDate?: string): unknown[] {
  return rows
    .map((row) => {
      const rowNode = row as ContentNode;
      const resolvedRow = applyRevision(rowNode, effectiveDate);
      if (!resolvedRow) return null;

      const cells = Array.isArray(resolvedRow.cells)
        ? resolvedRow.cells
            .map((cell) => {
              const resolvedCell = applyRevision(cell as ContentNode, effectiveDate);
              return resolvedCell || null;
            })
            .filter(Boolean)
        : [];

      return {
        ...resolvedRow,
        cells,
      };
    })
    .filter(Boolean);
}

function resolveTable(node: ContentNode, effectiveDate?: string): ContentNode | null {
  const resolved = applyRevision(node, effectiveDate);
  if (!resolved) return null;

  const structure = (resolved.structure || {}) as ContentNode;
  const headerRows = Array.isArray((structure as any).header_rows)
    ? resolveTableRows((structure as any).header_rows, effectiveDate)
    : undefined;
  const bodyRows = Array.isArray((structure as any).body_rows)
    ? resolveTableRows((structure as any).body_rows, effectiveDate)
    : undefined;

  return {
    ...resolved,
    structure: {
      ...structure,
      ...(headerRows ? { header_rows: headerRows } : {}),
      ...(bodyRows ? { body_rows: bodyRows } : {}),
    },
  };
}

function resolveContentNode(node: ContentNode, effectiveDate?: string): ContentNode | null {
  switch (node.type) {
    case 'sentence':
      return resolveSentence(node, effectiveDate);
    case 'clause':
      return resolveClause(node, effectiveDate);
    case 'subclause':
      return resolveSubclause(node, effectiveDate);
    case 'table':
      return resolveTable(node, effectiveDate);
    default:
      return applyRevision(node, effectiveDate);
  }
}

function resolveArticle(node: ContentNode, effectiveDate?: string): ContentNode | null {
  const resolved = applyRevision(node, effectiveDate);
  if (!resolved) return null;

  const content = Array.isArray(resolved.content)
    ? resolved.content
        .map((item) => resolveContentNode(item as ContentNode, effectiveDate))
        .filter(Boolean)
    : [];

  return {
    ...resolved,
    number: String(resolved.number ?? ''),
    content,
  };
}

function resolveSubsection(node: ContentNode, effectiveDate?: string): ContentNode | null {
  const resolved = applyRevision(node, effectiveDate);
  if (!resolved) return null;

  const articles = Array.isArray(resolved.articles)
    ? resolved.articles
        .map((item) => resolveArticle(item as ContentNode, effectiveDate))
        .filter(Boolean)
    : [];

  return {
    ...resolved,
    number: String(resolved.number ?? ''),
    articles,
  };
}

export function resolveSectionForEffectiveDate(
  section: Section,
  effectiveDate?: string
): Section {
  const resolved = applyRevision(section as unknown as ContentNode, effectiveDate);
  if (!resolved) return section;

  const subsections = Array.isArray(resolved.subsections)
    ? resolved.subsections
        .map((item) => resolveSubsection(item as ContentNode, effectiveDate))
        .filter(Boolean)
    : [];

  return {
    ...(resolved as unknown as Section),
    number: String((resolved as any).number ?? ''),
    subsections: subsections as any,
  };
}

function resolveAppendixContentBlock<T extends AppendixContentBlockNode>(
  block: T,
  effectiveDate?: string
): T | null {
  const resolved = applyRevision(block, effectiveDate);
  if (!resolved) return null;

  const paragraphs = Array.isArray(resolved.paragraphs)
    ? resolved.paragraphs
        .map((paragraph) => applyRevision(paragraph as ContentNode, effectiveDate))
        .filter(Boolean)
    : undefined;

  const tables = Array.isArray(resolved.tables)
    ? resolved.tables
        .map((table) => resolveTable(table as ContentNode, effectiveDate))
        .filter(Boolean)
    : undefined;

  const figures = Array.isArray(resolved.figures)
    ? resolved.figures
        .map((figure) => applyRevision(figure as ContentNode, effectiveDate))
        .filter(Boolean)
    : undefined;

  return {
    ...resolved,
    ...(paragraphs ? { paragraphs } : {}),
    ...(tables ? { tables } : {}),
    ...(figures ? { figures } : {}),
  } as T;
}

function resolveAppendixDivision(
  division: AppendixDivisionNode,
  effectiveDate?: string
): AppendixDivisionNode | null {
  return resolveAppendixContentBlock(division, effectiveDate);
}

function resolveApplicationNote(
  note: ApplicationNoteNode,
  effectiveDate?: string
): ApplicationNoteNode | null {
  const resolvedBlock = resolveAppendixContentBlock(note, effectiveDate);
  if (!resolvedBlock) return null;

  const divisions = Array.isArray(resolvedBlock.divisions)
    ? resolvedBlock.divisions
        .map((division) => resolveAppendixDivision(division as AppendixDivisionNode, effectiveDate))
        .filter((division): division is AppendixDivisionNode => Boolean(division))
    : undefined;

  return {
    ...resolvedBlock,
    ...(divisions ? { divisions } : {}),
  };
}

export function resolvePartAppendixForEffectiveDate<T extends PartAppendixNode>(
  appendix: T,
  effectiveDate?: string
): T {
  const resolved = applyRevision(appendix, effectiveDate);
  if (!resolved) return appendix;

  const applicationNotes = Array.isArray((resolved as PartAppendixNode).application_notes)
    ? (resolved as PartAppendixNode).application_notes
        ?.map((note) => resolveApplicationNote(note as ApplicationNoteNode, effectiveDate))
        .filter((note): note is ApplicationNoteNode => Boolean(note))
    : [];

  return {
    ...(resolved as T),
    application_notes: applicationNotes as ApplicationNoteNode[],
  };
}
