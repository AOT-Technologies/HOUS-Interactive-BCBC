import React from 'react';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './PartTitle.css';

interface SeeAlsoRevision {
  effective_date: string;
  content: string;
}

interface PartTitleProps {
  title: string;
  /** "(See Note A-3.)" printed under the Part title in the PDF (BBC-193). Current version. */
  seeAlso?: string;
  /** Dated versions of seeAlso when a revision changes it (e.g. Part 5, MO BA 2024 06 item 73). */
  seeAlsoRevisions?: SeeAlsoRevision[];
  /** Selected effective date (YYYY-MM-DD); the current version is shown when not set. */
  effectiveDate?: string;
  /** Id of the Part, used as the reference context of the see-also link. */
  partId?: string;
}

/** Latest version dated on or before the effective date, the same rule as other revised content. */
export const resolvePartSeeAlso = (
  seeAlso: string | undefined,
  revisions: SeeAlsoRevision[] | undefined,
  effectiveDate: string | undefined
): string => {
  if (!revisions?.length || !effectiveDate) return seeAlso?.trim() || '';
  const applicable = [...revisions]
    .sort((a, b) => (b.effective_date || '').localeCompare(a.effective_date || ''))
    .find((revision) => (revision.effective_date || '') <= effectiveDate);
  return applicable?.content?.trim() || '';
};

export const PartTitle: React.FC<PartTitleProps> = ({ title, seeAlso, seeAlsoRevisions, effectiveDate, partId }) => {
  const normalizedTitle = title.trim();
  const displayTitle = /^part\s+/i.test(normalizedTitle)
    ? normalizedTitle
    : `Part ${normalizedTitle}`;
  const seeAlsoText = resolvePartSeeAlso(seeAlso, seeAlsoRevisions, effectiveDate);

  return (
    <>
      <h1 className="partTitle">{displayTitle}</h1>
      {seeAlsoText ? (
        <p className="articleSeeAlso partSeeAlso">
          {parseTextWithMarkers(seeAlsoText, [], true, [], [], { kind: 'article', referenceId: partId || '' })}
        </p>
      ) : null}
    </>
  );
};
