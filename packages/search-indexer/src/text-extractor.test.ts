/**
 * Bug condition exploration tests for stripReferences()
 *
 * These tests encode the EXPECTED (correct) behavior for non-term reference types.
 * On unfixed code, they MUST FAIL — failure confirms the bug exists.
 *
 * Bug: parseReferencePayload() returns displayText: '' for non-term types,
 * and stripReferences() only emits display text for term markers with inline labels.
 * Non-term markers (internal, standard, external) are replaced with empty string.
 */

import { describe, it, expect } from 'vitest';
import { stripReferences, extractListText, extractClauseText, extractArticleText, extractTableText, extractApplicationNoteText, stripFormattingMarkers } from './text-extractor';
import { DEFAULT_REFERENCE_CONFIG, DEFAULT_TEXT_EXTRACTION_CONFIG } from './config';

describe('Bug Condition: Non-term reference markers stripped to empty string', () => {
  /**
   * Validates: Requirements 1.1, 2.1
   *
   * Internal ref markers should produce human-readable display text
   * derived from the reference ID (e.g., "Sentence 3.2.2.47.(3)").
   * On unfixed code, the marker is replaced with empty string.
   */
  it('should produce non-empty display text for internal reference markers', () => {
    const input = 'see [REF:internal:nbc.divB.part3.sect2.subsect2.art47.sent3:short]';
    const result = stripReferences(input, DEFAULT_REFERENCE_CONFIG);

    // Marker must be fully removed
    expect(result).not.toContain('[REF:internal:');

    // Display text must be present where the marker was (no blank gap)
    expect(result).toContain('Sentence (3)');

    // Result should not have trailing whitespace gap
    expect(result).not.toMatch(/see\s*$/);
  });

  /**
   * Validates: Requirements 1.2, 2.2
   *
   * Standard ref markers should use the standard ID as display text.
   * On unfixed code, the marker is replaced with empty string.
   */
  it('should produce non-empty display text for standard reference markers', () => {
    const input = 'per [REF:standard:CSA-A23.3]';
    const result = stripReferences(input, DEFAULT_REFERENCE_CONFIG);

    // Marker must be fully removed
    expect(result).not.toContain('[REF:standard:');

    // Display text must contain the standard ID
    expect(result).toContain('CSA-A23.3');
  });

  /**
   * Validates: Requirements 1.3, 2.3
   *
   * External ref markers should use the external reference ID as display text.
   * On unfixed code, the marker is replaced with empty string.
   */
  it('should produce non-empty display text for external reference markers', () => {
    const input = 'see [REF:external:nfc]';
    const result = stripReferences(input, DEFAULT_REFERENCE_CONFIG);

    // Marker must be fully removed
    expect(result).not.toContain('[REF:external:');

    // Display text must contain the external ref ID
    expect(result).toContain('nfc');
  });

  /**
   * Validates: Requirements 1.4, 2.4
   *
   * Multiple internal ref markers in a list should each produce display text,
   * preserving the readable list structure.
   * On unfixed code, all markers are replaced with empty strings, leaving
   * only punctuation and conjunctions (e.g., ",  or ").
   */
  it('should produce readable list with display text for multiple internal refs', () => {
    const input =
      '[REF:internal:nbc.divB.part3.sect2.subsect2.art47.sent3:short], ' +
      '[REF:internal:nbc.divB.part3.sect2.subsect2.art47.sent4:short] or ' +
      '[REF:internal:nbc.divB.part3.sect2.subsect2.art47.sent5:short]';
    const result = stripReferences(input, DEFAULT_REFERENCE_CONFIG);

    // No raw markers should remain
    expect(result).not.toContain('[REF:internal:');

    // Each marker position should have non-empty display text
    // The result should NOT be just punctuation/conjunctions
    expect(result).not.toMatch(/^\s*,\s*(,\s*)*or\s*$/);

    // Result should contain display text for each reference
    expect(result.trim().length).toBeGreaterThan(10);
  });
});

import type { ReferenceParsingConfig } from './config';

/**
 * Preservation property tests for stripReferences()
 *
 * These tests capture the CORRECT baseline behavior of the unfixed code for
 * non-buggy inputs (cases where isBugCondition returns false). They MUST PASS
 * on both unfixed and fixed code — any failure indicates a regression.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
describe('Preservation: Term references, config bypass, and plain text unchanged', () => {
  const config = DEFAULT_REFERENCE_CONFIG;

  /**
   * Validates: Requirements 3.1
   *
   * Term ref with inline label: [REF:term:id:label] → returns inline label as display text.
   * Observed on unfixed code: stripReferences("[REF:term:bldng:building] test", config) → "building test"
   */
  it('should return inline label as display text for term ref with inline label', () => {
    const input = '[REF:term:bldng:building] test';
    const result = stripReferences(input, config);

    // Marker must be removed
    expect(result).not.toContain('[REF:term:');

    // Inline label "building" must appear as display text
    expect(result).toBe('building test');
  });

  /**
   * Validates: Requirements 3.1
   *
   * Property: for any term ref with inline label [REF:term:{id}:{label}],
   * the label replaces the marker in the output.
   */
  it('should preserve inline label for various term ref ids and labels', () => {
    const cases = [
      { id: 'bldng', label: 'building', surrounding: 'a {m} here' },
      { id: 'frprfng', label: 'fireproofing', surrounding: 'use {m} now' },
      { id: 'cncrt', label: 'concrete', surrounding: '{m} is strong' },
      { id: 'stl', label: 'steel', surrounding: 'made of {m}' },
      { id: 'wtr-rstnt', label: 'water-resistant', surrounding: 'must be {m} material' },
    ];

    for (const { id, label, surrounding } of cases) {
      const marker = `[REF:term:${id}:${label}]`;
      const input = surrounding.replace('{m}', marker);
      const expected = surrounding.replace('{m}', label);
      const result = stripReferences(input, config);

      expect(result).toBe(expected);
      expect(result).not.toContain('[REF:');
    }
  });

  /**
   * Validates: Requirements 3.2
   *
   * Term ref legacy format: [REF:term:id]trailingText → returns empty so trailing text remains.
   * Observed on unfixed code: stripReferences("[REF:term:bldng]building test", config) → "building test"
   */
  it('should return empty for term ref legacy format so trailing text remains', () => {
    const input = '[REF:term:bldng]building test';
    const result = stripReferences(input, config);

    // Marker is removed, trailing "building test" stays intact
    expect(result).toBe('building test');
    expect(result).not.toContain('[REF:');
  });

  /**
   * Validates: Requirements 3.2
   *
   * Property: for any term ref in legacy format [REF:term:{id}]{trailingWord},
   * the marker is replaced with empty string and trailing text remains.
   */
  it('should preserve trailing text for various legacy term refs', () => {
    const cases = [
      { id: 'bldng', trailing: 'building', prefix: 'the ' },
      { id: 'frprfng', trailing: 'fireproofing', prefix: 'apply ' },
      { id: 'cncrt', trailing: 'concrete', prefix: '' },
    ];

    for (const { id, trailing, prefix } of cases) {
      const input = `${prefix}[REF:term:${id}]${trailing} end`;
      const result = stripReferences(input, config);

      // Marker removed, trailing text preserved
      expect(result).toBe(`${prefix}${trailing} end`);
      expect(result).not.toContain('[REF:');
    }
  });

  /**
   * Validates: Requirements 3.3
   *
   * Config bypass: stripFromSearchText: false → returns text unchanged with all markers preserved.
   * Observed on unfixed code: returns original text unchanged.
   */
  it('should return text unchanged when stripFromSearchText is false', () => {
    const bypassConfig: ReferenceParsingConfig = { ...config, stripFromSearchText: false };

    const inputs = [
      '[REF:internal:nbc.divB.part3:long] details',
      '[REF:term:bldng:building] test',
      '[REF:standard:CSA-A23.3] compliance',
      '[REF:external:nfc] reference',
      'plain text no markers',
      '[REF:internal:a:short], [REF:standard:B] and [REF:term:c:label]',
    ];

    for (const input of inputs) {
      const result = stripReferences(input, bypassConfig);
      expect(result).toBe(input);
    }
  });

  /**
   * Validates: Requirements 3.4
   *
   * Unprocessed type: marker type not in processTypes → marker left as-is in output.
   * Observed on unfixed code: internal marker left untouched when processTypes is ['term'].
   */
  it('should leave markers untouched when their type is not in processTypes', () => {
    const termOnlyConfig: ReferenceParsingConfig = { ...config, processTypes: ['term'] };

    const input = '[REF:internal:nbc.divB.part3:long] details';
    const result = stripReferences(input, termOnlyConfig);

    // Internal marker must remain since 'internal' is not in processTypes
    expect(result).toBe(input);
  });

  /**
   * Validates: Requirements 3.4
   *
   * Property: for any marker type excluded from processTypes, the marker is preserved as-is.
   */
  it('should preserve markers for all types excluded from processTypes', () => {
    // Config that only processes 'external' — all other types should be left as-is
    const externalOnlyConfig: ReferenceParsingConfig = { ...config, processTypes: ['external'] };

    const termInput = '[REF:term:bldng:building] test';
    expect(stripReferences(termInput, externalOnlyConfig)).toBe(termInput);

    const internalInput = '[REF:internal:nbc.divB.part3:short] details';
    expect(stripReferences(internalInput, externalOnlyConfig)).toBe(internalInput);

    const standardInput = 'per [REF:standard:CSA-A23.3]';
    expect(stripReferences(standardInput, externalOnlyConfig)).toBe(standardInput);
  });

  /**
   * Validates: Requirements 3.5
   *
   * Plain text: no markers → text returned unchanged.
   * Observed on unfixed code: "plain text no markers" → "plain text no markers"
   */
  it('should return plain text unchanged when no markers are present', () => {
    const inputs = [
      'plain text no markers',
      'Except as permitted by Sentence 3.2.2.47.(3)',
      '',
      'a',
      'Multiple words with numbers 123 and symbols !@#',
      'Text with [brackets] but not REF markers',
    ];

    for (const input of inputs) {
      const result = stripReferences(input, config);
      expect(result).toBe(input);
    }
  });

  /**
   * Validates: Requirements 3.5
   *
   * Property: for any string that does not contain [REF: pattern,
   * stripReferences returns the input unchanged regardless of config.
   */
  it('should be identity function for text without REF markers regardless of config', () => {
    const configs: ReferenceParsingConfig[] = [
      config,
      { ...config, stripFromSearchText: false },
      { ...config, processTypes: [] },
      { ...config, processTypes: ['term'] },
      { ...config, processTypes: ['term', 'internal', 'external', 'standard'] },
    ];

    const plainTexts = [
      'simple text',
      'text with [brackets] and (parens)',
      'numbers 1.2.3.4',
      '',
    ];

    for (const cfg of configs) {
      for (const text of plainTexts) {
        expect(stripReferences(text, cfg)).toBe(text);
      }
    }
  });
});


/**
 * Tests for extractListText()
 */
describe('extractListText', () => {
  it('should return empty string for undefined input', () => {
    expect(extractListText(undefined)).toBe('');
  });

  it('should return empty string for empty lists array', () => {
    expect(extractListText([])).toBe('');
  });

  it('should extract content from list items', () => {
    const lists = [
      {
        type: 'bulleted',
        items: [
          { content: 'First item' },
          { content: 'Second item' },
        ],
      },
    ];
    const result = extractListText(lists);
    expect(result).toContain('First item');
    expect(result).toContain('Second item');
  });

  it('should extract term and definition from definition lists', () => {
    const lists = [
      {
        type: 'definition',
        items: [
          { term: 'Building', definition: 'A structure used for shelter.' },
          { term: 'Occupancy', definition: 'The use of a building.' },
        ],
      },
    ];
    const result = extractListText(lists);
    expect(result).toContain('Building');
    expect(result).toContain('A structure used for shelter.');
    expect(result).toContain('Occupancy');
    expect(result).toContain('The use of a building.');
  });

  it('should extract text field from list items', () => {
    const lists = [
      {
        type: 'numbered',
        items: [
          { text: 'Item with text field' },
        ],
      },
    ];
    const result = extractListText(lists);
    expect(result).toContain('Item with text field');
  });

  it('should handle multiple lists', () => {
    const lists = [
      { type: 'bulleted', items: [{ content: 'List 1 item' }] },
      { type: 'numbered', items: [{ content: 'List 2 item' }] },
    ];
    const result = extractListText(lists);
    expect(result).toContain('List 1 item');
    expect(result).toContain('List 2 item');
  });

  it('should handle lists with no items', () => {
    const lists = [{ type: 'bulleted' }];
    const result = extractListText(lists as any);
    expect(result).toBe('');
  });
});

/**
 * Tests for extractClauseText with list extraction
 */
describe('extractClauseText with lists', () => {
  it('should extract list items from clauses', () => {
    const clauses = [
      {
        id: 'clause1',
        type: 'clause',
        text: 'The following applies:',
        lists: [
          {
            type: 'bulleted',
            items: [
              { content: 'requirement one' },
              { content: 'requirement two' },
            ],
          },
        ],
      },
    ];
    const result = extractClauseText(clauses, DEFAULT_TEXT_EXTRACTION_CONFIG);
    expect(result).toContain('The following applies:');
    expect(result).toContain('requirement one');
    expect(result).toContain('requirement two');
  });

  it('should extract lists from subclauses', () => {
    const clauses = [
      {
        id: 'clause1',
        type: 'clause',
        text: 'Main clause',
        subclauses: [
          {
            id: 'subclause1',
            type: 'subclause',
            text: 'Sub clause with list:',
            lists: [
              {
                type: 'bulleted',
                items: [{ content: 'nested list item' }],
              },
            ],
          },
        ],
      },
    ];
    const result = extractClauseText(clauses, DEFAULT_TEXT_EXTRACTION_CONFIG);
    expect(result).toContain('Main clause');
    expect(result).toContain('Sub clause with list:');
    expect(result).toContain('nested list item');
  });
});

/**
 * Tests for extractArticleText with list extraction
 */
describe('extractArticleText with lists', () => {
  it('should extract list items from sentences', () => {
    const content = [
      {
        id: 'sent1',
        type: 'sentence',
        number: 1,
        text: 'The following terms are defined:',
        lists: [
          {
            type: 'definition',
            items: [
              { term: 'Access', definition: 'means an area which is easy to approach' },
              { term: 'Exit', definition: 'means that part of a means of egress' },
            ],
          },
        ],
      },
    ];
    const { text } = extractArticleText(content as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('The following terms are defined:');
    expect(text).toContain('Access');
    expect(text).toContain('means an area which is easy to approach');
    expect(text).toContain('Exit');
    expect(text).toContain('means that part of a means of egress');
  });

  it('should not extract lists when includeSentences is false', () => {
    const content = [
      {
        id: 'sent1',
        type: 'sentence',
        number: 1,
        text: 'Sentence text',
        lists: [
          { type: 'bulleted', items: [{ content: 'list item' }] },
        ],
      },
    ];
    const config = { ...DEFAULT_TEXT_EXTRACTION_CONFIG, includeSentences: false };
    const { text } = extractArticleText(content as any, config, DEFAULT_REFERENCE_CONFIG);
    expect(text).toBe('');
  });
});

/**
 * Tests for extractTableText with actual BCBC data format
 */
describe('extractTableText with actual data format', () => {
  it('should extract text from header_rows with content[].value cells', () => {
    const table = {
      type: 'table',
      title: 'Test Table',
      structure: {
        header_rows: [
          {
            id: 'rowh1',
            type: 'header_row',
            cells: [
              { content: [{ type: 'text', value: 'Column A' }] },
              { content: [{ type: 'text', value: 'Column B' }] },
            ],
          },
        ],
        body_rows: [],
      },
    };
    const { text } = extractTableText(table as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('Test Table');
    expect(text).toContain('Column A');
    expect(text).toContain('Column B');
  });

  it('should extract text from body_rows with content[].value cells', () => {
    const table = {
      type: 'table',
      title: 'Data Table',
      structure: {
        header_rows: [
          {
            cells: [
              { content: [{ type: 'text', value: 'Header' }] },
            ],
          },
        ],
        body_rows: [
          {
            cells: [
              { content: [{ type: 'text', value: 'Row 1 data' }] },
            ],
          },
          {
            cells: [
              { content: [{ type: 'text', value: 'Row 2 data' }] },
            ],
          },
          {
            cells: [
              { content: [{ type: 'text', value: 'Row 3 data' }] },
            ],
          },
        ],
      },
    };
    const { text } = extractTableText(table as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('Data Table');
    expect(text).toContain('Header');
    expect(text).toContain('Row 1 data');
    expect(text).toContain('Row 2 data');
    expect(text).toContain('Row 3 data');
  });

  it('should index ALL body rows (no row limit)', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      cells: [{ content: [{ type: 'text', value: `Row ${i + 1} content` }] }],
    }));
    const table = {
      type: 'table',
      title: 'Large Table',
      structure: { header_rows: [], body_rows: rows },
    };
    const { text } = extractTableText(table as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('Row 1 content');
    expect(text).toContain('Row 10 content');
    expect(text).toContain('Row 20 content');
  });

  it('should handle cells with multiple content items', () => {
    const table = {
      type: 'table',
      structure: {
        header_rows: [],
        body_rows: [
          {
            cells: [
              {
                content: [
                  { type: 'text', value: 'Part one ' },
                  { type: 'text', value: 'part two' },
                ],
              },
            ],
          },
        ],
      },
    };
    const { text } = extractTableText(table as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('Part one');
    expect(text).toContain('part two');
  });

  it('should still support legacy format (structure.headers and structure.rows)', () => {
    const table = {
      type: 'table',
      title: 'Legacy Table',
      structure: {
        headers: [{ text: 'Legacy Header' }],
        rows: [
          { cells: [{ text: 'Legacy Cell' }] },
        ],
      },
    };
    const { text } = extractTableText(table as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('Legacy Table');
    expect(text).toContain('Legacy Header');
    expect(text).toContain('Legacy Cell');
  });

  it('should strip references from table cell text', () => {
    const table = {
      type: 'table',
      structure: {
        header_rows: [],
        body_rows: [
          {
            cells: [
              { content: [{ type: 'text', value: '[REF:term:bldng:building] requirements' }] },
            ],
          },
        ],
      },
    };
    const { text } = extractTableText(table as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('building requirements');
    expect(text).not.toContain('[REF:');
  });

  it('should extract text from table_notes', () => {
    const table = {
      type: 'table',
      title: 'Referenced Standards',
      structure: { header_rows: [], body_rows: [] },
      table_notes: [
        { id: 'note1', content: 'While every effort was made to ensure accuracy of the information.' },
        { id: 'note2', content: 'Users should refer to the most recent official versions.' },
      ],
    };
    const { text } = extractTableText(table as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('ensure accuracy of the information');
    expect(text).toContain('most recent official versions');
  });

  it('should handle table_notes with references', () => {
    const table = {
      type: 'table',
      title: 'Test',
      structure: { header_rows: [], body_rows: [] },
      table_notes: [
        { id: 'note1', content: 'See [REF:internal:nbc.divB.part3:long] for requirements.' },
      ],
    };
    const { text } = extractTableText(table as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).not.toContain('[REF:');
    expect(text).toContain('requirements');
  });
});

/**
 * Tests for extractApplicationNoteText
 */
describe('extractApplicationNoteText', () => {
  it('should return empty for undefined content', () => {
    const { text } = extractApplicationNoteText(undefined, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toBe('');
  });

  it('should extract text from paragraph content items', () => {
    const content = [
      { type: 'paragraph', id: 'para1', content: 'First paragraph of the note.' },
      { type: 'paragraph', id: 'para2', content: 'Second paragraph with more details.' },
    ];
    const { text } = extractApplicationNoteText(content, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('First paragraph of the note.');
    expect(text).toContain('Second paragraph with more details.');
  });

  it('should extract list items from paragraphs', () => {
    const content = [
      {
        type: 'paragraph',
        id: 'para1',
        content: 'The following applies:',
        lists: [
          {
            type: 'bulleted',
            items: [
              { content: 'First requirement' },
              { content: 'Second requirement' },
            ],
          },
        ],
      },
    ];
    const { text } = extractApplicationNoteText(content, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('The following applies:');
    expect(text).toContain('First requirement');
    expect(text).toContain('Second requirement');
  });

  it('should strip references from application note text', () => {
    const content = [
      {
        type: 'paragraph',
        id: 'para1',
        content: 'This applies to [REF:term:bldng:buildings] when an owner wishes to rehabilitate.',
      },
    ];
    const { text } = extractApplicationNoteText(content, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).toContain('buildings');
    expect(text).toContain('when an owner wishes to rehabilitate');
    expect(text).not.toContain('[REF:');
  });

  it('should extract reference IDs from content', () => {
    const content = [
      {
        type: 'paragraph',
        id: 'para1',
        content: 'See [REF:term:bldng:building] for details.',
      },
    ];
    const { referenceIds } = extractApplicationNoteText(content, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(referenceIds.length).toBeGreaterThan(0);
    expect(referenceIds.some(id => id.includes('bldng'))).toBe(true);
  });

  it('should truncate text at maxTextLength', () => {
    const longContent = 'A'.repeat(20000);
    const content = [{ type: 'paragraph', id: 'para1', content: longContent }];
    const config = { ...DEFAULT_TEXT_EXTRACTION_CONFIG, maxTextLength: 100 };
    const { text } = extractApplicationNoteText(content, config, DEFAULT_REFERENCE_CONFIG);
    expect(text.length).toBeLessThanOrEqual(100);
  });

  it('should extract titles and content from note_division items', () => {
    const content = [
      {
        type: 'paragraph',
        id: 'para1',
        content: 'Top-level paragraph text.',
      },
      {
        type: 'note_division',
        id: 'div1',
        title: 'Air Barrier Systems and Vapour Barriers',
        content: [
          {
            type: 'paragraph',
            id: 'div1.para1',
            content: 'Articles require the installation of air barrier systems and vapour barriers only where insulation is installed.',
          },
        ],
      },
      {
        type: 'note_division',
        id: 'div2',
        title: 'Interior Wall and Ceiling Finishes',
        content: [
          {
            type: 'paragraph',
            id: 'div2.para1',
            content: 'The choice of interior wall and ceiling finishes has implications for fire safety.',
          },
        ],
      },
    ];
    const { text } = extractApplicationNoteText(content as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    // Should include note_division titles
    expect(text).toContain('Air Barrier Systems and Vapour Barriers');
    expect(text).toContain('Interior Wall and Ceiling Finishes');
    // Should include note_division paragraph content
    expect(text).toContain('air barrier systems and vapour barriers only where insulation is installed');
    expect(text).toContain('interior wall and ceiling finishes has implications for fire safety');
    // Should include top-level paragraph
    expect(text).toContain('Top-level paragraph text.');
  });
});


/**
 * Tests for stripFormattingMarkers
 */
describe('stripFormattingMarkers', () => {
  it('should remove [LIST:type] placeholders', () => {
    expect(stripFormattingMarkers('meanings:[LIST:definition]')).toBe('meanings:');
    expect(stripFormattingMarkers('items:[LIST:bulleted]')).toBe('items:');
    expect(stripFormattingMarkers('list:[LIST:numbered]')).toBe('list:');
  });

  it('should convert superscript markers to plain text', () => {
    expect(stripFormattingMarkers('600 m^{2}')).toBe('600 m2');
    expect(stripFormattingMarkers('10^{3} Pa')).toBe('103 Pa');
    expect(stripFormattingMarkers('x^{n}')).toBe('xn');
  });

  it('should convert subscript markers to plain text', () => {
    expect(stripFormattingMarkers('H_{2}O')).toBe('H2O');
    expect(stripFormattingMarkers('CO_{2}')).toBe('CO2');
  });

  it('should remove <bold> tags but keep content', () => {
    expect(stripFormattingMarkers('<bold>Important</bold> text')).toBe('Important text');
  });

  it('should remove <italic> tags but keep content', () => {
    expect(stripFormattingMarkers('<italic>emphasized</italic> word')).toBe('emphasized word');
  });

  it('should handle multiple markers in one string', () => {
    const input = 'Area of 600 m^{2} with [LIST:bulleted] and <bold>note</bold>';
    const result = stripFormattingMarkers(input);
    expect(result).toBe('Area of 600 m2 with  and note');
    expect(result).not.toContain('[LIST:');
    expect(result).not.toContain('^{');
    expect(result).not.toContain('<bold>');
  });

  it('should return text unchanged when no markers present', () => {
    const input = 'Plain text with no formatting markers';
    expect(stripFormattingMarkers(input)).toBe(input);
  });
});

/**
 * Tests for formatting markers being stripped during article extraction
 */
describe('extractArticleText strips formatting markers', () => {
  it('should strip [LIST:] markers from sentence text', () => {
    const content = [
      {
        id: 'sent1',
        type: 'sentence',
        number: 1,
        text: 'The following terms are defined:[LIST:definition]',
      },
    ];
    const { text } = extractArticleText(content as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).not.toContain('[LIST:');
    expect(text).toContain('The following terms are defined:');
  });

  it('should convert superscript markers in sentence text', () => {
    const content = [
      {
        id: 'sent1',
        type: 'sentence',
        number: 1,
        text: 'not more than 600 m^{2} in area',
      },
    ];
    const { text } = extractArticleText(content as any, DEFAULT_TEXT_EXTRACTION_CONFIG, DEFAULT_REFERENCE_CONFIG);
    expect(text).not.toContain('^{');
    expect(text).toContain('600 m2 in area');
  });
});
