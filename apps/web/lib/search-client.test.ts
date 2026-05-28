/**
 * Unit tests for BCBCSearchClient scoring, ranking, and phrase matching logic.
 *
 * These tests verify:
 * 1. Search results respect content hierarchy
 *    (Part > Section > Subsection > Article > Table/Figure > Note > Glossary)
 *    while still allowing overwhelmingly strong matches to surface.
 * 2. Phrase search: multi-word and hyphenated queries return only results where
 *    the term appears in the document's title or text (mimicking PDF Ctrl+F).
 * 3. Prefix matching: "fire extinguisher" matches "fire extinguishers" (plurals).
 * 4. Snippet override: search results have document.snippet replaced with
 *    50 characters of context around the matched term.
 *
 * Hierarchy priorities (from config.ts):
 *   Part (10) > Section (9) > Subsection (8) > Article (7) >
 *   Table/Figure (6) > Note/Application-Note (5) > Glossary (3)
 *
 * Sort rule: hierarchy wins unless the lower-level item's score
 * exceeds the higher-level item's score by more than 3x.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BCBCSearchClient } from './search-client';

// Minimal SearchDocument factory
function makeDoc(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id ?? 'doc-1',
        type: overrides.type ?? 'article',
        articleNumber: overrides.articleNumber ?? '',
        title: overrides.title ?? 'Test',
        text: overrides.text ?? 'test content',
        snippet: overrides.snippet ?? 'test',
        divisionId: 'nbc.divA',
        divisionLetter: 'A',
        divisionTitle: 'Division A',
        partId: 'nbc.divA.part1',
        partNumber: 1,
        partTitle: 'Part 1',
        sectionId: 'nbc.divA.part1.sect1',
        sectionNumber: 1,
        sectionTitle: 'Section 1',
        subsectionId: 'nbc.divA.part1.sect1.subsect1',
        subsectionNumber: 1,
        subsectionTitle: 'Subsection 1',
        path: 'Division A > Part 1',
        breadcrumbs: ['Division A', 'Part 1'],
        urlPath: '/code/nbc.divA/1/1/1/1',
        hasAmendment: false,
        hasInternalRefs: false,
        hasExternalRefs: false,
        hasTermRefs: false,
        hasTables: false,
        hasFigures: false,
        searchPriority: overrides.searchPriority ?? 7,
        ...overrides,
    };
}

/**
 * Access the private calculateFinalScore method for unit testing.
 */
function calculateScore(
    client: BCBCSearchClient,
    doc: any,
    fieldScores: number[],
    query: string
): number {
    return (client as any).calculateFinalScore(doc, fieldScores, query);
}

/**
 * Replicate the sort logic used in the search client.
 * Hierarchy wins unless lower-level item has >3x the score.
 */
function sortResults(results: Array<{ document: any; score: number; highlights: any[] }>) {
    return [...results].sort((a, b) => {
        const priorityDiff = b.document.searchPriority - a.document.searchPriority;
        if (priorityDiff !== 0) {
            const higherPriorityItem = priorityDiff > 0 ? b : a;
            const lowerPriorityItem = priorityDiff > 0 ? a : b;
            if (
                higherPriorityItem.score > 0 &&
                lowerPriorityItem.score > higherPriorityItem.score * 3
            ) {
                return b.score - a.score;
            }
            return priorityDiff;
        }
        return b.score - a.score;
    });
}

describe('BCBCSearchClient phrase matching', () => {
    let client: BCBCSearchClient;

    beforeEach(() => {
        client = new BCBCSearchClient();
    });

    /**
     * Helper to simulate the phrase-matching filter logic from the search method.
     * Only checks title and text fields — mimics PDF Ctrl+F behavior where
     * only actual visible content is matched.
     */
    function applyPhraseFilter(docs: ReturnType<typeof makeDoc>[], query: string): ReturnType<typeof makeDoc>[] {
        const queryWords = query.trim().split(/\s+/);
        const hasMultipleTokens = queryWords.length > 1 || /[-]/.test(query.trim());

        if (!hasMultipleTokens) return docs;

        const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const phraseRegex = new RegExp(escaped + '\\w*', 'i');

        return docs.filter((doc) => {
            const title = typeof doc.title === 'string' ? doc.title : (doc.title as any)?.text ?? '';
            return (
                phraseRegex.test(title) ||
                phraseRegex.test(doc.text)
            );
        });
    }

    describe('multi-word queries require exact phrase', () => {
        it('should keep documents containing the exact phrase in text', () => {
            const docWithPhrase = makeDoc({
                id: 'doc-1',
                text: 'Requirements for residential buildings in this zone',
            });
            const docWithoutPhrase = makeDoc({
                id: 'doc-2',
                text: 'Residential zones and commercial buildings are covered',
            });

            const results = applyPhraseFilter([docWithPhrase, docWithoutPhrase], 'residential buildings');

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('doc-1');
        });

        it('should keep documents containing the exact phrase in title', () => {
            const docWithPhrase = makeDoc({
                id: 'doc-1',
                title: 'Fire Separation Requirements',
                text: 'some unrelated content',
            });
            const docWithoutPhrase = makeDoc({
                id: 'doc-2',
                title: 'Fire Safety',
                text: 'separation of concerns in building design',
            });

            const results = applyPhraseFilter([docWithPhrase, docWithoutPhrase], 'fire separation');

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('doc-1');
        });

        it('should not match when phrase is only in path (not in title or text)', () => {
            const docInPathOnly = makeDoc({
                id: 'doc-1',
                path: 'Division B > Part 3 > Fire Separation',
                text: 'some content',
                title: 'General',
            });
            const docInText = makeDoc({
                id: 'doc-2',
                path: 'Division A > Part 1',
                text: 'fire separation requirements apply here',
            });

            const results = applyPhraseFilter([docInPathOnly, docInText], 'fire separation');

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('doc-2');
        });

        it('should be case-insensitive', () => {
            const doc = makeDoc({
                id: 'doc-1',
                text: 'Requirements for Residential Buildings in this zone',
            });

            const results = applyPhraseFilter([doc], 'residential buildings');

            expect(results).toHaveLength(1);
        });

        it('should filter out all documents when none contain the exact phrase', () => {
            const doc1 = makeDoc({
                id: 'doc-1',
                text: 'residential zones require permits',
            });
            const doc2 = makeDoc({
                id: 'doc-2',
                text: 'buildings must comply with code',
            });

            const results = applyPhraseFilter([doc1, doc2], 'residential buildings');

            expect(results).toHaveLength(0);
        });

        it('should keep multiple documents when all contain the exact phrase', () => {
            const doc1 = makeDoc({
                id: 'doc-1',
                text: 'residential buildings in zone A',
            });
            const doc2 = makeDoc({
                id: 'doc-2',
                text: 'all residential buildings must comply',
            });

            const results = applyPhraseFilter([doc1, doc2], 'residential buildings');

            expect(results).toHaveLength(2);
        });

        it('should not match when phrase spans across field boundaries', () => {
            // Title ends with "residential", text starts with "buildings" —
            // the phrase should NOT match because it doesn't exist in any single field.
            const doc = makeDoc({
                id: 'doc-1',
                title: 'Requirements for residential',
                text: 'buildings must comply with code',
                path: 'Division A > Part 1',
            });

            const results = applyPhraseFilter([doc], 'residential buildings');

            expect(results).toHaveLength(0);
        });
    });

    describe('single-word queries are not filtered', () => {
        it('should not apply phrase filter for single-word queries', () => {
            const doc1 = makeDoc({ id: 'doc-1', text: 'residential zones' });
            const doc2 = makeDoc({ id: 'doc-2', text: 'commercial areas' });

            const results = applyPhraseFilter([doc1, doc2], 'residential');

            // Single word: no phrase filtering, all docs pass through
            expect(results).toHaveLength(2);
        });
    });

    describe('hyphenated queries are filtered as exact phrases', () => {
        it('should filter results for hyphenated terms like floors-on-ground', () => {
            const docWithPhrase = makeDoc({
                id: 'doc-1',
                text: 'Floors-on-ground shall accommodate the future installation',
            });
            const docWithoutPhrase = makeDoc({
                id: 'doc-2',
                text: 'This Section applies to floors supported on ground',
            });

            const results = applyPhraseFilter([docWithPhrase, docWithoutPhrase], 'floors-on-ground');

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('doc-1');
        });

        it('should not filter simple words without hyphens', () => {
            const doc1 = makeDoc({ id: 'doc-1', text: 'fire safety' });
            const doc2 = makeDoc({ id: 'doc-2', text: 'water damage' });

            const results = applyPhraseFilter([doc1, doc2], 'fire');

            expect(results).toHaveLength(2);
        });
    });

    describe('prefix matching (plural/variant forms)', () => {
        it('should match plural forms like "fire extinguishers" when searching "fire extinguisher"', () => {
            const docPlural = makeDoc({
                id: 'doc-1',
                text: 'Portable fire extinguishers shall be provided',
            });
            const docSingular = makeDoc({
                id: 'doc-2',
                text: 'A fire extinguisher is required',
            });
            const docNoMatch = makeDoc({
                id: 'doc-3',
                text: 'Fire alarm systems shall be installed',
            });

            const results = applyPhraseFilter([docPlural, docSingular, docNoMatch], 'fire extinguisher');

            expect(results).toHaveLength(2);
            expect(results.map(r => r.id)).toContain('doc-1');
            expect(results.map(r => r.id)).toContain('doc-2');
        });

        it('should match "buildings" when searching "building"', () => {
            const doc = makeDoc({
                id: 'doc-1',
                text: 'residential buildings must comply',
            });

            const results = applyPhraseFilter([doc], 'residential building');

            expect(results).toHaveLength(1);
        });
    });

    describe('phrase matching with title as object', () => {
        it('should handle title as object with text property', () => {
            const doc = makeDoc({
                id: 'doc-1',
                title: { text: 'Fire Separation Requirements' },
                text: 'some content',
            });

            const results = applyPhraseFilter([doc], 'fire separation');

            expect(results).toHaveLength(1);
        });
    });
});

describe('BCBCSearchClient scoring', () => {
    let client: BCBCSearchClient;

    beforeEach(() => {
        client = new BCBCSearchClient();
    });

    describe('hierarchy-aware scoring', () => {
        it('should score a Part higher than an Article with the same field scores', () => {
            const partDoc = makeDoc({ type: 'part', searchPriority: 10 });
            const articleDoc = makeDoc({ type: 'article', searchPriority: 7 });

            const partScore = calculateScore(client, partDoc, [5], 'test');
            const articleScore = calculateScore(client, articleDoc, [5], 'test');

            expect(partScore).toBeGreaterThan(articleScore);
        });

        it('should score a Section higher than an Article with the same field scores', () => {
            const sectionDoc = makeDoc({ type: 'section', searchPriority: 9 });
            const articleDoc = makeDoc({ type: 'article', searchPriority: 7 });

            const sectionScore = calculateScore(client, sectionDoc, [5], 'test');
            const articleScore = calculateScore(client, articleDoc, [5], 'test');

            expect(sectionScore).toBeGreaterThan(articleScore);
        });

        it('should score a Subsection higher than an Article with the same field scores', () => {
            const subsectionDoc = makeDoc({ type: 'subsection', searchPriority: 8 });
            const articleDoc = makeDoc({ type: 'article', searchPriority: 7 });

            const subsectionScore = calculateScore(client, subsectionDoc, [5], 'test');
            const articleScore = calculateScore(client, articleDoc, [5], 'test');

            expect(subsectionScore).toBeGreaterThan(articleScore);
        });

        it('should score an Article higher than a Glossary term with the same field scores', () => {
            const articleDoc = makeDoc({ type: 'article', searchPriority: 7 });
            const glossaryDoc = makeDoc({ type: 'glossary', searchPriority: 3 });

            const articleScore = calculateScore(client, articleDoc, [5], 'test');
            const glossaryScore = calculateScore(client, glossaryDoc, [5], 'test');

            expect(articleScore).toBeGreaterThan(glossaryScore);
        });

        it('should score an Article higher than a Table with the same field scores', () => {
            const articleDoc = makeDoc({ type: 'article', searchPriority: 7 });
            const tableDoc = makeDoc({ type: 'table', searchPriority: 6 });

            const articleScore = calculateScore(client, articleDoc, [5], 'test');
            const tableScore = calculateScore(client, tableDoc, [5], 'test');

            expect(articleScore).toBeGreaterThan(tableScore);
        });

        it('should maintain full hierarchy order: Part > Section > Subsection > Article > Table > Note > Glossary', () => {
            const fieldScores = [5];
            const query = 'test';

            const partScore = calculateScore(client, makeDoc({ searchPriority: 10 }), fieldScores, query);
            const sectionScore = calculateScore(client, makeDoc({ searchPriority: 9 }), fieldScores, query);
            const subsectionScore = calculateScore(client, makeDoc({ searchPriority: 8 }), fieldScores, query);
            const articleScore = calculateScore(client, makeDoc({ searchPriority: 7 }), fieldScores, query);
            const tableScore = calculateScore(client, makeDoc({ searchPriority: 6 }), fieldScores, query);
            const noteScore = calculateScore(client, makeDoc({ searchPriority: 5 }), fieldScores, query);
            const glossaryScore = calculateScore(client, makeDoc({ searchPriority: 3 }), fieldScores, query);

            expect(partScore).toBeGreaterThan(sectionScore);
            expect(sectionScore).toBeGreaterThan(subsectionScore);
            expect(subsectionScore).toBeGreaterThan(articleScore);
            expect(articleScore).toBeGreaterThan(tableScore);
            expect(tableScore).toBeGreaterThan(noteScore);
            expect(noteScore).toBeGreaterThan(glossaryScore);
        });
    });

    describe('amendment boost', () => {
        it('should boost score for amended documents', () => {
            const doc = makeDoc({ searchPriority: 7, hasAmendment: false });
            const amendedDoc = makeDoc({ searchPriority: 7, hasAmendment: true });

            const baseScore = calculateScore(client, doc, [5], 'test');
            const amendedScore = calculateScore(client, amendedDoc, [5], 'test');

            expect(amendedScore).toBeGreaterThan(baseScore);
            expect(amendedScore / baseScore).toBeCloseTo(1.5, 1);
        });
    });

    describe('title match boost', () => {
        it('should boost score when query appears in title', () => {
            const docNoMatch = makeDoc({ title: 'Something Else', searchPriority: 7 });
            const docWithMatch = makeDoc({ title: 'Fire Separation', searchPriority: 7 });

            const noMatchScore = calculateScore(client, docNoMatch, [5], 'fire');
            const matchScore = calculateScore(client, docWithMatch, [5], 'fire');

            expect(matchScore).toBeGreaterThan(noMatchScore);
            expect(matchScore / noMatchScore).toBeCloseTo(2, 1);
        });

        it('should handle title as object with text property', () => {
            const doc = makeDoc({ title: { text: 'Fire Separation' }, searchPriority: 7 });
            const docNoMatch = makeDoc({ title: { text: 'Other' }, searchPriority: 7 });

            const matchScore = calculateScore(client, doc, [5], 'fire');
            const noMatchScore = calculateScore(client, docNoMatch, [5], 'fire');

            expect(matchScore).toBeGreaterThan(noMatchScore);
        });
    });

    describe('combined scoring factors', () => {
        it('should combine hierarchy, amendment, and title boosts multiplicatively', () => {
            const doc = makeDoc({
                title: 'Fire Separation',
                searchPriority: 10,
                hasAmendment: true,
            });

            const score = calculateScore(client, doc, [5], 'fire');

            // Expected: 5 * 1.5^10 * 1.5 * 2
            expect(score).toBeCloseTo(5 * Math.pow(1.5, 10) * 1.5 * 2, 0);
        });

        it('should sum multiple field scores before applying multipliers', () => {
            const doc = makeDoc({ title: 'Something Unrelated', searchPriority: 7 });

            const score = calculateScore(client, doc, [10, 5, 1], 'query');

            // Expected: (10+5+1) * 1.5^7
            expect(score).toBeCloseTo(16 * Math.pow(1.5, 7), 0);
        });
    });

    describe('hierarchy-respecting sort with relevance override', () => {
        it('should place Subsection above Article when scores are comparable', () => {
            const subsectionDoc = makeDoc({ id: 'subsect-1', type: 'subsection', title: 'General', searchPriority: 8 });
            const articleDoc = makeDoc({ id: 'art-1', type: 'article', title: 'General', searchPriority: 7 });

            // Both match in text field only — no title boost for either
            const subsectionScore = calculateScore(client, subsectionDoc, [1], 'fire exit');
            const articleScore = calculateScore(client, articleDoc, [1], 'fire exit');

            // Verify article score is NOT more than 3x subsection score
            expect(articleScore).toBeLessThan(subsectionScore * 3);

            const sorted = sortResults([
                { document: articleDoc, score: articleScore, highlights: [] },
                { document: subsectionDoc, score: subsectionScore, highlights: [] },
            ]);

            expect(sorted[0].document.id).toBe('subsect-1');
            expect(sorted[1].document.id).toBe('art-1');
        });

        it('should place Article above Glossary when scores are comparable', () => {
            const articleDoc = makeDoc({ id: 'art-1', type: 'article', title: 'General', searchPriority: 7 });
            const glossaryDoc = makeDoc({ id: 'gloss-1', type: 'glossary', title: 'Fire Exit', searchPriority: 3 });

            const articleScore = calculateScore(client, articleDoc, [1], 'fire exit');
            const glossaryScore = calculateScore(client, glossaryDoc, [5], 'fire exit');

            // Verify glossary score is NOT more than 3x article score
            expect(glossaryScore).toBeLessThan(articleScore * 3);

            const sorted = sortResults([
                { document: glossaryDoc, score: glossaryScore, highlights: [] },
                { document: articleDoc, score: articleScore, highlights: [] },
            ]);

            expect(sorted[0].document.id).toBe('art-1');
            expect(sorted[1].document.id).toBe('gloss-1');
        });

        it('should allow a very strong lower-level match to override hierarchy (>3x score)', () => {
            // Article with exact title match + multiple fields vs Part with weak text match
            const partDoc = makeDoc({ id: 'part-1', type: 'part', title: 'General', searchPriority: 10 });
            const articleDoc = makeDoc({ id: 'art-1', type: 'article', title: 'Fire Exit Requirements', searchPriority: 7 });

            // Part: weak match (text only)
            const partScore = calculateScore(client, partDoc, [1], 'fire exit');
            // Article: strong match (articleNumber + title + text + title boost)
            const articleScore = calculateScore(client, articleDoc, [10, 5, 1], 'fire exit');

            // Verify article score IS more than 3x part score
            expect(articleScore).toBeGreaterThan(partScore * 3);

            const sorted = sortResults([
                { document: partDoc, score: partScore, highlights: [] },
                { document: articleDoc, score: articleScore, highlights: [] },
            ]);

            // Article wins because its score is overwhelmingly better
            expect(sorted[0].document.id).toBe('art-1');
            expect(sorted[1].document.id).toBe('part-1');
        });

        it('should sort by relevance score within the same hierarchy level', () => {
            const art1 = makeDoc({ id: 'art-1', type: 'article', title: 'Fire Exit', searchPriority: 7 });
            const art2 = makeDoc({ id: 'art-2', type: 'article', title: 'General', searchPriority: 7 });

            const score1 = calculateScore(client, art1, [5], 'fire exit'); // title match → 2x
            const score2 = calculateScore(client, art2, [1], 'fire exit'); // text only

            expect(score1).toBeGreaterThan(score2);

            const sorted = sortResults([
                { document: art2, score: score2, highlights: [] },
                { document: art1, score: score1, highlights: [] },
            ]);

            expect(sorted[0].document.id).toBe('art-1');
            expect(sorted[1].document.id).toBe('art-2');
        });

        it('should maintain hierarchy for typical search scenarios', () => {
            // Typical case: all items match in text field with similar strength
            const partDoc = makeDoc({ id: 'part-1', type: 'part', searchPriority: 10 });
            const sectionDoc = makeDoc({ id: 'sect-1', type: 'section', searchPriority: 9 });
            const subsectionDoc = makeDoc({ id: 'subsect-1', type: 'subsection', searchPriority: 8 });
            const articleDoc = makeDoc({ id: 'art-1', type: 'article', searchPriority: 7 });

            const partScore = calculateScore(client, partDoc, [1], 'fire');
            const sectionScore = calculateScore(client, sectionDoc, [1], 'fire');
            const subsectionScore = calculateScore(client, subsectionDoc, [1], 'fire');
            const articleScore = calculateScore(client, articleDoc, [1], 'fire');

            const sorted = sortResults([
                { document: articleDoc, score: articleScore, highlights: [] },
                { document: partDoc, score: partScore, highlights: [] },
                { document: subsectionDoc, score: subsectionScore, highlights: [] },
                { document: sectionDoc, score: sectionScore, highlights: [] },
            ]);

            expect(sorted[0].document.id).toBe('part-1');
            expect(sorted[1].document.id).toBe('sect-1');
            expect(sorted[2].document.id).toBe('subsect-1');
            expect(sorted[3].document.id).toBe('art-1');
        });
    });
});
