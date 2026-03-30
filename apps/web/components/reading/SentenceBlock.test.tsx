import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Sentence } from '@bc-building-code/bcbc-parser';
import { SentenceBlock } from './SentenceBlock';

describe('SentenceBlock', () => {
  it('strips raw change wrappers from sentence text', () => {
    const sentence: Sentence = {
      id: 'sentence-change-wrapper',
      type: 'sentence',
      number: '1',
      text: '<CHANGE:insert>Except as provided in Sentences Sentence (3) and Sentence (2) and as required by Sentence (2), the</CHANGE> climatic and seismic values',
      glossaryTerms: [],
    };

    const { container } = render(<SentenceBlock sentence={sentence} />);

    expect(container.textContent).toContain(
      '1)Except as provided in Sentences Sentence (3) and Sentence (2) and as required by Sentence (2), the climatic and seismic values'
    );
    expect(container.textContent).not.toContain('<CHANGE:insert>');
    expect(container.textContent).not.toContain('</CHANGE>');
  });

  it('renders variable lists inline where the placeholder appears', () => {
    const sentence: Sentence = {
      id: 'sentence-variable',
      type: 'sentence',
      number: '1',
      text: 'The area is calculated where[LIST:variable]',
      glossaryTerms: [],
      lists: [
        {
          type: 'variable',
          items: [
            {
              id: 'var-area',
              symbol: 'Area',
              description: '= gross area',
            },
          ],
        },
      ],
    };

    render(<SentenceBlock sentence={sentence} />);

    expect(screen.getByText('The area is calculated where')).toBeInTheDocument();
    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('= gross area')).toBeInTheDocument();
  });

  it('renders symbol lists inline where the placeholder appears', () => {
    const sentence: Sentence = {
      id: 'sentence-symbol',
      type: 'sentence',
      number: '1',
      text: 'The following symbols apply[LIST:symbol]',
      glossaryTerms: [],
      lists: [
        {
          type: 'symbol',
          items: [
            {
              id: 'sym-dead-load',
              symbol: 'D',
              description: 'dead load',
            },
          ],
        },
      ],
    };

    render(<SentenceBlock sentence={sentence} />);

    expect(screen.getByText('The following symbols apply')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('dead load')).toBeInTheDocument();
  });

  it('renders organizations as a table when sentence contains organizations', () => {
    const sentence: Sentence = {
      id: 'sentence-1',
      type: 'sentence',
      number: '1',
      text: 'The abbreviations of proper names in this Code shall have the meanings assigned to them in this Article.',
      glossaryTerms: [],
      organizations: [
        {
          id: 'org-aama',
          abbreviation: 'AAMA',
          fullName: 'Fenestration and Glazing Industry Alliance',
          website: 'https://www.fgiaonline.org',
        },
        {
          id: 'org-acgih',
          abbreviation: 'ACGIH',
          fullName: 'American Conference of Governmental Industrial Hygienists',
          website: 'https://www.acgih.org',
        },
      ],
    };

    render(<SentenceBlock sentence={sentence} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Abbreviation' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Website' })).toBeInTheDocument();
    expect(screen.getByText('AAMA')).toBeInTheDocument();
    expect(screen.getByText('ACGIH')).toBeInTheDocument();

    const websiteLink = screen.getByRole('link', { name: 'https://www.fgiaonline.org' });
    expect(websiteLink).toHaveAttribute('href', 'https://www.fgiaonline.org');
  });
});
