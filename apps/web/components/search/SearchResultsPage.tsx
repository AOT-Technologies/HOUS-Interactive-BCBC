'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Section } from '@bc-building-code/bcbc-parser';
import Button from '@repo/ui/button';
import Icon from '@repo/ui/icon';
import { getSearchClient, type SearchResult } from '@/lib/search-client';
import { resolveSectionForEffectiveDate } from '@/lib/revision-resolver';
import { useVersionStore } from '@/stores/version-store';
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

const RESULTS_BATCH_SIZE = 20;
const MAX_FETCH_RESULTS = 500;

function toNumberOrUndefined(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDivisionFilter(value: string | null): string | undefined {
  if (!value) return undefined;
  return value.toUpperCase();
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
    part: 'Requirement',
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

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const resultsScrollRef = useRef<HTMLDivElement | null>(null);
  const runIdRef = useRef(0);
  const sectionCacheRef = useRef<Map<string, Section>>(new Map());
  const resolvedSectionCacheRef = useRef<Map<string, Section>>(new Map());
  const visibilityCacheRef = useRef<Map<string, boolean>>(new Map());

  const selectedDivision = useMemo(
    () => divisions.find((item) => item.letter.toUpperCase() === division.toUpperCase()),
    [division, divisions]
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

    const sectionPath = buildSectionDataPath(version, result);
    if (!sectionPath) {
      visibilityCacheRef.current.set(cacheKey, true);
      return true;
    }

    let section = sectionCacheRef.current.get(sectionPath);
    if (!section) {
      const response = await fetch(sectionPath);
      if (!response.ok) {
        visibilityCacheRef.current.set(cacheKey, false);
        return false;
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

    const visible = nodeExistsInSection(resolvedSection, result.document.id);
    visibilityCacheRef.current.set(cacheKey, visible);
    return visible;
  };

  useEffect(() => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    const runSearch = async () => {
      if (!q.trim()) {
        setResults([]);
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

        if (date) {
          setIsDateFiltering(true);
          const visibility = await Promise.all(
            filtered.map((item) => isResultVisibleOnDate(item, date))
          );

          if (runIdRef.current !== runId) return;

          filtered = filtered.filter((_, index) => visibility[index]);
          setIsDateFiltering(false);
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

  const visibleResults = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);
  const hasMore = visibleCount < results.length;

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
    <div className="search-results-page">
      <Button
        variant="secondary"
        className="search-results-page__mobile-filters-toggle"
        onPress={() => setMobileFiltersOpen((open) => !open)}
      >
        Filters
      </Button>

      {mobileFiltersOpen ? (
        <button
          type="button"
          className="search-results-page__mobile-backdrop"
          onClick={() => setMobileFiltersOpen(false)}
          aria-label="Close filters"
        />
      ) : null}

      <div className="search-results-page__layout">
        <aside className={`search-results-page__filters ${mobileFiltersOpen ? '--mobile-open' : ''}`}>
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
                value={division}
                onChange={(event) => pushSearchParams({ division: event.target.value || null, part: null })}
                aria-label="Select division"
              >
                <option value="">Select</option>
                {divisions.map((item) => (
                  <option key={item.id} value={item.letter}>
                    Division {item.letter} - {item.title}
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
                {contentTypes.map((item) => (
                  <option key={item} value={item}>
                    {formatContentTypeLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <Button variant="secondary" className="search-results-page__clear-filters" onPress={clearFilters}>
            Clear All Filters
          </Button>
        </aside>

        <section className="search-results-page__results-panel" aria-live="polite">
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
            />
            <button type="submit" className="search-results-page__search-submit" aria-label="Submit search">
              <Icon type="search" />
            </button>
          </form>

          <div ref={resultsScrollRef} className="search-results-page__results-scroll">
            <div className="search-results-page__results">
              {error ? <p className="search-results-page__status --error">{error}</p> : null}
              {isSearching ? <p className="search-results-page__status">Searching…</p> : null}
              {isDateFiltering ? <p className="search-results-page__status">Applying effective date…</p> : null}

              {!isSearching && !error && q && results.length === 0 ? (
                <div className="search-results-page__empty">
                  <p>No results found for “{q}”.</p>
                  <Button variant="secondary" onPress={clearFilters}>Clear All Filters</Button>
                </div>
              ) : null}

              {visibleResults.map((item) => (
                <SearchResultCard
                  key={item.document.id}
                  result={item}
                  href={buildResultHref(item.document.urlPath, version, date || undefined)}
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
