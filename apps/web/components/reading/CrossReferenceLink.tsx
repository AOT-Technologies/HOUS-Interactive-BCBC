'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isModalReference, parseReferenceId } from '../../lib/cross-reference';
import { resolvePartAppendixForEffectiveDate } from '../../lib/revision-resolver';
import { useCrossReferenceContext } from './CrossReferenceContext';
import { useNavigationStore, type NavigationNode } from '../../stores/navigation-store';
import { useAppendixStore } from '../../lib/stores/appendix-store';
import { useUIStore } from '../../lib/stores/ui-store';
import './CrossReferenceLink.css';

interface CrossReferenceLinkProps {
  referenceId: string;
  displayText: string;
  format?: 'short' | 'long' | 'medium' | 'title' | 'number' | 'shortNum';
  interactive?: boolean;
  preserveDisplayText?: boolean;
}

type ApplicationNoteMeta = {
  id: string;
  number?: string;
  title?: string;
};

type PartAppendixPayload = {
  application_notes?: ApplicationNoteMeta[];
};

type StandardReferenceMeta = {
  standard_id?: string;
  standard_ref_id?: string;
  title?: string;
  full_title?: string;
  number?: string;
  full_number?: string;
  agency?: string;
  table_id?: string;
  location_id?: string;
};

const standardsMapCache = new Map<string, Record<string, StandardReferenceMeta>>();

const normalizeStandardsKey = (value: string): string =>
  value.replace(/[^a-z0-9.]/gi, '').toLowerCase();

export const CrossReferenceLink: React.FC<CrossReferenceLinkProps> = ({
  referenceId,
  displayText,
  format,
  interactive = true,
  preserveDisplayText = false,
}) => {
  const { openReference, navigateReference } = useCrossReferenceContext();
  const searchParams = useSearchParams();
  const version = searchParams.get('version') || '2024';
  const effectiveDate = searchParams.get('date') || undefined;
  const fetchAppendix = useAppendixStore((s) => s.fetchAppendix);
  const openGlossarySidebar = useUIStore((s) => s.openGlossarySidebar);
  const navigationTree = useNavigationStore((s) => s.navigationTree);
  const [appnoteDisplayText, setAppnoteDisplayText] = useState<string | null>(null);
  const [standardsDisplayText, setStandardsDisplayText] = useState<string | null>(null);

  const findNodeById = (
    nodes: NavigationNode[],
    targetId: string
  ): NavigationNode | null => {
    for (const node of nodes) {
      if (node.id.toLowerCase() === targetId.toLowerCase()) {
        return node;
      }

      if (node.children && node.children.length > 0) {
        const found = findNodeById(node.children, targetId);
        if (found) return found;
      }
    }

    return null;
  };

  const resolvedDisplayText =
    format === 'title'
      ? findNodeById(navigationTree, referenceId)?.title || displayText
      : displayText;

  const trailingClauseQualifier =
    resolvedDisplayText.match(/(\([A-Za-z0-9]+\))\.?\s*$/)?.[1] || '';

  const parsedReference = useMemo(() => parseReferenceId(referenceId), [referenceId]);
  const glossaryTermMatch = referenceId.match(/^term:(.+)$/i);
  const glossaryTermId = glossaryTermMatch?.[1]?.trim() || '';
  const isGlossaryTermReference = Boolean(glossaryTermId);
  const isPartAppendixAppnote =
    parsedReference?.kind === 'part_appendix' && Boolean(parsedReference.appnote);
  const shouldResolveAppnoteDisplayText = isPartAppendixAppnote && !preserveDisplayText;
  const standardsMatch = referenceId.match(/^(standard|external):(.+)$/i);
  const standardsRefId = standardsMatch?.[2]?.trim() || '';
  const isStandardsReference = Boolean(standardsMatch && standardsRefId);
  const hasExplicitStandardsLabel =
    isStandardsReference &&
    displayText.trim().length > 0 &&
    normalizeStandardsKey(displayText) !== normalizeStandardsKey(standardsRefId);

  useEffect(() => {
    let active = true;

    const resolveAppNoteDisplayText = async () => {
      if (!shouldResolveAppnoteDisplayText || !parsedReference) {
        if (active) {
          setAppnoteDisplayText(null);
        }
        return;
      }

      const tokenMatch = referenceId.match(/\.appnote([A-Za-z0-9]+)/i);
      const appnoteToken = tokenMatch?.[1] || parsedReference.appnote || '';
      const notePrefix = `${parsedReference.division}.part${parsedReference.part}.appendix.appnote${appnoteToken}`;

      let notesMap: Map<string, ApplicationNoteMeta>;
      try {
        const appendixPayload = (await fetchAppendix(
          version,
          parsedReference.division,
          parsedReference.part
        )) as PartAppendixPayload;
        const resolvedAppendixPayload = resolvePartAppendixForEffectiveDate(
          appendixPayload as any,
          effectiveDate
        ) as PartAppendixPayload;
        notesMap = new Map<string, ApplicationNoteMeta>();
        for (const note of resolvedAppendixPayload.application_notes || []) {
          notesMap.set(note.id, note);
        }
      } catch {
        if (active) {
          setAppnoteDisplayText(null);
        }
        return;
      }

      let matchedNote: ApplicationNoteMeta | undefined;
      for (const note of notesMap.values()) {
        if (note.id.startsWith(notePrefix)) {
          matchedNote = note;
          break;
        }
      }

      if (!matchedNote?.number) {
        if (active) {
          setAppnoteDisplayText(null);
        }
        return;
      }

      const noteLabel = `Note ${matchedNote.number}`;
      const longLabel =
        matchedNote.title && matchedNote.title.trim()
          ? `${noteLabel} ${matchedNote.title.trim()}`
          : noteLabel;
      const nextText = format === 'long' ? longLabel : noteLabel;

      if (active) {
        setAppnoteDisplayText(nextText);
      }
    };

    resolveAppNoteDisplayText();
    return () => {
      active = false;
    };
  }, [effectiveDate, fetchAppendix, format, parsedReference, referenceId, shouldResolveAppnoteDisplayText, version]);

  useEffect(() => {
    let active = true;

    const resolveStandardsDisplayText = async () => {
      if (!isStandardsReference || hasExplicitStandardsLabel) {
        if (active) {
          setStandardsDisplayText(null);
        }
        return;
      }

      const dataPath = `/data/${version}/standards-map.json`;
      let standardsMap = standardsMapCache.get(dataPath);

      if (!standardsMap) {
        try {
          const response = await fetch(dataPath);
          if (!response.ok) {
            if (active) {
              setStandardsDisplayText(null);
            }
            return;
          }
          standardsMap = (await response.json()) as Record<string, StandardReferenceMeta>;
          standardsMapCache.set(dataPath, standardsMap);
        } catch {
          if (active) {
            setStandardsDisplayText(null);
          }
          return;
        }
      }

      const normalizedRefId = normalizeStandardsKey(standardsRefId);
      const matchedEntry = Object.entries(standardsMap).find(([key, value]) => {
        if (normalizeStandardsKey(key) === normalizedRefId) return true;
        if (value.standard_ref_id && normalizeStandardsKey(value.standard_ref_id) === normalizedRefId) return true;
        if (value.standard_id && normalizeStandardsKey(value.standard_id) === normalizedRefId) return true;
        return false;
      })?.[1];

      if (!matchedEntry) {
        if (active) {
          setStandardsDisplayText(null);
        }
        return;
      }

      const label = matchedEntry.agency?.trim() || matchedEntry.standard_id?.trim() || standardsRefId;
      if (active) {
        setStandardsDisplayText(label);
      }
    };

    resolveStandardsDisplayText();
    return () => {
      active = false;
    };
  }, [hasExplicitStandardsLabel, isStandardsReference, standardsRefId, version]);

  const effectiveDisplayText = standardsDisplayText
    || (appnoteDisplayText
      ? `${appnoteDisplayText}${trailingClauseQualifier ? ` ${trailingClauseQualifier}` : ''}`
      : resolvedDisplayText);

  if (!interactive) {
    return (
      <span className="cross-reference-link cross-reference-link--non-interactive">
        {effectiveDisplayText}
      </span>
    );
  }

  const modalType = isModalReference(referenceId);

  return (
    <button
      type="button"
      className="cross-reference-link cross-reference-link--interactive"
      aria-haspopup={modalType ? 'dialog' : undefined}
      onClick={(event) => {
        if (isGlossaryTermReference) {
          openGlossarySidebar(glossaryTermId);
          return;
        }

        if (modalType) {
          openReference(referenceId, event.currentTarget);
          return;
        }

        navigateReference(referenceId);
      }}
    >
      <span className="cross-reference-link__icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 8C13 8.55208 12.5521 9 12 9C11.4479 9 11 8.55208 11 8C11 7.44792 11.4479 7 12 7C12.5521 7 13 7.44792 13 8ZM10 11C10 10.6313 10.2979 10.3333 10.6667 10.3333H12C12.3688 10.3333 12.6667 10.6313 12.6667 11V15.6667H13.3333C13.7021 15.6667 14 15.9646 14 16.3333C14 16.7021 13.7021 17 13.3333 17H10.6667C10.2979 17 10 16.7021 10 16.3333C10 15.9646 10.2979 15.6667 10.6667 15.6667H11.3333V11.6667H10.6667C10.2979 11.6667 10 11.3688 10 11Z" fill="white"/>
        </svg>
      </span>
      <span className="cross-reference-link__text">{effectiveDisplayText}</span>
    </button>
  );
};
