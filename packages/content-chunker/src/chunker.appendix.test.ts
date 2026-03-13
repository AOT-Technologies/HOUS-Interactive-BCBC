import { describe, expect, it } from 'vitest';
import { chunkRawContent } from './chunker';

describe('chunkRawContent division appendices', () => {
  it('emits standalone division appendix chunks', () => {
    const chunks = chunkRawContent({
      volumes: [
        {
          divisions: [
            {
              id: 'nbc.divB',
              parts: [],
              appendices: [
                {
                  id: 'nbc.divB.appendixD',
                  type: 'appendix',
                  letter: 'D',
                  title: 'Fire-Performance Ratings',
                  sections: [],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].path).toBe('content/nbc-divb/appendix-d.json');
    expect((chunks[0].data as { id: string }).id).toBe('nbc.divB.appendixD');
  });
});
