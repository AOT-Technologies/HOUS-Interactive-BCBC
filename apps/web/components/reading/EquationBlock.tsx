'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Equation } from '@bc-building-code/bcbc-parser';
import './EquationBlock.css';

export interface EquationBlockProps {
  equation: Equation & {
    plainText?: string;
    mathml?: string;
    htmlSrc?: string;
    image?: string;
    imageSrc?: string;
    display?: 'inline' | 'block';
  };
  variant?: 'standalone' | 'marker';
  displayMode?: 'inline' | 'block';
}

const mathmlAssetCache = new Map<string, string | null>();
let mathJaxReadyPromise: Promise<boolean> | null = null;

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: Element[]) => Promise<void>;
    };
  }
}

function getMathmlAssetPath(htmlSrc?: string, imageId?: string): string | null {
  if (typeof htmlSrc === 'string' && htmlSrc.trim()) {
    const normalized = htmlSrc.trim().replace(/\\/g, '/').replace(/^\/+/, '');
    return `/${normalized}`;
  }

  if (!imageId || imageId.length < 5) return null;
  const normalized = imageId.toLowerCase().trim();
  if (!/^eg\d+[a-z0-9]*$/i.test(normalized)) return null;

  // Example: eg02506a -> /graphics/eg/025/eg02506a.html
  const group = normalized.slice(2, 5);
  return `/graphics/eg/${group}/${normalized}.html`;
}

function normalizeMathml(rawMathml: string): string {
  return rawMathml
    .replace(/&amp;#/g, '&#')
    .replace(/&amp;([a-zA-Z]+;)/g, '&$1')
    .replace(/&nbsp;/g, '&#160;');
}

function getRepairedLatex(equation: EquationBlockProps['equation']): string | undefined {
  const id = (equation.id || '').toLowerCase();
  const latex = equation.latex || '';
  const plain = equation.plainText || '';

  // Known malformed source equation where fractions and text are flattened.
  if (
    id === 'eg02762a1' ||
    /25-h20/.test(latex) ||
    /FCb-1/.test(latex) ||
    /for5m≤h≤25m/i.test(plain)
  ) {
    return String.raw`C_{a0}=\left(\frac{25-h}{20}\right)\left(\frac{F}{C_b}-1\right)+1\;\text{for }5\,m\le h\le 25\,m,\quad \text{and}\quad C_{a0}=1\;\text{for }h>25\,m`;
  }

  return undefined;
}

function isMalformedMathml(mathml: string): boolean {
  return (
    /<mo[^>]*>\s*25-h20/i.test(mathml) ||
    /<mo[^>]*>\s*FCb-1/i.test(mathml)
  );
}

function ensureMathJaxLoaded(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  if (window.MathJax?.typesetPromise) {
    return Promise.resolve(true);
  }

  if (mathJaxReadyPromise) {
    return mathJaxReadyPromise;
  }

  mathJaxReadyPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mathjax="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.MathJax?.typesetPromise)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    // SVG output gives the closest fidelity to printed equation typography.
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-svg.js';
    script.async = true;
    script.setAttribute('data-mathjax', 'true');
    script.onload = () => resolve(Boolean(window.MathJax?.typesetPromise));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return mathJaxReadyPromise;
}

export const EquationBlock: React.FC<EquationBlockProps> = ({
  equation,
  variant = 'standalone',
  displayMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [assetMathml, setAssetMathml] = useState<string | null>(null);
  const [renderMethod, setRenderMethod] = useState<'latex' | 'fallback'>('fallback');
  const [mathJaxEnabled, setMathJaxEnabled] = useState(false);
  const mode = displayMode || equation.display || 'block';
  const shouldShowTitle = variant === 'standalone';
  const repairedLatex = getRepairedLatex(equation);
  const latexForRender = repairedLatex || equation.latex || '';
  const fallbackText = equation.plainText || latexForRender || equation.id;
  const resolvedMathml = assetMathml || equation.mathml || '';
  const hasMathml =
    typeof resolvedMathml === 'string' &&
    resolvedMathml.trim().length > 0 &&
    !isMalformedMathml(resolvedMathml);

  useEffect(() => {
    let isMounted = true;
    const assetPath = getMathmlAssetPath(equation.htmlSrc, equation.image);

    if (!assetPath) {
      setAssetMathml(null);
      return;
    }

    const cached = mathmlAssetCache.get(assetPath);
    if (cached !== undefined) {
      setAssetMathml(cached);
      return;
    }

    const loadAssetMathml = async () => {
      try {
        const response = await fetch(assetPath);
        if (!response.ok) {
          mathmlAssetCache.set(assetPath, null);
          if (isMounted) setAssetMathml(null);
          return;
        }

        const html = await response.text();
        const match = html.match(/<math[\s\S]*<\/math>/i);
        const extracted = match ? normalizeMathml(match[0]) : null;
        mathmlAssetCache.set(assetPath, extracted);

        if (isMounted) {
          setAssetMathml(extracted);
        }
      } catch {
        mathmlAssetCache.set(assetPath, null);
        if (isMounted) setAssetMathml(null);
      }
    };

    void loadAssetMathml();

    return () => {
      isMounted = false;
    };
  }, [equation.htmlSrc, equation.image]);

  useEffect(() => {
    if (hasMathml) {
      setRenderMethod('fallback');
      return;
    }

    // Try to render with KaTeX if available
    if (latexForRender && typeof window !== 'undefined') {
      const katex = (window as any).katex;
      
      if (katex && containerRef.current) {
        try {
          katex.render(latexForRender, containerRef.current, {
            displayMode: mode === 'block',
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
  }, [latexForRender, mode, hasMathml]);

  useEffect(() => {
    if (!hasMathml || !containerRef.current) return;

    let cancelled = false;

    const typesetMathml = async () => {
      const ready = await ensureMathJaxLoaded();
      if (cancelled) return;
      setMathJaxEnabled(ready);
      if (ready && window.MathJax?.typesetPromise && containerRef.current) {
        await window.MathJax.typesetPromise([containerRef.current]);
      }
    };

    void typesetMathml();

    return () => {
      cancelled = true;
    };
  }, [hasMathml, resolvedMathml]);

  return (
    <div
      className={[
        'equation-block',
        mode === 'inline' ? 'equation-block--inline' : 'equation-block--block',
      ].join(' ')}
    >
      {shouldShowTitle && (
        <div className="equation-block__title">
          Equation {equation.number}
        </div>
      )}
      {hasMathml ? (
        <div
          ref={containerRef}
          className="equation-block__mathml"
          role="math"
          data-renderer={mathJaxEnabled ? 'mathjax' : 'native'}
          aria-label={equation.plainText || equation.description || `Equation ${equation.id}`}
          dangerouslySetInnerHTML={{ __html: resolvedMathml }}
        />
      ) : renderMethod === 'latex' ? (
        <div
          ref={containerRef}
          className="equation-block__content"
          aria-label={equation.description || `Equation ${equation.number}`}
        />
      ) : (
        <code className="equation-block__fallback" aria-label="Mathematical equation">
          {fallbackText}
        </code>
      )}
      {shouldShowTitle && equation.description && (
        <div className="equation-block__description">
          {equation.description}
        </div>
      )}
    </div>
  );
};
