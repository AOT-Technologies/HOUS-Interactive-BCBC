import { describe, expect, it } from 'vitest';
import { resolvePartAppendixForEffectiveDate, resolveSectionForEffectiveDate } from './revision-resolver';

describe('resolveSectionForEffectiveDate', () => {
  it('selects the latest valid revision at subsection/article/sentence levels', () => {
    const section = {
      id: 'sec-1',
      type: 'section',
      number: 1,
      title: 'Section',
      subsections: [
        {
          id: 'sub-1',
          type: 'subsection',
          number: 1,
          title: 'Current Subsection',
          revised: true,
          articles: [
            {
              id: 'art-1',
              type: 'article',
              number: 1,
              title: 'Current Article',
              content: [
                {
                  id: 'sent-1',
                  type: 'sentence',
                  number: 1,
                  text: 'Current sentence',
                },
              ],
            },
          ],
          revisions: [
            {
              type: 'original',
              effective_date: '2020-12-01',
              title: 'Original Subsection',
              articles: [
                {
                  id: 'art-1',
                  type: 'article',
                  number: 1,
                  title: 'Original Article',
                  content: [
                    {
                      id: 'sent-1',
                      type: 'sentence',
                      number: 1,
                      text: 'Original sentence',
                    },
                  ],
                },
              ],
            },
            {
              type: 'revision',
              effective_date: '2025-06-16',
              title: 'Revised Subsection',
              articles: [
                {
                  id: 'art-1',
                  type: 'article',
                  number: 1,
                  title: 'Revised Article',
                  content: [
                    {
                      id: 'sent-1',
                      type: 'sentence',
                      number: 1,
                      text: 'Revised sentence',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as any;

    const onOriginalDate = resolveSectionForEffectiveDate(section, '2020-12-01');
    expect(onOriginalDate.subsections[0].title).toBe('Original Subsection');
    expect(onOriginalDate.subsections[0].articles[0].title).toBe('Original Article');
    expect(onOriginalDate.subsections[0].articles[0].content[0].text).toBe('Original sentence');

    const onRevisedDate = resolveSectionForEffectiveDate(section, '2025-06-16');
    expect(onRevisedDate.subsections[0].title).toBe('Revised Subsection');
    expect(onRevisedDate.subsections[0].articles[0].title).toBe('Revised Article');
    expect(onRevisedDate.subsections[0].articles[0].content[0].text).toBe('Revised sentence');
  });

  it('normalizes sentence clauses and clause letter numbering from raw source shape', () => {
    const section = {
      id: 'sec-1',
      type: 'section',
      number: 1,
      title: 'Section',
      subsections: [
        {
          id: 'sub-1',
          type: 'subsection',
          number: 1,
          title: 'Subsection',
          articles: [
            {
              id: 'art-1',
              type: 'article',
              number: 1,
              title: 'Article',
              content: [
                {
                  id: 'sent-1',
                  type: 'sentence',
                  number: 1,
                  text: 'Sentence',
                  clauses: [
                    {
                      id: 'clause-1',
                      type: 'clause',
                      letter: 'a',
                      text: 'Clause text',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as any;

    const resolved = resolveSectionForEffectiveDate(section, '2025-06-16');
    const sentence = resolved.subsections[0].articles[0].content[0];
    const clause = sentence.content[0];

    expect(Array.isArray(sentence.content)).toBe(true);
    expect(clause.number).toBe('a');
  });

  it('preserves content node type when revision.type exists (table should stay table)', () => {
    const section = {
      id: 'sec-1',
      type: 'section',
      number: 1,
      title: 'Section',
      subsections: [
        {
          id: 'sub-1',
          type: 'subsection',
          number: 1,
          title: 'Subsection',
          articles: [
            {
              id: 'art-1',
              type: 'article',
              number: 1,
              title: 'Article',
              content: [
                {
                  id: 'tbl-1',
                  type: 'table',
                  title: '',
                  revised: true,
                  structure: { body_rows: [] },
                  revisions: [
                    {
                      type: 'original',
                      effective_date: '2020-12-01',
                      title: 'Old Table',
                      structure: { body_rows: [{ id: 'r1', type: 'body_row', cells: [] }] },
                    },
                    {
                      type: 'revision',
                      effective_date: '2025-06-16',
                      title: 'New Table',
                      structure: { body_rows: [{ id: 'r2', type: 'body_row', cells: [] }] },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as any;

    const resolved = resolveSectionForEffectiveDate(section, '2025-06-16');
    const table = resolved.subsections[0].articles[0].content[0];

    expect(table.type).toBe('table');
    expect(table.title).toBe('New Table');
  });

  it('resolves application note revisions for appendix content by effective date', () => {
    const appendix = {
      id: 'nbc.divB.part3.appendix',
      type: 'part_appendix',
      introduction: 'Appendix intro',
      application_notes: [
        {
          id: 'nbc.divB.part3.appendix.appnote21',
          type: 'application_note',
          number: '3.1.6.4.(1)',
          title: 'Encapsulation of Mass Timber Elements',
          paragraphs: [
            {
              id: 'nbc.divB.part3.appendix.appnote21.para1',
              type: 'paragraph',
              content: 'Current content',
            },
          ],
          revisions: [
            {
              type: 'original',
              effective_date: '2020-12-01',
              number: '3.1.6.4.(1)',
              title: 'Encapsulation of Mass Timber Elements',
              paragraphs: [
                {
                  id: 'nbc.divB.part3.appendix.appnote21.para1',
                  type: 'paragraph',
                  content: 'Original content',
                },
              ],
            },
            {
              type: 'revision',
              effective_date: '2024-04-05',
              number: '3.1.6.4.(1)',
              title: 'Encapsulation of Mass Timber Elements',
              paragraphs: [
                {
                  id: 'nbc.divB.part3.appendix.appnote21.para1',
                  type: 'paragraph',
                  content: 'Revised content',
                },
              ],
            },
          ],
        },
      ],
    } as any;

    const onOriginalDate = resolvePartAppendixForEffectiveDate(appendix, '2021-01-01');
    expect(onOriginalDate.application_notes[0].paragraphs[0].content).toBe('Original content');

    const onRevisedDate = resolvePartAppendixForEffectiveDate(appendix, '2025-06-16');
    expect(onRevisedDate.application_notes[0].paragraphs[0].content).toBe('Revised content');
  });
});
