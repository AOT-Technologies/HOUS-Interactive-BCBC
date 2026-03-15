import { describe, expect, it } from 'vitest';
import { parseBCBC } from './parser';

describe('parseBCBC spectables', () => {
  it('preserves part-level spectables and tables', () => {
    const result = parseBCBC({
      document_type: 'bc_building_code',
      version: '2024',
      metadata: {
        title: 'BC Building Code',
        publication_date: '2024-01-01',
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
              title: 'Division B',
              number: '2',
              parts: [
                {
                  id: 'nbc.divBV2.part9',
                  type: 'part',
                  number: 9,
                  title: 'Part 9',
                  sections: [],
                  special_tables: [
                    {
                      id: 'nbc.divBV2.part9.spectables1',
                      type: 'spectables',
                      title: 'Span Tables',
                      tables: [
                        {
                          id: 'nbc.divBV2.part9.spectables1.table1',
                          type: 'table',
                          number: '9.10.3.1.-A',
                          title: 'Example Span Table',
                          rows: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      glossary: {},
    });

    const part = result.volumes[0].divisions[0].parts[0];
    expect(part.spectables).toHaveLength(1);
    expect(part.spectables?.[0].id).toBe('nbc.divBV2.part9.spectables1');
    expect(part.spectables?.[0].tables[0].number).toBe('9.10.3.1.-A');
  });
});
