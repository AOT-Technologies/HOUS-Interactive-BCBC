import { describe, expect, it } from 'vitest';
import { extractContentIds, getAmendmentDates, getGlossaryMap, parseBCBC } from './parser';
import type { BCBCDocument } from './types';

function createRawDocument() {
  return {
    document_type: 'bc_building_code',
    version: '2024',
    canonical_version: '2024.0',
    generated_timestamp: '2024-01-01T00:00:00Z',
    metadata: {
      title: 'BC Building Code',
      publication_date: '2024-01-01',
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
            id: 'div-a',
            type: 'division',
            letter: 'A',
            title: 'Division A',
            number: '1',
            parts: [
              {
                id: 'part-1',
                type: 'part',
                number: 1,
                title: 'Part 1',
                sections: [
                  {
                    id: 'sect-1',
                    type: 'section',
                    number: 1,
                    title: 'Section 1',
                    subsections: [
                      {
                        id: 'subsect-1',
                        type: 'subsection',
                        number: 1,
                        title: 'Subsection 1',
                        articles: [
                          {
                            id: 'art-1',
                            type: 'article',
                            number: 1,
                            title: 'Article 1',
                            content: [
                              {
                                id: 'sent-1',
                                type: 'sentence',
                                number: 1,
                                text: 'This applies to [REF:term:bldng]building.',
                                clauses: [
                                  {
                                    id: 'clause-a',
                                    type: 'clause',
                                    letter: 'a',
                                    text: 'Clause with [REF:term:ccpnc:Occupancy]reference.',
                                    subclauses: [
                                      {
                                        id: 'subclause-1',
                                        type: 'subclause',
                                        number: 1,
                                        text: 'Subclause text.',
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
      },
    ],
    glossary: {
      bldng: {
        term: 'Building',
        definition: 'A structure.',
      },
      ccpnc: {
        term: 'Occupancy',
        definition: 'Use of a building.',
      },
    },
    bc_amendments: [
      {
        effective_date: '2024-01-01',
        location_id: 'art-1',
      },
      {
        effective_date: '2024-06-01',
        location_id: 'sect-1',
      },
      {
        effective_date: '2024-06-01',
        location_id: 'part-1',
      },
    ],
  };
}

function createDocument(): BCBCDocument {
  return parseBCBC(createRawDocument());
}

describe('parseBCBC', () => {
  it('throws for invalid input', () => {
    expect(() => parseBCBC(null)).toThrow('Invalid BCBC JSON data');
    expect(() => parseBCBC(undefined)).toThrow('Invalid BCBC JSON data');
    expect(() => parseBCBC('string')).toThrow('Invalid BCBC JSON data');
  });

  it('throws for missing metadata', () => {
    expect(() => parseBCBC({ volumes: [] })).toThrow('missing metadata');
  });

  it('throws for missing volumes', () => {
    expect(() => parseBCBC({ metadata: { title: 'Test' } })).toThrow('missing or invalid volumes');
  });

  it('parses a minimal valid document with volumes', () => {
    const result = parseBCBC({
      document_type: 'bc_building_code',
      version: '2024',
      metadata: {
        title: 'BC Building Code',
        publication_date: '2024-01-01',
        volumes: [],
      },
      volumes: [],
      glossary: {},
    });

    expect(result.metadata.title).toBe('BC Building Code');
    expect(result.metadata.version).toBe('2024');
    expect(result.metadata.volumes).toEqual([]);
    expect(result.volumes).toEqual([]);
    expect(result.glossary).toEqual([]);
  });

  it('parses nested content under volumes', () => {
    const result = createDocument();
    const volume = result.volumes[0];
    const division = volume.divisions[0];
    const article = division.parts[0].sections[0].subsections[0].articles[0];

    expect(volume.id).toBe('vol-1');
    expect(division.id).toBe('div-a');
    expect(article.content).toHaveLength(1);
    expect(article.content[0].type).toBe('sentence');
  });

  it('parses clauses and subclauses into sentence content', () => {
    const result = createDocument();
    const article = result.volumes[0].divisions[0].parts[0].sections[0].subsections[0].articles[0];
    const sentence = article.content[0];

    expect(sentence.type).toBe('sentence');
    if (sentence.type !== 'sentence') {
      throw new Error('Expected sentence content node');
    }

    expect(sentence.content).toHaveLength(1);
    expect(sentence.content?.[0].type).toBe('clause');

    const clause = sentence.content?.[0];
    expect(clause?.type).toBe('clause');
    if (!clause || clause.type !== 'clause') {
      throw new Error('Expected clause content node');
    }

    expect(clause.content).toHaveLength(1);
    expect(clause.content?.[0].type).toBe('subclause');
    expect(clause.content?.[0].text).toBe('Subclause text.');
  });

  it('extracts glossary terms from sentence and clause text', () => {
    const result = createDocument();
    const article = result.volumes[0].divisions[0].parts[0].sections[0].subsections[0].articles[0];
    const sentence = article.content[0];

    expect(sentence.type).toBe('sentence');
    if (sentence.type !== 'sentence') {
      throw new Error('Expected sentence content node');
    }

    expect(sentence.glossaryTerms).toContain('bldng');

    const clause = sentence.content?.[0];
    expect(clause?.type).toBe('clause');
    if (!clause || clause.type !== 'clause') {
      throw new Error('Expected clause content node');
    }

    expect(clause.glossaryTerms).toContain('ccpnc');
  });

  it('parses glossary entries from the source object', () => {
    const result = createDocument();

    expect(result.glossary).toHaveLength(2);
    expect(result.glossary.find((entry) => entry.id === 'bldng')?.term).toBe('Building');
    expect(result.glossary.find((entry) => entry.id === 'ccpnc')?.definition).toBe(
      'Use of a building.'
    );
  });
});

describe('extractContentIds', () => {
  it('extracts IDs from the volume-based hierarchy', () => {
    const ids = extractContentIds(createDocument());

    expect(ids).toContain('div-a');
    expect(ids).toContain('part-1');
    expect(ids).toContain('sect-1');
    expect(ids).toContain('subsect-1');
    expect(ids).toContain('art-1');
    expect(ids).toContain('sent-1');
    expect(ids).toContain('clause-a');
    expect(ids).toContain('subclause-1');
  });
});

describe('getGlossaryMap', () => {
  it('creates ID and lowercase-term lookup entries', () => {
    const map = getGlossaryMap(createDocument());

    expect(map.get('bldng')?.term).toBe('Building');
    expect(map.get('building')?.id).toBe('bldng');
  });
});

describe('getAmendmentDates', () => {
  it('returns sorted unique amendment dates', () => {
    const dates = getAmendmentDates(createDocument());

    expect(dates).toEqual(['2024-01-01', '2024-06-01']);
  });
});
