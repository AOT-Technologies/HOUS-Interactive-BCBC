# @bc-building-code/bcbc-parser

BCBC JSON parsing and validation package.

## Purpose

This package provides TypeScript types and utilities for parsing and validating BC Building Code JSON data.

## Features

- TypeScript type definitions for BCBC data structures
- JSON parsing logic
- Schema validation
- Cross-reference validation

## Usage

```typescript
import { parseBCBC, validateBCBC } from '@bc-building-code/bcbc-parser';
import type { BCBCDocument, Division, Article } from '@bc-building-code/bcbc-parser/types';

// Parse BCBC JSON
const document = parseBCBC(jsonData);

// Validate structure
const errors = validateBCBC(document);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

## Type Definitions

- `BCBCDocument`: Root document structure
- `Division`: Division A, B, or C
- `Part`: Part within a division
- `Section`: Section within a part
- `Subsection`: Subsection within a section
- `Article`: Article with clauses
- `Clause`: Individual clause with text and subclauses
- `Table`, `Figure`, `Equation`: Content elements
- `GlossaryEntry`: Glossary term definition
- `AmendmentDate`: Effective date for amendments

## Development

```bash
# Type check
pnpm type-check

# Run tests
pnpm test

# Lint
pnpm lint
```
