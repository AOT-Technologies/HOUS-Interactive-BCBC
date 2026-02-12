'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Equation } from '@bc-building-code/bcbc-parser';
import './EquationBlock.css';

export interface EquationBlockProps {
  equation: Equation;
}

export const EquationBlock: React.FC<EquationBlockProps> = ({ equation }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderMethod, setRenderMethod] = useState<'latex' | 'fallback'>('fallback');

  useEffect(() => {
    // Try to render with KaTeX if available
    if (equation.latex && typeof window !== 'undefined') {
      const katex = (window as any).katex;
      
      if (katex && containerRef.current) {
        try {
          katex.render(equation.latex, containerRef.current, {
            displayMode: true,
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

    // Otherwise use plain text fallback
    setRenderMethod('fallback');
  }, [equation.latex]);

  return (
    <div className="equation-block">
      <div className="equation-block__title">
        Equation {equation.number}
      </div>
      {renderMethod === 'latex' ? (
        <div
          ref={containerRef}
          className="equation-block__content"
          aria-label={equation.description || `Equation ${equation.number}`}
        />
      ) : (
        <code className="equation-block__fallback" aria-label="Mathematical equation">
          {equation.latex}
        </code>
      )}
      {equation.description && (
        <div className="equation-block__description">
          {equation.description}
        </div>
      )}
    </div>
  );
};
