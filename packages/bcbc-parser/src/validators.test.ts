/**
 * Unit tests for BCBC JSON validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateBCBC,
  validateCrossReferences,
  validateRequiredFields,
  validateDataTypes,
} from './validators';
import type {
  BCBCDocument,
  Division,
  Part,
  Section,
  Subsection,
  Article,
  Clause,
  GlossaryEntry,
  AmendmentDate,
} from './types';

describe('validateRequiredFields', () => {
  it('should return no errors when all required fields are present', () => {
    const obj = { id: '1', name: 'test', value: 42 };
    const errors = validateRequiredFields(obj, ['id', 'name'], 'test.path');
    expect(errors).toHaveLength(0);
  });

  it('should return error when required field is missing', () => {
    const obj = { id: '1' };
    const errors = validateRequiredFields(obj, ['id', 'name'], 'test.path');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      path: 'test.path',
      field: 'name',
      message: 'Missing required field: name',
      severity: 'error',
    });
  });

  it('should return error when required field is null', () => {
    const obj = { id: '1', name: null };
    const errors = validateRequiredFields(obj, ['id', 'name'], 'test.path');
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('name');
  });

  it('should return error when required field is undefined', () => {
    const obj = { id: '1', name: undefined };
    const errors = validateRequiredFields(obj, ['id', 'name'], 'test.path');
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('name');
  });

  it('should return multiple errors for multiple missing fields', () => {
    const obj = { id: '1' };
    const errors = validateRequiredFields(obj, ['id', 'name', 'value'], 'test.path');
    expect(errors).toHaveLength(2);
    expect(errors.map(e => e.field)).toEqual(['name', 'value']);
  });
});

describe('validateDataTypes', () => {
  it('should return no errors when data types match', () => {
    const obj = { id: '1', name: 'test', count: 42 };
    const schema = { id: 'string', name: 'string', count: 'number' };
    const errors = validateDataTypes(obj, schema, 'test.path');
    expect(errors).toHaveLength(0);
  });

  it('should return error when data type does not match', () => {
    const obj = { id: 1, name: 'test' };
    const schema = { id: 'string', name: 'string' };
    const errors = validateDataTypes(obj, schema, 'test.path');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      path: 'test.path',
      field: 'id',
      message: 'Invalid type for field id: expected string, got number',
      severity: 'error',
    });
  });

  it('should skip validation for fields not in object', () => {
    const obj = { id: '1' };
    const schema = { id: 'string', name: 'string' };
    const errors = validateDataTypes(obj, schema, 'test.path');
    expect(errors).toHaveLength(0);
  });

  it('should skip validation for null fields', () => {
    const obj = { id: '1', name: null };
    const schema = { id: 'string', name: 'string' };
    const errors = validateDataTypes(obj, schema, 'test.path');
    expect(errors).toHaveLength(0);
  });

  it('should return multiple errors for multiple type mismatches', () => {
    const obj = { id: 1, name: 42, value: true };
    const schema = { id: 'string', name: 'string', value: 'string' };
    const errors = validateDataTypes(obj, schema, 'test.path');
    expect(errors).toHaveLength(3);
  });
});

describe('validateBCBC', () => {
  const createValidDocument = (): BCBCDocument => ({
    metadata: {
      title: 'BC Building Code',
      version: '2024',
      effectiveDate: '2024-01-01',
      jurisdiction: 'British Columbia',
    },
    divisions: [
      {
        id: 'nbc.divA',
        title: 'Division A',
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
                        clauses: [
                          {
                            id: 'nbc.divA.part1.sect1.subsect1.art1.sent1',
                            number: '1',
                            text: 'Test clause',
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
  });

  it('should return no errors for valid document', () => {
    const document = createValidDocument();
    const errors = validateBCBC(document);
    expect(errors).toHaveLength(0);
  });

  it('should return error when metadata is missing', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.metadata = undefined;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'metadata')).toBe(true);
  });

  it('should return error when divisions is missing', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions = undefined;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'divisions')).toBe(true);
  });

  it('should return error when divisions is not an array', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions = 'not an array';
    const errors = validateBCBC(document);
    expect(errors.some(e => e.message.includes('must be an array'))).toBe(true);
  });

  it('should return warning when divisions array is empty', () => {
    const document = createValidDocument();
    document.divisions = [];
    const errors = validateBCBC(document);
    expect(errors.some(e => e.severity === 'warning' && e.message.includes('at least one division'))).toBe(true);
  });

  it('should validate metadata required fields', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.metadata.title = undefined;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'title' && e.path === 'metadata')).toBe(true);
  });

  it('should validate metadata data types', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.metadata.version = 123;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'version' && e.message.includes('expected string'))).toBe(true);
  });

  it('should validate division structure', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions[0].id = undefined;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'id' && e.path === 'divisions[0]')).toBe(true);
  });

  it('should validate division type field value', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions[0].type = 'invalid';
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'type' && e.message.includes("expected 'division'"))).toBe(true);
  });

  it('should validate part structure', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions[0].parts[0].number = undefined;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'number' && e.path.includes('parts[0]'))).toBe(true);
  });

  it('should validate part type field value', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions[0].parts[0].type = 'invalid';
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'type' && e.message.includes("expected 'part'"))).toBe(true);
  });

  it('should validate section structure', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions[0].parts[0].sections[0].title = undefined;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'title' && e.path.includes('sections[0]'))).toBe(true);
  });

  it('should validate section type field value', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions[0].parts[0].sections[0].type = 'invalid';
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'type' && e.message.includes("expected 'section'"))).toBe(true);
  });

  it('should validate subsection structure', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions[0].parts[0].sections[0].subsections[0].id = undefined;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'id' && e.path.includes('subsections[0]'))).toBe(true);
  });

  it('should validate subsection type field value', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.divisions[0].parts[0].sections[0].subsections[0].type = 'invalid';
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'type' && e.message.includes("expected 'subsection'"))).toBe(true);
  });

  it('should validate article structure', () => {
    const document = createValidDocument();
    const article = document.divisions[0].parts[0].sections[0].subsections[0].articles[0];
    // @ts-expect-error - Testing invalid state
    article.clauses = undefined;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'clauses' && e.path.includes('articles[0]'))).toBe(true);
  });

  it('should validate article type field value', () => {
    const document = createValidDocument();
    const article = document.divisions[0].parts[0].sections[0].subsections[0].articles[0];
    // @ts-expect-error - Testing invalid state
    article.type = 'invalid';
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'type' && e.message.includes("expected 'article'"))).toBe(true);
  });

  it('should validate clause structure', () => {
    const document = createValidDocument();
    const clause = document.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];
    // @ts-expect-error - Testing invalid state
    clause.text = undefined;
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'text' && e.path.includes('clauses[0]'))).toBe(true);
  });

  it('should validate glossary entries', () => {
    const document = createValidDocument();
    document.glossary = [
      {
        id: 'term1',
        term: 'Test Term',
        definition: 'Test definition',
      },
    ];
    const errors = validateBCBC(document);
    expect(errors).toHaveLength(0);
  });

  it('should return error for invalid glossary entry', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.glossary = [{ id: 'term1' }];
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'term' || e.field === 'definition')).toBe(true);
  });

  it('should validate amendment dates', () => {
    const document = createValidDocument();
    document.amendmentDates = [
      {
        date: '2024-01-01',
        description: 'Initial release',
        affectedSections: [],
      },
    ];
    const errors = validateBCBC(document);
    expect(errors).toHaveLength(0);
  });

  it('should return error for invalid amendment date', () => {
    const document = createValidDocument();
    // @ts-expect-error - Testing invalid state
    document.amendmentDates = [{ date: '2024-01-01' }];
    const errors = validateBCBC(document);
    expect(errors.some(e => e.field === 'description')).toBe(true);
  });

  it('should validate nested clause structures', () => {
    const document = createValidDocument();
    const clause = document.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];
    clause.subclauses = [
      {
        id: 'subclause1',
        number: 'a',
        text: 'Subclause text',
        glossaryTerms: [],
      },
    ];
    const errors = validateBCBC(document);
    expect(errors).toHaveLength(0);
  });

  it('should validate tables in clauses', () => {
    const document = createValidDocument();
    const clause = document.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];
    clause.tables = [
      {
        id: 'table1',
        number: '1',
        title: 'Test Table',
        headers: [],
        rows: [],
      },
    ];
    const errors = validateBCBC(document);
    expect(errors).toHaveLength(0);
  });

  it('should validate figures in clauses', () => {
    const document = createValidDocument();
    const clause = document.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];
    clause.figures = [
      {
        id: 'figure1',
        number: '1',
        title: 'Test Figure',
        imageUrl: 'test.png',
        altText: 'Test alt text',
      },
    ];
    const errors = validateBCBC(document);
    expect(errors).toHaveLength(0);
  });

  it('should validate equations in clauses', () => {
    const document = createValidDocument();
    const clause = document.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];
    clause.equations = [
      {
        id: 'equation1',
        number: '1',
        latex: 'E = mc^2',
      },
    ];
    const errors = validateBCBC(document);
    expect(errors).toHaveLength(0);
  });
});

describe('validateCrossReferences', () => {
  const createDocumentWithReferences = (): BCBCDocument => ({
    metadata: {
      title: 'BC Building Code',
      version: '2024',
      effectiveDate: '2024-01-01',
      jurisdiction: 'British Columbia',
    },
    divisions: [
      {
        id: 'nbc.divA',
        title: 'Division A',
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
                        clauses: [
                          {
                            id: 'nbc.divA.part1.sect1.subsect1.art1.sent1',
                            number: '1',
                            text: 'Test clause with glossary term',
                            glossaryTerms: ['term1'],
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
        id: 'term1',
        term: 'Test Term',
        definition: 'Test definition',
      },
    ],
    amendmentDates: [],
  });

  it('should return no errors when all glossary references are valid', () => {
    const document = createDocumentWithReferences();
    const errors = validateCrossReferences(document);
    expect(errors).toHaveLength(0);
  });

  it('should return error when glossary term reference is invalid', () => {
    const document = createDocumentWithReferences();
    const clause = document.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];
    clause.glossaryTerms = ['invalid_term'];
    const errors = validateCrossReferences(document);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      field: 'glossaryTerms',
      message: expect.stringContaining('invalid_term'),
      severity: 'error',
    });
  });

  it('should validate glossary references in nested subclauses', () => {
    const document = createDocumentWithReferences();
    const clause = document.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];
    clause.subclauses = [
      {
        id: 'subclause1',
        number: 'a',
        text: 'Subclause with invalid term',
        glossaryTerms: ['invalid_term'],
      },
    ];
    const errors = validateCrossReferences(document);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('invalid_term');
  });

  it('should handle multiple invalid references', () => {
    const document = createDocumentWithReferences();
    const clause = document.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];
    clause.glossaryTerms = ['invalid1', 'invalid2', 'term1'];
    const errors = validateCrossReferences(document);
    expect(errors).toHaveLength(2);
  });

  it('should handle documents with no glossary terms', () => {
    const document = createDocumentWithReferences();
    document.glossary = [];
    const clause = document.divisions[0].parts[0].sections[0].subsections[0].articles[0].clauses[0];
    clause.glossaryTerms = [];
    const errors = validateCrossReferences(document);
    expect(errors).toHaveLength(0);
  });

  it('should build complete ID set including all hierarchy levels', () => {
    const document = createDocumentWithReferences();
    // Add a second article to test ID collection
    document.divisions[0].parts[0].sections[0].subsections[0].articles.push({
      id: 'nbc.divA.part1.sect1.subsect1.art2',
      number: '2',
      title: 'Article 2',
      type: 'article',
      clauses: [
        {
          id: 'nbc.divA.part1.sect1.subsect1.art2.sent1',
          number: '1',
          text: 'Another clause',
          glossaryTerms: [],
        },
      ],
      notes: [],
    });
    const errors = validateCrossReferences(document);
    expect(errors).toHaveLength(0);
  });
});
