'use client';

import { useMemo, type KeyboardEventHandler } from 'react';
import { useRouter } from 'next/navigation';
import { GET_TESTID_SEARCH_RESULT_ITEM } from '@repo/constants';
import type { SearchResult } from '@/lib/search-client';
import Icon from '@repo/ui/icon';
import { formatNumberedTitle } from '../../lib/title-formatting';
import './SearchResults.css';

interface SearchResultCardProps {
  result: SearchResult;
  href: string;
  testId?: string;
  displayTitle?: string;
  displaySnippet?: string;
}

function getVolumeLabel(divisionId: string): string {
  if (/divbv2/i.test(divisionId)) {
    return 'Vol 2';
  }
  return 'Vol 1';
}

function stripDivisionPrefix(articleNumber: string, divisionLetter: string): string {
  const prefix = `${divisionLetter}.`;
  if (articleNumber.startsWith(prefix)) {
    return articleNumber.slice(prefix.length);
  }
  return articleNumber;
}

function buildSectionNumber(partNumber: number, sectionNumber?: number): string | null {
  if (sectionNumber === undefined || sectionNumber === null) return null;
  const section = String(sectionNumber).trim();
  if (!section) return null;
  if (section.startsWith(`${partNumber}.`)) return section;
  return `${partNumber}.${section}`;
}

function buildSubsectionNumber(partNumber: number, sectionNumber?: number, subsectionNumber?: number): string | null {
  if (subsectionNumber === undefined || subsectionNumber === null) return null;
  const subsection = String(subsectionNumber).trim();
  if (!subsection) return null;

  const fullSection = buildSectionNumber(partNumber, sectionNumber);
  if (!fullSection) return null;

  if (subsection === '0') return fullSection;
  if (subsection === `${fullSection}.0`) return fullSection;

  if (subsection.startsWith(`${fullSection}.`)) return subsection;
  if (subsection.startsWith(`${partNumber}.`)) return subsection;
  return `${fullSection}.${subsection}`;
}

function normalizeHighlightedSnippet(input: string): string {
  return input.replace(/<mark[^>]*>/gi, '').replace(/<\/mark>/gi, '');
}

export function SearchResultCard({ result, href, testId, displayTitle, displaySnippet }: SearchResultCardProps) {
  const router = useRouter();
  const { document } = result;
  const titleForDisplay = displayTitle || document.title;

  const heading = useMemo(() => {
    const number = stripDivisionPrefix(document.articleNumber, document.divisionLetter);
    return formatNumberedTitle(number, titleForDisplay);
  }, [document.articleNumber, document.divisionLetter, titleForDisplay]);

  const previewHtml = useMemo(() => {
    if (displaySnippet) {
      return normalizeHighlightedSnippet(displaySnippet);
    }

    const textHighlight = result.highlights.find((item) => item.field === 'text')?.text;
    const preview = textHighlight || document.snippet || '';
    return normalizeHighlightedSnippet(preview);
  }, [displaySnippet, document.snippet, result.highlights]);

  const typeLabel = useMemo(() => {
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

    return map[document.type] || document.type;
  }, [document.type]);

  const volumeLabel = useMemo(() => getVolumeLabel(document.divisionId), [document.divisionId]);

  const pathLabel = useMemo(() => {
    const fullSectionNumber = buildSectionNumber(document.partNumber, document.sectionNumber);
    const fullSubsectionNumber = buildSubsectionNumber(
      document.partNumber,
      document.sectionNumber,
      document.subsectionNumber
    );
    const articleToken = stripDivisionPrefix(document.articleNumber, document.divisionLetter).split(' ')[0];

    const base = [
      `${volumeLabel} - Division ${document.divisionLetter} - Part ${document.partNumber}`,
      fullSectionNumber ? `Section ${formatNumberedTitle(fullSectionNumber, '')}` : null,
      fullSubsectionNumber ? `Subsection ${formatNumberedTitle(fullSubsectionNumber, '')}` : null,
      document.type === 'article' || document.type === 'table' || document.type === 'figure'
        ? `Article ${formatNumberedTitle(articleToken, '')}`
        : null,
    ].filter(Boolean);

    return base.join(' / ');
  }, [
    document.articleNumber,
    document.divisionLetter,
    document.divisionId,
    document.partNumber,
    document.sectionNumber,
    document.subsectionNumber,
    document.type,
    volumeLabel,
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
      data-testid={GET_TESTID_SEARCH_RESULT_ITEM(testId || document.id)}
    >
      <header className="search-results-card__header-row">
        <span className="search-results-card__badge">
          {volumeLabel.toUpperCase()} - DIVISION {document.divisionLetter} - PART {document.partNumber}
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
        <span className="search-results-card__cta" aria-hidden="true">
          View Section <Icon type="caretRight" />
        </span>
      </footer>
    </article>
  );
}

export default SearchResultCard;
