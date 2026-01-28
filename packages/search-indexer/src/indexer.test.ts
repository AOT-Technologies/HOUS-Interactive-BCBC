/**
 * Tests for search indexer
 */

import { describe, it, expect } from 'vitest';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';
import {
  createSearchIndex,
  extractSearchableContent,
  generateBreadcrumb,
  generatePath,
} from './indexer';

describe('search-indexer', () => {
  describe('generateBreadcrumb', () => {
    it('should generate breadcrumb without subsection', () => {
      const breadcrumb = generateBreadcrumb('Division A', 'Part 1', 'Section 1.1');
      expect(breadcrumb).toEqual(['Division A', 'Part 1', 'Section 1.1']);
    });

    it('should generate breadcrumb with subsection', () => {
      const breadcrumb = generateBreadcrumb(
        'Division A',
        'Part 1',
        'Section 1.1',
        'Subsection 1.1.1'
      );
      expect(breadcrumb).toEqual([
        'Division A',
        'Part 1',
        'Section 1.1',
        'Subsection 1.1.1',
      ]);
    });
  });

  describe('generatePath', () => {
    it('should generate path for section', () => {
      const path = generatePath('division-a', '1', '1.1');
      expect(path).toBe('/code/division-a/1/1.1');
    });

    it('should generate path for subsection', () => {
      const path = generatePath('division-a', '1', '1.1', '1.1.1');
      expect(path).toBe('/code/division-a/1/1.1/1.1.1');
    });

    it('should generate path for article', () => {
      const path = generatePath('division-a', '1', '1.1', '1.1.1', '1.1.1.1');
      expect(path).toBe('/code/division-a/1/1.1/1.1.1/1.1.1.1');
    });
  });

  describe('extractSearchableContent', () => {
    it('should extract searchable content from BCBC document', () => {
      const mockDocument: BCBCDocument = {
        metadata: {
          title: 'BC Building Code 2024',
          version: '2024',
          effectiveDate: '2024-01-01',
          jurisdiction: 'British Columbia',
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
                            clauses: [
                              {
                                id: 'clause-1',
                                number: '1',
                                text: 'This is a test clause.',
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
        glossary: [
          {
            id: 'glossary-1',
            term: 'Test Term',
            definition: 'This is a test definition.',
          },
        ],
        amendmentDates: [],
      };

      const items = extractSearchableContent(mockDocument);

      // Should have section, article, and glossary entry
      expect(items.length).toBeGreaterThanOrEqual(3);

      // Check section
      const section = items.find((item) => item.type === 'section');
      expect(section).toBeDefined();
      expect(section?.number).toBe('1.1');
      expect(section?.title).toBe('Section 1.1');

      // Check article
      const article = items.find((item) => item.type === 'article');
      expect(article).toBeDefined();
      expect(article?.number).toBe('1.1.1.1');
      expect(article?.title).toBe('Article 1.1.1.1');
      expect(article?.snippet).toContain('This is a test clause');

      // Check glossary
      const glossary = items.find((item) => item.type === 'glossary');
      expect(glossary).toBeDefined();
      expect(glossary?.title).toBe('Test Term');
      expect(glossary?.snippet).toContain('This is a test definition');
    });
  });

  describe('createSearchIndex', () => {
    it('should create a FlexSearch index from BCBC document', () => {
      const mockDocument: BCBCDocument = {
        metadata: {
          title: 'BC Building Code 2024',
          version: '2024',
          effectiveDate: '2024-01-01',
          jurisdiction: 'British Columbia',
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
                    title: 'General',
                    type: 'section',
                    subsections: [
                      {
                        id: 'subsection-1-1-1',
                        number: '1.1.1',
                        title: 'Application',
                        type: 'subsection',
                        articles: [
                          {
                            id: 'article-1-1-1-1',
                            number: '1.1.1.1',
                            title: 'Scope',
                            type: 'article',
                            clauses: [
                              {
                                id: 'clause-1',
                                number: '1',
                                text: 'This code applies to all buildings.',
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

      const index = createSearchIndex(mockDocument);

      // Verify index was created
      expect(index).toBeDefined();
      expect(typeof index.add).toBe('function');
      expect(typeof index.search).toBe('function');
    });
  });
});
