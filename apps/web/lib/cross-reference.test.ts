import { describe, expect, it } from 'vitest';
import { getNavigationSlug, getSectionFetchPath, parseReferenceId } from './cross-reference';

describe('cross-reference spectables support', () => {
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

