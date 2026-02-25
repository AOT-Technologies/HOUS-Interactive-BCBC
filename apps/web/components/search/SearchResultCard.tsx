'use client';

import { useMemo, type KeyboardEventHandler } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/lib/search-client';
import Icon from '@repo/ui/icon';
import './SearchResults.css';

interface SearchResultCardProps {
  result: SearchResult;
  href: string;
  effectiveDateLabel?: string;
}

function stripDivisionPrefix(articleNumber: string, divisionLetter: string, partNumber: number): string {
  const prefix = `${divisionLetter}.${partNumber}.`;
  if (articleNumber.startsWith(prefix)) {
    return articleNumber.slice(prefix.length);
  }
  return articleNumber;
}

function normalizeHighlightedSnippet(input: string): string {
  return input.replace(/<mark[^>]*>/gi, '').replace(/<\/mark>/gi, '');
}

export function SearchResultCard({ result, href, effectiveDateLabel }: SearchResultCardProps) {
  const router = useRouter();
  const { document } = result;

  const heading = useMemo(() => {
    const number = stripDivisionPrefix(document.articleNumber, document.divisionLetter, document.partNumber);
    return `${number} ${document.title}`.trim();
  }, [document.articleNumber, document.divisionLetter, document.partNumber, document.title]);

  const previewHtml = useMemo(() => {
    const textHighlight = result.highlights.find((item) => item.field === 'text')?.text;
    const preview = textHighlight || document.snippet || '';
    return normalizeHighlightedSnippet(preview);
  }, [document.snippet, result.highlights]);

  const typeLabel = useMemo(() => {
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

    return map[document.type] || document.type;
  }, [document.type]);

  const pathLabel = useMemo(() => {
    const articleToken = stripDivisionPrefix(document.articleNumber, document.divisionLetter, document.partNumber).split(' ')[0];

    const base = [
      `Division ${document.divisionLetter} - Part ${document.partNumber}`,
      document.sectionNumber ? `Section ${document.sectionNumber}` : null,
      document.subsectionNumber ? `Subsection ${document.sectionNumber}.${document.subsectionNumber}` : null,
      document.type === 'article' || document.type === 'table' || document.type === 'figure'
        ? `Article ${articleToken}`
        : null,
    ].filter(Boolean);

    return base.join(' / ');
  }, [
    document.articleNumber,
    document.divisionLetter,
    document.partNumber,
    document.sectionNumber,
    document.subsectionNumber,
    document.type,
  ]);

  const onOpen = () => {
    router.push(href);
  };

  const onKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      className="search-results-card"
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      aria-label={`Open ${heading}`}
    >
      <header className="search-results-card__header-row">
        <span className="search-results-card__badge">
          DIVISION {document.divisionLetter} - PART {document.partNumber}
        </span>
        <span className="search-results-card__type">{typeLabel}</span>
      </header>

      <h3 className="search-results-card__title">{heading}</h3>

      <p className="search-results-card__path">
        {pathLabel}
      </p>

      <p
        className="search-results-card__snippet"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />

      <footer className="search-results-card__footer-row">
        <span className="search-results-card__effective-date">
          Effective: {effectiveDateLabel || 'Latest'}
        </span>
        <span className="search-results-card__cta" aria-hidden="true">
          View Section <Icon type="arrowForward" />
        </span>
      </footer>
    </article>
  );
}

export default SearchResultCard;
