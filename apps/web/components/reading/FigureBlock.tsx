import React from 'react';
import type { Figure } from '@bc-building-code/bcbc-parser';
import { resolveImagePath } from '../../lib/image-config';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './FigureBlock.css';

type RawFigureGraphic = {
  src?: string;
  alt_text?: string;
};

type FigureWithRawGraphic = Figure & {
  graphic?: RawFigureGraphic;
  number?: string;
  altText?: string;
  imageUrl?: string;
  notes?: Array<{
    id: string;
    content: string;
  }>;
};

export interface FigureBlockProps {
  figure: FigureWithRawGraphic;
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

export const FigureBlock: React.FC<FigureBlockProps> = ({ figure }) => {
  const rawImageSrc = figure.imageUrl || figure.graphic?.src;
  const imagePath = resolveImagePath(rawImageSrc);
  const altText = figure.altText || figure.graphic?.alt_text || figure.title || 'Figure';
  const figureNumber = extractFigureNumberFromId(figure.id) || figure.number;
  const figureLabel = figureNumber ? `Figure ${figureNumber}` : 'Figure';
  const figureNotes = Array.isArray(figure.notes) ? figure.notes.filter((note) => note?.content) : [];

  return (
    <figure className="figure-block" id={figure.id} data-node-id={figure.id}>
      <div className="figure-block__number">{figureLabel}</div>
      {figure.title && (
        <div className="figure-block__title">
          {parseTextWithMarkers(figure.title, [], true)}
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
          {parseTextWithMarkers(figure.caption, [], true)}
        </figcaption>
      )}
      {figureNotes.length > 0 && (
        <div className="figure-block__notes">
          {figureNotes.map((note) => (
            <p key={note.id} className="figure-block__note">
              <strong>{`Note (${getFigureNoteNumber(note.id)}): `}</strong>
              {parseTextWithMarkers(note.content, [], true)}
            </p>
          ))}
        </div>
      )}
    </figure>
  );
};
