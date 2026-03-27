'use client';

import { CSSProperties, FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Section } from '@bc-building-code/bcbc-parser';
import {
  TESTID_SEARCH_RESULTS_EMPTY,
  TESTID_SEARCH_RESULTS_FILTERS,
  TESTID_SEARCH_RESULTS_FILTER_TOGGLE,
  TESTID_SEARCH_RESULTS_LIST,
  TESTID_SEARCH_RESULTS_PAGE,
  TESTID_SEARCH_RESULTS_PANEL,
  TESTID_SEARCH_RESULTS_QUERY_CLEAR,
  TESTID_SEARCH_RESULTS_QUERY_INPUT,
  TESTID_SEARCH_RESULTS_QUERY_SUBMIT,
  TESTID_SEARCH_RESULTS_STATUS,
} from '@repo/constants';
import Button from '@repo/ui/button';
import Icon from '@repo/ui/icon';
import { DEFAULT_REFERENCE_CONFIG, stripReferences } from '@bc-building-code/search-indexer';
import { getSearchClient, type SearchResult } from '@/lib/search-client';
import { resolveSectionForEffectiveDate } from '@/lib/revision-resolver';
import { useVersionStore } from '@/stores/version-store';
import { LiveRegion } from '@/components/reading/LiveRegion';
import SearchResultCard from './SearchResultCard';
import './SearchResults.css';

type DateOption = {
  effectiveDate: string;
  displayDate: string;
};

type DivisionOption = {
  id: string;
  letter: string;
  title: string;
  parts: Array<{ id: string; number: number; title: string }>;
};

type SearchResultDisplayOverride = {
  title?: string;
  snippet?: string;
};

const RESULTS_BATCH_SIZE = 20;
const MAX_FETCH_RESULTS = 500;
const SEARCH_RESULTS_FILTERS_ID = 'search-results-filters';
const SEARCH_RESULTS_LIST_ID = 'search-results-list';

function toNumberOrUndefined(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDivisionFilter(value: string | null): string | undefined {
  if (!value) return undefined;

  const match = value.match(/nbc\.div([A-Z])[A-Z0-9]*/i);
  if (match) {
    return match[1].toUpperCase();
  }

  return value.toUpperCase();
}

function normalizeDivisionIdFilter(value: string | null): string | undefined {
  if (!value) return undefined;
  return /^nbc\.div/i.test(value) ? value : undefined;
}

function formatDivisionVolumeLabel(divisionId: string): string {
  const volumeMatch = divisionId.match(/V(\d+)$/i);
  const volume = volumeMatch ? volumeMatch[1] : '1';
  return `Vol ${volume}`;
}

function transformDivisionForPath(divisionId: string): string {
  return divisionId.replace(/nbc\.div([A-Z0-9]+)/i, (_, suffix) => `nbc-div${String(suffix).toLowerCase()}`);
}

function buildSectionDataPath(version: string, result: SearchResult): string | null {
  const sectionNumber = result.document.sectionNumber;
  if (!sectionNumber) return null;

  const division = transformDivisionForPath(result.document.divisionId);
  const part = `part-${result.document.partNumber}`;
  const section = `section-${sectionNumber}`;
  return `/data/${version}/content/${division}/${part}/${section}.json`;
}

function nodeExistsInSection(section: Section, targetId: string): boolean {
  const stack: any[] = [section];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    if (current.id === targetId) {
      return true;
    }

    for (const value of Object.values(current)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object') {
            stack.push(item);
          }
        }
      } else if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return false;
}

function findNodeInSection(section: Section, targetId: string): any | null {
  const stack: any[] = [section];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    if (current.id === targetId) {
      return current;
    }

    for (const value of Object.values(current)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object') {
            stack.push(item);
          }
        }
      } else if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function formatReferenceText(value: string): string {
  if (!value) return '';
  return normalizeText(stripReferences(value, DEFAULT_REFERENCE_CONFIG));
}

function snippetFromText(text: string, maxLength: number = 280): string {
  const normalized = normalizeText(text);
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;

  const truncated = normalized.slice(0, maxLength);
  const lastWordBreak = truncated.lastIndexOf(' ');
  if (lastWordBreak > Math.floor(maxLength * 0.7)) {
    return `${truncated.slice(0, lastWordBreak)}...`;
  }
  return `${truncated}...`;
}

function readNodeText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  if ('text' in value && typeof (value as any).text === 'string') {
    return (value as any).text;
  }
  return '';
}

function extractClauseText(clause: any): string {
  const parts: string[] = [];
  const text = formatReferenceText(readNodeText(clause?.text));
  if (text) parts.push(text);

  const nested = Array.isArray(clause?.content)
    ? clause.content
    : [...(Array.isArray(clause?.clauses) ? clause.clauses : []), ...(Array.isArray(clause?.subclauses) ? clause.subclauses : [])];

  for (const item of nested) {
    if (!item || typeof item !== 'object') continue;
    parts.push(extractClauseText(item));
  }

  return parts.filter(Boolean).join(' ');
}

function extractArticleSnippet(node: any): string {
  const content = Array.isArray(node?.content) ? node.content : [];
  const parts: string[] = [];

  for (const item of content) {
    if (!item || typeof item !== 'object') continue;
    if (item.type === 'sentence') {
      const sentenceText = formatReferenceText(readNodeText(item.text));
      if (sentenceText) parts.push(sentenceText);

      const clauses = Array.isArray(item.content) ? item.content : item.clauses;
      if (Array.isArray(clauses)) {
        for (const clause of clauses) {
          parts.push(extractClauseText(clause));
        }
      }
    } else if (item.type === 'table' || item.type === 'figure') {
      const label = formatReferenceText(readNodeText(item.title) || readNodeText(item.caption));
      if (label) parts.push(label);
    }
  }

  if (parts.length === 0) {
    const fallbackText = formatReferenceText(readNodeText(node?.text));
    if (fallbackText) return snippetFromText(fallbackText);
  }

  return snippetFromText(parts.join(' '));
}

function extractTableSnippet(node: any): string {
  const parts: string[] = [];
  const title = formatReferenceText(readNodeText(node?.title));
  const caption = formatReferenceText(readNodeText(node?.caption));

  if (title) parts.push(title);
  if (caption) parts.push(caption);

  const structure = node?.structure;
  const headerRows = Array.isArray(structure?.header_rows) ? structure.header_rows : [];
  const bodyRows = Array.isArray(structure?.body_rows) ? structure.body_rows.slice(0, 5) : [];
  const rows = [...headerRows, ...bodyRows];

  for (const row of rows) {
    const cells = Array.isArray(row?.cells) ? row.cells : [];
    for (const cell of cells) {
      const cellText = formatReferenceText(readNodeText(cell?.text));
      if (cellText) parts.push(cellText);
    }
  }

  return snippetFromText(parts.join(' '));
}

function extractFigureSnippet(node: any): string {
  const text = formatReferenceText(
    readNodeText(node?.title) || readNodeText(node?.caption) || readNodeText(node?.text)
  );
  return snippetFromText(text);
}

function extractDisplayOverrideFromNode(
  node: any,
  result: SearchResult
): SearchResultDisplayOverride | null {
  const resolvedTitle = formatReferenceText(readNodeText(node?.title));
  let resolvedSnippet = '';

  if (result.document.type === 'article') {
    resolvedSnippet = extractArticleSnippet(node);
  } else if (result.document.type === 'table') {
    resolvedSnippet = extractTableSnippet(node);
  } else if (result.document.type === 'figure') {
    resolvedSnippet = extractFigureSnippet(node);
  } else {
    return null;
  }

  const nextTitle = resolvedTitle || result.document.title;
  const nextSnippet = resolvedSnippet || result.document.snippet;

  if (!nextTitle && !nextSnippet) {
    return null;
  }

  return {
    title: nextTitle,
    snippet: nextSnippet,
  };
}

function getCodeOrderTuple(result: SearchResult): [string, number, number, number, number, string] {
  const doc = result.document;
  const typeRank: Record<string, number> = {
    part: 0,
    section: 1,
    subsection: 2,
    article: 3,
    table: 4,
    figure: 5,
    note: 6,
    'application-note': 7,
    glossary: 8,
  };

  return [
    doc.divisionLetter || '',
    doc.partNumber || 0,
    doc.sectionNumber || 0,
    doc.subsectionNumber || 0,
    typeRank[doc.type] ?? 99,
    doc.articleNumber || '',
  ];
}

function compareCodeOrder(a: SearchResult, b: SearchResult): number {
  const left = getCodeOrderTuple(a);
  const right = getCodeOrderTuple(b);

  for (let i = 0; i < left.length; i += 1) {
    if (left[i] < right[i]) return -1;
    if (left[i] > right[i]) return 1;
  }

  return 0;
}

function buildResultHref(path: string, version: string, effectiveDate?: string): string {
  const [basePath, hash] = path.split('#');
  const params = new URLSearchParams();
  params.set('version', version);

  if (effectiveDate) {
    params.set('date', effectiveDate);
  }

  return `${basePath}?${params.toString()}${hash ? `#${hash}` : ''}`;
}

function formatContentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    article: 'Article',
    section: 'Section',
    subsection: 'Subsection',
    part: 'Part',
    table: 'Table',
    figure: 'Figure',
    note: 'Notes',
    glossary: 'Glossary',
    'application-note': 'Appendices',
  };

  return map[type] || type;
}

export default function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchClient = useMemo(() => getSearchClient(), []);

  const availableVersions = useVersionStore((state) => state.availableVersions);
  const currentVersion = useVersionStore((state) => state.currentVersion);
  const setCurrentVersion = useVersionStore((state) => state.setCurrentVersion);

  const q = searchParams.get('q') ?? '';
  const version = searchParams.get('version') || currentVersion || '2024';
  const date = searchParams.get('date') || '';
  const division = searchParams.get('division') || '';
  const part = searchParams.get('part') || '';
  const type = searchParams.get('type') || '';
  const sort = searchParams.get('sort') === 'code-order' ? 'code-order' : 'relevance';

  const [queryInput, setQueryInput] = useState(q);
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDateFiltering, setIsDateFiltering] = useState(false);
  const [datesLoading, setDatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(RESULTS_BATCH_SIZE);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileOverlayTop, setMobileOverlayTop] = useState<number | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [displayOverrides, setDisplayOverrides] = useState<Record<string, SearchResultDisplayOverride>>({});

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const resultsScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileFilterRowRef = useRef<HTMLDivElement | null>(null);
  const mobileFiltersRef = useRef<HTMLElement | null>(null);
  const mobileFilterToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const runIdRef = useRef(0);
  const sectionCacheRef = useRef<Map<string, Section>>(new Map());
  const resolvedSectionCacheRef = useRef<Map<string, Section>>(new Map());
  const visibilityCacheRef = useRef<Map<string, boolean>>(new Map());
  const displayOverrideCacheRef = useRef<Map<string, SearchResultDisplayOverride>>(new Map());

  const selectedDivisionValue = useMemo(() => {
    if (!division) return '';

    if (divisions.some((item) => item.id === division)) {
      return division;
    }

    const byLetter = divisions.find((item) => item.letter.toUpperCase() === division.toUpperCase());
    return byLetter?.id || '';
  }, [division, divisions]);

  const selectedDivision = useMemo(
    () => divisions.find((item) => item.id === selectedDivisionValue),
    [divisions, selectedDivisionValue]
  );

  const availableParts = selectedDivision?.parts || [];
  useEffect(() => {
    setQueryInput(q);
  }, [q]);

  useEffect(() => {
    if (!currentVersion) return;
    if (version === currentVersion) return;

    const exists = availableVersions.some((item) => item.id === version);
    if (exists) {
      setCurrentVersion(version);
    }
  }, [availableVersions, currentVersion, setCurrentVersion, version]);

  useEffect(() => {
    let isMounted = true;

    const loadDates = async () => {
      setDatesLoading(true);
      try {
        const response = await fetch(`/data/${version}/amendment-dates.json`);
        if (!response.ok) {
          throw new Error(`Failed to load amendment dates (${response.status})`);
        }

        const payload = await response.json();
        const options: DateOption[] = Array.isArray(payload?.dates)
          ? payload.dates.map((item: any) => ({
              effectiveDate: item.effectiveDate,
              displayDate: item.displayDate,
            }))
          : [];

        if (!isMounted) return;

        setDateOptions(options);

        if (options.length > 0) {
          const hasDate = date && options.some((item) => item.effectiveDate === date);
          if (!hasDate) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('date', options[0].effectiveDate);
            router.replace(`/search?${params.toString()}`);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setDateOptions([]);
      } finally {
        if (isMounted) {
          setDatesLoading(false);
        }
      }
    };

    loadDates();

    return () => {
      isMounted = false;
    };
  }, [date, router, searchParams, version]);

  const pushSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value.trim()) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    if (!params.get('version')) {
      params.set('version', version);
    }

    if (!params.get('date') && dateOptions.length > 0) {
      params.set('date', dateOptions[0].effectiveDate);
    }

    router.push(`/search?${params.toString()}`);
  };

  const getResolvedSection = async (result: SearchResult, effectiveDate: string): Promise<Section | null> => {
    if (result.document.type === 'part' || !result.document.sectionNumber) {
      return null;
    }

    const sectionPath = buildSectionDataPath(version, result);
    if (!sectionPath) {
      return null;
    }

    let section = sectionCacheRef.current.get(sectionPath);
    if (!section) {
      const response = await fetch(sectionPath);
      if (!response.ok) {
        return null;
      }
      section = (await response.json()) as Section;
      sectionCacheRef.current.set(sectionPath, section);
    }

    const resolvedKey = `${sectionPath}::${effectiveDate}`;
    let resolvedSection = resolvedSectionCacheRef.current.get(resolvedKey);
    if (!resolvedSection) {
      resolvedSection = resolveSectionForEffectiveDate(section, effectiveDate);
      resolvedSectionCacheRef.current.set(resolvedKey, resolvedSection);
    }

    return resolvedSection;
  };

  const isResultVisibleOnDate = async (result: SearchResult, effectiveDate: string): Promise<boolean> => {
    const cacheKey = `${version}:${effectiveDate}:${result.document.id}`;
    const cached = visibilityCacheRef.current.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    if (!result.document.urlPath.startsWith('/code/')) {
      visibilityCacheRef.current.set(cacheKey, false);
      return false;
    }

    if (result.document.type === 'part' || !result.document.sectionNumber) {
      visibilityCacheRef.current.set(cacheKey, true);
      return true;
    }

    const resolvedSection = await getResolvedSection(result, effectiveDate);
    if (!resolvedSection) {
      visibilityCacheRef.current.set(cacheKey, false);
      return false;
    }

    const visible = nodeExistsInSection(resolvedSection, result.document.id);
    visibilityCacheRef.current.set(cacheKey, visible);
    return visible;
  };

  const getDisplayOverrideForDate = async (
    result: SearchResult,
    effectiveDate: string
  ): Promise<SearchResultDisplayOverride | null> => {
    if (!['article', 'table', 'figure'].includes(result.document.type)) {
      return null;
    }

    const cacheKey = `${version}:${effectiveDate}:${result.document.id}`;
    const cached = displayOverrideCacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const resolvedSection = await getResolvedSection(result, effectiveDate);
    if (!resolvedSection) {
      return null;
    }

    const resolvedNode = findNodeInSection(resolvedSection, result.document.id);
    if (!resolvedNode) {
      return null;
    }

    const display = extractDisplayOverrideFromNode(resolvedNode, result);
    if (!display) {
      return null;
    }

    displayOverrideCacheRef.current.set(cacheKey, display);
    return display;
  };

  useEffect(() => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    const runSearch = async () => {
      if (!q.trim()) {
        setResults([]);
        setDisplayOverrides({});
        setError(null);
        setVisibleCount(RESULTS_BATCH_SIZE);
        return;
      }

      setIsSearching(true);
      setIsDateFiltering(false);
      setError(null);

      try {
        await searchClient.initialize(version);

        const divisionFilter = normalizeDivisionFilter(division);
        const divisionIdFilter = normalizeDivisionIdFilter(division);
        const partFilter = toNumberOrUndefined(part);
        const contentTypeFilter = type || undefined;

        const rawResults = await searchClient.search(
          q,
          {
            divisionFilter,
            partFilter,
            contentTypes: contentTypeFilter ? [contentTypeFilter as any] : undefined,
            limit: MAX_FETCH_RESULTS,
            offset: 0,
          },
          version
        );

        if (runIdRef.current !== runId) return;

        setDivisions(searchClient.getDivisions(version) as DivisionOption[]);
        setContentTypes(searchClient.getContentTypes(version));

        let filtered = rawResults.filter((item) => item.document.urlPath.startsWith('/code/'));

        if (divisionIdFilter) {
          filtered = filtered.filter((item) => item.document.divisionId === divisionIdFilter);
        }

        if (date) {
          setIsDateFiltering(true);
          const visibility = await Promise.all(
            filtered.map((item) => isResultVisibleOnDate(item, date))
          );

          if (runIdRef.current !== runId) return;

          filtered = filtered.filter((_, index) => visibility[index]);

          const displayEntries = await Promise.all(
            filtered.map(async (item) => {
              const display = await getDisplayOverrideForDate(item, date);
              return [item.document.id, display] as const;
            })
          );

          if (runIdRef.current !== runId) return;

          const nextOverrides: Record<string, SearchResultDisplayOverride> = {};
          for (const [id, display] of displayEntries) {
            if (display) {
              nextOverrides[id] = display;
            }
          }
          setDisplayOverrides(nextOverrides);
          setIsDateFiltering(false);
        } else {
          setDisplayOverrides({});
        }

        if (sort === 'code-order') {
          filtered = [...filtered].sort(compareCodeOrder);
        }

        setResults(filtered);
        setVisibleCount(RESULTS_BATCH_SIZE);
      } catch (err) {
        if (runIdRef.current !== runId) return;

        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load search results');
        setResults([]);
        setDisplayOverrides({});
      } finally {
        if (runIdRef.current === runId) {
          setIsSearching(false);
          setIsDateFiltering(false);
        }
      }
    };

    runSearch();
  }, [date, division, part, q, searchClient, sort, type, version]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        setVisibleCount((current) => {
          if (current >= results.length) return current;
          return Math.min(current + RESULTS_BATCH_SIZE, results.length);
        });
      },
      {
        root: resultsScrollRef.current,
        rootMargin: '250px 0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [results.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 64rem)');

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileFiltersOpen(false);
      }
    };

    if (mediaQuery.matches) {
      setMobileFiltersOpen(false);
    }

    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    if (!mobileFiltersOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [mobileFiltersOpen]);

  useLayoutEffect(() => {
    if (!mobileFiltersOpen) return;

    const updateOverlayTop = () => {
      const rowRect = mobileFilterRowRef.current?.getBoundingClientRect();
      if (!rowRect) return;
      setMobileOverlayTop(rowRect.bottom);
    };

    updateOverlayTop();
    window.addEventListener('resize', updateOverlayTop);
    window.addEventListener('scroll', updateOverlayTop, { passive: true });

    return () => {
      window.removeEventListener('resize', updateOverlayTop);
      window.removeEventListener('scroll', updateOverlayTop);
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!mobileFiltersOpen) {
      mobileFilterToggleButtonRef.current?.focus();
      return;
    }

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const panel = mobileFiltersRef.current;
    if (!panel) return;

    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
    focusables[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!mobileFiltersOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileFiltersOpen(false);
        return;
      }

      if (event.key !== 'Tab' || focusables.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileFiltersOpen]);

  const toggleMobileFilters = () => {
    if (!mobileFiltersOpen) {
      const rowRect = mobileFilterRowRef.current?.getBoundingClientRect();
      if (rowRect) {
        setMobileOverlayTop(rowRect.bottom);
      }
    }

    setMobileFiltersOpen((open) => !open);
  };

  const visibleResults = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);
  const hasMore = visibleCount < results.length;

  useEffect(() => {
    if (error) {
      setLiveAnnouncement(`Search failed: ${error}`);
      return;
    }
    if (isSearching) {
      setLiveAnnouncement(q ? `Searching for ${q}` : 'Searching');
      return;
    }
    if (isDateFiltering) {
      setLiveAnnouncement('Applying effective date filter');
      return;
    }
    if (q.trim()) {
      setLiveAnnouncement(`${results.length} results found${q ? ` for ${q}` : ''}`);
      return;
    }
    setLiveAnnouncement('');
  }, [error, isDateFiltering, isSearching, q, results.length]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    pushSearchParams({ q: queryInput.trim() || null });
  };

  const onVersionChange = (nextVersion: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('version', nextVersion);
    params.delete('date');
    router.push(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    pushSearchParams({
      division: null,
      part: null,
      type: null,
      sort: null,
    });
  };

  return (
    <div className="search-results-page" data-testid={TESTID_SEARCH_RESULTS_PAGE}>
      <nav className="search-results-page__skip-links" aria-label="Search results quick navigation">
        <a className="search-results-page__skip-link" href={`#${SEARCH_RESULTS_FILTERS_ID}`}>
          Skip to filters
        </a>
        <a className="search-results-page__skip-link" href={`#${SEARCH_RESULTS_LIST_ID}`}>
          Skip to results
        </a>
      </nav>
      <LiveRegion message={liveAnnouncement} politeness="polite" />
      <div ref={mobileFilterRowRef} className="search-results-page__mobile-filter-row">
        <button
          type="button"
          className="search-results-page__mobile-filter-icon-btn"
          aria-label={mobileFiltersOpen ? 'Close filters' : 'Open filters'}
          aria-controls={SEARCH_RESULTS_FILTERS_ID}
          aria-expanded={mobileFiltersOpen}
          ref={mobileFilterToggleButtonRef}
          onClick={toggleMobileFilters}
          data-testid={TESTID_SEARCH_RESULTS_FILTER_TOGGLE}
        >
          <Icon type={mobileFiltersOpen ? 'close' : 'funnel'} />
        </button>
      </div>

      <div className="search-results-page__layout">
        <aside
          id={SEARCH_RESULTS_FILTERS_ID}
          ref={mobileFiltersRef}
          className={`search-results-page__filters ${mobileFiltersOpen ? '--mobile-open' : ''} ${mobileFiltersOpen && mobileOverlayTop === null ? '--positioning' : ''}`}
          style={mobileFiltersOpen && mobileOverlayTop !== null ? ({ '--mobile-overlay-top': `${mobileOverlayTop}px` } as CSSProperties) : undefined}
          role={mobileFiltersOpen ? 'dialog' : undefined}
          aria-modal={mobileFiltersOpen ? 'true' : undefined}
          aria-label="Search filters"
          data-testid={TESTID_SEARCH_RESULTS_FILTERS}
        >

          <div className="search-results-page__filters-header">
            <h2>
              <Icon type="funnel" /> Filters
            </h2>
            <div className="search-results-page__filters-header-actions">
              <Button variant="secondary" className="search-results-page__filters-close" onPress={() => setMobileFiltersOpen(false)}>
                Close
              </Button>
            </div>
          </div>

          <Button variant="secondary" className="search-results-page__clear-filters" onPress={clearFilters}>
            Clear All Filters
          </Button>

          <label className="search-results-page__filter-group">
            <span>Effective Version</span>
            <div className="search-results-page__select-wrap">
              <select
                value={version}
                onChange={(event) => onVersionChange(event.target.value)}
                aria-label="Select version"
              >
                {availableVersions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="search-results-page__filter-group">
            <span>Effective Date</span>
            <div className="search-results-page__select-wrap">
              <select
                value={date}
                onChange={(event) => pushSearchParams({ date: event.target.value || null })}
                aria-label="Select effective date"
                disabled={datesLoading}
              >
                {dateOptions.map((item, index) => (
                  <option key={item.effectiveDate} value={item.effectiveDate}>
                    {index === 0 ? `${item.displayDate} (Latest)` : item.displayDate}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="search-results-page__filter-group">
            <span>Code Division</span>
            <div className="search-results-page__select-wrap">
              <select
                value={selectedDivisionValue}
                onChange={(event) => pushSearchParams({ division: event.target.value || null, part: null })}
                aria-label="Select division"
              >
                <option value="">Select</option>
                {divisions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatDivisionVolumeLabel(item.id)} - Division {item.letter} - {item.title}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="search-results-page__filter-group">
            <span>Part</span>
            <div className="search-results-page__select-wrap">
              <select
                value={part}
                onChange={(event) => pushSearchParams({ part: event.target.value || null })}
                aria-label="Select part"
                disabled={!selectedDivision}
              >
                <option value="">Select</option>
                {availableParts.map((item) => (
                  <option key={item.id} value={String(item.number)}>
                    Part {item.number} - {item.title}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="search-results-page__filter-group">
            <span>Content Type</span>
            <div className="search-results-page__select-wrap">
              <select
                value={type}
                onChange={(event) => pushSearchParams({ type: event.target.value || null })}
                aria-label="Select content type"
              >
                <option value="">Select</option>
                {contentTypes.filter((item) => item !== 'glossary').map((item) => (
                  <option key={item} value={item}>
                    {formatContentTypeLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <Button className="search-results-page__apply-filters" onPress={() => setMobileFiltersOpen(false)}>
            Apply Filters
          </Button>
        </aside>

        <section className="search-results-page__results-panel" data-testid={TESTID_SEARCH_RESULTS_PANEL}>
          <div className="search-results-page__header-row">
            <h1 className="search-results-page__title">Search Results</h1>
            <p className="search-results-page__summary">
              Found {results.length} results{q ? ` for “${q}”` : ''}
            </p>
          </div>

          <form className="search-results-page__search-form" onSubmit={onSubmit}>
            <input
              className="search-results-page__search-input"
              type="text"
              placeholder="Search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              aria-label="Search building code"
              data-testid={TESTID_SEARCH_RESULTS_QUERY_INPUT}
            />
            {queryInput && (
              <button
                type="button"
                className="search-results-page__search-clear"
                onClick={() => setQueryInput('')}
                aria-label="Clear search"
                data-testid={TESTID_SEARCH_RESULTS_QUERY_CLEAR}
              >
                <Icon type="close" />
              </button>
            )}
            <button
              type="submit"
              className="search-results-page__search-submit"
              aria-label="Submit search"
              data-testid={TESTID_SEARCH_RESULTS_QUERY_SUBMIT}
            >
              <Icon type="search" />
            </button>
          </form>

          <div ref={resultsScrollRef} className="search-results-page__results-scroll">
            <div
              id={SEARCH_RESULTS_LIST_ID}
              className="search-results-page__results"
              data-testid={TESTID_SEARCH_RESULTS_LIST}
            >
              {error ? (
                <p className="search-results-page__status --error" data-testid={TESTID_SEARCH_RESULTS_STATUS} role="alert">
                  {error}
                </p>
              ) : null}
              {isSearching ? (
                <p className="search-results-page__status" data-testid={TESTID_SEARCH_RESULTS_STATUS}>Searching…</p>
              ) : null}
              {isDateFiltering ? (
                <p className="search-results-page__status" data-testid={TESTID_SEARCH_RESULTS_STATUS}>Applying effective date…</p>
              ) : null}

              {!isSearching && !error && q && results.length === 0 ? (
                <div className="search-results-page__empty" data-testid={TESTID_SEARCH_RESULTS_EMPTY}>
                  <p>No results found for “{q}”.</p>
                  <Button variant="secondary" onPress={clearFilters}>Clear All Filters</Button>
                </div>
              ) : null}

              {visibleResults.map((item) => (
                <SearchResultCard
                  key={item.document.id}
                  result={item}
                  href={buildResultHref(item.document.urlPath, version, date || undefined)}
                  testId={item.document.id}
                  displayTitle={displayOverrides[item.document.id]?.title}
                  displaySnippet={displayOverrides[item.document.id]?.snippet}
                />
              ))}

              {hasMore ? <div ref={sentinelRef} className="search-results-page__sentinel" aria-hidden="true" /> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
