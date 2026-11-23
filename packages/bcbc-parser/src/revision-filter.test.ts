import { describe, expect, it } from 'vitest';
import { filterSentence, filterClause } from './revision-filter';
import type { Sentence, Clause } from './types';

function makeClause(letter: string, text = `Clause ${letter} text`, revisions?: Clause['revisions']): Clause {
  return {
    id: `sent1.clause-${letter}`,
    number: letter,
    type: 'clause',
    text,
    glossaryTerms: [],
    ...(revisions ? { revisions } : {}),
  };
}

function makeSentence(clauses: Clause[], revisions?: Sentence['revisions']): Sentence {
  return {
    id: 'art1.sent1',
    number: '1',
    type: 'sentence',
    text: 'Sentence text',
    glossaryTerms: [],
    content: clauses,
    ...(revisions ? { revisions } : {}),
  };
}

describe('filterSentence — clause ordering', () => {
  it('returns clauses in alphabetical letter order even when source array is out of order', () => {
    const sentence = makeSentence([
      makeClause('e', 'Group E text'),
      makeClause('a', 'Group A text'),
      makeClause('c', 'Group C text'),
      makeClause('b', 'Group B text'),
      makeClause('d', 'Group D text'),
    ]);

    const result = filterSentence(sentence, '2024-03-08');

    expect(result).not.toBeNull();
    const letters = result!.content!.map((c) => (c as Clause).number);
    expect(letters).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('returns clauses in order when source array is already alphabetical', () => {
    const sentence = makeSentence([
      makeClause('a'),
      makeClause('b'),
      makeClause('c'),
    ]);

    const result = filterSentence(sentence, '2024-03-08');

    expect(result).not.toBeNull();
    const letters = result!.content!.map((c) => (c as Clause).number);
    expect(letters).toEqual(['a', 'b', 'c']);
  });

  it('sorts remaining clauses after filtering out deleted ones', () => {
    const sentence = makeSentence([
      makeClause('e', 'Group E text'),
      makeClause('a', 'Group A text', [{ effective_date: '2024-03-08', deleted: true }]),
      makeClause('c', 'Group C text'),
      makeClause('b', 'Group B text'),
    ]);

    const result = filterSentence(sentence, '2024-03-08');

    expect(result).not.toBeNull();
    const letters = result!.content!.map((c) => (c as Clause).number);
    // clause 'a' was deleted; remaining b, c, e should be sorted
    expect(letters).toEqual(['b', 'c', 'e']);
  });

  it('returns null for a sentence deleted on the effective date', () => {
    const sentence = makeSentence([], [{ effective_date: '2024-03-08', deleted: true }]);
    const result = filterSentence(sentence, '2024-03-08');
    expect(result).toBeNull();
  });

  it('returns undefined content when all clauses are filtered out', () => {
    const sentence = makeSentence([
      makeClause('a', 'text', [{ effective_date: '2024-01-01', deleted: true }]),
    ]);

    const result = filterSentence(sentence, '2024-06-01');
    expect(result).not.toBeNull();
    expect(result!.content).toBeUndefined();
  });
});

describe('filterClause', () => {
  it('returns clause unchanged when no revisions', () => {
    const clause = makeClause('a', 'Some text');
    const result = filterClause(clause, '2024-03-08');
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Some text');
    expect(result!.number).toBe('a');
  });

  it('returns revised text for the effective date', () => {
    const clause = makeClause('a', 'Original text', [
      { effective_date: '2024-03-08', text: 'Revised text' },
    ]);

    const result = filterClause(clause, '2024-03-08');
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Revised text');
  });

  it('returns null for a deleted clause', () => {
    const clause = makeClause('a', 'Some text', [
      { effective_date: '2024-01-01', deleted: true },
    ]);

    const result = filterClause(clause, '2024-06-01');
    expect(result).toBeNull();
  });
});

// BBC-322: Defined Terms by effective date
import { getDefinitionForDate } from './revision-filter';
import type { Definition } from './types';

describe('getDefinitionForDate', () => {
  const fieldReview: Definition = {
    id: 'bc-fld-rvw',
    term: 'Field review',
    definition: 'means a review ... in their professional discretion',
    revised: true,
    revisions: [
      { type: 'original', effective_date: '2024-03-08', term: 'Field review', definition: 'means a review ... in thier professional discretion' },
      { type: 'revision', effective_date: '2025-06-16', sequence: 1, term: 'Field review', definition: 'means a review ... in their professional discretion' },
    ],
  };

  it('returns the original wording before the revision date', () => {
    expect(getDefinitionForDate(fieldReview, '2025-03-10')?.definition).toContain('thier');
  });

  it('returns the revised wording from the revision date', () => {
    expect(getDefinitionForDate(fieldReview, '2025-06-16')?.definition).toContain('their');
  });

  it('returns the current definition when no date is selected', () => {
    expect(getDefinitionForDate(fieldReview)).toBe(fieldReview);
  });

  it('leaves out a definition that is not in the Code on the date', () => {
    const added: Definition = {
      id: 'new', term: 'New term', definition: 'means x',
      revisions: [
        { type: 'original', effective_date: '2024-03-08', term: '', definition: '' },
        { type: 'revision', effective_date: '2025-06-16', term: 'New term', definition: 'means x' },
      ],
    };
    expect(getDefinitionForDate(added, '2024-03-08')).toBeNull();
    expect(getDefinitionForDate(added, '2025-06-16')?.term).toBe('New term');
  });

  it('returns an unrevised definition unchanged', () => {
    const plain: Definition = { id: 'p', term: 'Plain', definition: 'means y' };
    expect(getDefinitionForDate(plain, '2024-03-08')).toBe(plain);
  });
});
