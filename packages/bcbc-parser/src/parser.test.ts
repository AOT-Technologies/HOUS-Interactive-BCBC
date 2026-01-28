/**
 * Tests for BCBC parser
 */

import { describe, it, expect } from 'vitest';
import { parseBCBC, extractContentIds, getGlossaryMap, getAmendmentDates } from './parser';
import type { BCBCDocument } from './types';

describe('parseBCBC', () => {
  it('should throw error for invalid input', () => {
    expect(() => parseBCBC(null)).toThrow('Invalid BCBC JSON data');
    expect(() => parseBCBC(undefined)).toThrow('Invalid BCBC JSON data');
    expect(() => parseBCBC('string')).toThrow('Invalid BCBC JSON data');
  });

  it('should throw error for missing metadata', () => {
    expect(() => parseBCBC({ divisions: [] })).toThrow('missing metadata');
  });

  it('should throw error for missing divisions', () => {
    expect(() => parseBCBC({ metadata: { title: 'Test' } })).toThrow('missing or invalid divisions');
  });

  it('should parse valid BCBC JSON with minimal structure', () => {
    const input = {
      document_type: 'bc_building_code',
      version: '2024',
      metadata: {
        title: 'BC Building Code',
        publication_date: '2024-01-01',
      },
      divisions: [],
      glossary: {},
    };

    const result = parseBCBC(input);

    expect(result).toBeDefined();
    expect(result.metadata.title).toBe('BC Building Code');
    expect(result.metadata.version).toBe('2024');
    expect(result.divisions).toEqual([]);
    expect(result.glossary).toEqual([]);
  });

  it('should parse divisions with nested structure', () => {
    const input = {
      document_type: 'bc_building_code',
      version: '2024',
      metadata: {
        title: 'BC Building Code',
      },
      divisions: [
        {
          id: 'div-a',
          type: 'division',
          letter: 'A',
          title: 'Division A',
          number: '',
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
                              text: 'This is a test sentence.',
                              clauses: [],
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
      glossary: {},
    };

    const result = parseBCBC(input);

    expect(result.divisions).toHaveLength(1);
    expect(result.divisions[0].id).toBe('div-a');
    expect(result.divisions[0].parts).toHaveLength(1);
    expect(result.divisions[0].parts[0].sections).toHaveLength(1);
    expect(result.divisions[0].parts[0].sections[0].subsections).toHaveLength(1);
    expect(result.divisions[0].parts[0].sections[0].subsections[0].articles).toHaveLength(1);
  });

  it('should parse clauses with subclauses', () => {
    const input = {
      document_type: 'bc_building_code',
      version: '2024',
      metadata: { title: 'Test' },
      divisions: [
        {
          id: 'div-a',
          type: 'division',
          letter: 'A',
          title: 'Division A',
          number: '',
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
                              text: 'Main sentence',
                              clauses: [
                                {
                                  id: 'clause-a',
                                  type: 'clause',
                                  letter: 'a',
                                  text: 'Clause a',
                                  subclauses: [
                                    {
                                      id: 'subclause-1',
                                      type: 'subclause',
                                      number: 1,
                                      text: 'Subclause 1',
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
      glossary: {},
    };

    const result = parseBCBC(input);
    const article = result.divisions[0].parts[0].sections[0].subsections[0].articles[0];

    expect(article.clauses).toHaveLength(2); // Main sentence + clause a
    expect(article.clauses[1].subclauses).toHaveLength(1);
    expect(article.clauses[1].subclauses![0].text).toBe('Subclause 1');
  });

  it('should extract glossary terms from text', () => {
    const input = {
      document_type: 'bc_building_code',
      version: '2024',
      metadata: { title: 'Test' },
      divisions: [
        {
          id: 'div-a',
          type: 'division',
          letter: 'A',
          title: 'Division A',
          number: '',
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
                              text: 'This applies to [REF:term:bldng]building and [REF:term:ccpnc]occupancy.',
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
      glossary: {},
    };

    const result = parseBCBC(input);
    const clause = result.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];

    expect(clause.glossaryTerms).toContain('bldng');
    expect(clause.glossaryTerms).toContain('ccpnc');
  });

  it('should parse glossary from object format', () => {
    const input = {
      document_type: 'bc_building_code',
      version: '2024',
      metadata: { title: 'Test' },
      divisions: [],
      glossary: {
        bldng: {
          term: 'Building',
          definition: 'A structure',
          location_id: 'test',
        },
        ccpnc: {
          term: 'Occupancy',
          definition: 'Use of building',
          location_id: 'test',
        },
      },
    };

    const result = parseBCBC(input);

    expect(result.glossary).toHaveLength(2);
    expect(result.glossary[0].term).toBe('Building');
    expect(result.glossary[1].term).toBe('Occupancy');
  });
});

describe('extractContentIds', () => {
  it('should extract all content IDs from document', () => {
    const document: BCBCDocument = {
      metadata: {
        title: 'Test',
        version: '1.0',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
      },
      divisions: [
        {
          id: 'div-1',
          title: 'Division 1',
          type: 'division',
          parts: [
            {
              id: 'part-1',
              number: '1',
              title: 'Part 1',
              type: 'part',
              sections: [
                {
                  id: 'sect-1',
                  number: '1',
                  title: 'Section 1',
                  type: 'section',
                  subsections: [
                    {
                      id: 'subsect-1',
                      number: '1',
                      title: 'Subsection 1',
                      type: 'subsection',
                      articles: [
                        {
                          id: 'art-1',
                          number: '1',
                          title: 'Article 1',
                          type: 'article',
                          clauses: [
                            {
                              id: 'clause-1',
                              number: 'a',
                              text: 'Test',
                              glossaryTerms: [],
                            },
                          ],
                          notes: [],
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
      glossary: [],
      amendmentDates: [],
    };

    const ids = extractContentIds(document);

    expect(ids).toContain('div-1');
    expect(ids).toContain('part-1');
    expect(ids).toContain('sect-1');
    expect(ids).toContain('subsect-1');
    expect(ids).toContain('art-1');
    expect(ids).toContain('clause-1');
  });
});

describe('getGlossaryMap', () => {
  it('should create map from glossary entries', () => {
    const document: BCBCDocument = {
      metadata: {
        title: 'Test',
        version: '1.0',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
      },
      divisions: [],
      glossary: [
        {
          id: 'bldng',
          term: 'Building',
          definition: 'A structure',
        },
      ],
      amendmentDates: [],
    };

    const map = getGlossaryMap(document);

    expect(map.get('bldng')).toBeDefined();
    expect(map.get('building')).toBeDefined(); // lowercase term
    expect(map.get('bldng')?.term).toBe('Building');
  });
});

describe('getAmendmentDates', () => {
  it('should extract and sort unique amendment dates', () => {
    const document: BCBCDocument = {
      metadata: {
        title: 'Test',
        version: '1.0',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
      },
      divisions: [],
      glossary: [],
      amendmentDates: [
        { date: '2024-03-01', description: 'Amendment 1', affectedSections: [] },
        { date: '2024-01-01', description: 'Amendment 2', affectedSections: [] },
        { date: '2024-03-01', description: 'Amendment 3', affectedSections: [] },
      ],
    };

    const dates = getAmendmentDates(document);

    expect(dates).toEqual(['2024-01-01', '2024-03-01']);
  });
});
