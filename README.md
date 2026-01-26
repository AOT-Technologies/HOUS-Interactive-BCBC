# BC Building Code Interactive Web Application

A client-side search application for the 2024 British Columbia Building Code, enabling users to search, navigate, and explore building code requirements through an intuitive web interface.

## Tech Stack

- **Monorepo**: Turborepo
- **Framework**: Next.js 14+ (App Router, Static Export)
- **Language**: TypeScript (strict mode)
- **UI**: React 18 + BC Design System (@repo/ui)
- **Search**: FlexSearch (client-side, pre-built indexes)
- **Package Manager**: pnpm (v8.15.0+)
- **Node**: v18.0.0+

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BUILD TIME                           │
│  /data/source/bcbc-2024.json                            │
│         ↓                                               │
│  Parser → FlexSearch Index + Content Chunks             │
│         ↓                                               │
│  /apps/web/public/data/ (generated assets)              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    RUNTIME (Client)                     │
│  Load Index → Search → Lazy Load Content → Render       │
└─────────────────────────────────────────────────────────┘
```

**No backend required** — all search and content delivery happens client-side using pre-generated static assets.

## Features

- **Full-text search** with instant results via FlexSearch
- **Hierarchical navigation** (Division → Part → Section → Article)
- **Inline glossary** with clickable term definitions
- **Effective date filtering** for viewing amendments
- **Responsive design** for desktop and mobile
- **WCAG AAA accessible**

## Project Structure

```
bc-building-code/
├── data/
│   ├── source/            # BC Building Code JSON source (input)
│   │   └── bcbc-2024.json # Place your BC Building Code JSON here
│   └── samples/           # Sample data for testing
├── apps/web/              # Next.js application
│   └── public/data/       # Generated assets (output)
├── packages/
│   ├── ui/                # ✅ BC Design System UI components
│   ├── constants/         # ✅ Shared constants (URLs, IDs, test IDs)
│   ├── data/              # ✅ Data types and hooks
│   ├── bcbc-parser/       # JSON parsing & validation (to be created)
│   ├── search-indexer/    # FlexSearch index generation (to be created)
│   └── content-chunker/   # Content splitting utilities (to be created)
├── scripts/               # Build-time asset generation
└── docs/                  # Documentation
    ├── COMMANDS.md        # Command reference
    ├── DATA-MANAGEMENT.md # Data management guide
    └── BC-DESIGN-SYSTEM.md # BC Design System integration guide
```

## Quick Start

```bash
# 1. Install dependencies
npx pnpm install

# 2. Place BC Building Code JSON in data/source/
cp ~/path/to/bcbc-2024.json data/source/

# 3. Generate search index and content from BCBC JSON
npx pnpm generate-assets

# 4. Start development server
npx pnpm dev

# 5. Build for production
npx pnpm build
```

## Data Source

Place your BC Building Code JSON file at:
```
/data/source/bcbc-2024.json
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