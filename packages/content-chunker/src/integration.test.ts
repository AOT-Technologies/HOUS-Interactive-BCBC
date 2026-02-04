/**
 * Integration tests with sample BCBC data
 */

import { describe, it, expect } from 'vitest';
import { chunkContent, getChunkStats } from './chunker';
import { extractMetadata } from './metadata-extractor';
import { parseBCBC } from '@bc-building-code/bcbc-parser';
import * as fs from 'fs';
import * as path from 'path';

describe('Integration with sample BCBC data', () => {
  it('should process sample BCBC JSON', () => {
    // Read sample data
    const samplePath = path.resolve(__dirname, '../../../data/samples/bcbc-sample.json');
    
    // Skip if sample file doesn't exist
    if (!fs.existsSync(samplePath)) {
      console.log('Sample file not found, skipping integration test');
      return;
    }

    const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
    const document = parseBCBC(sampleData);

    // Test chunking
    const chunks = chunkContent(document);
    expect(chunks.length).toBeGreaterThan(0);

    const stats = getChunkStats(chunks);
    expect(stats.totalChunks).toBe(chunks.length);
    expect(stats.averageSize).toBeGreaterThan(0);

    console.log('Chunk statistics:', stats);

    // Test metadata extraction
    const metadata = extractMetadata(document);
    
    expect(metadata.navigationTree.length).toBeGreaterThan(0);
    expect(Object.keys(metadata.glossaryMap).length).toBeGreaterThan(0);
    expect(metadata.contentTypes).toContain('article');
    
    console.log('Navigation tree nodes:', metadata.navigationTree.length);
    console.log('Glossary terms:', Object.keys(metadata.glossaryMap).length);
    console.log('Content types:', metadata.contentTypes);
    console.log('Quick access sections:', metadata.quickAccess.length);
  });
});
