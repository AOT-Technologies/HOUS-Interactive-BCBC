'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from '@repo/ui/icon';
import { isModalReference, parseReferenceId } from '../../lib/cross-reference';
import { useCrossReferenceContext } from './CrossReferenceContext';
import { useNavigationStore, type NavigationNode } from '../../stores/navigation-store';
import { useAppendixStore } from '../../lib/stores/appendix-store';
import './CrossReferenceLink.css';

interface CrossReferenceLinkProps {
  referenceId: string;
  displayText: string;
  format?: 'short' | 'long' | 'medium' | 'title' | 'number' | 'shortNum';
  interactive?: boolean;
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
}) => {
  const { openReference, navigateReference } = useCrossReferenceContext();
  const searchParams = useSearchParams();
  const version = searchParams.get('version') || '2024';
  const fetchAppendix = useAppendixStore((s) => s.fetchAppendix);
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

  const parsedReference = useMemo(() => parseReferenceId(referenceId), [referenceId]);
  const isPartAppendixAppnote =
    parsedReference?.kind === 'part_appendix' && Boolean(parsedReference.appnote);
  const standardsMatch = referenceId.match(/^(standard|external):(.+)$/i);
  const standardsRefId = standardsMatch?.[2]?.trim() || '';
  const isStandardsReference = Boolean(standardsMatch && standardsRefId);

  useEffect(() => {
    let active = true;

    const resolveAppNoteDisplayText = async () => {
      if (!isPartAppendixAppnote || !parsedReference) {
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
        notesMap = new Map<string, ApplicationNoteMeta>();
        for (const note of appendixPayload.application_notes || []) {
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
  }, [fetchAppendix, format, isPartAppendixAppnote, parsedReference, referenceId, version]);

  useEffect(() => {
    let active = true;

    const resolveStandardsDisplayText = async () => {
      if (!isStandardsReference) {
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
  }, [isStandardsReference, standardsRefId, version]);

  const effectiveDisplayText = standardsDisplayText || appnoteDisplayText || resolvedDisplayText;

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
        if (modalType) {
          openReference(referenceId, event.currentTarget);
          return;
        }

        navigateReference(referenceId);
      }}
    >
      <span className="cross-reference-link__icon" aria-hidden="true">
        <Icon type="info" style={{ color: '#1A5A96' }} />
      </span>
      <span className="cross-reference-link__text">{effectiveDisplayText}</span>
    </button>
  );
};
