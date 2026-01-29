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

      it('should handle multiple references', () => {
        const text = '[REF:term:bldng]building and [REF:term:ccpnc]occupancy';
        const result = stripReferences(text, DEFAULT_REFERENCE_CONFIG);
        
        expect(result).toBe('building and occupancy');
      });

      it('should handle references without display text', () => {
        const text = 'See [REF:internal:nbc.divB.part3:long] for details';
        const result = stripReferences(text, DEFAULT_REFERENCE_CONFIG);
        
        expect(result).toBe('See  for details');
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
