/**
 * Integration tests with current source BCBC data
 */

import { describe, it, expect } from 'vitest';
import { chunkContent, getChunkStats } from './chunker';
import { extractMetadata } from './metadata-extractor';
import { parseBCBC } from '@bc-building-code/bcbc-parser';
import * as fs from 'fs';
import * as path from 'path';

describe('Integration with current source BCBC data', () => {
  it('processes data/source/bcbc-2024.json', () => {
    const sourcePath = path.resolve(__dirname, '../../../data/source/bcbc-2024.json');
    const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
    const document = parseBCBC(sourceData);

    const chunks = chunkContent(document);
    expect(chunks.length).toBeGreaterThan(0);

    const stats = getChunkStats(chunks);
    expect(stats.totalChunks).toBe(chunks.length);
    expect(stats.averageSize).toBeGreaterThan(0);

    const metadata = extractMetadata(document);
    expect(metadata.navigationTree.length).toBeGreaterThan(0);
    expect(Object.keys(metadata.glossaryMap).length).toBeGreaterThan(0);
    expect(metadata.contentTypes).toContain('article');
    expect(metadata.quickAccess.length).toBeGreaterThan(0);
  });
});
