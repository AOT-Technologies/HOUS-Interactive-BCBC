/**
 * Unit tests for BCBCSearchClient scoring and ranking logic.
 *
 * These tests verify that search results respect content hierarchy
 * (Part > Section > Subsection > Article > Table/Figure > Note > Glossary)
 * while still allowing overwhelmingly strong matches to surface.
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
