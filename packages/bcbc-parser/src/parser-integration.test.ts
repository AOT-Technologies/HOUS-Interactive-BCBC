import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { extractContentIds, getGlossaryMap, parseBCBC } from './parser';

const sourcePath = join(__dirname, '../../../data/source/bcbc-2024.json');

function loadSourceDocument() {
  return JSON.parse(readFileSync(sourcePath, 'utf-8'));
}

describe('parseBCBC with source data', () => {
  it('parses the current source file', () => {
    const result = parseBCBC(loadSourceDocument());

    expect(result.metadata.title).toBe('National Building Code of Canada 2020');
    expect(result.metadata.version).toBe('2020');
    expect(result.volumes.length).toBeGreaterThan(0);
    expect(result.volumes[0].divisions.length).toBeGreaterThan(0);

    const firstDivision = result.volumes[0].divisions[0];
    expect(firstDivision.parts.length).toBeGreaterThan(0);
    expect(firstDivision.parts[0].sections.length).toBeGreaterThan(0);
  });

  it('extracts content IDs from the current source file', () => {
    const result = parseBCBC(loadSourceDocument());
    const ids = extractContentIds(result);

    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain(result.volumes[0].divisions[0].id);
    expect(ids).toContain(result.volumes[0].divisions[0].parts[0].id);
  });

  it('creates a glossary map from the current source file', () => {
    const result = parseBCBC(loadSourceDocument());
    const glossaryMap = getGlossaryMap(result);
    const firstGlossaryEntry = result.glossary[0];

    expect(result.glossary.length).toBeGreaterThan(0);
    expect(firstGlossaryEntry).toBeDefined();
    expect(glossaryMap.get(firstGlossaryEntry.id)?.term).toBe(firstGlossaryEntry.term);
    expect(glossaryMap.get(firstGlossaryEntry.term.toLowerCase())?.id).toBe(firstGlossaryEntry.id);
  });
});
