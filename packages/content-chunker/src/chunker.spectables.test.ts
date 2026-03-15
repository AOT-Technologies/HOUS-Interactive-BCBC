import { describe, expect, it } from 'vitest';
import { chunkRawContent } from './chunker';

describe('chunkRawContent spectables', () => {
  it('emits standalone spectables chunks under part directories', () => {
    const chunks = chunkRawContent({
      volumes: [
        {
          divisions: [
            {
              id: 'nbc.divBV2',
              parts: [
                {
                  number: '9',
                  sections: [],
                  special_tables: [
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
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].path).toBe('content/nbc-divbv2/part-9/spectables-2.json');
    expect((chunks[0].data as { id: string }).id).toBe('nbc.divBV2.part9.spectables2');
  });
});
