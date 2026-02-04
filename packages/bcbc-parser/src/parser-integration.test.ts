/**
 * Integration tests for BCBC parser with sample data
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseBCBC, extractContentIds, getGlossaryMap } from './parser';

describe('parseBCBC with sample data', () => {
  it('should parse the sample BCBC JSON file', () => {
    // Read the sample file
    const samplePath = join(__dirname, '../../../data/samples/bcbc-sample.json');
    const sampleData = JSON.parse(readFileSync(samplePath, 'utf-8'));

    // Parse the data
    const result = parseBCBC(sampleData);

    // Verify metadata
    expect(result.metadata).toBeDefined();
    expect(result.metadata.title).toBe('National Building Code of Canada 2020');
    expect(result.metadata.version).toBe('2020');

    // Verify divisions
    expect(result.divisions).toHaveLength(1);
    expect(result.divisions[0].id).toBe('nbc.divA');
    expect(result.divisions[0].title).toBe('Compliance, Objectives and Functional Statements');

    // Verify nested structure
    const division = result.divisions[0];
    expect(division.parts).toHaveLength(1);
    expect(division.parts[0].number).toBe('1');
    expect(division.parts[0].title).toBe('Compliance');

    const part = division.parts[0];
    expect(part.sections).toHaveLength(1);
    expect(part.sections[0].number).toBe('1');

    const section = part.sections[0];
    expect(section.subsections).toHaveLength(1);
    expect(section.subsections[0].number).toBe('1');

    const subsection = section.subsections[0];
    expect(subsection.articles).toHaveLength(1);
    expect(subsection.articles[0].number).toBe('1');

    // Verify article content
    const article = subsection.articles[0];
    expect(article.clauses.length).toBeGreaterThan(0);
    expect(article.clauses[0].text).toContain('This Code applies');

    // Verify glossary terms are extracted
    const clauseWithTerms = article.clauses.find((c) => c.glossaryTerms.length > 0);
    expect(clauseWithTerms).toBeDefined();
    expect(clauseWithTerms!.glossaryTerms).toContain('bldng');

    // Verify glossary
    expect(result.glossary).toHaveLength(2);
    const buildingTerm = result.glossary.find((g) => g.term === 'Building');
    expect(buildingTerm).toBeDefined();
    expect(buildingTerm!.definition).toContain('structure');
  });

  it('should extract all content IDs from sample', () => {
    const samplePath = join(__dirname, '../../../data/samples/bcbc-sample.json');
    const sampleData = JSON.parse(readFileSync(samplePath, 'utf-8'));
    const result = parseBCBC(sampleData);

    const ids = extractContentIds(result);

    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain('nbc.divA');
    expect(ids).toContain('nbc.divA.part1');
  });

  it('should create glossary map from sample', () => {
    const samplePath = join(__dirname, '../../../data/samples/bcbc-sample.json');
    const sampleData = JSON.parse(readFileSync(samplePath, 'utf-8'));
    const result = parseBCBC(sampleData);

    const glossaryMap = getGlossaryMap(result);

    expect(glossaryMap.size).toBeGreaterThan(0);
    expect(glossaryMap.get('bldng')).toBeDefined();
    expect(glossaryMap.get('building')).toBeDefined(); // lowercase lookup
    expect(glossaryMap.get('bldng')?.term).toBe('Building');
  });
});
