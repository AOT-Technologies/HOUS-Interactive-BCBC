import { describe, expect, it } from 'vitest';
import { extractNavigationTree } from './metadata-extractor';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';

describe('extractNavigationTree division appendices', () => {
  it('labels part appendices as notes to the part', () => {
    const document: BCBCDocument = {
      metadata: {
        title: 'BC Building Code',
        version: '2024',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
        volumes: [{ volume: '1', title: 'Volume 1' }],
      },
      volumes: [
        {
          id: 'v1',
          type: 'volume',
          number: 1,
          title: 'Volume 1',
          divisions: [
            {
              id: 'nbc.divB',
              type: 'division',
              letter: 'B',
              title: 'General',
              number: '2',
              parts: [
                {
                  id: 'nbc.divB.part3',
                  type: 'part',
                  number: '3',
                  title: 'Fire Protection',
                  sections: [],
                  appendix: {
                    id: 'nbc.divB.part3.appendix',
                    type: 'part_appendix',
                    application_notes: [],
                  },
                },
              ],
              appendices: [],
            },
          ],
        },
      ],
      glossary: [],
      amendmentDates: [],
    };

    const tree = extractNavigationTree(document);
    const partNode = tree[0].children?.[0]?.children?.[0];
    const appendixNode = partNode?.children?.find((node) => node.id === 'nbc.divB.part3.appendix');

    expect(appendixNode).toBeDefined();
    expect(appendixNode?.type).toBe('part_appendix');
    expect(appendixNode?.title).toBe('Notes to Part 3');
    expect(appendixNode?.path).toBe('/code/nbc.divB/3/appendix');
  });

  it('includes division appendices in the navigation tree', () => {
    const document: BCBCDocument = {
      metadata: {
        title: 'BC Building Code',
        version: '2024',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
        volumes: [{ volume: '1', title: 'Volume 1' }],
      },
      volumes: [
        {
          id: 'v1',
          type: 'volume',
          number: 1,
          title: 'Volume 1',
          divisions: [
            {
              id: 'nbc.divB',
              type: 'division',
              letter: 'B',
              title: 'General',
              number: '2',
              parts: [],
              appendices: [
                {
                  id: 'nbc.divB.appendixD',
                  type: 'appendix',
                  letter: 'D',
                  number: '4',
                  title: 'Fire-Performance Ratings',
                  sections: [],
                },
              ],
            },
          ],
        },
      ],
      glossary: [],
      amendmentDates: [],
    };

    const tree = extractNavigationTree(document);
    const divisionNode = tree[0].children?.[0];
    const appendixNode = divisionNode?.children?.find((node) => node.id === 'nbc.divB.appendixD');

    expect(appendixNode).toBeDefined();
    expect(appendixNode?.type).toBe('division_appendix');
    expect(appendixNode?.path).toBe('/code/nbc.divB/appendix/D');
  });
});
