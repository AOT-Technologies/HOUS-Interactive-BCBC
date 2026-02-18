# Build Scripts

This directory contains build-time scripts for the BC Building Code application.

## Scripts

### `generate-assets.ts`

The main orchestration script that generates all static assets from the source BCBC JSON file.

**Purpose:** Transform the source BC Building Code JSON into optimized, pre-processed assets for the web application.

**Usage:**

```bash
# Run via pnpm (recommended)
npx pnpm generate-assets

# Run directly with tsx
npx tsx scripts/generate-assets.ts

# Use sample data
SAMPLE_MODE=true npx tsx scripts/generate-assets.ts

# Custom source file
SOURCE_FILE=data/samples/bcbc-sample.json npx tsx scripts/generate-assets.ts
```

**Environment Variables:**

- `SOURCE_FILE` - Path to source JSON (default: `data/source/bcbc-2024.json`)
- `OUTPUT_DIR` - Output directory (default: `apps/web/public/data`)
- `SAMPLE_MODE` - Use sample data (default: `false`)

**Pipeline Steps:**

1. **Clean Output Directory** - Remove old generated assets
2. **Load Source Data** - Read and parse BCBC JSON
3. **Validate Data** - Validate structure and schema (Sprint 1 Task 8)
4. **Generate Search Index** - Create FlexSearch index (Sprint 1 Task 9)
5. **Generate Navigation Tree** - Extract TOC structure (Sprint 1 Task 10)
6. **Generate Glossary Map** - Extract term definitions (Sprint 1 Task 10)
7. **Generate Equation Map** - Extract equation definitions for `[EQ:*:*]` markers
8. **Generate Amendment Dates** - Extract available dates (Sprint 1 Task 10)
9. **Generate Content Types** - Extract content type list (Sprint 1 Task 10)
10. **Generate Quick Access** - Create homepage pins (Sprint 1 Task 10)
11. **Generate Content Chunks** - Split content by section (Sprint 1 Task 10)

**Output Files:**

```
apps/web/public/data/
├── search-index.json          # Pre-built FlexSearch index
├── navigation-tree.json       # Navigation structure
├── glossary-map.json          # Glossary term definitions
├── equation-map.json          # Equation definitions keyed by equation id
├── amendment-dates.json       # Available amendment dates
├── content-types.json         # Content type filter options
├── quick-access.json          # Homepage quick access pins
└── content/                   # Chunked content by division/part/section
    ├── division-a/
    │   ├── part-1/
    │   │   ├── section-1-1.json
    │   │   └── section-1-2.json
    │   └── part-2/
    └── division-b/
```

**Current Status:**

✅ **Fully Implemented** - The complete pipeline is operational (Sprint 1 Task 11 Complete)
✅ **All Integrations Complete** - All packages integrated and working:
  - Task 8: BCBC Parser (validation) ✅
  - Task 9: Search Indexer (FlexSearch index generation) ✅
  - Task 10: Content Chunker (metadata extraction and content splitting) ✅
  - Task 11: Build Pipeline Orchestration ✅

**Performance:**

- Processes 2-3 KB sample data in ~15ms
- Expected to process 10-50 MB production data in < 30 seconds
- Outputs optimized JSON files for fast client-side loading

**Error Handling:**

The script includes comprehensive error handling:
- File not found errors
- JSON parsing errors
- Validation errors (Sprint 1)
- Write permission errors
- Detailed error messages with context

**Logging:**

Color-coded console output:
- 🔵 Info messages (blue)
- ✅ Success messages (green)
- ⚠️ Warning messages (yellow)
- ❌ Error messages (red)
- ▶️ Step headers (cyan)

**Integration with Turborepo:**

The script is integrated into the Turborepo pipeline:

```json
{
  "tasks": {
    "generate-assets": {
      "cache": false,
      "outputs": ["apps/web/public/data/**"]
    }
  }
}
```

This ensures:
- Assets are generated before Next.js build
- Output directory is tracked for caching
- Dependencies are handled correctly

**Development Workflow:**

1. **First Time Setup:**
   ```bash
   npx pnpm install
   npx pnpm generate-assets
   ```

2. **When Source Data Changes:**
   ```bash
   npx pnpm generate-assets
   ```

3. **Testing with Sample Data:**
   ```bash
   cp data/samples/bcbc-sample.json data/source/bcbc-2024.json
   npx pnpm generate-assets
   ```

4. **Before Deployment:**
   ```bash
   npx pnpm generate-assets
   npx pnpm build
   ```

**Troubleshooting:**

**Problem:** Script fails with "Cannot find module"
**Solution:** Run `npx pnpm install` to install dependencies

**Problem:** "ENOENT: no such file or directory"
**Solution:** Ensure `data/source/bcbc-2024.json` exists

**Problem:** "Unexpected token in JSON"
**Solution:** Validate JSON with `cat data/source/bcbc-2024.json | jq .`

**Problem:** Permission denied writing to output directory
**Solution:** Check write permissions on `apps/web/public/data/`

**Problem:** Out of memory error
**Solution:** Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 npx tsx scripts/generate-assets.ts`

## Future Scripts

Additional scripts may be added for:
- Data validation (`validate-bcbc.ts`)
- Asset optimization (`optimize-assets.ts`)
- Index rebuilding (`rebuild-index.ts`)
- Content migration (`migrate-content.ts`)

## Contributing

When adding new scripts:

1. Use TypeScript with strict mode
2. Add comprehensive error handling
3. Include progress logging
4. Document environment variables
5. Add to this README
6. Update `package.json` scripts if needed
7. Integrate with Turborepo if appropriate

## Related Documentation

- **Project Structure**: `docs/PROJECT-STRUCTURE.md`
- **Data Management**: `docs/DATA-MANAGEMENT.md`
- **Build Pipeline**: `.kiro/specs/bcbc-interactive-web-app/tasks.md` (Sprint 0 Task 6)
- **Parser Package**: `packages/bcbc-parser/README.md`
- **Search Indexer**: `packages/search-indexer/README.md`
- **Content Chunker**: `packages/content-chunker/README.md`

---

**Last Updated:** January 28, 2026
**Status:** Sprint 1 Task 11 Complete ✅ - Full Pipeline Operational
