# @bc-building-code/content-chunker

Content splitting and metadata extraction for BC Building Code.

## Purpose

This package splits BCBC content into optimized chunks and extracts metadata for navigation, glossary, and filtering.

## Features

- Content splitting by section level
- Navigation tree generation
- Glossary map extraction
- Amendment dates extraction
- Content types extraction
- Quick access sections extraction

## Usage

```typescript
import { chunkContent, extractMetadata } from '@bc-building-code/content-chunker';
import type { BCBCDocument } from '@bc-building-code/bcbc-parser';

// Split content into chunks
const chunks = chunkContent(document);

// chunks organized as:
// content/division-a/part-1/section-1-1.json
// content/division-a/part-1/section-1-2.json
// etc.

// Extract metadata
const metadata = extractMetadata(document);

// metadata includes:
// - navigationTree: Hierarchical structure
// - glossaryMap: Term → Definition
// - amendmentDates: Available dates
// - contentTypes: Available content types
// - quickAccess: Frequently accessed sections
```

## Chunking Strategy

Content is split by Section level:
- Each chunk contains a complete section with all subsections and articles
- Typical chunk size: 50-200KB per section
- Chunks are organized by path: `content/{division}/{part}/{section}.json`

## Metadata Files

Generated metadata files:
1. `navigation-tree.json` - Hierarchical TOC structure
2. `glossary-map.json` - Term definitions
3. `amendment-dates.json` - Effective dates
4. `content-types.json` - Filter options
5. `quick-access.json` - Homepage pins

## Development

```bash
# Type check
pnpm type-check

# Run tests
pnpm test

# Lint
pnpm lint
```
