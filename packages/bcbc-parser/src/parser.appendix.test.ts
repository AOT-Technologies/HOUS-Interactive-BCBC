import { describe, expect, it } from 'vitest';
import { parseBCBC } from './parser';

describe('parseBCBC division appendices', () => {
  it('preserves division-level appendices nested directly under a division', () => {
    const result = parseBCBC({
      document_type: 'bc_building_code',
      version: '2024',
      metadata: {
        title: 'BC Building Code',
        publication_date: '2024-01-01',
        volumes: [{ volume: '1', title: 'Volume 1' }],
      },
      volumes: [
        {
          id: 'v1',
          type: 'volume',
          number: 1,
          title: 'Volume 1',
          divisions: [
            {
              id: 'nbc.divB',
              type: 'division',
              letter: 'B',
              title: 'Division B',
              number: '2',
              parts: [],
              appendices: [
                {
                  id: 'nbc.divB.appendixD',
                  type: 'appendix',
                  letter: 'D',
                  number: '4',
                  title: 'Fire-Performance Ratings',
                  introduction: 'Informative appendix.',
                  sections: [
                    {
                      id: 'nbc.divB.appendixD.appsect1',
                      type: 'appendix_section',
                      title: 'D.1. General',
                      paragraphs: [
                        {
                          id: 'nbc.divB.appendixD.appsect1.para1',
                          content: 'Example paragraph.',
                        },
                      ],
                      subsections: [
                        {
                          id: 'nbc.divB.appendixD.appsect1.subsect1',
                          type: 'appendix_subsection',
                          title: 'D.1.1.',
                          articles: [
                            {
                              id: 'nbc.divB.appendixD.appsect1.subsect1.article2',
                              type: 'appendix_article',
                              title: 'D.1.1.2.',
                              paragraphs: [],
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
      ],
      glossary: {},
    });

    const division = result.volumes[0].divisions[0];
    expect(division.appendices).toHaveLength(1);
    expect(division.appendices?.[0].id).toBe('nbc.divB.appendixD');
    expect(division.appendices?.[0].sections[0].id).toBe('nbc.divB.appendixD.appsect1');
    expect(division.appendices?.[0].sections[0].subsections?.[0].articles[0].id).toBe(
      'nbc.divB.appendixD.appsect1.subsect1.article2'
    );
  });
});
