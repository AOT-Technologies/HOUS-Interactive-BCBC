import React from 'react';
import type { Figure } from '@bc-building-code/bcbc-parser';
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
};

export interface FigureBlockProps {
  figure: FigureWithRawGraphic;
}

export const FigureBlock: React.FC<FigureBlockProps> = ({ figure }) => {
  // Determine the full image path
  const getImagePath = (src?: string): string | null => {
    if (!src || typeof src !== 'string') {
      return null;
    }

    // If src already starts with /, use it as-is.
    if (src.startsWith('/')) {
      return src;
    }

    const normalizedSrc = src.replace(/^\/?bc-graphics\//i, '');
    const convertedSrc = normalizedSrc.replace(/\.eps$/i, '.jpg');

    // Use normalized root-relative asset path.
    return `/${convertedSrc}`;
  };

  const rawImageSrc = figure.imageUrl || figure.graphic?.src;
  const imagePath = getImagePath(rawImageSrc);
  const altText = figure.altText || figure.graphic?.alt_text || figure.title || 'Figure';
  const figureLabel = figure.number ? `Figure ${figure.number}` : 'Figure';

  return (
    <figure className="figure-block">
      <div className="figure-block__title">
        {figureLabel} {figure.title}
      </div>
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
          {figure.caption}
        </figcaption>
      )}
    </figure>
  );
};
