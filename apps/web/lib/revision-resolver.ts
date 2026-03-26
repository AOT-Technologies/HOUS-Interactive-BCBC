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
  content?: ContentNode[];
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

function normalizeNodeNumber(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : String(value ?? fallback);
}

function mapResolvedArray<TInput, TOutput>(
  items: TInput[],
  mapper: (item: TInput, index: number) => TOutput | null
): { items: TOutput[]; changed: boolean } {
  let changed = false;
  const resolvedItems: TOutput[] = [];

  items.forEach((item, index) => {
    const resolvedItem = mapper(item, index);
    if (resolvedItem === null) {
      changed = true;
      return;
    }

    if (resolvedItem !== item) {
      changed = true;
    }

    resolvedItems.push(resolvedItem);
  });

  if (!changed && resolvedItems.length === items.length) {
    return { items: items as unknown as TOutput[], changed: false };
  }

  return { items: resolvedItems, changed: true };
}

function applyRevision<T extends ContentNode>(node: T, effectiveDate?: string): T | null {
  let resolvedTitle = node.title;

  if (node.title && typeof node.title === 'object' && 'revised' in node.title) {
    const titleObj = node.title as any;
    if (titleObj.revised && Array.isArray(titleObj.revisions)) {
      const sortedTitleRevisions = [...titleObj.revisions].sort((a, b) =>
        (b.effective_date || '').localeCompare(a.effective_date || '')
      );

      if (effectiveDate) {
        const applicableTitleRevision = sortedTitleRevisions.find(
          (rev) => (rev.effective_date || '') <= effectiveDate
        ) || sortedTitleRevisions[sortedTitleRevisions.length - 1];

        resolvedTitle = applicableTitleRevision.text || titleObj.text;
      } else {
        resolvedTitle = titleObj.text;
      }
    }
  }

  const revision = getApplicableRevision(node.revisions, effectiveDate);
  if (!revision) {
    if (resolvedTitle === node.title) {
      return node;
    }

    return {
      ...node,
      title: resolvedTitle,
    } as T;
  }
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

  return {
    ...node,
    ...(resolvedTitle !== node.title ? { title: resolvedTitle } : {}),
    ...revisionPayload,
    id: node.id,
    type: node.type,
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
    ? mapResolvedArray(nestedSource as ContentNode[], (item) => resolveContentNode(item, effectiveDate))
    : { items: [], changed: false };

  const number = normalizeNodeNumber(resolved.number);
  const glossaryTerms = Array.isArray(resolved.glossaryTerms) ? resolved.glossaryTerms : [];
  const nextContent = nested.items.length > 0 ? nested.items : undefined;
  const contentChanged = (resolved.content ?? undefined) !== nextContent;
  const glossaryChanged = glossaryTerms !== resolved.glossaryTerms;
  const numberChanged = number !== resolved.number;

  if (resolved === node && !nested.changed && !contentChanged && !glossaryChanged && !numberChanged) {
    return resolved;
  }

  return {
    ...resolved,
    number,
    glossaryTerms,
    content: nextContent,
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
    ? mapResolvedArray(nestedSource as ContentNode[], (item) => resolveContentNode(item, effectiveDate))
    : { items: [], changed: false };

  const number = normalizeNodeNumber(resolved.number ?? resolved.letter);
  const glossaryTerms = Array.isArray(resolved.glossaryTerms) ? resolved.glossaryTerms : [];
  const nextContent = nested.items.length > 0 ? nested.items : undefined;
  const contentChanged = (resolved.content ?? undefined) !== nextContent;
  const glossaryChanged = glossaryTerms !== resolved.glossaryTerms;
  const numberChanged = number !== resolved.number;

  if (resolved === node && !nested.changed && !contentChanged && !glossaryChanged && !numberChanged) {
    return resolved;
  }

  return {
    ...resolved,
    number,
    glossaryTerms,
    content: nextContent,
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
    ? mapResolvedArray(nestedSource as ContentNode[], (item) => resolveContentNode(item, effectiveDate))
    : { items: [], changed: false };

  const number = normalizeNodeNumber(resolved.number);
  const glossaryTerms = Array.isArray(resolved.glossaryTerms) ? resolved.glossaryTerms : [];
  const nextContent = nested.items.length > 0 ? nested.items : undefined;
  const contentChanged = (resolved.content ?? undefined) !== nextContent;
  const glossaryChanged = glossaryTerms !== resolved.glossaryTerms;
  const numberChanged = number !== resolved.number;

  if (resolved === node && !nested.changed && !contentChanged && !glossaryChanged && !numberChanged) {
    return resolved;
  }

  return {
    ...resolved,
    number,
    glossaryTerms,
    content: nextContent,
  };
}

function resolveTableRows(rows: unknown[], effectiveDate?: string): unknown[] {
  const resolvedRows = mapResolvedArray(rows as ContentNode[], (rowNode) => {
    const resolvedRow = applyRevision(rowNode, effectiveDate);
    if (!resolvedRow) return null;

    const resolvedCells = Array.isArray(resolvedRow.cells)
      ? mapResolvedArray(resolvedRow.cells as ContentNode[], (cell) => applyRevision(cell, effectiveDate))
      : { items: [], changed: false };

    if (resolvedRow === rowNode && !resolvedCells.changed) {
      return resolvedRow;
    }

    return {
      ...resolvedRow,
      cells: resolvedCells.items,
    };
  });

  return resolvedRows.changed ? resolvedRows.items : rows;
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

  const structureChanged =
    headerRows !== (structure as any).header_rows ||
    bodyRows !== (structure as any).body_rows;

  if (resolved === node && !structureChanged) {
    return resolved;
  }

  return {
    ...resolved,
    structure: structureChanged
      ? {
          ...structure,
          ...(headerRows ? { header_rows: headerRows } : {}),
          ...(bodyRows ? { body_rows: bodyRows } : {}),
        }
      : structure,
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
    ? mapResolvedArray(resolved.content as ContentNode[], (item) => resolveContentNode(item, effectiveDate))
    : { items: [], changed: false };

  const number = normalizeNodeNumber(resolved.number);
  if (resolved === node && !content.changed && number === resolved.number) {
    return resolved;
  }

  return {
    ...resolved,
    number,
    content: content.items,
  };
}

function resolveSubsection(node: ContentNode, effectiveDate?: string): ContentNode | null {
  const resolved = applyRevision(node, effectiveDate);
  if (!resolved) return null;

  const articles = Array.isArray(resolved.articles)
    ? mapResolvedArray(resolved.articles as ContentNode[], (item) => resolveArticle(item, effectiveDate))
    : { items: [], changed: false };

  const number = normalizeNodeNumber(resolved.number);
  if (resolved === node && !articles.changed && number === resolved.number) {
    return resolved;
  }

  return {
    ...resolved,
    number,
    articles: articles.items,
  };
}

export function resolveSectionForEffectiveDate(
  section: Section,
  effectiveDate?: string
): Section {
  const resolved = applyRevision(section as unknown as ContentNode, effectiveDate);
  if (!resolved) return section;

  const subsections = Array.isArray(resolved.subsections)
    ? mapResolvedArray(resolved.subsections as ContentNode[], (item) => resolveSubsection(item, effectiveDate))
    : { items: [], changed: false };

  const number = normalizeNodeNumber((resolved as any).number);
  if (
    resolved === (section as unknown as ContentNode) &&
    !subsections.changed &&
    number === (resolved as any).number
  ) {
    return resolved as unknown as Section;
  }

  return {
    ...(resolved as unknown as Section),
    number,
    subsections: subsections.items as any,
  };
}

function resolveAppendixContentBlock<T extends AppendixContentBlockNode>(
  block: T,
  effectiveDate?: string
): T | null {
  const resolved = applyRevision(block, effectiveDate);
  if (!resolved) return null;

  const paragraphs = Array.isArray(resolved.paragraphs)
    ? mapResolvedArray(resolved.paragraphs as ContentNode[], (paragraph) =>
        applyRevision(paragraph, effectiveDate)
      )
    : undefined;

  const tables = Array.isArray(resolved.tables)
    ? mapResolvedArray(resolved.tables as ContentNode[], (table) => resolveTable(table, effectiveDate))
    : undefined;

  const figures = Array.isArray(resolved.figures)
    ? mapResolvedArray(resolved.figures as ContentNode[], (figure) =>
        applyRevision(figure, effectiveDate)
      )
    : undefined;

  const content = Array.isArray(resolved.content)
    ? mapResolvedArray(resolved.content as ContentNode[], (item) => {
        if (item.type === 'table') {
          return resolveTable(item, effectiveDate);
        }
        if (item.type === 'note_division') {
          return resolveAppendixDivision(item as AppendixDivisionNode, effectiveDate);
        }
        return applyRevision(item, effectiveDate);
      })
    : undefined;

  const paragraphsChanged = Boolean(paragraphs?.changed);
  const tablesChanged = Boolean(tables?.changed);
  const figuresChanged = Boolean(figures?.changed);
  const contentChanged = Boolean(content?.changed);

  if (resolved === block && !paragraphsChanged && !tablesChanged && !figuresChanged && !contentChanged) {
    return resolved;
  }

  return {
    ...resolved,
    ...(paragraphs ? { paragraphs: paragraphs.items } : {}),
    ...(tables ? { tables: tables.items } : {}),
    ...(figures ? { figures: figures.items } : {}),
    ...(content ? { content: content.items } : {}),
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
    ? mapResolvedArray(resolvedBlock.divisions as AppendixDivisionNode[], (division) =>
        resolveAppendixDivision(division, effectiveDate)
      )
    : undefined;

  if (resolvedBlock === note && !divisions?.changed) {
    return resolvedBlock;
  }

  return {
    ...resolvedBlock,
    ...(divisions ? { divisions: divisions.items } : {}),
  };
}

export function resolvePartAppendixForEffectiveDate<T extends PartAppendixNode>(
  appendix: T,
  effectiveDate?: string
): T {
  const resolved = applyRevision(appendix, effectiveDate);
  if (!resolved) return appendix;

  const applicationNotes = Array.isArray((resolved as PartAppendixNode).application_notes)
    ? mapResolvedArray((resolved as PartAppendixNode).application_notes as ApplicationNoteNode[], (note) =>
        resolveApplicationNote(note, effectiveDate)
      )
    : { items: [], changed: false };

  if (resolved === appendix && !applicationNotes.changed) {
    return resolved as T;
  }

  return {
    ...(resolved as T),
    application_notes: applicationNotes.items as ApplicationNoteNode[],
  };
}
