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

  it('renders interleaved appendix section items in source order', () => {
    const appendix: DivisionAppendix = {
      id: 'nbc.divB.appendixC',
      type: 'appendix',
      letter: 'C',
      number: '3',
      title: 'Climatic and Seismic Information',
      sections: [
        {
          id: 'nbc.divB.appendixC.div18',
          type: 'note_division',
          title: 'Wind Effects',
          content: [
            {
              id: 'nbc.divB.appendixC.div18.para1',
              type: 'paragraph',
              content: 'Wind paragraph text',
            },
            {
              type: 'list',
              list_type: 'bulleted',
              items: [
                { id: 'nbc.divB.appendixC.div18.list1.item1', content: 'Latitude and longitude' },
                { id: 'nbc.divB.appendixC.div18.list1.item2', content: 'Site class designation' },
              ],
            },
          ],
        },
        {
          id: 'nbc.divB.appendixC.div22.para0',
          type: 'paragraph',
          content: '<bold>Example</bold>',
        },
        {
          id: 'nbc.divB.appendixC.div22.list1',
          type: 'list',
          list_type: 'numbered',
          items: [
            { id: 'nbc.divB.appendixC.div22.list1.item1', content: 'Go to seismic hazard tool' },
            { id: 'nbc.divB.appendixC.div22.list1.item2', content: 'Select Site Class' },
          ],
        },
        {
          id: 'nbc.divB.appendixC.table1',
          type: 'table',
          number: 'C.1',
          title: 'Wind Speeds',
          headers: [],
          rows: [
            {
              id: 'row-1',
              type: 'body_row',
              cells: [{ content: 'Table cell value' }],
            },
          ],
        },
      ],
    };

    render(<DivisionAppendixRenderer appendix={appendix} interactive />);

    expect(screen.getByText('Wind Effects')).toBeInTheDocument();
    expect(screen.getByText('Wind paragraph text')).toBeInTheDocument();
    expect(screen.getByText('Latitude and longitude')).toBeInTheDocument();
    expect(screen.getByText('Site class designation')).toBeInTheDocument();
    expect(screen.getByText('Example')).toBeInTheDocument();
    expect(screen.getByText('Go to seismic hazard tool')).toBeInTheDocument();
    expect(screen.getByText('Select Site Class')).toBeInTheDocument();
    expect(screen.getByText('Wind Speeds')).toBeInTheDocument();
    expect(screen.getByText('Table cell value')).toBeInTheDocument();
  });
});
