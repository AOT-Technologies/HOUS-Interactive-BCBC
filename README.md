# BC Building Code Interactive Web Application

A client-side search application for the 2024 British Columbia Building Code, enabling users to search, navigate, and explore building code requirements through an intuitive web interface.

## Tech Stack

- **Monorepo**: Turborepo
- **Framework**: Next.js 14+ (App Router, Static Export)
- **Language**: TypeScript
- **UI**: React 18 + Chakra UI
- **Search**: FlexSearch (client-side, pre-built indexes)

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
│   ├── bcbc-parser/       # JSON parsing & types
│   ├── search-indexer/    # FlexSearch index generation
│   ├── content-chunker/   # Content splitting utilities
│   └── ui/                # Shared components
├── scripts/               # Build-time asset generation
└── docs/                  # Documentation
    ├── COMMANDS.md        # Command reference
    └── DATA-MANAGEMENT.md # Data management guide
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

## Deployment

Static export deployed to BC Government OpenShift as containerized static assets.

## License

Copyright © Province of British Columbia