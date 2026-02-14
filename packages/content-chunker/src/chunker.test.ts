/**
 * Tests for content chunking functionality
 */

import { describe, it, expect } from 'vitest';
import { chunkContent, chunkRawContent, generateChunkPath, isOptimalChunkSize, getChunkStats } from './chunker';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';

describe('chunkContent', () => {
  it('should split content by section', () => {
    const mockDocument: BCBCDocument = {
      metadata: {
        title: 'Test BCBC',
        version: '2024',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
      },
      divisions: [
        {
          id: 'division-a',
          title: 'Division A',
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
      glossary: [],
      amendmentDates: [],
    };

    const chunks = chunkContent(mockDocument);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].path).toBe('content/division-a/part-1/section-1-1.json');
    expect(chunks[1].path).toBe('content/division-a/part-1/section-1-2.json');
    expect(chunks[0].data.id).toBe('section-1-1');
    expect(chunks[1].data.id).toBe('section-1-2');
  });

  it('should calculate chunk sizes', () => {
    const mockDocument: BCBCDocument = {
      metadata: {
        title: 'Test BCBC',
        version: '2024',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
      },
      divisions: [
        {
          id: 'division-a',
          title: 'Division A',
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
              ],
            },
          ],
        },
      ],
      glossary: [],
      amendmentDates: [],
    };

    const chunks = chunkContent(mockDocument);

    expect(chunks[0].size).toBeGreaterThan(0);
    expect(typeof chunks[0].size).toBe('number');
  });
});

describe('chunkRawContent', () => {
  it('should preserve raw section objects without stripping table revisions', () => {
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

    const tableNode = (chunks[0].data.subsections as any[])[0]
      .articles[0]
      .content[0];

    expect(tableNode.revised).toBe(true);
    expect(tableNode.structure).toEqual({ columns: null, body_rows: [] });
    expect(tableNode.revisions).toHaveLength(1);
    expect(tableNode.revisions[0].effective_date).toBe('2020-12-01');
  });
});

describe('generateChunkPath', () => {
  it('should generate correct path format', () => {
    const path = generateChunkPath('division-a', '1', '1.1');
    expect(path).toBe('content/division-a/part-1/section-1-1.json');
  });

  it('should normalize division ID', () => {
    const path = generateChunkPath('Division-A', '1', '1.1');
    expect(path).toBe('content/division-a/part-1/section-1-1.json');
  });

  it('should handle section numbers with dots', () => {
    const path = generateChunkPath('division-b', '3', '3.2.1');
    expect(path).toBe('content/division-b/part-3/section-3-2-1.json');
  });
});

describe('isOptimalChunkSize', () => {
  it('should return true for chunks within 50-200KB range', () => {
    const chunk = {
      path: 'test.json',
      data: {} as any,
      size: 100 * 1024, // 100KB
    };
    expect(isOptimalChunkSize(chunk)).toBe(true);
  });

  it('should return false for chunks below 50KB', () => {
    const chunk = {
      path: 'test.json',
      data: {} as any,
      size: 30 * 1024, // 30KB
    };
    expect(isOptimalChunkSize(chunk)).toBe(false);
  });

  it('should return false for chunks above 200KB', () => {
    const chunk = {
      path: 'test.json',
      data: {} as any,
      size: 250 * 1024, // 250KB
    };
    expect(isOptimalChunkSize(chunk)).toBe(false);
  });
});

describe('getChunkStats', () => {
  it('should calculate correct statistics', () => {
    const chunks = [
      { path: 'test1.json', data: {} as any, size: 50 * 1024 },
      { path: 'test2.json', data: {} as any, size: 100 * 1024 },
      { path: 'test3.json', data: {} as any, size: 150 * 1024 },
    ];

    const stats = getChunkStats(chunks);

    expect(stats.totalChunks).toBe(3);
    expect(stats.totalSize).toBe(300 * 1024);
    expect(stats.averageSize).toBe(100 * 1024);
    expect(stats.minSize).toBe(50 * 1024);
    expect(stats.maxSize).toBe(150 * 1024);
  });
});
