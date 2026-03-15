import { describe, expect, it } from 'vitest';
import { extractNavigationTree } from './metadata-extractor';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';

describe('extractNavigationTree spectables', () => {
  it('includes part-level spectables in the navigation tree', () => {
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
              id: 'nbc.divBV2',
              type: 'division',
              letter: 'B',
              title: 'General',
              number: '2',
              parts: [
                {
                  id: 'nbc.divBV2.part9',
                  type: 'part',
                  number: '9',
                  title: 'Housing and Small Buildings',
                  sections: [],
                  spectables: [
                    {
                      id: 'nbc.divBV2.part9.spectables2',
                      type: 'spectables',
                      title: 'Span Tables',
                      tables: [],
                    },
                  ],
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
    const partNode = divisionNode?.children?.[0];
    const spectablesNode = partNode?.children?.find((node) => node.id === 'nbc.divBV2.part9.spectables2');

    expect(spectablesNode).toBeDefined();
    expect(spectablesNode?.type).toBe('spectables');
    expect(spectablesNode?.path).toBe('/code/nbc.divBV2/9/spectables/2');
  });
});

