import { describe, expect, it } from 'vitest';
import {
  chunkContent,
  chunkRawContent,
  generateChunkPath,
  generateIndexChunkPath,
  generateConversionsChunkPath,
  getChunkStats,
  isOptimalChunkSize,
} from './chunker';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';

function createDocument(): BCBCDocument {
  return {
    metadata: {
      title: 'Test BCBC',
      version: '2024',
      effectiveDate: '2024-01-01',
      jurisdiction: 'BC',
      volumes: [{ volume: '1', title: 'Volume 1' }],
    },
    volumes: [
      {
        id: 'vol-1',
        type: 'volume',
        number: 1,
        title: 'Volume 1',
        divisions: [
          {
            id: 'division-a',
            letter: 'A',
            title: 'Division A',
            number: '1',
            type: 'division',
            parts: [
              {
                id: 'part-1',
                number: '1',
                title: 'Part 1',
                type: 'part',
                sections: [
                  {
                    id: 'section-1-1',
                    number: '1.1',
                    title: 'Section 1.1',
                    type: 'section',
                    subsections: [],
                  },
                  {
                    id: 'section-1-2',
                    number: '1.2',
                    title: 'Section 1.2',
                    type: 'section',
                    subsections: [],
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
}

describe('chunkContent', () => {
  it('splits content by section from the volume hierarchy', () => {
    const chunks = chunkContent(createDocument());

    expect(chunks).toHaveLength(2);
    expect(chunks[0].path).toBe('content/division-a/part-1/section-1-1.json');
    expect(chunks[1].path).toBe('content/division-a/part-1/section-1-2.json');
    expect(chunks[0].data.id).toBe('section-1-1');
    expect(chunks[1].data.id).toBe('section-1-2');
  });

  it('calculates chunk sizes', () => {
    const chunks = chunkContent(createDocument());

    expect(chunks[0].size).toBeGreaterThan(0);
    expect(typeof chunks[0].size).toBe('number');
  });
});

describe('chunkRawContent', () => {
  it('preserves raw section objects without stripping table revisions', () => {
    const mockRawDocument = {
      volumes: [
        {
          divisions: [
            {
              id: 'nbc.divB',
              parts: [
                {
                  number: 3,
                  sections: [
                    {
                      id: 'nbc.divB.part3.sect1',
                      number: 1,
                      type: 'section',
                      subsections: [
                        {
                          id: 'sub-1',
                          type: 'subsection',
                          number: 1,
                          articles: [
                            {
                              id: 'art-1',
                              type: 'article',
                              number: 1,
                              content: [
                                {
                                  id: 'table-1',
                                  type: 'table',
                                  revised: true,
                                  structure: { columns: null, body_rows: [] },
                                  revisions: [
                                    {
                                      type: 'original',
                                      effective_date: '2020-12-01',
                                      title: 'Original table title',
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
                },
              ],
            },
          ],
        },
      ],
    };

    const chunks = chunkRawContent(mockRawDocument);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].path).toBe('content/nbc-divb/part-3/section-1.json');

    const tableNode = (chunks[0].data.subsections as any[])[0].articles[0].content[0];
    expect(tableNode.revised).toBe(true);
    expect(tableNode.structure).toEqual({ columns: null, body_rows: [] });
    expect(tableNode.revisions).toHaveLength(1);
    expect(tableNode.revisions[0].effective_date).toBe('2020-12-01');
  });
});

describe('generateChunkPath', () => {
  it('generates correct section chunk paths', () => {
    expect(generateChunkPath('division-a', '1', '1.1')).toBe(
      'content/division-a/part-1/section-1-1.json'
    );
    expect(generateChunkPath('Division-A', '1', '1.1')).toBe(
      'content/division-a/part-1/section-1-1.json'
    );
    expect(generateChunkPath('division-b', '3', '3.2.1')).toBe(
      'content/division-b/part-3/section-3-2-1.json'
    );
  });
});

describe('isOptimalChunkSize', () => {
  it('returns true for chunks within the target range', () => {
    expect(isOptimalChunkSize({ size: 100 * 1024 })).toBe(true);
  });

  it('returns false for chunks outside the target range', () => {
    expect(isOptimalChunkSize({ size: 30 * 1024 })).toBe(false);
    expect(isOptimalChunkSize({ size: 250 * 1024 })).toBe(false);
  });
});

describe('getChunkStats', () => {
  it('calculates aggregate statistics', () => {
    const stats = getChunkStats([
      { size: 50 * 1024 },
      { size: 100 * 1024 },
      { size: 150 * 1024 },
    ]);

    expect(stats.totalChunks).toBe(3);
    expect(stats.totalSize).toBe(300 * 1024);
    expect(stats.averageSize).toBe(100 * 1024);
    expect(stats.minSize).toBe(50 * 1024);
    expect(stats.maxSize).toBe(150 * 1024);
  });
});

describe('generateIndexChunkPath', () => {
  it('generates correct index chunk paths', () => {
    expect(generateIndexChunkPath(1)).toBe('content/index/volume-1.json');
    expect(generateIndexChunkPath(2)).toBe('content/index/volume-2.json');
  });
});

describe('generateConversionsChunkPath', () => {
  it('generates correct conversions chunk paths', () => {
    expect(generateConversionsChunkPath(1)).toBe('content/conversions/volume-1.json');
    expect(generateConversionsChunkPath(2)).toBe('content/conversions/volume-2.json');
  });
});

describe('chunkRawContent - index and conversions', () => {
  it('generates chunks for index and conversions sections', () => {
    const mockRawDocument = {
      volumes: [
        {
          divisions: [
            {
              id: 'nbc.divA',
              parts: [
                {
                  number: 1,
                  sections: [
                    { id: 'sect-1', number: 1, type: 'section', subsections: [] },
                  ],
                },
              ],
            },
          ],
          index: {
            id: 'nbc.2020.vol1.index',
            type: 'index',
            introduction: 'Index intro',
            letters: [{ id: 'letter-A', letter: 'A', groups: [] }],
          },
          conversions: {
            id: 'nbc.2020.vol1.conversions',
            type: 'conversions',
            table_id: 'conv-1',
            table_title: 'Conversion Factors',
            table_structure: { columns: 6, column_specs: [], header_rows: [], body_rows: [] },
          },
        },
      ],
    };

    const chunks = chunkRawContent(mockRawDocument);

    // Should have 3 chunks: 1 section + 1 index + 1 conversions
    expect(chunks).toHaveLength(3);

    const indexChunk = chunks.find(c => c.path === 'content/index/volume-1.json');
    expect(indexChunk).toBeDefined();
    expect((indexChunk!.data as any).type).toBe('index');
    expect((indexChunk!.data as any).introduction).toBe('Index intro');

    const conversionsChunk = chunks.find(c => c.path === 'content/conversions/volume-1.json');
    expect(conversionsChunk).toBeDefined();
    expect((conversionsChunk!.data as any).type).toBe('conversions');
    expect((conversionsChunk!.data as any).table_title).toBe('Conversion Factors');
  });

  it('omits index chunk when volume has no index', () => {
    const mockRawDocument = {
      volumes: [
        {
          divisions: [
            { id: 'nbc.divA', parts: [{ number: 1, sections: [{ id: 's1', number: 1, type: 'section' }] }] },
          ],
        },
      ],
    };

    const chunks = chunkRawContent(mockRawDocument);
    const indexChunk = chunks.find(c => c.path.includes('index'));
    expect(indexChunk).toBeUndefined();
  });
});
