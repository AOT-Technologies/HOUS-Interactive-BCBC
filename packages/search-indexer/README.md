# @bc-building-code/search-indexer

FlexSearch index generation for BC Building Code.

## Purpose

This package generates pre-built FlexSearch indexes at build time for client-side search functionality.

## Features

- FlexSearch configuration optimized for BCBC content
- Index generation from parsed BCBC data
- Automatic extraction of searchable content (articles, sections, notes, glossary)
- Index serialization to JSON for client-side loading
- Metadata generation for search results (breadcrumbs, paths, snippets)

## Usage

```typescript
import {
  createSearchIndex,
  extractSearchableContent,
  exportIndex,
  getIndexStats,
} from '@bc-building-code/search-indexer';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';

// Parse BCBC document
const document: BCBCDocument = parseBCBC(jsonData);

// Create search index from BCBC document
const index = createSearchIndex(document);

// Extract searchable items for reference
const searchableItems = extractSearchableContent(document);

// Export index to JSON
const indexData = await exportIndex(index, searchableItems);

// Get index statistics
const stats = getIndexStats(searchableItems, indexData);
console.log(`Indexed ${stats.documentCount} items (${stats.indexSizeKB} KB)`);

// Write to file
fs.writeFileSync('public/data/search-index.json', indexData);
```

## Index Configuration

The search index is configured with:
- **Tokenization**: Forward tokenization for prefix matching
- **Boost values**: Article numbers (3.0x), titles (2.0x), content (1.0x)
- **Resolution**: High resolution (9) for precise matching
- **Cache**: Enabled for performance
- **Indexed fields**: title, number
- **Content types**: Articles, sections, notes, glossary terms

## Searchable Content

The indexer automatically extracts and indexes:
- **Sections**: Section titles and numbers
- **Articles**: Article titles, numbers, and clause content
- **Notes**: Note titles, numbers, and content
- **Glossary**: Terms and definitions

Each indexed item includes:
- Unique ID
- Content type (article, section, note, glossary)
- Number (e.g., "1.1.1.1")
- Title
- Snippet (first 200 characters)
- Breadcrumb path (e.g., ["Division A", "Part 1", "Section 1.1"])
- URL path (e.g., "/code/division-a/1/1.1/1.1.1/1.1.1.1")

## Development

```bash
# Type check
pnpm type-check

# Run tests
pnpm test

# Lint
pnpm lint
```

## Requirements

Implements requirements:
- 2.2: Build pipeline generates FlexSearch index
- 3.1: Search returns results within 100ms
- 3.2: Search across article titles, clause text, notes, and glossary terms
