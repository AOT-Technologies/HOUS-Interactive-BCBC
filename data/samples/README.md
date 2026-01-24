# Sample BC Building Code Data

This directory contains sample/test data for development and testing purposes.

## Purpose

- **Development:** Test the build pipeline without the full dataset
- **Testing:** Validate parser, indexer, and chunker logic
- **CI/CD:** Run automated tests quickly
- **Documentation:** Provide examples of the expected JSON structure

## Files

### `bcbc-sample.json`
A minimal sample of the BC Building Code structure containing:
- 1-2 divisions
- A few parts and sections
- Sample articles with clauses
- Example tables, figures, equations
- Sample glossary entries
- Sample amendment dates

**Size:** ~100-500 KB (much smaller than full dataset)

## Usage

### For Development

```bash
# Copy sample to source location
cp data/samples/bcbc-sample.json data/source/bcbc-2024.json

# Generate assets from sample
npx pnpm generate-assets

# Start dev server
npx pnpm dev
```

### For Testing

```bash
# Run parser tests with sample data
npx pnpm --filter @bc-building-code/bcbc-parser test

# Validate sample structure
npx pnpm --filter @bc-building-code/bcbc-parser validate data/samples/bcbc-sample.json
```

## Creating Sample Data

When creating sample data:

1. **Include all structure types:**
   - Divisions, Parts, Sections, Subsections, Articles
   - Clauses with subclauses
   - Tables with merged cells
   - Figures with captions
   - Equations (inline and block)
   - Cross-references
   - Note references
   - Glossary terms

2. **Keep it small but representative:**
   - 1-2 divisions
   - 2-3 parts per division
   - 3-5 sections per part
   - 5-10 articles total
   - 10-20 glossary terms

3. **Include edge cases:**
   - Empty sections
   - Deeply nested clauses
   - Complex tables
   - Multiple amendment dates
   - Various cross-reference formats

## Sample Structure Template

```json
{
  "metadata": {
    "title": "BC Building Code 2024 - Sample",
    "version": "2024-sample",
    "effectiveDate": "2024-12-01",
    "publisher": "Province of British Columbia"
  },
  "divisions": [
    {
      "id": "divA",
      "title": "Division A - Compliance, Objectives and Functional Statements",
      "type": "division",
      "parts": [...]
    }
  ],
  "glossary": [
    {
      "term": "Building",
      "definition": "A structure consisting of a wall, roof and floor..."
    }
  ],
  "amendmentDates": [
    {
      "date": "2024-12-01",
      "label": "December 1, 2024",
      "description": "Initial release"
    }
  ]
}
```

## Benefits of Sample Data

✅ **Faster development:** Quick iteration without processing large files
✅ **Easier debugging:** Smaller dataset is easier to inspect
✅ **Faster tests:** Unit tests run in milliseconds
✅ **Better CI/CD:** Faster pipeline execution
✅ **Documentation:** Clear examples for developers

---

**Last Updated:** January 19, 2026
