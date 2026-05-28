import { describe, expect, it } from 'vitest';
import {
  extractContentTypes,
  extractGlossaryMap,
  extractMetadata,
  extractNavigationTree,
  extractQuickAccess,
} from './metadata-extractor';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';

function createBaseDocument(): BCBCDocument {
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
        frontMatter: {
          id: 'front-matter',
          preface: {
            id: 'preface',
            type: 'preface',
            content: [],
          },
        },
        index: {
          id: 'vol-1-index',
          type: 'index',
          introduction: 'Index introduction text',
          letters: [],
        },
        conversions: {
          id: 'vol-1-conversions',
          type: 'conversions',
          table_id: 'conv-table-1',
          table_title: 'Conversion Factors',
          table_structure: { columns: 3, column_specs: [], rows: [] },
        },
        divisions: [
          {
            id: 'nbc.divA',
            letter: 'A',
            title: 'Compliance, Objectives and Functional Statements',
            number: '1',
            type: 'division',
            parts: [
              {
                id: 'nbc.divA.part1',
                number: '1',
                title: 'Compliance',
                type: 'part',
                sections: [
                  {
                    id: 'nbc.divA.part1.sect1',
                    number: '1',
                    title: 'Section 1',
                    type: 'section',
                    subsections: [
                      {
                        id: 'nbc.divA.part1.sect1.subsect1',
                        number: '1',
                        title: 'Subsection 1',
                        type: 'subsection',
                        articles: [
                          {
                            id: 'nbc.divA.part1.sect1.subsect1.art1',
                            number: '1',
                            title: 'Article 1',
                            type: 'article',
                            content: [
                              {
                                id: 'sent-1',
                                number: '1',
                                type: 'sentence',
                                text: 'Sentence text.',
                                glossaryTerms: [],
                                content: [],
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
          {
            id: 'nbc.divB',
            letter: 'B',
            title: 'General Requirements',
            number: '2',
            type: 'division',
            parts: [
              {
                id: 'nbc.divB.part3',
                number: '3',
                title: 'Fire Protection, Occupant Safety and Accessibility',
                type: 'part',
                sections: [
                  {
                    id: 'nbc.divB.part3.sect1',
                    number: '1',
                    title: 'General',
                    type: 'section',
                    subsections: [],
                  },
                ],
              },
            ],
          },
          {
            id: 'nbc.divBV2',
            letter: 'B',
            title: 'Volume 2 Requirements',
            number: '2',
            type: 'division',
            parts: [
              {
                id: 'nbc.divBV2.part9',
                number: '9',
                title: 'Housing and Small Buildings',
                type: 'part',
                sections: [
                  {
                    id: 'nbc.divBV2.part9.sect1',
                    number: '1',
                    title: 'Small Buildings',
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
    glossary: [
      {
        id: 'term-1',
        term: 'Building',
        definition: 'A structure for shelter.',
      },
      {
        id: 'term-2',
        term: 'Occupancy',
        definition: 'The use of a building.',
      },
    ],
    amendmentDates: [
      {
        date: '2024-01-01',
        description: 'Initial release',
        affectedSections: [],
      },
    ],
  };
}

describe('extractNavigationTree', () => {
  it('extracts a volume-first navigation hierarchy', () => {
    const tree = extractNavigationTree(createBaseDocument());

    expect(tree).toHaveLength(1);
    expect(tree[0].type).toBe('volume');
    expect(tree[0].children?.[0].title).toBe('Preface');
    expect(tree[0].children?.[1].type).toBe('division');
    expect(tree[0].children?.[1].children?.[0].type).toBe('part');
    expect(tree[0].children?.[1].children?.[0].children?.[0].type).toBe('section');
    expect(tree[0].children?.[1].children?.[0].children?.[0].children?.[0].type).toBe(
      'subsection'
    );
    expect(
      tree[0].children?.[1].children?.[0].children?.[0].children?.[0].children?.[0].type
    ).toBe('article');
  });

  it('generates current navigation paths', () => {
    const tree = extractNavigationTree(createBaseDocument());
    const divisionNode = tree[0].children?.[1];
    const partNode = divisionNode?.children?.[0];
    const sectionNode = partNode?.children?.[0];

    expect(tree[0].path).toBe('/volume/1');
    expect(divisionNode?.path).toBe('/code/nbc.divA');
    expect(partNode?.path).toBe('/code/nbc.divA/1');
    expect(sectionNode?.path).toBe('/code/nbc.divA/1/1');
  });

  it('excludes Index and Conversion Factors from Volume 1 navigation', () => {
    const tree = extractNavigationTree(createBaseDocument());
    const volumeChildren = tree[0].children!;
    const indexNode = volumeChildren.find(c => c.type === 'index');
    const conversionsNode = volumeChildren.find(c => c.type === 'conversions');
    expect(indexNode).toBeUndefined();
    expect(conversionsNode).toBeUndefined();
  });

  it('includes Index and Conversion Factors for Volume 2', () => {
    const doc = createBaseDocument();
    // Add a second volume with number 2
    doc.volumes.push({
      id: 'vol-2',
      type: 'volume',
      number: 2,
      title: 'Volume 2',
      divisions: [],
      index: {
        id: 'vol-2-index',
        type: 'index',
        introduction: 'Index introduction text',
        letters: [],
      },
      conversions: {
        id: 'vol-2-conversions',
        type: 'conversions',
        table_id: 'conv-table-2',
        table_title: 'Conversion Factors',
        table_structure: { columns: 3, column_specs: [], rows: [] },
      },
    } as any);

    const tree = extractNavigationTree(doc);
    const vol2Children = tree[1].children!;
    const lastTwo = vol2Children.slice(-2);

    expect(lastTwo[0]).toMatchObject({
      id: 'vol-2-index',
      type: 'index',
      title: 'Index',
      path: '/code/index/volume-2',
    });
    expect(lastTwo[1]).toMatchObject({
      id: 'vol-2-conversions',
      type: 'conversions',
      title: 'Conversion Factors',
      path: '/code/conversions/volume-2',
    });
  });

  it('omits Index node when volume has no index', () => {
    const doc = createBaseDocument();
    delete doc.volumes[0].index;
    const tree = extractNavigationTree(doc);
    const volumeChildren = tree[0].children!;
    const indexNode = volumeChildren.find(c => c.type === 'index');
    expect(indexNode).toBeUndefined();
  });

  it('omits Conversion Factors node when volume has no conversions', () => {
    const doc = createBaseDocument();
    delete doc.volumes[0].conversions;
    const tree = extractNavigationTree(doc);
    const volumeChildren = tree[0].children!;
    const conversionsNode = volumeChildren.find(c => c.type === 'conversions');
    expect(conversionsNode).toBeUndefined();
  });
});

describe('extractGlossaryMap', () => {
  it('creates a term-keyed lowercase glossary map', () => {
    const glossaryMap = extractGlossaryMap(createBaseDocument());

    expect(glossaryMap.building.term).toBe('Building');
    expect(glossaryMap.occupancy.term).toBe('Occupancy');
  });
});

describe('extractContentTypes', () => {
  it('always includes article', () => {
    expect(extractContentTypes(createBaseDocument())).toContain('article');
  });

  it('detects tables, figures, and notes from nested content nodes', () => {
    const document = createBaseDocument();
    const article =
      document.volumes[0].divisions[0].parts[0].sections[0].subsections[0].articles[0];
    const sentence = article.content[0];

    if (sentence.type !== 'sentence') {
      throw new Error('Expected sentence content node');
    }

    sentence.content = [
      {
        id: 'clause-1',
        number: 'a',
        type: 'clause',
        text: 'Clause text.',
        glossaryTerms: [],
        content: [
          {
            id: 'table-1',
            type: 'table',
            number: '1',
            title: 'Table 1',
            headers: [],
            rows: [],
          },
          {
            id: 'figure-1',
            type: 'figure',
            number: '1',
            title: 'Figure 1',
            imageUrl: '/images/test.png',
            altText: 'Figure',
          },
        ],
      },
      {
        id: 'note-1',
        type: 'note',
        noteNumber: 'A-1',
        noteTitle: 'Application Note',
        noteContent: 'Test content',
      },
    ];

    const contentTypes = extractContentTypes(document);
    expect(contentTypes).toContain('table');
    expect(contentTypes).toContain('figure');
    expect(contentTypes).toContain('note');
    expect(contentTypes).toContain('application-note');
  });
});

describe('extractQuickAccess', () => {
  it('returns the three predefined quick access pins when present', () => {
    const quickAccess = extractQuickAccess(createBaseDocument());

    expect(quickAccess).toHaveLength(3);
    expect(quickAccess[0]).toMatchObject({
      id: 'nbc.divA.part1',
      title: 'Division A - Part 1',
      path: '/code/nbc.divA/1',
      description: 'Compliance',
    });
    expect(quickAccess[1]).toMatchObject({
      id: 'nbc.divBV2.part9',
      title: 'Division B - Part 9',
      path: '/code/nbc.divBV2/9',
      description: 'Housing and Small Buildings',
    });
    expect(quickAccess[2]).toMatchObject({
      id: 'nbc.divB.part3',
      title: 'Division B - Part 3',
      path: '/code/nbc.divB/3',
      description: 'Fire Protection, Occupant Safety and Accessibility',
    });
  });
});

describe('extractMetadata', () => {
  it('extracts all metadata types', () => {
    const metadata = extractMetadata(createBaseDocument());

    expect(metadata.navigationTree.length).toBeGreaterThan(0);
    expect(Object.keys(metadata.glossaryMap).length).toBeGreaterThan(0);
    expect(metadata.amendmentDates).toHaveLength(1);
    expect(metadata.contentTypes).toContain('article');
    expect(metadata.quickAccess).toHaveLength(3);
  });
});
