# BC Building Code Interactive Web Application

A client-side search application for the British Columbia Building Code, enabling users to search, navigate, and explore building code requirements through an intuitive web interface.

**Multi-Version Support:** The application supports multiple BC Building Code versions (2024, 2027, etc.) with seamless switching between versions.

## Tech Stack

- **Monorepo**: Turborepo
- **Framework**: Next.js 16+ (App Router, Static Export)
- **Language**: TypeScript (strict mode)
- **UI**: React 19 + BC Design System (@repo/ui)
- **Search**: FlexSearch (client-side, pre-built indexes)
- **Package Manager**: pnpm (v8.15.0+)
- **Node**: v18.0.0+

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BUILD TIME                           │
│  /data/source/versions.json (version config)            │
│  /data/source/bcbc-{year}.json (per version)            │
│         ↓                                               │
│  Parser → FlexSearch Index + Content Chunks             │
│         ↓                                               │
│  /apps/web/public/data/{version}/ (per version)         │
│  /apps/web/public/data/versions.json (index)            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    RUNTIME (Client)                     │
│  Load Versions → Select Version → Load Index →          │
│  Search → Lazy Load Content → Render                    │
│                                                         │
│  User Switches Version → Reload Data → Re-render        │
└─────────────────────────────────────────────────────────┘
```

**No backend required** — all search and content delivery happens client-side using pre-generated static assets.

## Features

- **Multi-version support** with seamless switching between BC Building Code versions
- **Full-text search** with instant results via FlexSearch
- **Hierarchical navigation** (Division → Part → Section → Article)
- **Inline glossary** with clickable term definitions
- **Effective date filtering** for viewing amendments
- **Responsive design** for desktop and mobile
- **WCAG AAA accessible**
- **Deep linking** - all pages bookmarkable and shareable with full state preservation

## Project Structure

```
bc-building-code/
├── data/
│   ├── source/            # BC Building Code JSON source (input)
│   │   ├── versions.json  # Version configuration (NEW)
│   │   ├── bcbc-2024.json # BC Building Code 2024
│   │   └── bcbc-2027.json # BC Building Code 2027 (future)
│   └── samples/           # Sample data for testing
├── apps/web/              # Next.js application
│   └── public/data/       # Generated assets (output)
│       ├── versions.json  # Version index (generated)
│       ├── 2024/          # Version-specific assets
│       └── 2027/          # Future version assets
├── packages/
│   ├── ui/                # ✅ BC Design System UI components
│   ├── constants/         # ✅ Shared constants (URLs, IDs, test IDs)
│   ├── data/              # ✅ Data types and hooks
│   ├── bcbc-parser/       # JSON parsing & validation
│   ├── search-indexer/    # FlexSearch index generation
│   └── content-chunker/   # Content splitting utilities
├── scripts/               # Build-time asset generation
└── docs/                  # Documentation
    ├── COMMANDS.md        # Command reference
    ├── DATA-MANAGEMENT.md # Data management guide
    ├── HOW-TO-ADD-NEW-VERSION.md # Version management guide
    └── BC-DESIGN-SYSTEM.md # BC Design System integration guide
```

## Quick Start

```bash
# 1. Install dependencies
npx pnpm install

# 2. Set up version configuration
# Create data/source/versions.json (see docs/HOW-TO-ADD-NEW-VERSION.md)

# 3. Place BC Building Code JSON in data/source/
cp ~/path/to/bcbc-2024.json data/source/

# 4. Generate search index and content from BCBC JSON
npx pnpm generate-assets

# 5. Start development server
npx pnpm dev

# 6. Build for production
npx pnpm build
```

## Version Management

### Current Versions

The application currently supports BC Building Code 2024. Additional versions can be added easily.

### Adding a New Version

See [docs/HOW-TO-ADD-NEW-VERSION.md](docs/HOW-TO-ADD-NEW-VERSION.md) for complete instructions.

**Quick steps:**
1. Add source JSON: `data/source/bcbc-2027.json`
2. Update `data/source/versions.json` to include new version
3. Run `npx pnpm generate-assets`
4. Done! Version selector will show both versions

### Version Switching

Users can switch between versions using the dropdown in the sidebar. The application:
- Loads version-specific data (navigation, search index, content)
- Updates URL with version parameter (`?version=2024`)
- Preserves version selection in localStorage
- Supports bookmarking and sharing links with version

## Data Source

### Version Configuration

Create `data/source/versions.json` to define available versions:

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

### Source Files

Place BC Building Code JSON files in `data/source/`:
```
data/source/
├── versions.json      # Version configuration
├── bcbc-2024.json     # BC Building Code 2024
└── bcbc-2027.json     # BC Building Code 2027 (future)
```

For testing, use sample data:
```bash
cp data/samples/bcbc-sample.json data/source/bcbc-2024.json
```

See [docs/DATA-MANAGEMENT.md](docs/DATA-MANAGEMENT.md) for complete data management guide.

## Key Commands

| Command | Description |
|---------|-------------|
| `npx pnpm dev` | Start dev server |
| `npx pnpm build` | Production build |
| `npx pnpm generate-assets` | Generate search index & content chunks from `/data/source/` |
| `npx pnpm lint` | Run linting |
| `npx pnpm test` | Run tests |

See [docs/COMMANDS.md](docs/COMMANDS.md) for complete command reference.

## BC Design System

The application uses the BC Design System UI component library with 20+ accessible, government-standard components including:

- Layout: Header, Footer, PreFooter
- Forms: Button, Checkbox, Radio, NumberField
- Navigation: Link, LinkCard
- Modals: ModalSide, ConfirmationModal
- Display: Icon, Image, Tooltip

All components meet WCAG AAA accessibility standards. See [docs/BC-DESIGN-SYSTEM.md](docs/BC-DESIGN-SYSTEM.md) for complete integration guide.

## Deployment

Static export deployed to BC Government OpenShift as containerized static assets.

## License

Copyright © Province of British Columbia