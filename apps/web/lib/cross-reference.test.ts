import { describe, expect, it } from 'vitest';
import {
  getNavigationSlug,
  getSectionFetchPath,
  parseReferenceId,
  shouldSuppressReferenceInContext,
} from './cross-reference';

describe('cross-reference spectables support', () => {
  it('parses part references and builds a part navigation slug', () => {
    const referenceId = 'nbc.divB.part5';
    const parsed = parseReferenceId(referenceId);

    expect(parsed).toBeTruthy();
    expect(parsed?.kind).toBe('part');
    expect(parsed?.division).toBe('nbc.divB');
    expect(parsed?.part).toBe('5');
    expect(getNavigationSlug(referenceId)).toEqual(['nbc.divB', '5']);
    expect(getSectionFetchPath('2024', referenceId)).toBeNull();
  });

  it('parses spectables table references', () => {
    const parsed = parseReferenceId('nbc.divBV2.part9.spectables2.table14');

    expect(parsed).toBeTruthy();
    expect(parsed?.kind).toBe('spectables');
    expect(parsed?.division).toBe('nbc.divBV2');
    expect(parsed?.part).toBe('9');
    expect(parsed?.spectables).toBe('2');
    expect(parsed?.table).toBe('14');
  });

  it('builds navigation slug and fetch path for spectables references', () => {
    const referenceId = 'nbc.divBV2.part9.spectables1.table2';

    expect(getNavigationSlug(referenceId)).toEqual(['nbc.divBV2', '9', 'spectables', '1']);
    expect(getSectionFetchPath('2024', referenceId)).toBe(
      '/data/2024/content/nbc-divbv2/part-9/spectables-1.json'
    );
  });
});

describe('shouldSuppressReferenceInContext', () => {
  it('suppresses same-article sentence and table references', () => {
    const context = {
      kind: 'article' as const,
      referenceId: 'nbc.divA.part1.sect3.subsect3.art3',
    };

    expect(
      shouldSuppressReferenceInContext(
        'nbc.divA.part1.sect3.subsect3.art3.sent1',
        context
      )
    ).toBe(true);
    expect(
      shouldSuppressReferenceInContext(
        'nbc.divA.part1.sect3.subsect3.art3.table1',
        context
      )
    ).toBe(true);
  });

  it('keeps different-article references interactive', () => {
    const context = {
      kind: 'article' as const,
      referenceId: 'nbc.divA.part1.sect3.subsect3.art3',
    };

    expect(
      shouldSuppressReferenceInContext(
        'nbc.divA.part1.sect3.subsect3.art2.sent1',
        context
      )
    ).toBe(false);
  });

  it('suppresses references within the same division appendix', () => {
    const context = {
      kind: 'appendix' as const,
      referenceId: 'nbc.divB.appendixD.appsect1.subsect2.article1',
    };

    expect(
      shouldSuppressReferenceInContext(
        'nbc.divB.appendixD.appsect1.subsect3.article4.para2',
        context
      )
    ).toBe(true);
    expect(
      shouldSuppressReferenceInContext(
        'nbc.divB.appendixC.appsect1.subsect3.article4.para2',
        context
      )
    ).toBe(false);
  });

  it('suppresses only the same application note', () => {
    const context = {
      kind: 'application-note' as const,
      referenceId: 'nbc.divC.part2.appendix.appnote7',
    };

    expect(
      shouldSuppressReferenceInContext(
        'nbc.divC.part2.appendix.appnote7',
        context
      )
    ).toBe(true);
    expect(
      shouldSuppressReferenceInContext(
        'nbc.divC.part2.appendix.appnote8',
        context
      )
    ).toBe(false);
  });

  it('never suppresses standards or external references', () => {
    const context = {
      kind: 'article' as const,
      referenceId: 'nbc.divA.part1.sect3.subsect3.art3',
    };

    expect(shouldSuppressReferenceInContext('standard:csaa440S1', context)).toBe(false);
    expect(shouldSuppressReferenceInContext('external:https://example.com', context)).toBe(false);
  });
});
