# BCBC Parser Implementation

## Overview

The BCBC parser transforms the raw BC Building Code JSON data from the source format into a standardized, type-safe structure that can be used throughout the application.

## Key Features

### 1. Nested Structure Parsing

The parser handles the complete hierarchical structure:
- **Divisions** (A, B, C)
- **Parts** (numbered sections within divisions)
- **Sections** (numbered sections within parts)
- **Subsections** (numbered subsections within sections)
- **Articles** (numbered articles with content)
- **Clauses** (lettered clauses with optional subclauses)

### 2. Content Parsing

The parser extracts and transforms:
- **Sentences** with text content
- **Clauses** (a, b, c, etc.) with subclauses (1, 2, 3, etc.)
- **Tables** with headers, rows, and cell merging (colspan/rowspan)
- **Figures** with images, captions, and alt text
- **Equations** with LaTeX notation
- **Note references** embedded in text

### 3. Glossary Term Extraction

The parser automatically extracts glossary term references from text:
- Format: `[REF:term:termId]termText`
- Example: `[REF:term:bldng]building` → extracts term ID "bldng"
- Terms are stored in the `glossaryTerms` array for each clause

### 4. Glossary Parsing

The source glossary is stored as an object with term IDs as keys:
```json
{
  "bldng": {
    "term": "Building",
    "definition": "Any structure...",
    "location_id": "..."
  }
}
```

The parser converts this to an array of `GlossaryEntry` objects for easier use.

### 5. Amendment Date Parsing

The parser extracts amendment dates and affected sections for filtering functionality.

## Source Data Format

The source JSON (`data/source/bcbc-2024.json`) has this structure:

```json
{
  "document_type": "bc_building_code",
  "version": "2020",
  "metadata": {
    "title": "...",
    "publication_date": "..."
  },
  "divisions": [
    {
      "id": "nbc.divA",
      "type": "division",
      "letter": "A",
      "parts": [
        {
          "id": "nbc.divA.part1",
          "type": "part",
          "number": 1,
          "sections": [
            {
              "subsections": [
                {
                  "articles": [
                    {
                      "content": [
                        {
                          "type": "sentence",
                          "text": "...",
                          "clauses": [
                            {
                              "type": "clause",
                              "letter": "a",
                              "text": "...",
                              "subclauses": [...]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "glossary": {
    "termId": {
      "term": "Term Name",
      "definition": "..."
    }
  }
}
```

## Parsed Output Format

The parser outputs a standardized `BCBCDocument` structure:

```typescript
interface BCBCDocument {
  metadata: DocumentMetadata;
  divisions: Division[];
  glossary: GlossaryEntry[];
  amendmentDates: AmendmentDate[];
}
```

Key transformations:
- Glossary: Object → Array
- Numbers: All converted to strings for consistency
- Clauses: Sentences and clauses flattened into a single clauses array
- Glossary terms: Automatically extracted from text references

## Usage

```typescript
import { parseBCBC, getGlossaryMap, extractContentIds } from '@bc-building-code/bcbc-parser';

// Parse the source JSON
const document = parseBCBC(sourceJson);

// Get all content IDs
const ids = extractContentIds(document);

// Create glossary lookup map
const glossaryMap = getGlossaryMap(document);
const term = glossaryMap.get('bldng'); // Get by ID
const termByName = glossaryMap.get('building'); // Get by lowercase term
```

## Helper Functions

### `extractContentIds(document)`
Extracts all IDs from the document hierarchy (divisions, parts, sections, subsections, articles, clauses).

### `getGlossaryMap(document)`
Creates a Map for fast glossary lookups by both term ID and lowercase term name.

### `getAmendmentDates(document)`
Extracts unique amendment dates sorted chronologically.

### `parseDivision(jsonData, divisionId)`
Parses only a specific division from the source JSON.

## Testing

The parser includes comprehensive tests:
- **Unit tests** (`parser.test.ts`): Test individual parsing functions
- **Integration tests** (`parser-integration.test.ts`): Test with actual sample data

Run tests:
```bash
cd packages/bcbc-parser
npx vitest run
```

## Sample Data

A sample JSON file is provided at `data/samples/bcbc-sample.json` that matches the source format and can be used for testing and development.
