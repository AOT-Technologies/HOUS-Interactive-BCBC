import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StructuredList } from '@bc-building-code/bcbc-parser';
import { StructuredListBlock } from './StructuredListBlock';

describe('StructuredListBlock organization list', () => {
  // CLAUDE-AUTOFIX CL-057 CF-00798 | issue 559 | Organizations are plain lines like the PDF, not a table.
  it('renders each organization as a plain line like the PDF', () => {
    const list = {
      type: 'organization',
      items: [
        { id: 'o1', abbreviation: 'AAMA', fullName: 'Fenestration and Glazing Industry Alliance', website: 'https://www.fgiaonline.org' },
        { id: 'o2', abbreviation: 'ICC', fullName: 'International Code Council', website: '' },
        { id: 'o3', abbreviation: 'NBC', fullName: '' },
      ],
    } as unknown as StructuredList;

    const { container } = render(<StructuredListBlock list={list} renderText={(text) => [text]} />);

    expect(screen.queryByRole('table')).toBeNull();
    const rows = container.querySelectorAll('.structuredList__organization-row');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toBe('AAMA Fenestration and Glazing Industry Alliance ( www.fgiaonline.org)');
    expect(rows[1].textContent).toBe('ICC International Code Council');
    expect(rows[2].textContent).toBe('NBC');
    expect(screen.getByRole('link', { name: 'www.fgiaonline.org' })).toHaveAttribute('href', 'https://www.fgiaonline.org');
  });
});
