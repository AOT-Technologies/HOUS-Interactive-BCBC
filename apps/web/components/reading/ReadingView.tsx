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
import { useNavigationStore, NavigationNode } from '../../stores/navigation-store';
import { useEquationStore } from '../../stores/equation-store';
import { parseContentPath } from '../../lib/url-utils';
import { resolveSectionForEffectiveDate } from '../../lib/revision-resolver';
import { getNavigationSlug, getSectionFetchPath, parseReferenceId } from '../../lib/cross-reference';
import { SectionRenderer } from './SectionRenderer';
import { ReadingViewHeader } from './ReadingViewHeader';
import { PartRenderer } from './PartRenderer';
import { SubsectionBlock } from './SubsectionBlock';
import { ArticleBlock } from './ArticleBlock';
import { CrossReferenceContext } from './CrossReferenceContext';
import { CrossReferenceModal } from './CrossReferenceModal';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './ReadingView.css';

export const ReadingView: React.FC<ReadingViewProps> = ({
  slug: initialSlug,
  version: initialVersion,
}) => {
  type AppendixParagraph = { id: string; content: string };
  type AppendixDivision = { id: string; title?: string; paragraphs?: AppendixParagraph[] };
  type ApplicationNote = {
    id: string;
    number?: string;
    title?: string;
    paragraphs?: AppendixParagraph[];
    divisions?: AppendixDivision[];
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
    mode: 'article' | 'subsection' | 'section' | 'appnote' | 'error';
    section?: SectionWithAppendix;
    subsection?: Subsection;
    article?: Article;
    note?: ApplicationNote;
    errorMessage?: string;
  };

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const targetSectionCacheRef = useRef<Map<string, SectionWithAppendix>>(new Map());
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const suppressedModalParamRef = useRef<string | null>(null);
  const [modalData, setModalData] = useState<ResolvedCrossReference | null>(null);
  
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
  const isSectionLevelOrDeeper = slug.length >= 3;
  const requestedSectionKey = slug.slice(0, 3).join('/');
  const loadedSectionKey = currentPath.slice(0, 3).join('/');
  const isErrorForRequestedSection = Boolean(error) && loadedSectionKey === requestedSectionKey;
  const isRequestedSectionLoaded = Boolean(currentSection) && loadedSectionKey === requestedSectionKey;
  const resolvedSection = useMemo(
    () => (currentSection ? resolveSectionForEffectiveDate(currentSection, effectiveDate) : null),
    [currentSection, effectiveDate]
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

  const currentPartNode = isPartLevel
    ? findNodeByPath(navigationTree, normalizedPathname)
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

  const resolveCrossReference = useCallback(
    async (referenceId: string): Promise<ResolvedCrossReference> => {
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

      if (parsed.appnote) {
        const targetNotePrefix = `${parsed.division}.part${parsed.part}.sect${parsed.section}.appnote${parsed.appnote}`;
        const note = section.appendix?.application_notes?.find((item) =>
          item.id.startsWith(targetNotePrefix)
        );

        if (!note) {
          return {
            referenceId,
            heading: referenceId,
            mode: 'error',
            targetSlug: getNavigationSlug(referenceId),
            section,
            errorMessage: 'Referenced note was not found.',
          };
        }

        const noteLabel = note.number ? `Note ${note.number}` : 'Note';
        const heading = (note.title || noteLabel).trim();
        return {
          referenceId,
          heading,
          mode: 'appnote',
          section,
          note,
          targetSlug: getNavigationSlug(referenceId),
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
          return {
            referenceId,
            heading: subsection.title.trim(),
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
    [fetchTargetSection, requestedSectionKey, resolvedSection]
  );

  const closeReferenceModal = useCallback(() => {
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
        expandToNode(nodeId);
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

  // Preload equation map for [EQ:*:*] marker resolution in content text.
  useEffect(() => {
    useEquationStore.getState().loadEquationMap().catch((error) => {
      console.error('Failed to load equation map:', error);
    });
  }, [version]);

  useEffect(() => {
    if (!modalQueryParam) {
      suppressedModalParamRef.current = null;
      return;
    }

    if (suppressedModalParamRef.current === modalQueryParam) {
      return;
    }

    if (!modalQueryParam || !isSectionLevelOrDeeper || loading) return;
    if (modalData?.referenceId === modalQueryParam) return;

    openReferenceModal(modalQueryParam, null).catch((error) => {
      console.error('Failed to open modal from URL parameter:', error);
    });
  }, [
    isSectionLevelOrDeeper,
    loading,
    modalData?.referenceId,
    modalQueryParam,
    openReferenceModal,
  ]);

  useEffect(() => {
    if (!modalQueryParam) {
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

  // Loading state
  if (loading) {
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
  const sectionPdfLabel = `${divisionLabel} - ${resolvedSection.number} ${resolvedSection.title} PDF`;
  const modalGoToSectionVisible = modalData?.mode !== 'error';

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
      return (
        <div className="note-block">
          {modalData.note.paragraphs?.map((paragraph) => (
            <p key={paragraph.id}>{parseTextWithMarkers(paragraph.content || '', [], false)}</p>
          ))}
          {modalData.note.divisions?.map((division) => (
            <div key={division.id}>
              {division.title ? <h4>{division.title}</h4> : null}
              {division.paragraphs?.map((paragraph) => (
                <p key={paragraph.id}>{parseTextWithMarkers(paragraph.content || '', [], false)}</p>
              ))}
            </div>
          ))}
        </div>
      );
    }

    return <p>{modalData.errorMessage || 'Referenced content is unavailable.'}</p>;
  };

  return (
    <CrossReferenceContext.Provider
      value={{ openReference: openReferenceModal, navigateReference: navigateToReference }}
    >
      <div className="reading-view" ref={contentContainerRef}>
        <ReadingViewHeader pdfLabel={sectionPdfLabel} />
        
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
