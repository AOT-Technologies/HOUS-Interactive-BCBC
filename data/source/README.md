# BC Building Code Source Data

This directory contains the source JSON files for the BC Building Code that will be processed by the build pipeline.

## Files

### `bcbc-2024.json`
The complete BC Building Code 2024 in JSON format. This is the primary source file that the build pipeline processes.

**Size:** Expected to be several MB (2000+ pages of content)

**Format:** JSON with hierarchical structure:
- Divisions
- Parts
- Sections
- Subsections
- Articles
- Clauses
- Tables, Figures, Equations
- Notes
- Glossary entries
- Amendment dates

### `bcbc-2024-amendments.json` (Optional)
Supplementary amendment data if needed separately from the main file.

## Usage

The build pipeline reads from this directory:

```bash
# Generate all static assets from source data
npx pnpm generate-assets
```

This will:
1. Parse `bcbc-2024.json` using `@bc-building-code/bcbc-parser`
2. Generate FlexSearch index using `@bc-building-code/search-indexer`
3. Create content chunks using `@bc-building-code/content-chunker`
4. Output all assets to `apps/web/public/data/`

## File Requirements

The JSON file must conform to the BCBC JSON schema defined in `packages/bcbc-parser/src/types.ts`.

### Required Top-Level Structure

```json
{
  "metadata": {
    "title": "British Columbia Building Code 2024",
    "version": "2024",
    "effectiveDate": "2024-12-01",
    "publisher": "Province of British Columbia"
  },
  "divisions": [...],
  "glossary": [...],
  "amendmentDates": [...]
}
```

## Version Control

- ✅ **DO** commit this file to Git (it's the source of truth)
- ✅ **DO** use Git LFS if the file is very large (>100MB)
- ✅ **DO** document any changes to the source data
- ❌ **DON'T** commit generated assets from `apps/web/public/data/`

## Git LFS (if needed)

If the JSON file is very large, use Git LFS:

```bash
# Install Git LFS
git lfs install

# Track large JSON files
git lfs track "data/source/*.json"

# Commit the .gitattributes file
git add .gitattributes
git commit -m "Configure Git LFS for source data"
```

## Data Updates

When updating the BC Building Code data:

1. Replace `bcbc-2024.json` with the new version
2. Run validation: `npx pnpm --filter @bc-building-code/bcbc-parser validate`
3. Regenerate assets: `npx pnpm generate-assets`
4. Test the application: `npx pnpm dev`
5. Commit the updated source file

## Sample Data

For development and testing, use the sample file in `data/samples/`:

```bash
# Use sample data for testing
cp data/samples/bcbc-sample.json data/source/bcbc-2024.json
npx pnpm generate-assets
```

## Security & Licensing

- Ensure you have the right to use and distribute this data
- The BC Building Code is a public document, but verify licensing terms
- Do not include any proprietary or confidential information

## File Size Considerations

- **Expected size:** 10-50 MB for full building code
- **Compression:** Consider gzipping for storage (`.json.gz`)
- **Git LFS:** Use if file exceeds 100 MB
- **Chunking:** The build pipeline will chunk this into smaller files for the web app

## Troubleshooting

### File Too Large for Git

```bash
# Use Git LFS
git lfs track "data/source/*.json"
git add .gitattributes
git add data/source/bcbc-2024.json
git commit -m "Add BC Building Code source data with Git LFS"
```

### Validation Errors

```bash
# Validate the JSON structure
npx pnpm --filter @bc-building-code/bcbc-parser validate data/source/bcbc-2024.json
```

### Build Pipeline Fails

```bash
# Check the JSON is valid
cat data/source/bcbc-2024.json | jq . > /dev/null

# Run with verbose logging
DEBUG=* npx pnpm generate-assets
```

---

**Last Updated:** January 19, 2026
