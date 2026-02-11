import './FigureBlock.css';

interface FigureContent {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

interface FigureBlockProps {
  figure: FigureContent;
}

export function FigureBlock({ figure }: FigureBlockProps) {
  // Determine the full image path
  // Images can be in /bc-graphics/ or /graphics/ directories
  const getImagePath = (src: string): string => {
    // If src already starts with /, use it as-is
    if (src.startsWith('/')) {
      return src;
    }
    
    // Otherwise, try bc-graphics first, then graphics
    // The actual path resolution will happen at runtime
    return `/bc-graphics/${src}`;
  };

  const imagePath = getImagePath(figure.src);

  return (
    <figure className="figure-block">
      <img
        src={imagePath}
        alt={figure.alt}
        className="figure-block__image"
        loading="lazy"
        width={figure.width}
        height={figure.height}
      />
      {figure.caption && (
        <figcaption className="figure-block__caption">
          {figure.caption}
        </figcaption>
      )}
    </figure>
  );
}
