# BC Building Code Interactive - Project Structure

Complete overview of the project directory structure and data flow.

---

## Directory Structure

```
bc-building-code/
│
├── data/                                # Data directory (NEW)
│   ├── source/                         # ✅ SOURCE DATA (INPUT)
│   │   ├── bcbc-2024.json             # Main BC Building Code JSON (10-50 MB)
│   │   ├── bcbc-2024-amendments.json  # Optional: Separate amendments
│   │   └── README.md                   # Source data documentation
│   │
│   └── samples/                        # Sample/test data
│       ├── bcbc-sample.json           # Small sample for testing (~500 KB)
│       └── README.md                   # Sample data documentation
│
├── apps/
│   └── web/                            # Next.js application
│       ├── app/                        # App Router
│       │   ├── layout.tsx             # Root layout
│       │   ├── page.tsx               # Home page
│       │   └── globals.css            # Global styles
│       │
│       ├── components/                 # React components
│       │   └── .gitkeep
│       │
│       ├── hooks/                      # Custom React hooks
│       │   └── .gitkeep
│       │
│       ├── lib/                        # Utility libraries
│       │   └── .gitkeep
│       │
│       ├── styles/                     # Theme configuration
│       │   └── .gitkeep
│       │
│       ├── public/
│       │   └── data/                   # ❌ GENERATED ASSETS (OUTPUT)
│       │       ├── search-index.json   # FlexSearch index
│       │       ├── navigation-tree.json # Navigation structure
│       │       ├── glossary-map.json   # Glossary definitions
│       │       ├── amendment-dates.json # Available dates
│       │       └── content/            # Content chunks
│       │           ├── divA/
│       │           │   ├── part1/
│       │           │   │   ├── section1.json
│       │           │   │   └── section2.json
│       │           │   └── part2/
│       │           └── divB/
│       │
│       ├── .eslintrc.json             # ESLint configuration
│       ├── .prettierrc                 # Prettier configuration
│       ├── next.config.js              # Next.js configuration
│       ├── tsconfig.json               # TypeScript configuration
│       ├── package.json                # Package dependencies
│       └── README.md                   # App documentation
│
├── packages/                           # Shared packages (to be created)
│   ├── bcbc-parser/                   # BCBC JSON parsing & validation
│   │   ├── src/
│   │   │   ├── parser.ts              # Main parsing logic
│   │   │   ├── types.ts               # TypeScript type definitions
│   │   │   └── validators.ts          # Schema validation
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── search-indexer/                # FlexSearch index generation
│   │   ├── src/
│   │   │   ├── indexer.ts             # Index creation logic
│   │   │   ├── config.ts              # FlexSearch configuration
│   │   │   └── export.ts              # Index serialization
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── content-chunker/               # Content splitting & metadata extraction
│   │   ├── src/
│   │   │   ├── chunker.ts             # Content splitting logic
│   │   │   └── metadata-extractor.ts  # Navigation tree and glossary extraction
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                            # Shared UI components
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── tsconfig/                      # Shared TypeScript configurations
│       ├── base.json
│       ├── nextjs.json
│       └── react-library.json
│
├── scripts/                           # Build-time scripts
│   └── generate-assets.ts            # Orchestrates the build pipeline
│
├── docs/                              # Project documentation
│   ├── COMMANDS.md                    # Command reference
│   ├── DATA-MANAGEMENT.md             # Data management guide
│   ├── PROJECT-STRUCTURE.md           # This file
│   └── Sprint-Zero-Completed.md       # Sprint progress
│
├── .gitignore                         # Git ignore rules
├── turbo.json                         # Turborepo configuration
├── package.json                       # Root package.json
├── pnpm-workspace.yaml                # pnpm workspace config
└── README.md                          # Project README
```

---

## Data Flow

### Build Time (Asset Generation)

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUILD TIME                               │
└─────────────────────────────────────────────────────────────────┘

1. Source Data
   📁 /data/source/bcbc-2024.json (10-50 MB)
   │
   ▼
2. Parse & Validate
   📦 @bc-building-code/bcbc-parser
   │
   ├─▶ 3a. Generate Search Index
   │   📦 @bc-building-code/search-indexer
   │   │
   │   ▼
   │   📄 /apps/web/public/data/search-index.json (5-15 MB)
   │
   ├─▶ 3b. Extract Metadata
   │   📦 @bc-building-code/content-chunker
   │   │
   │   ├─▶ 📄 /apps/web/public/data/navigation-tree.json (100-500 KB)
   │   ├─▶ 📄 /apps/web/public/data/glossary-map.json (50-200 KB)
   │   └─▶ 📄 /apps/web/public/data/amendment-dates.json (1-5 KB)
   │
   └─▶ 3c. Chunk Content
       📦 @bc-building-code/content-chunker
       │
       ▼
       📁 /apps/web/public/data/content/[division]/[part]/[section].json
          (10-50 MB total, 50-200 KB per chunk)
```

### Runtime (Client-Side)

```
┌─────────────────────────────────────────────────────────────────┐
│                         RUNTIME (CLIENT)                         │
└─────────────────────────────────────────────────────────────────┘

4. Application Loads
   │
   ├─▶ Load search-index.json (on init)
   ├─▶ Load navigation-tree.json (on init)
   ├─▶ Load glossary-map.json (on init)
   ├─▶ Load amendment-dates.json (on init)
   │
   └─▶ User Navigates
       │
       └─▶ Lazy load content chunks (on demand)
           📄 /apps/web/public/data/content/divA/part1/section1.json
```

---

## Key Directories

### `/data/source/` - Source Data (Input)

**Purpose:** Store the original BC Building Code JSON file

**Contents:**
- `bcbc-2024.json` - Main source file (10-50 MB)
- `bcbc-2024-amendments.json` - Optional amendments
- `README.md` - Documentation

**Git:** ✅ Committed to version control (or use Git LFS if > 100 MB)

**When to use:**
- Place your BC Building Code JSON here
- Update when new versions are released
- Reference in build pipeline

### `/data/samples/` - Sample Data

**Purpose:** Smaller test data for development

**Contents:**
- `bcbc-sample.json` - Small sample (~500 KB)
- `README.md` - Documentation

**Git:** ✅ Committed to version control

**When to use:**
- Fast development iteration
- Unit testing
- CI/CD pipelines
- Documentation examples

### `/apps/web/public/data/` - Generated Assets (Output)

**Purpose:** Store generated static assets for the web app

**Contents:**
- `search-index.json` - FlexSearch index
- `navigation-tree.json` - Navigation structure
- `glossary-map.json` - Glossary definitions
- `amendment-dates.json` - Available dates
- `content/` - Content chunks by division/part/section

**Git:** ❌ NOT committed (in .gitignore)

**When to use:**
- Generated by build pipeline
- Served to clients
- Regenerated on each build

### `/packages/` - Shared Packages

**Purpose:** Reusable packages for parsing, indexing, and chunking

**Packages:**
1. **bcbc-parser** - Parse and validate BCBC JSON
2. **search-indexer** - Generate FlexSearch indexes
3. **content-chunker** - Split content and extract metadata
4. **ui** - Shared UI components
5. **tsconfig** - Shared TypeScript configurations

**Git:** ✅ Committed to version control

**When to use:**
- Shared logic across the monorepo
- Build pipeline operations
- Type definitions

### `/scripts/` - Build Scripts

**Purpose:** Orchestrate the build pipeline

**Contents:**
- `generate-assets.ts` - Main build script

**Git:** ✅ Committed to version control

**When to use:**
- Run `npx pnpm generate-assets`
- Automate asset generation
- CI/CD pipelines

### `/docs/` - Documentation

**Purpose:** Project documentation

**Contents:**
- `COMMANDS.md` - Command reference
- `DATA-MANAGEMENT.md` - Data management guide
- `PROJECT-STRUCTURE.md` - This file
- `Sprint-Zero-Completed.md` - Sprint progress

**Git:** ✅ Committed to version control

---

## File Size Reference

| File/Directory | Size | Description |
|----------------|------|-------------|
| `/data/source/bcbc-2024.json` | 10-50 MB | Source BC Building Code |
| `/data/samples/bcbc-sample.json` | ~500 KB | Sample for testing |
| `/apps/web/public/data/search-index.json` | 5-15 MB | FlexSearch index |
| `/apps/web/public/data/navigation-tree.json` | 100-500 KB | Navigation structure |
| `/apps/web/public/data/glossary-map.json` | 50-200 KB | Glossary definitions |
| `/apps/web/public/data/amendment-dates.json` | 1-5 KB | Available dates |
| `/apps/web/public/data/content/` | 10-50 MB | Content chunks (total) |
| Each content chunk | 50-200 KB | Individual section |

---

## Git Management

### What to Commit ✅

- `/data/source/` - Source BC Building Code JSON
- `/data/samples/` - Sample data
- `/apps/web/` - Application code
- `/packages/` - Shared packages
- `/scripts/` - Build scripts
- `/docs/` - Documentation
- Configuration files (tsconfig.json, package.json, etc.)

### What NOT to Commit ❌

- `/apps/web/public/data/` - Generated assets
- `/apps/web/.next/` - Next.js build
- `/apps/web/out/` - Static export
- `/node_modules/` - Dependencies
- `.turbo/` - Turbo cache

### .gitignore Configuration

```gitignore
# Generated assets (output from build pipeline)
apps/web/public/data/

# Source data (optional - uncomment if file is too large)
# data/source/bcbc-*.json

# Keep sample data in Git
!data/samples/*.json
```

---

## Quick Reference

### Where to Put Things

| What | Where | Why |
|------|-------|-----|
| BC Building Code JSON | `/data/source/bcbc-2024.json` | Source data input |
| Sample data | `/data/samples/bcbc-sample.json` | Testing |
| Generated assets | `/apps/web/public/data/` | Build output |
| React components | `/apps/web/components/` | UI code |
| Custom hooks | `/apps/web/hooks/` | React hooks |
| Utilities | `/apps/web/lib/` | Helper functions |
| Shared packages | `/packages/` | Reusable code |
| Build scripts | `/scripts/` | Automation |
| Documentation | `/docs/` | Guides and references |

### Common Commands

```bash
# Place source data
cp ~/bcbc-2024.json data/source/

# Generate assets
npx pnpm generate-assets

# Start development
npx pnpm dev

# Build for production
npx pnpm build
```

---

## Related Documentation

- [COMMANDS.md](./COMMANDS.md) - Complete command reference
- [DATA-MANAGEMENT.md](./DATA-MANAGEMENT.md) - Data management guide
- [Sprint-Zero-Completed.md](./Sprint-Zero-Completed.md) - Sprint progress
- [../README.md](../README.md) - Project README
- [../.kiro/specs/bcbc-interactive-web-app/design.md](../.kiro/specs/bcbc-interactive-web-app/design.md) - Design document

---

**Last Updated:** January 19, 2026  
**Version:** 1.0
