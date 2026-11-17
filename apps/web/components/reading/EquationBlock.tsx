'use client';

import React, { useEffect } from 'react';
import type { Equation } from '@bc-building-code/bcbc-parser';
import { MathJax } from 'better-react-mathjax';
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

export const EquationBlock: React.FC<EquationBlockProps> = ({
  equation,
  variant = 'standalone',
  displayMode,
}) => {
  const mode = displayMode || equation.display || 'block';
  const ContainerTag: 'span' | 'div' = mode === 'inline' ? 'span' : 'div';
  const DescriptionTag: 'span' | 'div' = mode === 'inline' ? 'span' : 'div';
  const repairedLatex = getRepairedLatex(equation);
  const latexForRender = repairedLatex || equation.latex || '';
  const fallbackText = equation.plainText || latexForRender || equation.id;
  const resolvedMathml = equation.mathml || '';
  const hasMathml =
    typeof resolvedMathml === 'string' &&
    resolvedMathml.trim().length > 0 &&
    !isMalformedMathml(resolvedMathml);

  // CLAUDE-AUTOFIX CL-093 CF-09340 | issue 1281 | A word equation given only as plain text ("Ss = smooth normalized SL + bZ") is printed as text, as in the PDF, not typeset as maths (which ran the words together in italic).
  const plainWordEquation =
    !hasMathml &&
    !repairedLatex &&
    Boolean(equation.plainText) &&
    latexForRender === equation.plainText &&
    !latexForRender.includes('\\') &&
    /[a-z]{2,} [a-z]{2,}/.test(latexForRender)
      ? latexForRender.split(/(_\{[^}]*\})/).map((part, index) =>
        part.startsWith('_{') ? <sub key={index}>{part.slice(2, -1)}</sub> : part
      )
      : null;
  const showLatex = !hasMathml && !plainWordEquation && latexForRender.trim().length > 0;
  const shouldShowDescription =
    variant === 'standalone' &&
    equation.description &&
    equation.plainText &&
    equation.description.trim() !== equation.plainText.trim();

  useEffect(() => {
    if (!hasMathml && !showLatex && !fallbackText) {
      console.error('[EquationBlock] Missing equation render data', {
        equationId: equation.id,
        equationNumber: equation.number,
      });
      return;
    }

    if (typeof resolvedMathml === 'string' && resolvedMathml.trim().length > 0 && isMalformedMathml(resolvedMathml)) {
      console.error('[EquationBlock] Malformed MathML detected, falling back from MathML rendering', {
        equationId: equation.id,
        equationNumber: equation.number,
      });
    }
  }, [equation.id, equation.number, fallbackText, hasMathml, resolvedMathml, showLatex]);

  return (
    <ContainerTag
      className={[
        'equation-block',
        mode === 'inline' ? 'equation-block--inline' : 'equation-block--block',
      ].join(' ')}
      data-node-id={equation.id}
    >
      {hasMathml ? (
        <MathJax
          renderMode="pre"
          text={resolvedMathml}
          typesettingOptions={{ fn: 'mathml2chtmlPromise' }}
          inline={mode === 'inline'}
          hideUntilTypeset="first"
          className="equation-block__mathml"
          role="math"
          aria-label={equation.plainText || equation.description || `Equation ${equation.id}`}
        >
        </MathJax>
      ) : plainWordEquation ? (
        <span className="equation-block__plain-text">{plainWordEquation}</span>
      ) : showLatex ? (
        <MathJax
          renderMode="pre"
          text={latexForRender}
          typesettingOptions={{ fn: 'tex2chtmlPromise' }}
          inline={mode === 'inline'}
          hideUntilTypeset="first"
          className="equation-block__content"
          aria-label={equation.description || `Equation ${equation.number}`}
        >
        </MathJax>
      ) : (
        <code className="equation-block__fallback" aria-label="Mathematical equation">
          {fallbackText}
        </code>
      )}
      {shouldShowDescription && (
        <DescriptionTag className="equation-block__description">
          {equation.description}
        </DescriptionTag>
      )}
    </ContainerTag>
  );
};
