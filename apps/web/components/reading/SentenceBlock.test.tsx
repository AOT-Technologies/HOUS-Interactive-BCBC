import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Sentence } from '@bc-building-code/bcbc-parser';
import { SentenceBlock } from './SentenceBlock';

describe('SentenceBlock', () => {
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
