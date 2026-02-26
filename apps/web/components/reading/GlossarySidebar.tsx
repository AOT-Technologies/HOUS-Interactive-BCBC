'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@repo/ui/icon';
import { useGlossaryStore } from '../../stores/glossary-store';
import { useUIStore } from '../../lib/stores/ui-store';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import { GlossaryTerm } from './GlossaryTerm';
import './GlossarySidebar.css';

type GlossaryEntry = {
  id?: string;
  term: string;
  definition: string;
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const normalize = (value: string) => value.trim().toLowerCase();

export const GlossarySidebar: React.FC = () => {
  const glossarySidebarOpen = useUIStore((s) => s.glossarySidebarOpen);
  const activeGlossaryTermId = useUIStore((s) => s.activeGlossaryTermId);
  const closeGlossarySidebar = useUIStore((s) => s.closeGlossarySidebar);
  const openGlossarySidebar = useUIStore((s) => s.openGlossarySidebar);

  const glossaryMap = useGlossaryStore((s) => s.glossaryMap);
  const loading = useGlossaryStore((s) => s.loading);
  const loadGlossary = useGlossaryStore((s) => s.loadGlossary);
  const getTerm = useGlossaryStore((s) => s.getTerm);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState<string>('ALL');

  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusedRef = useRef<HTMLElement | null>(null);
  const termRefs = useRef<Map<string, HTMLElement>>(new Map());
  const prevSearchQueryRef = useRef('');
  const lastAutoFilterTermRef = useRef<string | null>(null);

  useEffect(() => {
    if (glossarySidebarOpen && glossaryMap.size === 0 && !loading) {
      loadGlossary();
    }
  }, [glossarySidebarOpen, glossaryMap.size, loading, loadGlossary]);

  const entries = useMemo(() => {
    const seen = new Set<string>();
    const unique: GlossaryEntry[] = [];

    glossaryMap.forEach((entry) => {
      if (!entry?.term || !entry?.definition) return;
      const key = normalize(entry.term);
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(entry);
    });

    return unique.sort((a, b) => a.term.localeCompare(b.term));
  }, [glossaryMap]);

  const activeTermEntry = useMemo(() => {
    if (!activeGlossaryTermId) return null;
    const byStore = getTerm(activeGlossaryTermId);
    if (byStore) return byStore;
    return entries.find((entry) => normalize(entry.term) === normalize(activeGlossaryTermId)) || null;
  }, [activeGlossaryTermId, entries, getTerm]);

  const filteredEntries = useMemo(() => {
    const query = normalize(searchQuery);

    return entries.filter((entry) => {
      const letter = entry.term.charAt(0).toUpperCase();
      const letterMatches = activeLetter === 'ALL' || letter === activeLetter;
      if (!letterMatches) return false;
      if (!query) return true;

      return normalize(entry.term).includes(query);
    });
  }, [entries, searchQuery, activeLetter]);

  const isSearching = searchQuery.trim().length > 0;

  const groupedEntries = useMemo(() => {
    return filteredEntries.reduce<Record<string, GlossaryEntry[]>>((acc, entry) => {
      const letter = entry.term.charAt(0).toUpperCase();
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(entry);
      return acc;
    }, {});
  }, [filteredEntries]);

  useEffect(() => {
    if (!glossarySidebarOpen) return;

    previousFocusedRef.current = document.activeElement as HTMLElement;
    panelRef.current?.focus();

    return () => {
      previousFocusedRef.current?.focus();
    };
  }, [glossarySidebarOpen]);

  useEffect(() => {
    if (glossarySidebarOpen) return;
    setSearchQuery('');
    setActiveLetter('ALL');
  }, [glossarySidebarOpen]);

  useEffect(() => {
    if (!glossarySidebarOpen) return;

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
  }, [glossarySidebarOpen]);

  useEffect(() => {
    if (!glossarySidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeGlossarySidebar();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [glossarySidebarOpen, closeGlossarySidebar]);

  useEffect(() => {
    const previous = prevSearchQueryRef.current;
    const wasSearching = previous.trim().length > 0;
    const isSearchingNow = searchQuery.trim().length > 0;

    if (wasSearching && !isSearchingNow) {
      requestAnimationFrame(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      });
    }

    prevSearchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const pendingScrollTermRef = useRef<string | null>(null);

  useEffect(() => {
    if (!glossarySidebarOpen) {
      pendingScrollTermRef.current = null;
      return;
    }

    pendingScrollTermRef.current = activeGlossaryTermId ? normalize(activeGlossaryTermId) : null;
  }, [glossarySidebarOpen, activeGlossaryTermId]);

  useEffect(() => {
    if (!glossarySidebarOpen || !activeTermEntry) return;
    if (!pendingScrollTermRef.current) return;

    const key = normalize(activeTermEntry.term);
    const target = termRefs.current.get(key);
    if (!target) return;

    // Scroll once per requested active term after it is rendered, then move focus for accessibility.
    requestAnimationFrame(() => {
      const content = contentRef.current;
      if (content) {
        const contentRect = content.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offsetTop = targetRect.top - contentRect.top;
        const nextTop = content.scrollTop + offsetTop - 8;
        content.scrollTo({ top: Math.max(0, nextTop), behavior: 'auto' });
      } else {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
      }

      target.focus({ preventScroll: true });
    });
    pendingScrollTermRef.current = null;
  }, [activeTermEntry, glossarySidebarOpen, filteredEntries]);

  useEffect(() => {
    if (!glossarySidebarOpen || !activeTermEntry) return;

    // Ensure target entry is visible when activated from an inline definition link.
    const activeKey = normalize(activeTermEntry.id || activeTermEntry.term);
    if (lastAutoFilterTermRef.current === activeKey) return;
    lastAutoFilterTermRef.current = activeKey;

    const targetLetter = activeTermEntry.term.charAt(0).toUpperCase();
    setSearchQuery('');
    if (targetLetter) {
      setActiveLetter(targetLetter);
    }
  }, [activeTermEntry, glossarySidebarOpen]);

  const handleLetterFilterClick = (letter: string) => {
    setActiveLetter(letter);
    requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });
  };

  const renderDefinitionWithMarkers = (definition: string): React.ReactNode[] => {
    // Sidebar-specific behavior:
    // - REF:term remains clickable to jump within glossary
    // - all other REF types render as plain text (non-hyperlink)
    const parsedNodes = parseTextWithMarkers(definition, [], false);

    return parsedNodes.map((node, index) => {
      if (!React.isValidElement(node)) return node;
      if (node.type !== GlossaryTerm) return node;

      const glossaryNode = node as React.ReactElement<{ termId?: string; text?: string }>;
      const termId = typeof glossaryNode.props.termId === 'string' ? glossaryNode.props.termId : '';
      const text = typeof glossaryNode.props.text === 'string' ? glossaryNode.props.text : termId;
      if (!termId || !text) return text;

      return (
        <button
          key={`inline-term-${termId}-${index}`}
          type="button"
          className="glossary-sidebar__inline-term"
          onClick={() => openGlossarySidebar(termId)}
        >
          {text}
        </button>
      );
    });
  };

  return (
    <>
      <div
        className={`glossary-sidebar__backdrop ${glossarySidebarOpen ? 'is-open' : ''}`}
        onClick={closeGlossarySidebar}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className={`glossary-sidebar ${glossarySidebarOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="glossary-sidebar-title"
        tabIndex={-1}
      >
        <div className="glossary-sidebar__header-row">
          <button
            type="button"
            className="glossary-sidebar__close"
            onClick={closeGlossarySidebar}
            aria-label="Close glossary"
          >
            <Icon type="close" />
          </button>
        </div>

        <div className="glossary-sidebar__header">
          <h2 id="glossary-sidebar-title" className="glossary-sidebar__title">Glossary of Defined Terms</h2>
          <p className="glossary-sidebar__subtitle">Definitions from the BC Building Code</p>
        </div>

        <div className="glossary-sidebar__controls">
          <label className="glossary-sidebar__search-wrap">
            <Icon type="search" className="glossary-sidebar__search-icon" aria-hidden="true" />
            <input
              type="search"
              className="glossary-sidebar__search"
              placeholder="Search Defined Terms"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search defined terms"
            />
          </label>

          <div className="glossary-sidebar__letters" role="group" aria-label="Filter by letter">
            <button
              type="button"
              className={`glossary-sidebar__letter ${activeLetter === 'ALL' ? 'is-active' : ''}`}
              onClick={() => handleLetterFilterClick('ALL')}
            >
              All
            </button>
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                className={`glossary-sidebar__letter ${activeLetter === letter ? 'is-active' : ''}`}
                onClick={() => handleLetterFilterClick(letter)}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        <div ref={contentRef} className="glossary-sidebar__content">
          {loading && entries.length === 0 ? (
            <p className="glossary-sidebar__status">Loading glossary terms...</p>
          ) : filteredEntries.length === 0 ? (
            <p className="glossary-sidebar__status">No matching terms.</p>
          ) : isSearching ? (
            <>
              <div className="glossary-sidebar__search-summary">
                <h3 className="glossary-sidebar__search-title">Search Results</h3>
                <p className="glossary-sidebar__search-count">
                  Found {filteredEntries.length} result{filteredEntries.length === 1 ? '' : 's'} for "{searchQuery.trim()}"
                </p>
              </div>
              <div className="glossary-sidebar__search-divider" aria-hidden="true" />

              {filteredEntries.map((entry) => {
                const active = activeTermEntry && normalize(activeTermEntry.term) === normalize(entry.term);

                return (
                  <article
                    key={normalize(entry.term)}
                    className={`glossary-sidebar__term ${active ? 'is-active' : ''}`}
                    tabIndex={-1}
                    ref={(element) => {
                      const key = normalize(entry.term);
                      if (element) {
                        termRefs.current.set(key, element);
                      } else {
                        termRefs.current.delete(key);
                      }
                    }}
                  >
                    <h4 className="glossary-sidebar__term-title">{entry.term}</h4>
                    <p className="glossary-sidebar__term-definition">
                      {renderDefinitionWithMarkers(entry.definition)}
                    </p>
                  </article>
                );
              })}
            </>
          ) : (
            Object.keys(groupedEntries)
              .sort()
              .map((letter) => (
                <section key={letter} className="glossary-sidebar__group" aria-label={`Terms starting with ${letter}`}>
                  <h3 className="glossary-sidebar__group-letter">{letter}</h3>
                  <div className="glossary-sidebar__group-divider" aria-hidden="true" />

                  {groupedEntries[letter].map((entry) => {
                    const active = activeTermEntry && normalize(activeTermEntry.term) === normalize(entry.term);

                    return (
                      <article
                        key={normalize(entry.term)}
                        className={`glossary-sidebar__term ${active ? 'is-active' : ''}`}
                        tabIndex={-1}
                        ref={(element) => {
                          const key = normalize(entry.term);
                          if (element) {
                            termRefs.current.set(key, element);
                          } else {
                            termRefs.current.delete(key);
                          }
                        }}
                      >
                        <h4 className="glossary-sidebar__term-title">{entry.term}</h4>
                        <p className="glossary-sidebar__term-definition">
                          {renderDefinitionWithMarkers(entry.definition)}
                        </p>
                      </article>
                    );
                  })}
                </section>
              ))
          )}
        </div>
      </aside>
    </>
  );
};
