'use client';

import { useEffect, useRef, useState } from 'react';
import './EquationBlock.css';

interface EquationContent {
  id: string;
  latex?: string;
  imageSrc?: string;
  plainText: string;
  displayMode?: 'inline' | 'block';
}

interface EquationBlockProps {
  equation: EquationContent;
}

export function EquationBlock({ equation }: EquationBlockProps) {
  const containerRef = useRef<HTMLSpanElement | HTMLDivElement>(null);
  const [renderMethod, setRenderMethod] = useState<'latex' | 'image' | 'fallback'>('fallback');
  const displayMode = equation.displayMode || 'block';

  useEffect(() => {
    // Try to render with KaTeX if available
    if (equation.latex && typeof window !== 'undefined') {
      // Check if KaTeX is available
      const katex = (window as any).katex;
      
      if (katex && containerRef.current) {
        try {
          katex.render(equation.latex, containerRef.current, {
            displayMode: displayMode === 'block',
            throwOnError: false,
            errorColor: '#cc0000',
          });
          setRenderMethod('latex');
          return;
        } catch (error) {
          console.warn('KaTeX rendering failed:', error);
        }
      }
    }

    // Fall back to image if available
    if (equation.imageSrc) {
      setRenderMethod('image');
      return;
    }

    // Otherwise use plain text fallback
    setRenderMethod('fallback');
  }, [equation.latex, equation.imageSrc, displayMode]);

  const containerClass = `equation-block equation-block--${displayMode}`;
  const ContainerTag = displayMode === 'inline' ? 'span' : 'div';

  // Render based on the determined method
  if (renderMethod === 'latex') {
    return (
      <ContainerTag className={containerClass}>
        <ContainerTag
          ref={containerRef as any}
          className="equation-block__content"
          aria-label={equation.plainText}
        />
        <span className="equation-block__sr-only">{equation.plainText}</span>
      </ContainerTag>
    );
  }

  if (renderMethod === 'image' && equation.imageSrc) {
    return (
      <ContainerTag className={containerClass}>
        <img
          src={equation.imageSrc}
          alt={equation.plainText}
          className="equation-block__image"
          loading="lazy"
        />
        <span className="equation-block__sr-only">{equation.plainText}</span>
      </ContainerTag>
    );
  }

  // Fallback to plain text
  return (
    <ContainerTag className={containerClass}>
      <code className="equation-block__fallback" aria-label="Mathematical equation">
        {equation.plainText}
      </code>
    </ContainerTag>
  );
}
