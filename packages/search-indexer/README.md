# @bc-building-code/search-indexer

FlexSearch index generation for BC Building Code.

## Purpose

This package generates pre-built FlexSearch indexes at build time for client-side search functionality.

## Features

- FlexSearch configuration optimized for BCBC content
- Index generation from parsed BCBC data
- Index serialization to JSON
- Metadata extraction for search results

## Usage

```typescript
import { createSearchIndex, exportIndex } from '@bc-building-code/search-indexer';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';

// Create search index from BCBC document
const index = createSearchIndex(document);

// Add content to index
index.addArticle(article);
index.addSection(section);
index.addGlossaryTerm(term);

// Export index to JSON
const indexData = exportIndex(index);
fs.writeFileSync('search-index.json', JSON.stringify(indexData));
```

## Index Configuration

The search index is configured with:
- **Tokenization**: Forward tokenization for prefix matching
- **Boost values**: Article numbers (3.0x), titles (2.0x), content (1.0x)
- **Resolution**: High resolution (9) for precise matching
- **Stored fields**: ID, number, title, type, breadcrumb, path, snippet

## Development

```bash
# Type check
pnpm type-check

# Run tests
pnpm test

# Lint
pnpm lint
```
