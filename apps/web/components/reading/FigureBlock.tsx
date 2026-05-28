import React from 'react';
import type { Figure, FormingPartReference } from '@bc-building-code/bcbc-parser';
import { resolveImagePath } from '../../lib/image-config';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import './FigureBlock.css';

type RawFigureGraphic = {
  src?: string;
  alt_text?: string;
};

type FigureWithRawGraphic = Figure & {
  graphic?: RawFigureGraphic;
  number?: string;
  altText?: string;
  forming_part?: FormingPartReference[];
  formingPart?: FormingPartReference[];
  imageUrl?: string;
  hide_label?: boolean;
  notes?: Array<{
    id: string;
    content: string;
  }>;
};

export interface FigureBlockProps {
  figure: FigureWithRawGraphic;
  interactive?: boolean;
  renderContext?: ReferenceRenderContext;
}

function toAlphabetOrdinalUpper(value: number): string {
  if (value <= 0 || Number.isNaN(value)) return String(value);

  let remaining = value;
  let result = '';

  while (remaining > 0) {
    const current = (remaining - 1) % 26;
    result = String.fromCharCode(65 + current) + result;
    remaining = Math.floor((remaining - 1) / 26);
  }

  return result;
}

function extractFigureNumberFromId(id: string): string | undefined {
  // Handle appendix figures: nbc.divB.appendixC.figure1 → C-1
  const appendixFigureMatch = id.match(
    /\.appendix([A-Za-z])(?:\..*)?\.figure(\d+)/i
  );
  if (appendixFigureMatch) {
    const letter = appendixFigureMatch[1].toUpperCase();
    const figureNum = appendixFigureMatch[2];
    return `${letter}-${figureNum}`;
  }

  // Handle regular article figures
  const part = id.match(/\.part(\d+)/i)?.[1];
  const section = id.match(/\.sect(\d+)/i)?.[1];
  const subsection = id.match(/\.subsect(\d+)/i)?.[1];
  const article = id.match(/\.art(\d+)/i)?.[1];
  const figure = id.match(/\.figure(\d+)/i)?.[1];
  const figureIndex = figure ? Number.parseInt(figure, 10) : Number.NaN;

  if (!part || !section || !subsection || !article || Number.isNaN(figureIndex)) {
    return undefined;
  }

  return `${part}.${section}.${subsection}.${article}.-${toAlphabetOrdinalUpper(figureIndex)}`;
}

function getFigureNoteNumber(noteId: string): string {
  const noteMatch = noteId.match(/\.note(\d+)$/i);
  return noteMatch?.[1] || noteId.split('.').pop() || noteId;
}

type ParsedInternalReference = {
  part?: string;
  section?: string;
  subsection?: string;
  article?: string;
  sentence?: string;
  clause?: string;
  subclause?: string;
};

const extractNumeric = (value: string, pattern: RegExp): string | undefined =>
  value.match(pattern)?.[1];

const toAlphabetOrdinal = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return String(value);
  }

  let current = value;
  let result = '';

  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(97 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }

  return result;
};

const toRoman = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return String(value);
  }

  const numerals: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];

  let remainder = Math.floor(value);
  let result = '';

  for (const [numericValue, numeral] of numerals) {
    while (remainder >= numericValue) {
      result += numeral;
      remainder -= numericValue;
    }
  }

  return result;
};

const parseInternalReference = (referenceId: string): ParsedInternalReference => ({
  part: extractNumeric(referenceId, /\.part(\d+)/i),
  section: extractNumeric(referenceId, /\.sect(\d+)/i),
  subsection: extractNumeric(referenceId, /\.subsect(\d+)/i),
  article: extractNumeric(referenceId, /\.art(\d+)/i),
  sentence: extractNumeric(referenceId, /\.sent(\d+)/i),
  clause: extractNumeric(referenceId, /\.clause(\d+)/i),
  subclause: extractNumeric(referenceId, /\.subclause(\d+)/i),
});

const formatFormingPartLabel = (reference: ParsedInternalReference): string | null => {
  const articleReference = [reference.part, reference.section, reference.subsection, reference.article]
    .filter(Boolean)
    .join('.');

  if (reference.subclause) {
    return articleReference
      ? `Subclause ${articleReference}.(${toRoman(Number(reference.subclause))})`
      : `Subclause (${toRoman(Number(reference.subclause))})`;
  }

  if (reference.clause) {
    const clauseLabel = toAlphabetOrdinal(Number(reference.clause));
    return articleReference
      ? `Clause ${articleReference}.(${clauseLabel})`
      : `Clause (${clauseLabel})`;
  }

  if (reference.sentence) {
    return articleReference
      ? `Sentence ${articleReference}.(${reference.sentence})`
      : `Sentence (${reference.sentence})`;
  }

  if (articleReference) {
    return `Article ${articleReference}.`;
  }

  return null;
};

const formatFormingPartText = (formingPart: FormingPartReference[] | undefined): string | null => {
  if (!formingPart || formingPart.length === 0) {
    return null;
  }

  const labels = formingPart
    .filter((entry) => entry?.type === 'internal' && typeof entry.target === 'string')
    .map((entry) => formatFormingPartLabel(parseInternalReference(entry.target)))
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return null;
  }

  if (labels.length === 1) {
    return `Forming Part of ${labels[0]}`;
  }

  if (labels.length === 2) {
    return `Forming Part of ${labels[0]} and ${labels[1]}`;
  }

  return `Forming Part of ${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

export const FigureBlock: React.FC<FigureBlockProps> = ({
  figure,
  interactive = true,
  renderContext,
}) => {
  const rawImageSrc = figure.imageUrl || figure.graphic?.src;
  const imagePath = resolveImagePath(rawImageSrc);
  const altText = figure.altText || figure.graphic?.alt_text || figure.title || 'Figure';
  const figureNumber = extractFigureNumberFromId(figure.id) || figure.number;
  const figureLabel = figureNumber ? `Figure ${figureNumber}` : 'Figure';
  const hideLabel = figure.hide_label === true;
  const formingPartEntries = figure.formingPart ?? figure.forming_part;
  const formingPartText = formatFormingPartText(formingPartEntries);
  const figureNotes = Array.isArray(figure.notes) ? figure.notes.filter((note) => note?.content) : [];

  return (
    <figure className="figure-block" id={figure.id} data-node-id={figure.id}>
      {!hideLabel && <div className="figure-block__number">{figureLabel}</div>}
      {figure.title && (
        <div className="figure-block__title">
          {parseTextWithMarkers(figure.title, [], interactive, [], [], renderContext)}
        </div>
      )}
      {formingPartText && (
        <div className="figure-block__forming-part">
          {parseTextWithMarkers(formingPartText, [], interactive, [], [], renderContext)}
        </div>
      )}
      {imagePath && (
        <img
          src={imagePath}
          alt={altText}
          className="figure-block__image"
          loading="lazy"
        />
      )}
      {figure.caption && (
        <figcaption className="figure-block__caption">
          {parseTextWithMarkers(figure.caption, [], interactive, [], [], renderContext)}
        </figcaption>
      )}
      {figureNotes.length > 0 && (
        <div className="figure-block__notes">
          {figureNotes.map((note) => (
            <p key={note.id} className="figure-block__note">
              <strong>{`Note (${getFigureNoteNumber(note.id)}): `}</strong>
              {parseTextWithMarkers(note.content, [], interactive, [], [], renderContext)}
            </p>
          ))}
        </div>
      )}
    </figure>
  );
};
