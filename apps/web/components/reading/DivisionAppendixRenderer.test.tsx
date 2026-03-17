import React from 'react';
import { render, screen } from '@testing-library/react';
import { DivisionAppendixRenderer } from './DivisionAppendixRenderer';
import type { DivisionAppendix } from '../../lib/stores/appendix-store';

describe('DivisionAppendixRenderer', () => {
  it('does not wrap structured lists inside paragraph tags', () => {
    const appendix: DivisionAppendix = {
      id: 'nbc.divB.appendixD',
      type: 'appendix',
      letter: 'D',
      number: 'D',
      title: 'Test Appendix',
      sections: [
        {
          id: 'appendix-section-1',
          type: 'appendix_section',
          title: 'Section D.1.',
          paragraphs: [
            {
              id: 'appendix-paragraph-1',
              content: '[LIST:bulleted]',
              lists: [
                {
                  type: 'bulleted',
                  items: [
                    { content: 'First item' },
                    { content: 'Second item' },
                  ],
                },
              ],
            },
          ],
          subsections: [],
        },
      ],
    };

    const { container } = render(
      <DivisionAppendixRenderer appendix={appendix} interactive />
    );

    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(container.querySelector('p ul')).toBeNull();
    expect(container.querySelector('div ul')).not.toBeNull();
  });
});
