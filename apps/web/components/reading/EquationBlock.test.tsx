import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EquationBlock } from './EquationBlock';

vi.mock('better-react-mathjax', () => ({
  MathJax: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="mock-mathjax">{children}</span>
  ),
}));

describe('EquationBlock', () => {
  it('renders inline equations with a span root element', () => {
    const { container } = render(
      <EquationBlock
        equation={{
          id: 'eq-inline',
          type: 'equation',
          number: 'E1',
          latex: 'x+1',
          display: 'inline',
        } as any}
        variant="marker"
        displayMode="inline"
      />
    );

    const inlineNode = container.querySelector('.equation-block--inline');
    expect(inlineNode).toBeTruthy();
    expect(inlineNode?.tagName.toLowerCase()).toBe('span');
  });

  it('renders block equations with a div root element', () => {
    const { container } = render(
      <EquationBlock
        equation={{
          id: 'eq-block',
          type: 'equation',
          number: 'E2',
          latex: 'x^2',
          display: 'block',
        } as any}
        displayMode="block"
      />
    );

    const blockNode = container.querySelector('.equation-block--block');
    expect(blockNode).toBeTruthy();
    expect(blockNode?.tagName.toLowerCase()).toBe('div');
  });
});
