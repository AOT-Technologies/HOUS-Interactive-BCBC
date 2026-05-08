/**
 * Tests for search indexer
 */

import { describe, it, expect } from 'vitest';
import { buildSearchIndex } from './indexer';
import {
  extractReferences,
  stripReferences,
  generateSnippet,
  normalizeWhitespace,
} from './text-extractor';
import { DEFAULT_REFERENCE_CONFIG } from './config';

describe('search-indexer', () => {
  describe('text-extractor', () => {
    describe('extractReferences', () => {
      it('should extract term references', () => {
        const text = 'This is a [REF:term:bldng]building test';
        const refs = extractReferences(text);

        expect(refs).toHaveLength(1);
        expect(refs[0].type).toBe('term');
        expect(refs[0].id).toBe('bldng');
        expect(refs[0].displayText).toBe('building');
      });

      it('should extract term references with inline label', () => {
        const text = 'This is a [REF:term:bldng:building] test';
        const refs = extractReferences(text);

        expect(refs).toHaveLength(1);
        expect(refs[0].type).toBe('term');
        expect(refs[0].id).toBe('bldng');
        expect(refs[0].displayText).toBe('building');
      });

      it('should extract internal references', () => {
        const text = 'See [REF:internal:nbc.divB.part3:long] for details';
        const refs = extractReferences(text);

        expect(refs).toHaveLength(1);
        expect(refs[0].type).toBe('internal');
        expect(refs[0].id).toBe('nbc.divB.part3');
      });

      it('should extract multiple references', () => {
        const text = '[REF:term:bldng]building and [REF:term:ccpnc]occupancy';
        const refs = extractReferences(text);

        expect(refs).toHaveLength(2);
      });
    });

    describe('stripReferences', () => {
      it('should strip references and keep display text', () => {
        const text = 'This is a [REF:term:bldng]building test';
        const result = stripReferences(text, DEFAULT_REFERENCE_CONFIG);

        expect(result).toBe('This is a building test');
      });

      it('should strip references and keep inline label text', () => {
        const text = 'This is a [REF:term:bldng:building] test';
        const result = stripReferences(text, DEFAULT_REFERENCE_CONFIG);

        expect(result).toBe('This is a building test');
      });

      it('should handle multiple references', () => {
        const text = '[REF:term:bldng]building and [REF:term:ccpnc]occupancy';
        const result = stripReferences(text, DEFAULT_REFERENCE_CONFIG);

        expect(result).toBe('building and occupancy');
      });

      it('should handle references without display text', () => {
        const text = 'See [REF:internal:nbc.divB.part3:long] for details';
        const result = stripReferences(text, DEFAULT_REFERENCE_CONFIG);

        // After bugfix: internal refs now produce display text from formatInternalReference
        expect(result).toBe('See Part 3 for details');
      });
    });

    describe('generateSnippet', () => {
      it('should return full text if under limit', () => {
        const text = 'Short text';
        const snippet = generateSnippet(text, 200);

        expect(snippet).toBe('Short text');
      });

      it('should truncate long text with ellipsis', () => {
        const text = 'This is a very long text that should be truncated at some point';
        const snippet = generateSnippet(text, 30);

        expect(snippet.length).toBeLessThanOrEqual(33); // 30 + '...'
        expect(snippet).toContain('...');
      });
    });

    describe('normalizeWhitespace', () => {
      it('should collapse multiple spaces', () => {
        const text = 'This   has   multiple   spaces';
        const result = normalizeWhitespace(text);

        expect(result).toBe('This has multiple spaces');
      });

      it('should replace newlines with spaces', () => {
        const text = 'Line 1\nLine 2\nLine 3';
        const result = normalizeWhitespace(text);

        expect(result).toBe('Line 1 Line 2 Line 3');
      });
    });
  });

  describe('buildSearchIndex', () => {
    it('should build index from minimal BCBC data', () => {
      const mockData = {
        document_type: 'bc_building_code',
        version: '2024',
        divisions: [
          {
            id: 'nbc.divA',
            type: 'division',
            letter: 'A',
            title: 'Compliance',
            parts: [
              {
                id: 'nbc.divA.part1',
                type: 'part',
                number: 1,
                title: 'General',
                sections: [
                  {
                    id: 'nbc.divA.part1.sect1',
                    type: 'section',
                    number: 1,
                    title: 'Application',
                    subsections: [
                      {
                        id: 'nbc.divA.part1.sect1.subsect1',
                        type: 'subsection',
                        number: 1,
                        title: 'Scope',
                        articles: [
                          {
                            id: 'nbc.divA.part1.sect1.subsect1.art1',
                            type: 'article',
                            number: 1,
                            title: 'Application of Code',
                            content: [
                              {
                                id: 'sent1',
                                type: 'sentence',
                                number: 1,
                                text: 'This Code applies to all [REF:term:bldng]buildings.',
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
        glossary: {
          bldng: {
            term: 'Building',
            definition: 'A structure used for shelter.',
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { documents, metadata } = buildSearchIndex(mockData as any);

      // Should have documents
      expect(documents.length).toBeGreaterThan(0);

      // Should have part, section, subsection, article, and glossary
      const types = new Set(documents.map(d => d.type));
      expect(types.has('part')).toBe(true);
      expect(types.has('section')).toBe(true);
      expect(types.has('subsection')).toBe(true);
      expect(types.has('article')).toBe(true);
      expect(types.has('glossary')).toBe(true);

      // Check article document
      const article = documents.find(d => d.type === 'article');
      expect(article).toBeDefined();
      expect(article?.title).toBe('Application of Code');
      expect(article?.articleNumber).toBe('A.1.1.1.1');
      expect(article?.text).toContain('buildings'); // Reference stripped
      expect(article?.text).not.toContain('[REF:'); // No raw refs

      // Check glossary document
      const glossary = documents.find(d => d.type === 'glossary');
      expect(glossary).toBeDefined();
      expect(glossary?.title).toBe('Building');

      // Check metadata
      expect(metadata.version).toBe('2024');
      expect(metadata.statistics.totalDocuments).toBe(documents.length);
      expect(metadata.divisions).toHaveLength(1);
      expect(metadata.tableOfContents).toHaveLength(1);
    });

    it('should strip references from glossary definitions for search', () => {
      const mockData = {
        document_type: 'bc_building_code',
        version: '2024',
        divisions: [],
        glossary: {
          'test-term': {
            term: 'Fire Separation',
            definition: 'a [REF:term:cnstrtn:construction] assembly that acts as a barrier against the spread of [REF:term:fr:fire]',
          },
          'test-term-2': {
            term: 'Occupancy',
            definition: 'the use or intended use of a [REF:term:bldng:building] or part thereof for the shelter',
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { documents } = buildSearchIndex(mockData as any);

      const glossaryDocs = documents.filter(d => d.type === 'glossary');
      expect(glossaryDocs).toHaveLength(2);

      // Glossary text should have references stripped for search
      const fireSep = glossaryDocs.find(d => d.title === 'Fire Separation');
      expect(fireSep).toBeDefined();
      expect(fireSep?.text).not.toContain('[REF:');
      expect(fireSep?.text).toContain('construction');
      expect(fireSep?.text).toContain('fire');
      expect(fireSep?.text).toContain('barrier against the spread');

      const occupancy = glossaryDocs.find(d => d.title === 'Occupancy');
      expect(occupancy).toBeDefined();
      expect(occupancy?.text).not.toContain('[REF:');
      expect(occupancy?.text).toContain('building');
      expect(occupancy?.text).toContain('shelter');
    });

    it('should detect amendments and track revision dates', () => {
      const mockData = {
        document_type: 'bc_building_code',
        version: '2024',
        divisions: [
          {
            id: 'nbc.divA',
            type: 'division',
            letter: 'A',
            title: 'Compliance',
            parts: [
              {
                id: 'nbc.divA.part1',
                type: 'part',
                number: 1,
                title: 'General',
                sections: [
                  {
                    id: 'nbc.divA.part1.sect1',
                    type: 'section',
                    number: 1,
                    title: 'Application',
                    subsections: [
                      {
                        id: 'nbc.divA.part1.sect1.subsect1',
                        type: 'subsection',
                        number: 1,
                        title: 'Scope',
                        articles: [
                          {
                            id: 'nbc.divA.part1.sect1.subsect1.art1',
                            type: 'article',
                            number: 1,
                            title: 'Amended Article',
                            content: [],
                            revisions: [
                              {
                                type: 'original' as const,
                                effective_date: '2020-12-01',
                              },
                              {
                                type: 'revision' as const,
                                revision_type: 'amendment' as const,
                                effective_date: '2024-08-27',
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { documents, metadata } = buildSearchIndex(mockData as any);

      // Article should be marked as amended
      const article = documents.find(d => d.type === 'article');
      expect(article?.hasAmendment).toBe(true);
      expect(article?.latestAmendmentDate).toBe('2024-08-27');

      // Revision dates should be tracked
      expect(metadata.revisionDates.length).toBeGreaterThan(0);
      expect(metadata.statistics.totalAmendments).toBe(1);

      // TOC should show hasRevisions
      const tocArticle = metadata.tableOfContents[0]?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0];
      expect(tocArticle?.hasRevisions).toBe(true);
    });

    it('should respect content type configuration', () => {
      const mockData = {
        document_type: 'bc_building_code',
        version: '2024',
        divisions: [
          {
            id: 'nbc.divA',
            type: 'division',
            letter: 'A',
            title: 'Compliance',
            parts: [
              {
                id: 'nbc.divA.part1',
                type: 'part',
                number: 1,
                title: 'General',
                sections: [],
              },
            ],
          },
        ],
        glossary: {
          test: { term: 'Test', definition: 'A test term.' },
        },
      };

      // Disable glossary indexing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { documents } = buildSearchIndex(mockData as any, {
        contentTypes: {
          article: { enabled: true, priority: 5, amendmentBoost: 1.5 },
          table: { enabled: true, priority: 7, amendmentBoost: 1.3 },
          figure: { enabled: true, priority: 7, amendmentBoost: 1.3 },
          part: { enabled: true, priority: 10, amendmentBoost: 1.0 },
          section: { enabled: true, priority: 9, amendmentBoost: 1.0 },
          subsection: { enabled: true, priority: 8, amendmentBoost: 1.0 },
          glossary: { enabled: false, priority: 0, amendmentBoost: 1.0 },
          note: { enabled: true, priority: 4, amendmentBoost: 1.2 },
          'application-note': { enabled: true, priority: 4, amendmentBoost: 1.2 },
        },
      });

      // Should not have glossary documents
      const glossary = documents.find(d => d.type === 'glossary');
      expect(glossary).toBeUndefined();
    });
  });
});


describe('application note indexing', () => {
  it('should index application notes from part appendix', () => {
    const mockData = {
      document_type: 'bc_building_code',
      version: '2024',
      divisions: [
        {
          id: 'nbc.divA',
          type: 'division',
          letter: 'A',
          title: 'Compliance',
          parts: [
            {
              id: 'nbc.divA.part1',
              type: 'part',
              number: 1,
              title: 'General',
              sections: [],
              appendix: {
                id: 'nbc.divA.part1.appendix',
                type: 'appendix',
                application_notes: [
                  {
                    id: 'nbc.divA.part1.appendix.appnote1',
                    type: 'application_note',
                    number: '1.1.1.2.(1)',
                    title: 'Application to Existing Buildings',
                    content: [
                      {
                        type: 'paragraph',
                        id: 'nbc.divA.part1.appendix.appnote1.para1',
                        content: 'This Code is most often applied to existing buildings when an owner wishes to rehabilitate.',
                      },
                      {
                        type: 'paragraph',
                        id: 'nbc.divA.part1.appendix.appnote1.para2',
                        content: 'It is not intended for retrospective application.',
                      },
                    ],
                  },
                  {
                    id: 'nbc.divA.part1.appendix.appnote2',
                    type: 'application_note',
                    number: '1.1.1.1.(3)',
                    title: 'Factory-Constructed Buildings',
                    content: [
                      {
                        type: 'paragraph',
                        id: 'nbc.divA.part1.appendix.appnote2.para1',
                        content: 'The Code applies the same requirements to site-built and factory-constructed buildings.',
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { documents } = buildSearchIndex(mockData as any);

    // Should have application-note documents
    const appNotes = documents.filter(d => d.type === 'application-note');
    expect(appNotes).toHaveLength(2);

    // Check first note
    const note1 = appNotes.find(d => d.id === 'nbc.divA.part1.appendix.appnote1');
    expect(note1).toBeDefined();
    expect(note1?.title).toBe('Application to Existing Buildings');
    expect(note1?.text).toContain('existing buildings');
    expect(note1?.text).toContain('rehabilitate');
    expect(note1?.text).toContain('retrospective application');
    expect(note1?.articleNumber).toContain('A.1 Note 1.1.1.2.(1)');

    // Check second note
    const note2 = appNotes.find(d => d.id === 'nbc.divA.part1.appendix.appnote2');
    expect(note2).toBeDefined();
    expect(note2?.title).toBe('Factory-Constructed Buildings');
    expect(note2?.text).toContain('factory-constructed buildings');
  });

  it('should not index application notes when disabled in config', () => {
    const mockData = {
      document_type: 'bc_building_code',
      version: '2024',
      divisions: [
        {
          id: 'nbc.divA',
          type: 'division',
          letter: 'A',
          title: 'Compliance',
          parts: [
            {
              id: 'nbc.divA.part1',
              type: 'part',
              number: 1,
              title: 'General',
              sections: [],
              appendix: {
                application_notes: [
                  {
                    id: 'note1',
                    type: 'application_note',
                    number: '1.1.1.1.(1)',
                    title: 'Test Note',
                    content: [{ type: 'paragraph', content: 'Note content.' }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { documents } = buildSearchIndex(mockData as any, {
      contentTypes: {
        article: { enabled: true, priority: 5, amendmentBoost: 1.5 },
        table: { enabled: true, priority: 7, amendmentBoost: 1.3 },
        figure: { enabled: true, priority: 7, amendmentBoost: 1.3 },
        part: { enabled: true, priority: 10, amendmentBoost: 1.0 },
        section: { enabled: true, priority: 9, amendmentBoost: 1.0 },
        subsection: { enabled: true, priority: 8, amendmentBoost: 1.0 },
        glossary: { enabled: true, priority: 6, amendmentBoost: 1.0 },
        note: { enabled: true, priority: 4, amendmentBoost: 1.2 },
        'application-note': { enabled: false, priority: 4, amendmentBoost: 1.2 },
      },
    });

    const appNotes = documents.filter(d => d.type === 'application-note');
    expect(appNotes).toHaveLength(0);
  });
});

describe('table indexing with actual data format', () => {
  it('should index table content from header_rows and body_rows', () => {
    const mockData = {
      document_type: 'bc_building_code',
      version: '2024',
      divisions: [
        {
          id: 'nbc.divA',
          type: 'division',
          letter: 'A',
          title: 'Compliance',
          parts: [
            {
              id: 'nbc.divA.part1',
              type: 'part',
              number: 1,
              title: 'General',
              sections: [
                {
                  id: 'nbc.divA.part1.sect1',
                  type: 'section',
                  number: 1,
                  title: 'Application',
                  subsections: [
                    {
                      id: 'nbc.divA.part1.sect1.subsect1',
                      type: 'subsection',
                      number: 1,
                      title: 'Scope',
                      articles: [
                        {
                          id: 'nbc.divA.part1.sect1.subsect1.art1',
                          type: 'article',
                          number: 1,
                          title: 'Test Article',
                          content: [
                            {
                              id: 'nbc.divA.part1.sect1.subsect1.art1.table1',
                              type: 'table',
                              title: 'Compliance Methods',
                              structure: {
                                columns: 3,
                                header_rows: [
                                  {
                                    id: 'rowh1',
                                    type: 'header_row',
                                    cells: [
                                      { content: [{ type: 'text', value: 'No.' }] },
                                      { content: [{ type: 'text', value: 'Code Requirement' }] },
                                      { content: [{ type: 'text', value: 'Alternate Method' }] },
                                    ],
                                  },
                                ],
                                body_rows: [
                                  {
                                    id: 'row1',
                                    type: 'body_row',
                                    cells: [
                                      { content: [{ type: 'text', value: '1' }] },
                                      { content: [{ type: 'text', value: 'Fire Separations required between occupancies' }] },
                                      { content: [{ type: 'text', value: 'Sprinkler system throughout' }] },
                                    ],
                                  },
                                  {
                                    id: 'row2',
                                    type: 'body_row',
                                    cells: [
                                      { content: [{ type: 'text', value: '2' }] },
                                      { content: [{ type: 'text', value: 'Smoke alarms in dwelling units' }] },
                                      { content: [{ type: 'text', value: 'Interconnected smoke detectors' }] },
                                    ],
                                  },
                                ],
                              },
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { documents } = buildSearchIndex(mockData as any);

    const tableDocs = documents.filter(d => d.type === 'table');
    expect(tableDocs).toHaveLength(1);

    const table = tableDocs[0];
    expect(table.title).toBe('Compliance Methods');
    // Header content should be indexed
    expect(table.text).toContain('Code Requirement');
    expect(table.text).toContain('Alternate Method');
    // Body row content should be indexed
    expect(table.text).toContain('Fire Separations required between occupancies');
    expect(table.text).toContain('Sprinkler system throughout');
    expect(table.text).toContain('Smoke alarms in dwelling units');
    expect(table.text).toContain('Interconnected smoke detectors');
  });
});

describe('article indexing with list items', () => {
  it('should index list items within sentences', () => {
    const mockData = {
      document_type: 'bc_building_code',
      version: '2024',
      divisions: [
        {
          id: 'nbc.divA',
          type: 'division',
          letter: 'A',
          title: 'Compliance',
          parts: [
            {
              id: 'nbc.divA.part1',
              type: 'part',
              number: 1,
              title: 'General',
              sections: [
                {
                  id: 'nbc.divA.part1.sect1',
                  type: 'section',
                  number: 1,
                  title: 'Application',
                  subsections: [
                    {
                      id: 'nbc.divA.part1.sect1.subsect1',
                      type: 'subsection',
                      number: 1,
                      title: 'Definitions',
                      articles: [
                        {
                          id: 'nbc.divA.part1.sect1.subsect1.art1',
                          type: 'article',
                          number: 1,
                          title: 'Defined Terms',
                          content: [
                            {
                              id: 'sent1',
                              type: 'sentence',
                              number: 1,
                              text: 'The following terms are defined:',
                              lists: [
                                {
                                  type: 'definition',
                                  items: [
                                    { term: 'Accessible', definition: 'means an area which is easy to approach' },
                                    { term: 'Egress', definition: 'means a path of travel to the exterior' },
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { documents } = buildSearchIndex(mockData as any);

    const article = documents.find(d => d.type === 'article');
    expect(article).toBeDefined();
    expect(article?.text).toContain('The following terms are defined:');
    expect(article?.text).toContain('Accessible');
    expect(article?.text).toContain('means an area which is easy to approach');
    expect(article?.text).toContain('Egress');
    expect(article?.text).toContain('means a path of travel to the exterior');
  });
});


describe('glossary searchability', () => {
  it('should produce glossary documents with clean searchable text (no REF markers)', () => {
    const mockData = {
      document_type: 'bc_building_code',
      version: '2024',
      divisions: [],
      glossary: {
        'prchd-gr': {
          term: 'Perched groundwater',
          definition: 'means a free standing body of water in the ground extending to a limited depth.',
        },
        'bldng': {
          term: 'Building',
          definition: 'any [REF:term:strctr:structure] used or intended for supporting or sheltering any use or [REF:term:ccpnc:occupancy]',
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { documents } = buildSearchIndex(mockData as any);

    const glossaryDocs = documents.filter(d => d.type === 'glossary');
    expect(glossaryDocs).toHaveLength(2);

    // "Perched groundwater" should be directly searchable by title
    const perched = glossaryDocs.find(d => d.title === 'Perched groundwater');
    expect(perched).toBeDefined();
    expect(perched?.text).toBe('means a free standing body of water in the ground extending to a limited depth.');

    // "Building" definition should have references stripped for search
    const building = glossaryDocs.find(d => d.title === 'Building');
    expect(building).toBeDefined();
    expect(building?.text).not.toContain('[REF:');
    expect(building?.text).toContain('structure');
    expect(building?.text).toContain('occupancy');
  });
});
