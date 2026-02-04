# BC Building Code Interactive - Project Structure

Complete overview of the project directory structure and data flow.

---

## Directory Structure

```
bc-building-code/
│
├── data/                                # Data directory
│   ├── source/                         # ✅ SOURCE DATA (INPUT)
│   │   ├── versions.json              # Version configuration (NEW)
│   │   ├── bcbc-2024.json             # BC Building Code 2024 (10-50 MB)
│   │   ├── bcbc-2027.json             # BC Building Code 2027 (future)
│   │   └── README.md                   # Source data documentation
│   │
│   └── samples/                        # Sample/test data
│       ├── bcbc-sample.json           # Small sample for testing (~500 KB)
│       └── README.md                   # Sample data documentation
│
├── apps/
│   └── web/                            # Next.js application
│       ├── app/                        # App Router
│       │   ├── layout.tsx             # Root layout (with version store init)
│       │   ├── page.tsx               # Home page
│       │   └── globals.css            # Global styles
│       │
│       ├── components/                 # React components
│       │   ├── home/                  # Homepage components
│       │   │   ├── HomeSidebarContent.tsx  # Sidebar with version selector
│       │   │   └── QuickAccessPins.tsx
│       │   ├── navigation/            # Navigation components
│       │   │   ├── VersionSelector.tsx     # Version dropdown (NEW)
│       │   │   ├── VersionSelector.css
│       │   │   ├── Breadcrumbs.tsx
│       │   │   ├── NavigationTree.tsx
│       │   │   └── PrevNextNav.tsx
│       │   └── layout/                # Layout components
│       │
│       ├── hooks/                      # Custom React hooks
│       │   ├── useSearchClient.ts     # Version-aware search hook
│       │   └── useUrlNavigation.ts
│       │
│       ├── lib/                        # Utility libraries
│       │   ├── search-client.ts       # Version-aware search client
│       │   └── url-utils.ts           # URL utilities with version support
│       │
│       ├── stores/                     # Zustand stores
│       │   ├── version-store.ts       # Version state management (NEW)
│       │   ├── navigation-store.ts    # Version-aware navigation
│       │   ├── content-store.ts       # Version-aware content
│       │   ├── amendment-date-store.ts # Version-aware dates
│       │   ├── glossary-store.ts      # Version-aware glossary
│       │   ├── search-store.ts        # Version-aware search
│       │   └── ui-store.ts
│       │
│       ├── styles/                     # Theme configuration
│       │   └── .gitkeep
│       │
│       ├── public/
│       │   └── data/                   # ❌ GENERATED ASSETS (OUTPUT)
│       │       ├── versions.json       # Version index (NEW)
│       │       ├── 2024/              # BC Building Code 2024 (NEW)
│       │       │   ├── search/
│       │       │   │   ├── documents.json   # FlexSearch index
│       │       │   │   └── metadata.json    # Search metadata
│       │       │   ├── navigation-tree.json # Navigation structure
│       │       │   ├── glossary-map.json    # Glossary definitions
│       │       │   ├── amendment-dates.json # Available dates
│       │       │   ├── content-types.json   # Content type filters
│       │       │   ├── quick-access.json    # Homepage pins
│       │       │   └── content/             # Content chunks
│       │       │       ├── nbc-diva/
│       │       │       │   ├── part-1/
│       │       │       │   │   ├── section-1.json
│       │       │       │   │   └── section-2.json
│       │       │       │   └── part-2/
│       │       │       └── nbc-divb/
│       │       └── 2027/              # BC Building Code 2027 (future)
│       │           └── ... (same structure as 2024)
│       │
│       ├── .eslintrc.json             # ESLint configuration
│       ├── .prettierrc                 # Prettier configuration
│       ├── next.config.js              # Next.js configuration
│       ├── tsconfig.json               # TypeScript configuration
│       ├── package.json                # Package dependencies
│       └── README.md                   # App documentation
│
├── packages/                           # Shared packages
│   ├── ui/                            # ✅ BC Design System UI components
│   │   ├── src/
│   │   │   ├── button/                # Button component
│   │   │   ├── header/                # Header with navigation
│   │   │   ├── footer/                # Footer component
│   │   │   ├── icon/                  # Icon system
│   │   │   ├── link/                  # Link component
│   │   │   ├── modal-side/            # Side modal for content
│   │   │   ├── modal-glossary-content/ # Glossary modal content
│   │   │   ├── modal-building-code-content/ # Building code modal
│   │   │   ├── checkbox-group/        # Checkbox group
│   │   │   ├── radio-group/           # Radio group
│   │   │   ├── number-field/          # Number input field
│   │   │   ├── tooltip/               # Tooltip component
│   │   │   ├── link-card/             # Card with link
│   │   │   ├── checkbox-card/         # Selectable card
│   │   │   ├── confirmation-modal/    # Confirmation dialog
│   │   │   ├── pre-footer/            # Pre-footer section
│   │   │   ├── result-pdf-button/     # PDF download button
│   │   │   ├── result-pdf-print-content/ # Print content
│   │   │   ├── input-error/           # Error message display
│   │   │   ├── image/                 # Next.js Image wrapper
│   │   │   ├── button-modal-close/    # Modal close button
│   │   │   └── variables.css          # BC Design System CSS variables
│   │   ├── tests/                     # Test utilities
│   │   ├── turbo/generators/          # Component generator
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.mts            # Vitest configuration
│   │   └── README.md
│   │
│   ├── constants/                     # ✅ Shared constants
│   │   ├── src/
│   │   │   ├── constants.ts           # General constants
│   │   │   ├── urls.ts                # URL constants
│   │   │   ├── ids.ts                 # Element IDs
│   │   │   └── testids.ts             # Test IDs
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── data/                          # ✅ Data types and hooks
│   │   ├── src/
│   │   │   ├── hooks/
│   │   │   │   ├── useLocalStorage.ts
│   │   │   │   ├── useSearch.ts
│   │   │   │   └── useWalkthroughsData.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── bcbc-parser/                   # ✅ BCBC JSON parsing & validation
│   │   ├── src/
│   │   │   ├── parser.ts              # Main parsing logic
│   │   │   ├── types.ts               # TypeScript type definitions
│   │   │   └── validators.ts          # Schema validation
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── search-indexer/                # ✅ FlexSearch index generation
│   │   ├── src/
│   │   │   ├── indexer.ts             # Index creation logic
│   │   │   ├── config.ts              # FlexSearch configuration
│   │   │   ├── export.ts              # Index serialization
│   │   │   └── text-extractor.ts      # Text extraction utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── content-chunker/               # ✅ Content splitting & metadata extraction
│   │   ├── src/
│   │   │   ├── chunker.ts             # Content splitting logic
│   │   │   └── metadata-extractor.ts  # Navigation tree and glossary extraction
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── eslint-config/                 # ✅ Shared ESLint config
│   │   ├── index.js
│   │   ├── next.js
│   │   └── package.json
│   │
│   └── typescript-config/             # ✅ Shared TypeScript configurations
│       ├── base.json
│       ├── nextjs.json
│       ├── react-library.json
│       ├── package.json
│       └── README.md
│
├── scripts/                           # Build-time scripts
│   ├── generate-assets.ts            # Multi-version asset generation (NEW)
│   ├── generate-assets-multi-version.ts  # Multi-version script
│   ├── generate-assets-single-version-backup.ts  # Legacy backup
│   └── README.md
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

### Build Time (Multi-Version Asset Generation)

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUILD TIME                               │
└─────────────────────────────────────────────────────────────────┘

1. Version Configuration
   📄 /data/source/versions.json
   │
   ▼
2. For Each Version:
   📁 /data/source/bcbc-{year}.json (10-50 MB)
   │
   ▼
3. Parse & Validate
   📦 @bc-building-code/bcbc-parser
   │
   ├─▶ 4a. Generate Search Index
   │   📦 @bc-building-code/search-indexer
   │   │
   │   ├─▶ 📄 /apps/web/public/data/{version}/search/documents.json
   │   └─▶ 📄 /apps/web/public/data/{version}/search/metadata.json
   │
   ├─▶ 4b. Extract Metadata
   │   📦 @bc-building-code/content-chunker
   │   │
   │   ├─▶ 📄 /apps/web/public/data/{version}/navigation-tree.json
   │   ├─▶ 📄 /apps/web/public/data/{version}/glossary-map.json
   │   ├─▶ 📄 /apps/web/public/data/{version}/amendment-dates.json
   │   ├─▶ 📄 /apps/web/public/data/{version}/content-types.json
   │   └─▶ 📄 /apps/web/public/data/{version}/quick-access.json
   │
   └─▶ 4c. Chunk Content
       📦 @bc-building-code/content-chunker
       │
       ▼
       📁 /apps/web/public/data/{version}/content/[division]/[part]/[section].json

5. Generate Version Index
   │
   ▼
   📄 /apps/web/public/data/versions.json
```

### Runtime (Client-Side with Version Support)

```
┌─────────────────────────────────────────────────────────────────┐
│                         RUNTIME (CLIENT)                         │
└─────────────────────────────────────────────────────────────────┘

6. Application Loads
   │
   ├─▶ Load versions.json (on init)
   ├─▶ Select version (from URL, localStorage, or default)
   │
   ├─▶ Load version-specific data:
   │   ├─▶ Load search index (on init or lazy)
   │   ├─▶ Load navigation-tree.json (on init)
   │   ├─▶ Load glossary-map.json (on init)
   │   ├─▶ Load amendment-dates.json (on init)
   │   ├─▶ Load content-types.json (on init)
   │   └─▶ Load quick-access.json (on init)
   │
   └─▶ User Navigates
       │
       └─▶ Lazy load content chunks (on demand)
           📄 /apps/web/public/data/{version}/content/[path].json

7. User Switches Version
   │
   ├─▶ Update URL with version parameter
   ├─▶ Clear cached data for old version
   ├─▶ Load data for new version (steps 6)
   └─▶ Re-render UI with new version data
```

---

## Key Directories

### `/data/source/` - Source Data (Input)

**Purpose:** Store BC Building Code JSON files and version configuration

**Contents:**
- `versions.json` - Version configuration (NEW - required)
- `bcbc-2024.json` - BC Building Code 2024 (10-50 MB)
- `bcbc-2027.json` - BC Building Code 2027 (future)
- `README.md` - Documentation

**Git:** ✅ Committed to version control (or use Git LFS if > 100 MB)

**When to use:**
- Place BC Building Code JSON files here
- Update `versions.json` when adding new versions
- Update when new versions are released
- Reference in build pipeline

**Version Configuration Example:**
```json
{
  "versions": [
    {
      "id": "2024",
      "year": 2024,
      "title": "BC Building Code 2024",
      "sourceFile": "bcbc-2024.json",
      "isDefault": true,
      "publishedDate": "2024-01-01",
      "status": "current"
    }
  ]
}
```

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

**Purpose:** Store generated static assets for the web app (multi-version)

**Structure:**
```
apps/web/public/data/
├── versions.json          # Version index (NEW)
├── 2024/                  # BC Building Code 2024
│   ├── search/
│   │   ├── documents.json
│   │   └── metadata.json
│   ├── navigation-tree.json
│   ├── glossary-map.json
│   ├── amendment-dates.json
│   ├── content-types.json
│   ├── quick-access.json
│   └── content/
└── 2027/                  # BC Building Code 2027 (future)
    └── ... (same structure)
```

**Git:** ❌ NOT committed (in .gitignore)

**When to use:**
- Generated by build pipeline
- Served to clients
- Regenerated on each build
- Each version has its own directory

### `/packages/` - Shared Packages

**Purpose:** Reusable packages for parsing, indexing, and chunking

**Packages:**
1. **ui** ✅ - BC Design System UI components (React, CSS)
2. **constants** ✅ - Shared constants (URLs, IDs, test IDs)
3. **data** ✅ - Data types and hooks (glossary, walkthroughs)
4. **typescript-config** ✅ - Shared TypeScript configurations
5. **bcbc-parser** ✅ - Parse and validate BCBC JSON
6. **search-indexer** ✅ - Generate FlexSearch indexes
7. **content-chunker** ✅ - Split content and extract metadata
8. **eslint-config** ✅ - Shared ESLint configuration

**Git:** ✅ Committed to version control

**When to use:**
- Shared logic across the monorepo
- Build pipeline operations
- Type definitions
- Multi-version asset generation

### `/scripts/` - Build Scripts

**Purpose:** Orchestrate the multi-version build pipeline

**Contents:**
- `generate-assets.ts` - Multi-version build script (NEW)
- `generate-assets-multi-version.ts` - Multi-version implementation
- `generate-assets-single-version-backup.ts` - Legacy backup
- `README.md` - Build script documentation

**Git:** ✅ Committed to version control

**When to use:**
- Run `npx pnpm generate-assets` (processes all versions)
- Run `npx pnpm generate-assets:2024` (single version)
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
| Version configuration | `/data/source/versions.json` | Version metadata (NEW) |
| BC Building Code JSON | `/data/source/bcbc-{year}.json` | Source data input |
| Sample data | `/data/samples/bcbc-sample.json` | Testing |
| Generated assets | `/apps/web/public/data/{version}/` | Build output (version-specific) |
| Version index | `/apps/web/public/data/versions.json` | Version list (generated) |
| React components | `/apps/web/components/` | UI code |
| Version selector | `/apps/web/components/navigation/VersionSelector.tsx` | Version UI (NEW) |
| Custom hooks | `/apps/web/hooks/` | React hooks |
| Utilities | `/apps/web/lib/` | Helper functions |
| Stores | `/apps/web/stores/` | State management |
| Version store | `/apps/web/stores/version-store.ts` | Version state (NEW) |
| Shared packages | `/packages/` | Reusable code |
| Build scripts | `/scripts/` | Automation |
| Documentation | `/docs/` | Guides and references |

### Common Commands

```bash
# Place source data
cp ~/bcbc-2024.json data/source/

# Create version configuration
# Edit data/source/versions.json

# Generate assets for all versions
npx pnpm generate-assets

# Generate assets for single version
npx pnpm generate-assets:2024

# Clean generated assets
npx pnpm generate-assets:clean

# Start development
npx pnpm dev

# Build for production
npx pnpm build
```

### Version Management

```bash
# Add new version
cp ~/bcbc-2027.json data/source/
# Edit data/source/versions.json to add 2027
npx pnpm generate-assets

# See docs/HOW-TO-ADD-NEW-VERSION.md for complete guide
```

---

## Related Documentation

- [COMMANDS.md](./COMMANDS.md) - Complete command reference
- [DATA-MANAGEMENT.md](./DATA-MANAGEMENT.md) - Data management guide
- [HOW-TO-ADD-NEW-VERSION.md](./HOW-TO-ADD-NEW-VERSION.md) - Version management guide (NEW)
- [MULTI-VERSION-IMPLEMENTATION-COMPLETE.md](./MULTI-VERSION-IMPLEMENTATION-COMPLETE.md) - Implementation summary (NEW)
- [USER-FLOW.md](./USER-FLOW.md) - User flow documentation
- [../README.md](../README.md) - Project README
- [../.kiro/specs/bcbc-interactive-web-app/design.md](../.kiro/specs/bcbc-interactive-web-app/design.md) - Design document

---

**Last Updated:** February 4, 2026  
**Version:** 2.0 (Multi-Version Support)
