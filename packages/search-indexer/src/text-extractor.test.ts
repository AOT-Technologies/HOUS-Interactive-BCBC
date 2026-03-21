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
import { stripReferences } from './text-extractor';
import { DEFAULT_REFERENCE_CONFIG } from './config';

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
