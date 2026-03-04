/**
 * ReadingView Container Component
 * 
 * Top-level container that manages content loading, URL synchronization, and state.
 * Fetches section JSON and renders content using type-driven recursive rendering.
 * 
 * URL Change Handling:
 * - Listens for changes to slug and version props (updated by Next.js router)
 * - Automatically fetches new content when URL changes
 * - Supports browser back/forward navigation
 * - Updates content without full page reload
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReadingViewProps } from '@repo/data';
import type { Subsection, Article, Section } from '@bc-building-code/bcbc-parser';
import { useSectionStore } from '../../lib/stores/section-store';
import { useAppendixStore, type PartAppendix, type ApplicationNote, type AppendixContentBlock } from '../../lib/stores/appendix-store';
import { useNavigationStore, NavigationNode } from '../../stores/navigation-store';
import { useEquationStore } from '../../stores/equation-store';
import { parseContentPath } from '../../lib/url-utils';
import { resolvePartAppendixForEffectiveDate, resolveSectionForEffectiveDate } from '../../lib/revision-resolver';
import { getNavigationSlug, getSectionFetchPath, parseReferenceId } from '../../lib/cross-reference';
import { SectionRenderer } from './SectionRenderer';
import { ReadingViewHeader } from './ReadingViewHeader';
import { PartRenderer } from './PartRenderer';
import { PartTitle } from './PartTitle';
import { SubsectionBlock } from './SubsectionBlock';
import { ArticleBlock } from './ArticleBlock';
import { TableBlock } from './TableBlock';
import { FigureBlock } from './FigureBlock';
import { CrossReferenceContext } from './CrossReferenceContext';
import { CrossReferenceModal } from './CrossReferenceModal';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './ReadingView.css';

type StandardReferenceEntry = {
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

type SectionWithAppendix = Section & {
  appendix?: {
    application_notes?: ApplicationNote[];
  };
};

type ResolvedCrossReference = {
  referenceId: string;
  heading: string;
  targetSlug: string[] | null;
  mode: 'article' | 'subsection' | 'section' | 'appnote' | 'standard' | 'error';
  section?: SectionWithAppendix;
  subsection?: Subsection;
  article?: Article;
  note?: ApplicationNote;
  standard?: StandardReferenceEntry;
  errorMessage?: string;
};

const normalizeStandardsKey = (value: string): string =>
  value.replace(/[^a-z0-9.]/gi, '').toLowerCase();

export const ReadingView: React.FC<ReadingViewProps> = ({
  slug: initialSlug,
  version: initialVersion,
}) => {
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const targetSectionCacheRef = useRef<Map<string, SectionWithAppendix>>(new Map());
  const standardsMapCacheRef = useRef<Map<string, Record<string, StandardReferenceEntry>>>(new Map());
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const suppressedModalParamRef = useRef<string | null>(null);
  const pendingModalParamRef = useRef<string | null>(null);
  const [modalData, setModalData] = useState<ResolvedCrossReference | null>(null);
  const [partAppendix, setPartAppendix] = useState<PartAppendix | null>(null);
  const [appendixLoading, setAppendixLoading] = useState(false);
  const [appendixError, setAppendixError] = useState<string | null>(null);
  
  // Extract version and date from URL query parameters
  const urlVersion = searchParams.get('version');
  const urlDate = searchParams.get('date');
  
  // Use version from URL, fallback to props, then default to '2024'
  const version = urlVersion || initialVersion || '2024';
  
  // Use date from URL, or undefined to show latest
  const effectiveDate = urlDate || undefined;
  const modalQueryParam = searchParams.get('modal');
  
  const {
    currentSection,
    currentPath,
    loading,
    error,
    fetchSection,
    clearError,
  } = useSectionStore();
  const fetchAppendix = useAppendixStore((s) => s.fetchAppendix);

  const {
    navigationTree,
    loading: navigationLoading,
    currentVersion,
    currentPath: navigationCurrentPath,
    setCurrentPath,
  } = useNavigationStore();

  const getSlugFromPath = (path: string): string[] | null => {
    const params = parseContentPath(path);
    if (!params) return null;

    const nextSlug = [
      params.division,
      params.part,
      params.section,
      params.subsection,
      params.article,
    ].filter(Boolean) as string[];

    return nextSlug.length > 0 ? nextSlug : null;
  };

  const liveSlug = useMemo(
    () => (navigationCurrentPath ? getSlugFromPath(navigationCurrentPath) : null),
    [navigationCurrentPath]
  );

  const slug = liveSlug || initialSlug;
  const isPartLevel = slug.length === 2;
  const isAppendixLevel = slug.length === 3 && slug[2]?.toLowerCase() === 'appendix';
  const isSectionLevelOrDeeper = slug.length >= 3 && !isAppendixLevel;
  const requestedSectionKey = slug.slice(0, 3).join('/');
  const loadedSectionKey = currentPath.slice(0, 3).join('/');
  const isErrorForRequestedSection = Boolean(error) && loadedSectionKey === requestedSectionKey;
  const isRequestedSectionLoaded = Boolean(currentSection) && loadedSectionKey === requestedSectionKey;
  const resolvedSection = useMemo(
    () => (currentSection ? resolveSectionForEffectiveDate(currentSection, effectiveDate) : null),
    [currentSection, effectiveDate]
  );
  const resolvedPartAppendix = useMemo(
    () => (partAppendix ? resolvePartAppendixForEffectiveDate(partAppendix as any, effectiveDate) : null),
    [effectiveDate, partAppendix]
  );

  // Create stable slug key for useEffect dependencies
  const slugKey = slug.join('/');
  const normalizedPathname = pathname.replace(/\/$/, '');

  const getDivisionLabel = (divisionSlug: string): string => {
    const match = divisionSlug.match(/div([a-z0-9]+)/i);
    if (!match) return divisionSlug;
    return `Division ${match[1].toUpperCase()}`;
  };

  const findNodeByPath = (nodes: NavigationNode[], path: string): NavigationNode | null => {
    for (const node of nodes) {
      const normalizedNodePath = node.path.replace(/\/$/, '');
      if (normalizedNodePath === path) {
        return node;
      }

      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }

    return null;
  };

  const currentPartNode = (isPartLevel || isAppendixLevel)
    ? findNodeByPath(
        navigationTree,
        isAppendixLevel ? normalizedPathname.replace(/\/appendix$/i, '') : normalizedPathname
      )
    : null;

  const divisionLabel = getDivisionLabel(slug[0] || '');

  const getSubtreeForSlug = (
    section: NonNullable<typeof currentSection>,
    path: string[]
  ): { mode: 'section' | 'subsection' | 'article'; subsection?: Subsection; article?: Article } => {
    // /code/{division}/{part}/{section}
    if (path.length === 3) {
      return { mode: 'section' };
    }

    const subsectionNumber = path[3];
    const subsection = section.subsections.find(
      (sub) => String(sub.number) === String(subsectionNumber)
    );

    // /code/{division}/{part}/{section}/{subsection}
    if (path.length === 4) {
      return { mode: 'subsection', subsection };
    }

    // /code/{division}/{part}/{section}/{subsection}/{article}
    const articleNumber = path[4];
    const article = subsection?.articles.find(
      (art) => String(art.number) === String(articleNumber)
    );
    return { mode: 'article', subsection, article };
  };

  const updateModalInUrl = useCallback(
    (referenceId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (referenceId) {
        params.set('modal', referenceId);
      } else {
        params.delete('modal');
      }

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const fetchTargetSection = useCallback(
    async (referenceId: string): Promise<SectionWithAppendix | null> => {
      const fetchPath = getSectionFetchPath(version, referenceId);
      if (!fetchPath) return null;
      const parsed = parseReferenceId(referenceId);
      if (!parsed || parsed.kind !== 'section') return null;

      const cacheKey = `${fetchPath}|${effectiveDate || 'latest'}`;
      const cached = targetSectionCacheRef.current.get(cacheKey);
      if (cached) return cached;

      const response = await fetch(fetchPath);
      if (!response.ok) return null;

      const section = (await response.json()) as SectionWithAppendix;
      const resolvedSection = resolveSectionForEffectiveDate(section as Section, effectiveDate) as SectionWithAppendix;
      targetSectionCacheRef.current.set(cacheKey, resolvedSection);
      return resolvedSection;
    },
    [effectiveDate, version]
  );

  const fetchTargetAppendix = useCallback(
    async (referenceId: string): Promise<PartAppendix | null> => {
      const parsed = parseReferenceId(referenceId);
      if (!parsed || parsed.kind !== 'part_appendix') return null;

      try {
        const appendix = await fetchAppendix(version, parsed.division, parsed.part);
        return resolvePartAppendixForEffectiveDate(appendix as any, effectiveDate);
      } catch {
        return null;
      }
    },
    [effectiveDate, fetchAppendix, version]
  );

  const fetchStandardsMap = useCallback(async (): Promise<Record<string, StandardReferenceEntry> | null> => {
    const mapPath = `/data/${version}/standards-map.json`;
    const cached = standardsMapCacheRef.current.get(mapPath);
    if (cached) return cached;

    const response = await fetch(mapPath);
    if (!response.ok) return null;

    const map = (await response.json()) as Record<string, StandardReferenceEntry>;
    standardsMapCacheRef.current.set(mapPath, map);
    return map;
  }, [version]);

  const resolveCrossReference = useCallback(
    async (referenceId: string): Promise<ResolvedCrossReference> => {
      const standardsMatch = referenceId.match(/^(standard|external):(.+)$/i);
      if (standardsMatch) {
        const standardsRefId = (standardsMatch[2] || '').trim();
        const standardsMap = await fetchStandardsMap();

        if (!standardsMap) {
          return {
            referenceId,
            heading: referenceId,
            mode: 'error',
            targetSlug: null,
            errorMessage: 'Standards mapping could not be loaded.',
          };
        }

        const normalizedRefId = normalizeStandardsKey(standardsRefId);
        const standardEntry = Object.entries(standardsMap).find(([key, value]) => {
          if (normalizeStandardsKey(key) === normalizedRefId) return true;
          if (value.standard_ref_id && normalizeStandardsKey(value.standard_ref_id) === normalizedRefId) return true;
          if (value.standard_id && normalizeStandardsKey(value.standard_id) === normalizedRefId) return true;
          return false;
        })?.[1];

        if (!standardEntry) {
          return {
            referenceId,
            heading: standardsRefId,
            mode: 'error',
            targetSlug: null,
            errorMessage: 'Referenced standard was not found.',
          };
        }

        const heading = [standardEntry.agency, standardEntry.full_number]
          .filter(Boolean)
          .join(' ')
          .trim() || standardEntry.standard_id || standardsRefId;
        const targetSlug = standardEntry.location_id
          ? getNavigationSlug(standardEntry.location_id)
          : null;

        return {
          referenceId,
          heading,
          mode: 'standard',
          standard: standardEntry,
          targetSlug,
        };
      }

      const parsed = parseReferenceId(referenceId);
      if (!parsed) {
        return {
          referenceId,
          heading: referenceId,
          mode: 'error',
          targetSlug: null,
          errorMessage: 'Unable to parse reference target.',
        };
      }

      if (parsed.kind === 'part_appendix' && parsed.appnote) {
        const appendix =
          (isAppendixLevel ? resolvedPartAppendix : null) ||
          (await fetchTargetAppendix(referenceId));

        if (!appendix) {
          return {
            referenceId,
            heading: referenceId,
            mode: 'error',
            targetSlug: getNavigationSlug(referenceId),
            errorMessage: 'Referenced appendix could not be loaded.',
          };
        }

        const appnoteTokenMatch = referenceId.match(/\.appnote([A-Za-z0-9]+)/i);
        const appnoteToken = appnoteTokenMatch?.[1] || parsed.appnote;
        const notePrefix = `${parsed.division}.part${parsed.part}.appendix.appnote${appnoteToken}`;
        const note = appendix.application_notes?.find((item: ApplicationNote) => item.id.startsWith(notePrefix));

        if (!note) {
          return {
            referenceId,
            heading: referenceId,
            mode: 'error',
            targetSlug: getNavigationSlug(referenceId),
            errorMessage: 'Referenced note was not found.',
          };
        }

        const noteLabel = note.number ? `Note ${note.number}` : 'Note';
        const heading = [noteLabel, note.title].filter(Boolean).join(' ').trim();
        return {
          referenceId,
          heading: heading || noteLabel,
          mode: 'appnote',
          note,
          targetSlug: getNavigationSlug(referenceId),
        };
      }

      if (parsed.kind !== 'section' || !parsed.section) {
        return {
          referenceId,
          heading: referenceId,
          mode: 'error',
          targetSlug: getNavigationSlug(referenceId),
          errorMessage: 'Referenced content type is not supported.',
        };
      }

      const sectionKey = [parsed.division, parsed.part, parsed.section].join('/');
      const isSameSection = sectionKey === requestedSectionKey;
      const section =
        (isSameSection ? (resolvedSection as SectionWithAppendix | null) : null) ||
        (await fetchTargetSection(referenceId));

      if (!section) {
        return {
          referenceId,
          heading: referenceId,
          mode: 'error',
          targetSlug: getNavigationSlug(referenceId),
          errorMessage: 'Referenced content could not be loaded.',
        };
      }

      if (parsed.subsection && parsed.article) {
        const subsection = section.subsections.find(
          (item) => String(item.number) === String(parsed.subsection)
        );
        const article = subsection?.articles.find(
          (item) => String(item.number) === String(parsed.article)
        );

        if (subsection && article) {
          return {
            referenceId,
            heading: article.title.trim(),
            mode: 'article',
            section,
            subsection,
            article,
            targetSlug: getNavigationSlug(referenceId),
          };
        }
      }

      if (parsed.subsection) {
        const subsection = section.subsections.find(
          (item) => String(item.number) === String(parsed.subsection)
        );

        if (subsection) {
          // Handle subsection title - after revision resolution it should be a string
          const subsectionTitle = typeof subsection.title === 'string' 
            ? subsection.title 
            : (subsection.title as any)?.text || '';
          
          return {
            referenceId,
            heading: subsectionTitle.trim(),
            mode: 'subsection',
            section,
            subsection,
            targetSlug: getNavigationSlug(referenceId),
          };
        }
      }

      return {
        referenceId,
        heading: section.title.trim(),
        mode: 'section',
        section,
        targetSlug: getNavigationSlug(referenceId),
      };
    },
    [
      fetchStandardsMap,
      fetchTargetAppendix,
      fetchTargetSection,
      isAppendixLevel,
      partAppendix,
      requestedSectionKey,
      resolvedSection,
      resolvedPartAppendix,
    ]
  );

  const closeReferenceModal = useCallback(() => {
    pendingModalParamRef.current = null;
    suppressedModalParamRef.current = modalData?.referenceId || suppressedModalParamRef.current;
    setModalData(null);
    updateModalInUrl(null);

    if (triggerElementRef.current) {
      triggerElementRef.current.focus();
      triggerElementRef.current = null;
    }
  }, [modalData?.referenceId, updateModalInUrl]);

  const openReferenceModal = useCallback(
    async (referenceId: string, triggerElement: HTMLElement | null) => {
      if (triggerElement) {
        triggerElementRef.current = triggerElement;
      }

      // Guard against local open -> URL sync race that can briefly clear modal state.
      pendingModalParamRef.current = referenceId;
      const resolved = await resolveCrossReference(referenceId);
      setModalData(resolved);
      updateModalInUrl(referenceId);
    },
    [resolveCrossReference, updateModalInUrl]
  );

  const navigateToReference = useCallback(
    (referenceId: string) => {
      const targetSlug = getNavigationSlug(referenceId);
      if (!targetSlug || targetSlug.length < 3) return;

      const params = new URLSearchParams(searchParams.toString());
      params.delete('modal');
      const query = params.toString();
      const url = `/code/${targetSlug.join('/')}${query ? `?${query}` : ''}`;
      router.push(url);
    },
    [router, searchParams]
  );

  // Sync navigation state from URL on mount and when path changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initializeNavigation = async () => {
      const navStore = useNavigationStore.getState();
      
      // Ensure navigation tree is loaded for the current version
      if (navStore.navigationTree.length === 0 || navStore.currentVersion !== version) {
        await navStore.loadNavigationTree(version);
      }
      
      const { navigationTree, setCurrentPath, expandToNode } = useNavigationStore.getState();
      
      // Set current path from the URL pathname (without updating URL back)
      // Normalize by stripping trailing slash to match node.path format
      const normalizedPathname = pathname.replace(/\/$/, '');
      if (useNavigationStore.getState().currentPath !== normalizedPathname) {
        setCurrentPath(normalizedPathname, false);
      }
      
      // Find the node whose path matches the current URL pathname
      const findNodeIdByPath = (nodes: NavigationNode[]): string | null => {
        for (const node of nodes) {
          const normalizedNodePath = node.path.replace(/\/$/, '');
          if (normalizedNodePath === normalizedPathname) {
            return node.id;
          }
          if (node.children) {
            const found = findNodeIdByPath(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const nodeId = findNodeIdByPath(navigationTree);
      if (nodeId) {
        // On reading routes, URL path is the source of truth for open tree state.
        // Replace existing expansion so homepage defaults or prior state do not leak in.
        expandToNode(nodeId, { replaceExpandedNodes: true });
      }
    };
    
    initializeNavigation();
  }, [pathname, version, setCurrentPath]);

  // Keep reading view in sync with browser back/forward while staying on /code.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPopState = () => {
      const nextPath = window.location.pathname.replace(/\/$/, '');
      if (useNavigationStore.getState().currentPath !== nextPath) {
        setCurrentPath(nextPath, false);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setCurrentPath]);

  // Fetch content when slug or version changes
  useEffect(() => {
    if (!isSectionLevelOrDeeper) {
      return;
    }

    const loadContent = async () => {
      try {
        await fetchSection(version, slug);
      } catch (err) {
        console.error('Failed to load content:', err);
      }
    };

    loadContent();
  }, [slugKey, version, fetchSection, isSectionLevelOrDeeper]);

  useEffect(() => {
    if (!isAppendixLevel) {
      setPartAppendix(null);
      setAppendixError(null);
      setAppendixLoading(false);
      return;
    }

    const loadAppendix = async () => {
      setAppendixLoading(true);
      setAppendixError(null);
      setPartAppendix(null);

      try {
        const appendix = await fetchAppendix(version, slug[0], slug[1]);
        setPartAppendix(appendix);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load appendix.';
        setAppendixError(message);
      } finally {
        setAppendixLoading(false);
      }
    };

    loadAppendix();
  }, [fetchAppendix, isAppendixLevel, slug, version]);

  // Preload equation map for [EQ:*:*] marker resolution in content text.
  useEffect(() => {
    useEquationStore.getState().loadEquationMap().catch((error) => {
      console.error('Failed to load equation map:', error);
    });
  }, [version]);

  useEffect(() => {
    if (modalQueryParam && pendingModalParamRef.current === modalQueryParam) {
      pendingModalParamRef.current = null;
    }

    if (!modalQueryParam) {
      suppressedModalParamRef.current = null;
      return;
    }

    if (suppressedModalParamRef.current === modalQueryParam) {
      return;
    }

    const contentStillLoading =
      (isSectionLevelOrDeeper && loading) || (isAppendixLevel && appendixLoading);
    if (!modalQueryParam || (!isSectionLevelOrDeeper && !isAppendixLevel) || contentStillLoading) return;
    if (modalData?.referenceId === modalQueryParam) return;

    openReferenceModal(modalQueryParam, null).catch((error) => {
      console.error('Failed to open modal from URL parameter:', error);
    });
  }, [
    appendixLoading,
    isAppendixLevel,
    isSectionLevelOrDeeper,
    loading,
    modalData?.referenceId,
    modalQueryParam,
    openReferenceModal,
  ]);

  useEffect(() => {
    if (!modalQueryParam) {
      if (pendingModalParamRef.current) {
        return;
      }
      setModalData(null);
    }
  }, [modalQueryParam]);

  const renderLoadingSkeleton = (message: string = 'Loading content...') => (
    <div className="reading-view">
      <div className="reading-view__loading" role="status" aria-live="polite" aria-label={message}>
        <div className="reading-view__loading-shell" aria-hidden="true">
          <div className="reading-view__skeleton-line reading-view__skeleton-title" />
          <div className="reading-view__skeleton-line reading-view__skeleton-subtitle" />
          <div className="reading-view__skeleton-block">
            <div className="reading-view__skeleton-line reading-view__skeleton-body" />
            <div className="reading-view__skeleton-line reading-view__skeleton-body" />
            <div className="reading-view__skeleton-line reading-view__skeleton-body-short" />
          </div>
          <div className="reading-view__skeleton-block">
            <div className="reading-view__skeleton-line reading-view__skeleton-body" />
            <div className="reading-view__skeleton-line reading-view__skeleton-body-mid" />
            <div className="reading-view__skeleton-line reading-view__skeleton-body-short" />
          </div>
        </div>
        <span className="reading-view__loading-text">{message}</span>
      </div>
    </div>
  );

  const getNoteDisplayLabel = (note: ApplicationNote): string => {
    if (note.number && note.number.trim()) {
      return `Note ${note.number.trim()}`;
    }
    return 'Note';
  };

  const renderAppendixBlock = (
    block: AppendixContentBlock,
    interactive: boolean
  ): React.ReactNode => {
    return (
      <>
        {block.paragraphs?.map((paragraph) => (
          <p key={paragraph.id}>{parseTextWithMarkers(paragraph.content || '', [], interactive)}</p>
        ))}
        {block.tables?.map((table) => (
          <TableBlock
            key={table.id}
            table={table}
            interactive={interactive}
            effectiveDate={effectiveDate}
          />
        ))}
        {block.figures?.map((figure) => (
          <FigureBlock key={figure.id} figure={figure} />
        ))}
      </>
    );
  };

  const renderApplicationNote = (note: ApplicationNote, interactive: boolean): React.ReactNode => {
    const noteLabel = getNoteDisplayLabel(note);

    return (
      <article key={note.id} id={note.id} className="reading-view__appendix-note">
        <h3 className="reading-view__appendix-note-title">
          {noteLabel}
          {note.title ? ` ${note.title}` : ''}
        </h3>
        <div className="reading-view__appendix-note-content">
          {renderAppendixBlock(note, interactive)}
          {note.divisions?.map((division) => (
            <section key={division.id} id={division.id} className="reading-view__appendix-division">
              {division.title ? <h4>{division.title}</h4> : null}
              {renderAppendixBlock(division, interactive)}
            </section>
          ))}
        </div>
      </article>
    );
  };

  const renderModalContent = () => {
    if (!modalData) return null;

    if (modalData.mode === 'article' && modalData.section && modalData.subsection && modalData.article) {
      const targetPart = modalData.targetSlug?.[1];
      return (
        <ArticleBlock
          article={modalData.article}
          subsectionNumberPrefix={`${targetPart || ''}.${modalData.section.number}.${modalData.subsection.number}`.replace(/^\./, '')}
          interactive={false}
        />
      );
    }

    if (modalData.mode === 'subsection' && modalData.section && modalData.subsection) {
      const targetPart = modalData.targetSlug?.[1];
      return (
        <SubsectionBlock
          subsection={modalData.subsection}
          sectionNumberPrefix={`${targetPart || ''}.${modalData.section.number}`.replace(/^\./, '')}
          interactive={false}
        />
      );
    }

    if (modalData.mode === 'section' && modalData.section) {
      return (
        <SectionRenderer
          section={modalData.section}
          partNumber={modalData.targetSlug?.[1] || slug[1]}
          interactive={false}
        />
      );
    }

    if (modalData.mode === 'appnote' && modalData.note) {
      return renderApplicationNote(modalData.note, false);
    }

    if (modalData.mode === 'standard' && modalData.standard) {
      const standard = modalData.standard;
      const heading = [standard.agency, standard.full_number]
        .filter(Boolean)
        .join(' ')
        .trim();

      return (
        <div className="reading-view__standard-modal">
          {heading ? <p><strong>{heading}</strong></p> : null}
          {standard.full_title ? <p>{standard.full_title}</p> : null}
          {!standard.full_title && standard.title ? <p>{standard.title}</p> : null}
          {standard.standard_id ? (
            <p className="reading-view__standard-modal-meta">Reference: {standard.standard_id}</p>
          ) : null}
        </div>
      );
    }

    return <p>{modalData.errorMessage || 'Referenced content is unavailable.'}</p>;
  };

  // Loading state
  if (loading || (isAppendixLevel && appendixLoading)) {
    return renderLoadingSkeleton();
  }

  if (isPartLevel) {
    // Navigation tree is still loading for this version
    if (
      navigationLoading ||
      (navigationTree.length === 0 && currentVersion !== version) ||
      (navigationTree.length === 0 && !currentPartNode)
    ) {
      return renderLoadingSkeleton();
    }

    if (!currentPartNode || currentPartNode.type !== 'part') {
      return (
        <div className="reading-view">
          <div className="reading-view__error">
            <h2>Unable to Load Content</h2>
            <p>Part content is not available for this URL.</p>
            <div className="reading-view__error-actions">
              <a href="/" className="reading-view__error-link">
                Return to Homepage
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <CrossReferenceContext.Provider
        value={{ openReference: openReferenceModal, navigateReference: navigateToReference }}
      >
        <div className="reading-view" ref={contentContainerRef}>
          <ReadingViewHeader pdfLabel={`${divisionLabel} - Part ${slug[1]} PDF`} />

          <div className="reading-view__content">
            <PartRenderer
              part={currentPartNode}
              queryString={queryString}
            />
          </div>
        </div>
      </CrossReferenceContext.Provider>
    );
  }

  if (isAppendixLevel) {
    if (
      navigationLoading ||
      (navigationTree.length === 0 && currentVersion !== version) ||
      (navigationTree.length === 0 && !currentPartNode)
    ) {
      return renderLoadingSkeleton();
    }

    if (!currentPartNode || currentPartNode.type !== 'part') {
      return (
        <div className="reading-view">
          <div className="reading-view__error">
            <h2>Unable to Load Content</h2>
            <p>Appendix content is not available for this URL.</p>
          </div>
        </div>
      );
    }

    if (appendixError) {
      return (
        <div className="reading-view">
          <div className="reading-view__error">
            <h2>Unable to Load Content</h2>
            <p>{appendixError}</p>
          </div>
        </div>
      );
    }

    if (!resolvedPartAppendix) {
      return renderLoadingSkeleton();
    }

    const appendixPdfLabel = `${divisionLabel} - Part ${slug[1]} Appendix PDF`;
    return (
      <CrossReferenceContext.Provider
        value={{ openReference: openReferenceModal, navigateReference: navigateToReference }}
      >
        <div className="reading-view" ref={contentContainerRef}>
          <ReadingViewHeader pdfLabel={appendixPdfLabel} />
          <div className="reading-view__content">
            <div className="reading-view__appendix">
              <PartTitle title={currentPartNode.title} />
              <h2 className="reading-view__appendix-heading">Appendix</h2>
              {resolvedPartAppendix.introduction ? (
                <p className="reading-view__appendix-introduction">
                  {parseTextWithMarkers(resolvedPartAppendix.introduction, [], true)}
                </p>
              ) : null}
              <div className="reading-view__appendix-notes">
                {(resolvedPartAppendix.application_notes || []).map((note: ApplicationNote) =>
                  renderApplicationNote(note, true)
                )}
              </div>
            </div>
          </div>
          <CrossReferenceModal
            open={Boolean(modalData)}
            heading={modalData?.heading || 'Cross reference'}
            scrollToReferenceId={modalData?.referenceId || null}
            onClose={closeReferenceModal}
            onGoToSection={() => {
              if (!modalData?.targetSlug || modalData.targetSlug.length < 3) {
                closeReferenceModal();
                return;
              }

              closeReferenceModal();
              const params = new URLSearchParams(searchParams.toString());
              params.delete('modal');
              const query = params.toString();
              router.push(`/code/${modalData.targetSlug.join('/')}${query ? `?${query}` : ''}`);
            }}
            showGoToSection={modalData?.mode !== 'error'}
          >
            {renderModalContent()}
          </CrossReferenceModal>
        </div>
      </CrossReferenceContext.Provider>
    );
  }

  if (isSectionLevelOrDeeper && !isRequestedSectionLoaded && !isErrorForRequestedSection) {
    return renderLoadingSkeleton();
  }

  // Error state
  if (isErrorForRequestedSection) {
    return (
      <div className="reading-view">
        <div className="reading-view__error">
          <h2>Unable to Load Content</h2>
          <p>{error}</p>
          <div className="reading-view__error-actions">
            <button
              onClick={() => {
                clearError();
                fetchSection(version, slug);
              }}
              className="reading-view__error-button"
            >
              Try Again
            </button>
            <a href="/" className="reading-view__error-link">
              Return to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  // No content state
  if (!resolvedSection) {
    return renderLoadingSkeleton();
  }

  const subtree = getSubtreeForSlug(resolvedSection, slug);

  if (subtree.mode === 'subsection' && !subtree.subsection) {
    return (
      <div className="reading-view">
        <div className="reading-view__error">
          <h2>Unable to Load Content</h2>
          <p>Subsection content is not available for this URL.</p>
        </div>
      </div>
    );
  }

  if (subtree.mode === 'article' && (!subtree.subsection || !subtree.article)) {
    return (
      <div className="reading-view">
        <div className="reading-view__error">
          <h2>Unable to Load Content</h2>
          <p>Article content is not available for this URL.</p>
        </div>
      </div>
    );
  }

  // Render content
  const sectionNumberPrefix = `${slug[1]}.${resolvedSection.number}`;
  const pdfLabel =
    subtree.mode === 'article' && subtree.subsection && subtree.article
      ? `${divisionLabel} - ${sectionNumberPrefix}.${subtree.subsection.number}.${subtree.article.number} ${subtree.article.title} PDF`
      : subtree.mode === 'subsection' && subtree.subsection
        ? `${divisionLabel} - ${sectionNumberPrefix}.${subtree.subsection.number} ${subtree.subsection.title} PDF`
        : `${divisionLabel} - ${sectionNumberPrefix} ${resolvedSection.title} PDF`;
  const modalGoToSectionVisible =
    modalData?.mode !== 'error' &&
    Boolean(modalData?.targetSlug && modalData.targetSlug.length >= 3);

  return (
    <CrossReferenceContext.Provider
      value={{ openReference: openReferenceModal, navigateReference: navigateToReference }}
    >
      <div className="reading-view" ref={contentContainerRef}>
        <ReadingViewHeader pdfLabel={pdfLabel} />
        
        <div className="reading-view__content">
          {subtree.mode === 'section' && (
              <SectionRenderer
              section={resolvedSection}
              partNumber={slug[1]}
              effectiveDate={effectiveDate}
              interactive={true}
            />
          )}
          {subtree.mode === 'subsection' && subtree.subsection && (
            <div className="sectionRenderer">
              <SubsectionBlock
                subsection={subtree.subsection}
                sectionNumberPrefix={`${slug[1]}.${resolvedSection.number}`}
                effectiveDate={effectiveDate}
                interactive={true}
              />
            </div>
          )}
          {subtree.mode === 'article' && subtree.article && (
            <div className="sectionRenderer">
              <ArticleBlock
                article={subtree.article}
                subsectionNumberPrefix={`${slug[1]}.${resolvedSection.number}.${subtree.subsection!.number}`}
                effectiveDate={effectiveDate}
                interactive={true}
              />
            </div>
          )}
        </div>

        <CrossReferenceModal
          open={Boolean(modalData)}
          heading={modalData?.heading || 'Cross reference'}
          scrollToReferenceId={modalData?.referenceId || null}
          onClose={closeReferenceModal}
          onGoToSection={() => {
            if (!modalData?.targetSlug || modalData.targetSlug.length < 3) {
              closeReferenceModal();
              return;
            }

            closeReferenceModal();
            const params = new URLSearchParams(searchParams.toString());
            params.delete('modal');
            const query = params.toString();
            router.push(`/code/${modalData.targetSlug.join('/')}${query ? `?${query}` : ''}`);
          }}
          showGoToSection={modalGoToSectionVisible}
        >
          {renderModalContent()}
        </CrossReferenceModal>
      </div>
    </CrossReferenceContext.Provider>
  );
};
