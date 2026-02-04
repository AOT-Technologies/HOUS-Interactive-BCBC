/**
 * Tests for metadata extraction functionality
 */

import { describe, it, expect } from 'vitest';
import {
  extractMetadata,
  extractNavigationTree,
  extractGlossaryMap,
  extractContentTypes,
  extractQuickAccess,
} from './metadata-extractor';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';

describe('extractNavigationTree', () => {
  it('should extract complete navigation hierarchy', () => {
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
                  subsections: [
                    {
                      id: 'subsection-1-1-1',
                      number: '1.1.1',
                      title: 'Subsection 1.1.1',
                      type: 'subsection',
                      articles: [
                        {
                          id: 'article-1-1-1-1',
                          number: '1.1.1.1',
                          title: 'Article 1.1.1.1',
                          type: 'article',
                          clauses: [],
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

    const tree = extractNavigationTree(mockDocument);

    expect(tree).toHaveLength(1);
    expect(tree[0].type).toBe('division');
    expect(tree[0].title).toBe('Division A');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].type).toBe('part');
    expect(tree[0].children![0].children).toHaveLength(1);
    expect(tree[0].children![0].children![0].type).toBe('section');
    expect(tree[0].children![0].children![0].children).toHaveLength(1);
    expect(tree[0].children![0].children![0].children![0].type).toBe('subsection');
    expect(tree[0].children![0].children![0].children![0].children).toHaveLength(1);
    expect(tree[0].children![0].children![0].children![0].children![0].type).toBe('article');
  });

  it('should generate correct paths', () => {
    const mockDocument: BCBCDocument = {
      metadata: {
        title: 'Test BCBC',
        version: '2024',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
      },
      divisions: [
        {
          id: 'division-b',
          title: 'Division B',
          type: 'division',
          parts: [
            {
              id: 'part-3',
              number: '3',
              title: 'Part 3',
              type: 'part',
              sections: [
                {
                  id: 'section-3-2',
                  number: '3.2',
                  title: 'Section 3.2',
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

    const tree = extractNavigationTree(mockDocument);

    expect(tree[0].path).toBe('/code/division-b');
    expect(tree[0].children![0].path).toBe('/code/division-b/3');
    expect(tree[0].children![0].children![0].path).toBe('/code/division-b/3/3.2');
  });
});

describe('extractGlossaryMap', () => {
  it('should create map with lowercase keys', () => {
    const mockDocument: BCBCDocument = {
      metadata: {
        title: 'Test BCBC',
        version: '2024',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
      },
      divisions: [],
      glossary: [
        {
          id: 'term-1',
          term: 'Building',
          definition: 'A structure for shelter',
          relatedTerms: [],
        },
        {
          id: 'term-2',
          term: 'Occupancy',
          definition: 'The use of a building',
          relatedTerms: [],
        },
      ],
      amendmentDates: [],
    };

    const glossaryMap = extractGlossaryMap(mockDocument);

    expect(glossaryMap['building']).toBeDefined();
    expect(glossaryMap['building'].term).toBe('Building');
    expect(glossaryMap['occupancy']).toBeDefined();
    expect(glossaryMap['occupancy'].term).toBe('Occupancy');
  });
});

describe('extractContentTypes', () => {
  it('should always include article type', () => {
    const mockDocument: BCBCDocument = {
      metadata: {
        title: 'Test BCBC',
        version: '2024',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
      },
      divisions: [],
      glossary: [],
      amendmentDates: [],
    };

    const contentTypes = extractContentTypes(mockDocument);

    expect(contentTypes).toContain('article');
  });

  it('should detect tables in clauses', () => {
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
                  subsections: [
                    {
                      id: 'subsection-1-1-1',
                      number: '1.1.1',
                      title: 'Subsection 1.1.1',
                      type: 'subsection',
                      articles: [
                        {
                          id: 'article-1',
                          number: '1.1.1.1',
                          title: 'Article 1',
                          type: 'article',
                          clauses: [
                            {
                              id: 'clause-1',
                              number: '1',
                              text: 'Test clause',
                              glossaryTerms: [],
                              tables: [
                                {
                                  id: 'table-1',
                                  number: '1',
                                  title: 'Test Table',
                                  headers: [['Header']],
                                  rows: [],
                                },
                              ],
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

    const contentTypes = extractContentTypes(mockDocument);

    expect(contentTypes).toContain('table');
  });

  it('should detect figures in clauses', () => {
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
                  subsections: [
                    {
                      id: 'subsection-1-1-1',
                      number: '1.1.1',
                      title: 'Subsection 1.1.1',
                      type: 'subsection',
                      articles: [
                        {
                          id: 'article-1',
                          number: '1.1.1.1',
                          title: 'Article 1',
                          type: 'article',
                          clauses: [
                            {
                              id: 'clause-1',
                              number: '1',
                              text: 'Test clause',
                              glossaryTerms: [],
                              figures: [
                                {
                                  id: 'figure-1',
                                  number: '1',
                                  title: 'Test Figure',
                                  imageUrl: '/images/test.png',
                                  altText: 'Test',
                                },
                              ],
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

    const contentTypes = extractContentTypes(mockDocument);

    expect(contentTypes).toContain('figure');
  });

  it('should detect notes', () => {
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
                  subsections: [
                    {
                      id: 'subsection-1-1-1',
                      number: '1.1.1',
                      title: 'Subsection 1.1.1',
                      type: 'subsection',
                      articles: [
                        {
                          id: 'article-1',
                          number: '1.1.1.1',
                          title: 'Article 1',
                          type: 'article',
                          clauses: [],
                          notes: [
                            {
                              id: 'note-1',
                              noteNumber: 'A-1',
                              noteTitle: 'Test Note',
                              noteContent: 'Test content',
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
      glossary: [],
      amendmentDates: [],
    };

    const contentTypes = extractContentTypes(mockDocument);

    expect(contentTypes).toContain('note');
  });
});

describe('extractQuickAccess', () => {
  it('should extract first section from each part', () => {
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
            {
              id: 'part-2',
              number: '2',
              title: 'Part 2',
              type: 'part',
              sections: [
                {
                  id: 'section-2-1',
                  number: '2.1',
                  title: 'Section 2.1',
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

    const quickAccess = extractQuickAccess(mockDocument);

    expect(quickAccess).toHaveLength(2);
    expect(quickAccess[0].id).toBe('section-1-1');
    expect(quickAccess[1].id).toBe('section-2-1');
  });

  it('should generate correct paths and descriptions', () => {
    const mockDocument: BCBCDocument = {
      metadata: {
        title: 'Test BCBC',
        version: '2024',
        effectiveDate: '2024-01-01',
        jurisdiction: 'BC',
      },
      divisions: [
        {
          id: 'division-b',
          title: 'Division B',
          type: 'division',
          parts: [
            {
              id: 'part-3',
              number: '3',
              title: 'Fire Protection',
              type: 'part',
              sections: [
                {
                  id: 'section-3-1',
                  number: '3.1',
                  title: 'General',
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

    const quickAccess = extractQuickAccess(mockDocument);

    expect(quickAccess[0].path).toBe('/code/division-b/3/3.1');
    expect(quickAccess[0].title).toBe('Fire Protection - General');
    expect(quickAccess[0].description).toBe('Division B, Part 3, Section 3.1');
  });
});

describe('extractMetadata', () => {
  it('should extract all metadata types', () => {
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
      glossary: [
        {
          id: 'term-1',
          term: 'Building',
          definition: 'A structure',
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

    const metadata = extractMetadata(mockDocument);

    expect(metadata.navigationTree).toBeDefined();
    expect(metadata.glossaryMap).toBeDefined();
    expect(metadata.amendmentDates).toBeDefined();
    expect(metadata.contentTypes).toBeDefined();
    expect(metadata.quickAccess).toBeDefined();
    expect(metadata.navigationTree.length).toBeGreaterThan(0);
    expect(Object.keys(metadata.glossaryMap).length).toBeGreaterThan(0);
    expect(metadata.contentTypes).toContain('article');
  });
});
