# @bc-building-code/search-indexer

FlexSearch index generation for BC Building Code content.

## Overview

This package generates search documents and metadata from BCBC JSON source data. It produces:

- **documents.json**: Flat array of searchable documents (articles, tables, figures, etc.)
- **metadata.json**: Unified metadata including TOC, revision dates, divisions, and statistics
- Individual files for backward compatibility (navigation-tree.json, amendment-dates.json, etc.)

## Installation

```bash
pnpm add @bc-building-code/search-indexer
```

## Usage

### Basic Usage

```typescript
import { buildSearchIndex, exportAll } from '@bc-building-code/search-indexer';
import fs from 'fs';

// Load BCBC JSON
const bcbcData = JSON.parse(fs.readFileSync('bcbc-2024.json', 'utf-8'));

// Build index with default config
const { documents, metadata } = buildSearchIndex(bcbcData);

// Export to JSON
const result = exportAll(documents, metadata, { prettyPrint: true });

// Write files
fs.writeFileSync('documents.json', result.documents);
fs.writeFileSync('metadata.json', result.metadata);
```

### Custom Configuration

```typescript
import { 
  buildSearchIndex, 
  DEFAULT_INDEXER_CONFIG,
  type IndexerConfig 
} from '@bc-building-code/search-indexer';

const config: Partial<IndexerConfig> = {
  // Customize content types to index
  contentTypes: {
    ...DEFAULT_INDEXER_CONFIG.contentTypes,
    glossary: { enabled: false, priority: 0, amendmentBoost: 1 },
    note: { enabled: false, priority: 0, amendmentBoost: 1 },
  },
  
  // Customize reference handling
  references: {
    stripFromSearchText: true,
    preserveReferenceIds: true,
    processTypes: ['term', 'internal'], // Only process these ref types
  },
  
  // Customize text extraction
  textExtraction: {
    includeSentences: true,
    includeClauses: true,
    includeSubclauses: true,
    maxTextLength: 5000,
    snippetLength: 150,
  },
  
  // Customize output
  output: {
    generateMetadataJson: true,
    generateIndividualFiles: true,
    prettyPrint: false,
    includeStatistics: true,
  },
};

const { documents, metadata } = buildSearchIndex(bcbcData, config);
```

## Configuration Options

### Content Types

Control which content types are indexed and their search priority:

| Content Type | Default Priority | Description |
|--------------|-----------------|-------------|
| `part` | 10 | Part-level navigation |
| `section` | 9 | Section-level navigation |
| `subsection` | 8 | Subsection-level navigation |
| `table` | 7 | Tables within articles |
| `figure` | 7 | Figures within articles |
| `glossary` | 6 | Glossary terms |
| `article` | 5 | Code articles |
| `note` | 4 | Notes and application notes |

### Reference Parsing

Configure how `[REF:type:id]` tags are handled:

```typescript
references: {
  // Strip [REF:...] tags from searchable text
  stripFromSearchText: true,
  
  // Keep reference IDs in a separate field for linking
  preserveReferenceIds: true,
  
  // Which reference types to process
  processTypes: ['term', 'internal', 'external', 'standard'],
}
```

Reference types:
- `term`: Glossary term references (`[REF:term:bldng]building`)
- `internal`: Internal code references (`[REF:internal:nbc.divB.part3:long]`)
- `external`: External document references
- `standard`: Standard references (CSA, ASTM, etc.)

### Text Extraction

Control how text is extracted from articles:

```typescript
textExtraction: {
  includeSentences: true,    // Include sentence text
  includeClauses: true,      // Include clause text
  includeSubclauses: true,   // Include subclause text (recursive)
  maxTextLength: 10000,      // Max characters per document
  snippetLength: 200,        // Snippet length for display
}
```

## Output Structure

### documents.json

```json
[
  {
    "id": "nbc.divA.part1.sect1.subsect1.art1",
    "type": "article",
    "articleNumber": "A.1.1.1.1",
    "title": "Application of this Code",
    "text": "This Code applies to...",
    "snippet": "This Code applies to...",
    "divisionId": "nbc.divA",
    "divisionLetter": "A",
    "divisionTitle": "Compliance, Objectives and Functional Statements",
    "partId": "nbc.divA.part1",
    "partNumber": 1,
    "partTitle": "Compliance",
    "sectionId": "nbc.divA.part1.sect1",
    "sectionNumber": 1,
    "sectionTitle": "General",
    "subsectionId": "nbc.divA.part1.sect1.subsect1",
    "subsectionNumber": 1,
    "subsectionTitle": "Application of this Code",
    "path": "Division A > Part 1 > Section 1 > 1.1",
    "breadcrumbs": ["Compliance...", "Compliance", "General", "Application..."],
    "urlPath": "/code/nbc.divA/1/1/1/1",
    "hasAmendment": false,
    "hasInternalRefs": true,
    "hasTermRefs": true,
    "hasTables": false,
    "hasFigures": false,
    "searchPriority": 5
  }
]
```

### metadata.json

```json
{
  "version": "2020",
  "generatedAt": "2026-01-29T04:51:34.982Z",
  "statistics": {
    "totalDocuments": 3100,
    "totalArticles": 2080,
    "totalTables": 229,
    "totalFigures": 22,
    "totalParts": 15,
    "totalSections": 104,
    "totalSubsections": 465,
    "totalAmendments": 81,
    "totalRevisionDates": 6,
    "totalGlossaryTerms": 185
  },
  "divisions": [...],
  "revisionDates": [
    {
      "effectiveDate": "2024-08-27",
      "displayDate": "August 27, 2024",
      "count": 8,
      "type": "amendment"
    }
  ],
  "tableOfContents": [...],
  "contentTypes": ["article", "table", "figure", "part", "section", "subsection", "glossary"]
}
```

## API Reference

### buildSearchIndex(bcbcData, config?)

Build search documents and metadata from BCBC JSON.

**Parameters:**
- `bcbcData`: Raw BCBC JSON document
- `config`: Optional partial configuration (merged with defaults)

**Returns:** `{ documents: SearchDocument[], metadata: SearchMetadata }`

### exportAll(documents, metadata, options?)

Export documents and metadata to JSON strings.

**Parameters:**
- `documents`: Array of search documents
- `metadata`: Search metadata
- `options`: Export options (prettyPrint, generateMetadataJson, generateIndividualFiles)

**Returns:** `ExportResult` with JSON strings for each file

### Text Extraction Utilities

```typescript
import {
  extractReferences,      // Extract all [REF:...] from text
  stripReferences,        // Remove [REF:...] tags, keep display text
  extractArticleText,     // Extract searchable text from article
  extractTableText,       // Extract searchable text from table
  generateSnippet,        // Create truncated snippet
  normalizeWhitespace,    // Clean up whitespace
} from '@bc-building-code/search-indexer';
```

## Integration with Runtime Client

The generated files are designed to work with the runtime search client in `apps/web/lib/search-client.ts`:

```typescript
// Runtime client loads documents.json and metadata.json
// Builds FlexSearch index at runtime for fast search
import { initializeSearch } from '../lib/search-client';

const client = await initializeSearch();
const results = await client.search('fire separation', {
  divisionFilter: 'B',
  amendmentsOnly: true,
  limit: 20,
});
```

## Performance

Typical generation times for ~2000 articles:
- Index building: ~200ms
- Export to JSON: ~300ms
- Total: ~500ms

Output sizes:
- documents.json: ~5-6 MB (uncompressed)
- metadata.json: ~800 KB (uncompressed)
- Gzipped: ~1 MB total
