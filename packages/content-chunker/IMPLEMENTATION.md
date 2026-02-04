# Content Chunker Implementation

## Overview

The content-chunker package has been fully implemented to split BCBC content into optimized chunks and extract metadata for navigation, glossary, and filtering.

## Implemented Features

### 1. Content Splitting (chunker.ts)

**Functions:**
- `chunkContent(document)` - Splits BCBC content by section level
- `generateChunkPath(divisionId, partNumber, sectionNumber)` - Generates chunk file paths
- `isOptimalChunkSize(chunk)` - Validates chunk size is within 50-200KB range
- `getChunkStats(chunks)` - Calculates statistics for all chunks

**Chunking Strategy:**
- Each chunk contains a complete section with all subsections and articles
- Chunks are organized by path: `content/{division}/{part}/{section}.json`
- Example: `content/division-a/part-1/section-1-1.json`
- Typical chunk size: 50-200KB per section

### 2. Metadata Extraction (metadata-extractor.ts)

**Functions:**
- `extractMetadata(document)` - Extracts all metadata types
- `extractNavigationTree(document)` - Generates hierarchical navigation structure
- `extractGlossaryMap(document)` - Creates term → definition map
- `extractContentTypes(document)` - Identifies all content types in document
- `extractQuickAccess(document)` - Extracts frequently accessed sections

**Generated Metadata:**

1. **Navigation Tree** - Hierarchical structure following:
   - Division → Part → Section → Subsection → Article
   - Each node includes: id, type, number, title, path, children

2. **Glossary Map** - Term definitions for inline glossary
   - Lowercase keys for case-insensitive lookups
   - Maps term → GlossaryEntry

3. **Amendment Dates** - Available effective dates for filtering
   - Passed through from document.amendmentDates

4. **Content Types** - Available content types for search filters
   - Scans document to identify: article, table, figure, note, application-note
   - Only includes types that are actually present in the document

5. **Quick Access** - Frequently accessed sections for homepage
   - Currently extracts first section from each part
   - Can be customized based on usage analytics

## Test Coverage

**Unit Tests:**
- `chunker.test.ts` - 9 tests covering all chunking functions
- `metadata-extractor.test.ts` - 10 tests covering all extraction functions
- `integration.test.ts` - 1 integration test with sample BCBC data

**Total: 20 tests, all passing**

## Usage Example

```typescript
import { chunkContent, extractMetadata } from '@bc-building-code/content-chunker';
import { parseBCBC } from '@bc-building-code/bcbc-parser';

// Parse BCBC JSON
const document = parseBCBC(bcbcJson);

// Split content into chunks
const chunks = chunkContent(document);
// chunks[0].path = 'content/division-a/part-1/section-1-1.json'
// chunks[0].data = Section object with all subsections and articles
// chunks[0].size = 75000 (bytes)

// Extract metadata
const metadata = extractMetadata(document);
// metadata.navigationTree = [{ id: 'division-a', type: 'division', ... }]
// metadata.glossaryMap = { 'building': { term: 'Building', definition: '...' } }
// metadata.amendmentDates = [{ date: '2024-01-01', description: '...' }]
// metadata.contentTypes = ['article', 'table', 'figure', 'note']
// metadata.quickAccess = [{ id: 'section-1-1', title: '...', path: '...' }]
```

## Integration with Build Pipeline

This package will be integrated into the build pipeline (task 11) to:

1. Read parsed BCBC document from bcbc-parser
2. Generate content chunks and save to `apps/web/public/data/content/`
3. Generate metadata files:
   - `navigation-tree.json`
   - `glossary-map.json`
   - `amendment-dates.json`
   - `content-types.json`
   - `quick-access.json`

## Requirements Satisfied

- ✅ Requirement 2.3: Generate navigation tree JSON file
- ✅ Requirement 2.4: Generate glossary map JSON file
- ✅ Requirement 2.5: Generate amendment dates JSON file
- ✅ Requirement 2.6: Generate content types JSON file
- ✅ Requirement 2.7: Generate quick access JSON file
- ✅ Requirement 2.8: Split content into optimized JSON chunks by division/part/section

## Next Steps

Task 11 will integrate this package into the build pipeline orchestration script (`scripts/generate-assets.ts`).
