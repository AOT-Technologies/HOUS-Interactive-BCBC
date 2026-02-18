'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@repo/ui/icon';
import { useGlossaryStore } from '../../stores/glossary-store';
import { useUIStore } from '../../lib/stores/ui-store';
import './GlossarySidebar.css';

type GlossaryEntry = {
  id?: string;
  term: string;
  definition: string;
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const normalize = (value: string) => value.trim().toLowerCase();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const renderDefinitionWithLinks = (
  definition: string,
  terms: GlossaryEntry[],
  onTermClick: (termId: string) => void
): React.ReactNode[] => {
  if (!definition) return [definition];

  const shortList = terms
    .map((entry) => ({ id: entry.id || entry.term, term: entry.term }))
    .filter((entry) => entry.term.length >= 4)
    .sort((a, b) => b.term.length - a.term.length)
    .slice(0, 250);

  if (shortList.length === 0) return [definition];

  const pattern = shortList.map((entry) => escapeRegExp(entry.term)).join('|');
  const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(definition)) !== null) {
    const matchedText = match[0];
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(definition.slice(lastIndex, start));
    }

    const matchedEntry = shortList.find((entry) =>
      normalize(entry.term) === normalize(matchedText)
    );

    if (matchedEntry) {
      nodes.push(
        <button
          key={`link-${start}-${matchedEntry.id}`}
          type="button"
          className="glossary-sidebar__inline-term"
          onClick={() => onTermClick(matchedEntry.id)}
        >
          <span className="glossary-sidebar__inline-term-icon" aria-hidden="true">
            <Icon type="info" style={{ color: '#1A5A96' }} />
          </span>
          {matchedText}
        </button>
      );
    } else {
      nodes.push(matchedText);
    }

    lastIndex = start + matchedText.length;
  }

  if (lastIndex < definition.length) {
    nodes.push(definition.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [definition];
};

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
  const previousFocusedRef = useRef<HTMLElement | null>(null);
  const termRefs = useRef<Map<string, HTMLElement>>(new Map());

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
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
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
    if (!glossarySidebarOpen || !activeTermEntry) return;

    const key = normalize(activeTermEntry.term);
    const target = termRefs.current.get(key);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.focus();
  }, [activeTermEntry, groupedEntries, glossarySidebarOpen]);

  const handleSidebarTermClick = (termId: string) => {
    openGlossarySidebar(termId);
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
              onClick={() => setActiveLetter('ALL')}
            >
              All
            </button>
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                className={`glossary-sidebar__letter ${activeLetter === letter ? 'is-active' : ''}`}
                onClick={() => setActiveLetter(letter)}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        <div className="glossary-sidebar__content">
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
                      {renderDefinitionWithLinks(entry.definition, entries, handleSidebarTermClick)}
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
                          {renderDefinitionWithLinks(entry.definition, entries, handleSidebarTermClick)}
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
