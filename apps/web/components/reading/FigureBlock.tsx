import React from 'react';
import type { Figure } from '@bc-building-code/bcbc-parser';
import './FigureBlock.css';

export interface FigureBlockProps {
  figure: Figure;
}

export const FigureBlock: React.FC<FigureBlockProps> = ({ figure }) => {
  // Determine the full image path
  const getImagePath = (src: string): string => {
    // If src already starts with /, use it as-is
    if (src.startsWith('/')) {
      return src;
    }
    
    // Otherwise, try bc-graphics first
    return `/bc-graphics/${src}`;
  };

  const imagePath = getImagePath(figure.imageUrl);

  return (
    <figure className="figure-block">
      <div className="figure-block__title">
        Figure {figure.number} {figure.title}
      </div>
      <img
        src={imagePath}
        alt={figure.altText}
        className="figure-block__image"
        loading="lazy"
      />
      {figure.caption && (
        <figcaption className="figure-block__caption">
          {figure.caption}
        </figcaption>
      )}
    </figure>
  );
};
