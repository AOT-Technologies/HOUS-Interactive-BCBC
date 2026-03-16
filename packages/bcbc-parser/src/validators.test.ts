import { describe, expect, it } from 'vitest';
import {
  validateBCBC,
  validateCrossReferences,
  validateDataTypes,
  validateRequiredFields,
} from './validators';
import type { BCBCDocument, Clause, Sentence } from './types';

describe('validateRequiredFields', () => {
  it('returns no errors when required fields exist', () => {
    const errors = validateRequiredFields({ id: '1', name: 'test' }, ['id', 'name'], 'test.path');
    expect(errors).toHaveLength(0);
  });

  it('returns errors for missing, null, and undefined fields', () => {
    const errors = validateRequiredFields(
      { id: '1', missing: undefined, empty: null },
      ['id', 'missing', 'empty', 'name'],
      'test.path'
    );

    expect(errors).toHaveLength(3);
    expect(errors.map((error) => error.field)).toEqual(['missing', 'empty', 'name']);
  });
});

describe('validateDataTypes', () => {
  it('returns no errors when data types match', () => {
    const errors = validateDataTypes(
      { id: '1', count: 42, enabled: true },
      { id: 'string', count: 'number', enabled: 'boolean' },
      'test.path'
    );

    expect(errors).toHaveLength(0);
  });

  it('returns errors for type mismatches', () => {
    const errors = validateDataTypes(
      { id: 1, count: '42' },
      { id: 'string', count: 'number' },
      'test.path'
    );

    expect(errors).toHaveLength(2);
    expect(errors[0].message).toContain('expected string');
    expect(errors[1].message).toContain('expected number');
  });
});

function createSentence(): Sentence {
  return {
    id: 'nbc.divA.part1.sect1.subsect1.art1.sent1',
    number: '1',
    type: 'sentence',
    text: 'Sentence with [REF:term:term1]term.',
    glossaryTerms: ['term1'],
    content: [
      {
        id: 'nbc.divA.part1.sect1.subsect1.art1.sent1.clausea',
        number: 'a',
        type: 'clause',
        text: 'Clause text.',
        glossaryTerms: [],
      },
    ],
  };
}

function createValidDocument(): BCBCDocument {
  return {
    metadata: {
      title: 'BC Building Code',
      version: '2024',
      effectiveDate: '2024-01-01',
      jurisdiction: 'British Columbia',
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
            id: 'nbc.divA',
            letter: 'A',
            title: 'Division A',
            number: '1',
            type: 'division',
            parts: [
              {
                id: 'nbc.divA.part1',
                number: '1',
                title: 'Part 1',
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
                            content: [createSentence()],
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
    glossary: [
      {
        id: 'term1',
        term: 'Test Term',
        definition: 'Test definition',
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

function getFirstSentence(document: BCBCDocument): Sentence {
  const sentence = document.volumes[0].divisions[0].parts[0].sections[0].subsections[0].articles[0]
    .content[0];
  if (sentence.type !== 'sentence') {
    throw new Error('Expected first content node to be a sentence');
  }
  return sentence;
}

function getFirstClause(document: BCBCDocument): Clause {
  const clause = getFirstSentence(document).content?.[0];
  if (!clause || clause.type !== 'clause') {
    throw new Error('Expected first sentence content node to be a clause');
  }
  return clause;
}

describe('validateBCBC', () => {
  it('returns no errors for a valid volume-based document', () => {
    expect(validateBCBC(createValidDocument())).toHaveLength(0);
  });

  it('reports missing metadata', () => {
    const document = createValidDocument();
    // @ts-expect-error testing invalid state
    document.metadata = undefined;

    expect(validateBCBC(document).some((error) => error.field === 'metadata')).toBe(true);
  });

  it('reports missing or invalid volumes', () => {
    const missing = createValidDocument();
    // @ts-expect-error testing invalid state
    missing.volumes = undefined;

    expect(validateBCBC(missing).some((error) => error.field === 'volumes')).toBe(true);

    const invalid = createValidDocument();
    // @ts-expect-error testing invalid state
    invalid.volumes = 'not an array';

    expect(
      validateBCBC(invalid).some(
        (error) => error.field === 'volumes' && error.message.includes('must be an array')
      )
    ).toBe(true);
  });

  it('warns when the volumes array is empty', () => {
    const document = createValidDocument();
    document.volumes = [];

    expect(
      validateBCBC(document).some(
        (error) => error.field === 'volumes' && error.severity === 'warning'
      )
    ).toBe(true);
  });

  it('validates metadata fields and types', () => {
    const missingTitle = createValidDocument();
    // @ts-expect-error testing invalid state
    missingTitle.metadata.title = undefined;

    expect(
      validateBCBC(missingTitle).some(
        (error) => error.field === 'title' && error.path === 'metadata'
      )
    ).toBe(true);

    const invalidVersion = createValidDocument();
    // @ts-expect-error testing invalid state
    invalidVersion.metadata.version = 123;

    expect(
      validateBCBC(invalidVersion).some(
        (error) => error.field === 'version' && error.message.includes('expected string')
      )
    ).toBe(true);
  });

  it('validates the nested hierarchy inside volumes', () => {
    const missingDivisionId = createValidDocument();
    // @ts-expect-error testing invalid state
    missingDivisionId.volumes[0].divisions[0].id = undefined;
    expect(
      validateBCBC(missingDivisionId).some(
        (error) => error.field === 'id' && error.path === 'volumes[0].divisions[0]'
      )
    ).toBe(true);

    const invalidDivisionType = createValidDocument();
    // @ts-expect-error testing invalid state
    invalidDivisionType.volumes[0].divisions[0].type = 'invalid';
    expect(
      validateBCBC(invalidDivisionType).some(
        (error) => error.field === 'type' && error.message.includes("expected 'division'")
      )
    ).toBe(true);

    const missingPartNumber = createValidDocument();
    // @ts-expect-error testing invalid state
    missingPartNumber.volumes[0].divisions[0].parts[0].number = undefined;
    expect(
      validateBCBC(missingPartNumber).some(
        (error) => error.field === 'number' && error.path.includes('parts[0]')
      )
    ).toBe(true);

    const invalidSectionType = createValidDocument();
    // @ts-expect-error testing invalid state
    invalidSectionType.volumes[0].divisions[0].parts[0].sections[0].type = 'invalid';
    expect(
      validateBCBC(invalidSectionType).some(
        (error) => error.field === 'type' && error.message.includes("expected 'section'")
      )
    ).toBe(true);

    const missingSubsectionId = createValidDocument();
    // @ts-expect-error testing invalid state
    missingSubsectionId.volumes[0].divisions[0].parts[0].sections[0].subsections[0].id =
      undefined;
    expect(
      validateBCBC(missingSubsectionId).some(
        (error) => error.field === 'id' && error.path.includes('subsections[0]')
      )
    ).toBe(true);
  });

  it('validates article content instead of legacy clauses or notes fields', () => {
    const missingContent = createValidDocument();
    // @ts-expect-error testing invalid state
    missingContent.volumes[0].divisions[0].parts[0].sections[0].subsections[0].articles[0].content =
      undefined;

    expect(
      validateBCBC(missingContent).some(
        (error) => error.field === 'content' && error.path.includes('articles[0]')
      )
    ).toBe(true);

    const invalidArticleType = createValidDocument();
    // @ts-expect-error testing invalid state
    invalidArticleType.volumes[0].divisions[0].parts[0].sections[0].subsections[0].articles[0].type =
      'invalid';

    expect(
      validateBCBC(invalidArticleType).some(
        (error) => error.field === 'type' && error.message.includes("expected 'article'")
      )
    ).toBe(true);
  });

  it('validates sentence, clause, and subclause content structures', () => {
    const missingSentenceText = createValidDocument();
    // @ts-expect-error testing invalid state
    getFirstSentence(missingSentenceText).text = undefined;
    expect(
      validateBCBC(missingSentenceText).some(
        (error) => error.field === 'text' && error.path.includes('content[0]')
      )
    ).toBe(true);

    const missingClauseText = createValidDocument();
    // @ts-expect-error testing invalid state
    getFirstClause(missingClauseText).text = undefined;
    expect(
      validateBCBC(missingClauseText).some(
        (error) => error.field === 'text' && error.path.includes('content[0].content[0]')
      )
    ).toBe(true);

    const invalidSubclause = createValidDocument();
    getFirstClause(invalidSubclause).content = [
      {
        id: 'subclause1',
        number: '1',
        type: 'subclause',
        // @ts-expect-error testing invalid state
        text: undefined,
        glossaryTerms: [],
      },
    ];
    expect(
      validateBCBC(invalidSubclause).some(
        (error) => error.field === 'text' && error.path.includes('content[0].content[0].content[0]')
      )
    ).toBe(true);
  });

  it('validates glossary entries and amendment dates', () => {
    const invalidGlossary = createValidDocument();
    // @ts-expect-error testing invalid state
    invalidGlossary.glossary = [{ id: 'term1' }];
    expect(
      validateBCBC(invalidGlossary).some(
        (error) => error.field === 'term' || error.field === 'definition'
      )
    ).toBe(true);

    const invalidAmendment = createValidDocument();
    // @ts-expect-error testing invalid state
    invalidAmendment.amendmentDates = [{ date: '2024-01-01' }];
    expect(
      validateBCBC(invalidAmendment).some((error) => error.field === 'description')
    ).toBe(true);
  });
});

describe('validateCrossReferences', () => {
  it('returns no errors when glossary references are valid', () => {
    expect(validateCrossReferences(createValidDocument())).toHaveLength(0);
  });

  it('reports invalid glossary references in clauses', () => {
    const document = createValidDocument();
    getFirstClause(document).glossaryTerms = ['invalid_term'];

    const errors = validateCrossReferences(document);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('invalid_term');
  });

  it('reports invalid glossary references in nested subclauses', () => {
    const document = createValidDocument();
    getFirstClause(document).content = [
      {
        id: 'subclause1',
        number: '1',
        type: 'subclause',
        text: 'Nested content.',
        glossaryTerms: ['invalid_term'],
      },
    ];

    const errors = validateCrossReferences(document);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('invalid_term');
  });

  it('handles multiple invalid references', () => {
    const document = createValidDocument();
    getFirstClause(document).glossaryTerms = ['invalid1', 'invalid2', 'term1'];

    const errors = validateCrossReferences(document);
    expect(errors).toHaveLength(2);
  });

  it('handles documents without glossary entries', () => {
    const document = createValidDocument();
    document.glossary = [];
    getFirstSentence(document).glossaryTerms = [];
    getFirstClause(document).glossaryTerms = [];

    expect(validateCrossReferences(document)).toHaveLength(0);
  });
});
