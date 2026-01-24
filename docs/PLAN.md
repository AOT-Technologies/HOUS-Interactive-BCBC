# BC Building Code Interactive Web Application - Project Description

## Project Overview

This project delivers a **free, publicly accessible, interactive web application** for the 2024 British Columbia Building Code (BCBC). The application enables building officials, construction professionals, and the public to efficiently search, navigate, and understand the 2000+ page technical building code document.

### Core Problem Being Solved

The BCBC is currently available only as a PDF, which users find difficult to navigate. This application transforms the structured JSON representation of the BCBC into an intuitive, searchable web interface with inline glossary definitions, hierarchical navigation, and effective-date filtering.

---

## Technical Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | Turborepo |
| **Framework** | Next.js 14+ (App Router) |
| **Language** | TypeScript (strict mode) |
| **UI Library** | React 18 |
| **Component Library** | Chakra UI (BC Design System aligned) |
| **Search Engine** | FlexSearch (client-side, pre-built indexes) |
| **Styling** | Chakra UI + CSS-in-JS |
| **Build Output** | Static Site Generation (SSG) / Static Export |
| **Hosting Target** | BC Gov OpenShift (containerized static assets) |

### Key Architectural Decisions

1. **No Backend**: The application is entirely client-side with pre-generated static assets
2. **Pre-built Search Indexes**: FlexSearch indexes are generated at build time from the BCBC JSON
3. **Static JSON Chunks**: Code content is split into optimized chunks for lazy loading
4. **Offline-Capable**: Core search functionality works without network after initial load

---

## Data Pipeline (Build-Time)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BUILD PIPELINE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐  │
│  │   BCBC JSON  │────▶│  Index Generator │────▶│ FlexSearch      │  │
│  │   (Source)   │     │                  │     │ Index Files     │  │
│  └──────────────┘     └──────────────────┘     │ (.json)         │  │
│         │                                       └─────────────────┘  │
│         │                                                            │
│         │             ┌──────────────────┐     ┌─────────────────┐  │
│         └────────────▶│ Metadata         │────▶│ Navigation Tree │  │
│                       │ Extractor        │     │ Glossary Map    │  │
│                       └──────────────────┘     │ Amendment Dates │  │
│                                                └─────────────────┘  │
│         │                                                            │
│         │             ┌──────────────────┐     ┌─────────────────┐  │
│         └────────────▶│ Content Chunker  │────▶│ Static JSON     │  │
│                       │                  │     │ Chunks (by      │  │
│                       └──────────────────┘     │ Part/Section)   │  │
│                                                └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Generated Assets

| Asset | Purpose | Load Strategy |
|-------|---------|---------------|
| `flexsearch-index.json` | Pre-built search index | Loaded on app init |
| `navigation-tree.json` | Hierarchical TOC structure | Loaded on app init |
| `glossary-map.json` | Term → Definition mappings | Loaded on app init |
| `amendment-dates.json` | Available effective dates | Loaded on app init |
| `content/[part]/[section].json` | Actual code content | Lazy loaded on demand |

---

## Application Features

### 1. Full-Text Search with FlexSearch

**Implementation Details:**
- Pre-indexed at build time using FlexSearch's export/import capability
- Searches across: article titles, clause text, notes, glossary terms
- Returns results with breadcrumb paths (e.g., "Division A > Part 1 > Section 1.1 > 1.1.1.1")
- Supports fuzzy matching and phrase search

**Search Results Display:**
- Ranked by relevance
- Shows matched context snippet
- Displays full hierarchical path
- Pagination support (configurable results per page)

### 2. Hierarchical Navigation

**Structure (from BCBC JSON):**
```
BCBC
├── Division A - Compliance, Objectives and Functional Statements
│   ├── Part 1 - Compliance
│   │   ├── Section 1.1 - General
│   │   │   ├── 1.1.1 - Application of this Code
│   │   │   │   └── 1.1.1.1 - Application of this Code (Article)
│   │   │   └── ...
│   │   └── Section 1.2 - Compliance
│   └── Part 2 - Objectives
├── Division B - Acceptable Solutions
│   └── ...
└── Division C - Administrative Provisions
    └── ...
```

**UI Behavior:**
- Collapsible tree navigation (left sidebar)
- Current location highlighting
- Breadcrumb trail at top of content area
- Previous/Next navigation buttons
- Deep linking support (URL reflects current location)

### 3. Inline Glossary

**Behavior:**
- Terms defined in BCBC glossary are rendered as interactive links (styled distinctly, e.g., italic + underline)
- Clicking a term opens a popover/modal with the definition
- Glossary terms include: "building", "occupancy", "alteration", "unsafe condition", etc.
- Copy-to-clipboard functionality for definitions

### 4. Effective Date Filtering (Global Filter)

**Purpose:** The BCBC has amendments with different effective dates. Users need to view content valid for a specific date.

**Implementation:**
- Global dropdown filter in header
- Persisted in URL query params and localStorage
- Filters both search results and displayed content
- Shows available amendment dates from `amendment-dates.json`

### 5. Content Rendering

**Supported Content Types:**
- **Articles**: Numbered clauses with hierarchical lettering (1), a., i., etc.)
- **Tables**: Complex tables with merged cells, headers, units
- **Figures**: Images/diagrams with captions and references
- **Equations**: Mathematical formulas (consider MathJax/KaTeX)
- **Notes**: Appendix notes linked to articles (e.g., "A-1.1.1.1.(3) Factory-Constructed Buildings")
- **Cross-references**: Links to other code sections and external standards

### 6. Downloadable Content

**Options:**
- Download current section as PDF (client-side generation)
- Download full code (pre-generated PDF link)
- Print-optimized view

---

## UI/UX Design Reference

Based on the provided screenshots, the interface follows a **three-panel layout**:

### Left Panel: Search Results / Navigation
- Search input with filter dropdown ("CODES", "SORT: MATCH")
- Paginated search results showing:
  - Article/section number and title
  - Parent path (e.g., "Part 9 Housing and Small Buildings > Division B...")
- Click result to load in content panel

### Center Panel: Table of Contents Tree
- Collapsible hierarchical tree
- Current selection highlighted
- Expand/collapse toggles
- Scrollable independent of other panels

### Right Panel: Content Display
- Division/Part/Section header
- Article content with:
  - Numbered/lettered clauses
  - Glossary terms as clickable links (purple/italic)
  - Linked notes (yellow badges like "A-1.1.1.1.(3) Factory-Constr...")
- Previous/Next navigation

### Modals/Popovers
- **Glossary Modal**: Shows term definition with copy button and close
- **Note Modal**: Shows full appendix note content with "PROCEED TO" navigation

### Header
- Search bar
- Document version dropdown (amendment date filter)
- Current project indicator

---

## Monorepo Structure (Turborepo)

```
bc-building-code/
├── apps/
│   └── web/                          # Next.js application
│       ├── app/                      # App Router pages
│       │   ├── layout.tsx
│       │   ├── page.tsx              # Home/search landing
│       │   ├── [division]/
│       │   │   └── [part]/
│       │   │       └── [section]/
│       │   │           └── page.tsx  # Dynamic content pages
│       │   └── search/
│       │       └── page.tsx          # Search results page
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── ContentPanel.tsx
│       │   ├── search/
│       │   │   ├── SearchInput.tsx
│       │   │   ├── SearchResults.tsx
│       │   │   └── SearchFilters.tsx
│       │   ├── navigation/
│       │   │   ├── NavigationTree.tsx
│       │   │   ├── Breadcrumbs.tsx
│       │   │   └── PrevNextNav.tsx
│       │   ├── content/
│       │   │   ├── ArticleRenderer.tsx
│       │   │   ├── ClauseList.tsx
│       │   │   ├── TableRenderer.tsx
│       │   │   ├── FigureRenderer.tsx
│       │   │   └── EquationRenderer.tsx
│       │   ├── glossary/
│       │   │   ├── GlossaryTerm.tsx
│       │   │   └── GlossaryModal.tsx
│       │   └── notes/
│       │       ├── NoteLink.tsx
│       │       └── NoteModal.tsx
│       ├── hooks/
│       │   ├── useSearch.ts
│       │   ├── useNavigation.ts
│       │   ├── useGlossary.ts
│       │   └── useAmendmentDate.ts
│       ├── lib/
│       │   ├── search/
│       │   │   ├── flexsearch-client.ts
│       │   │   └── search-utils.ts
│       │   ├── content/
│       │   │   └── content-loader.ts
│       │   └── utils/
│       │       └── url-utils.ts
│       ├── public/
│       │   └── data/                 # Generated static assets
│       │       ├── flexsearch-index.json
│       │       ├── navigation-tree.json
│       │       ├── glossary-map.json
│       │       ├── amendment-dates.json
│       │       └── content/
│       │           ├── division-a/
│       │           ├── division-b/
│       │           └── division-c/
│       └── styles/
│           └── theme.ts              # Chakra UI theme (BC Design System)
│
├── packages/
│   ├── bcbc-parser/                  # BCBC JSON processing
│   │   ├── src/
│   │   │   ├── parser.ts             # JSON structure parser
│   │   │   ├── types.ts              # TypeScript interfaces
│   │   │   └── validators.ts         # Schema validation
│   │   └── package.json
│   │
│   ├── search-indexer/               # FlexSearch index generator
│   │   ├── src/
│   │   │   ├── indexer.ts            # Build-time index creation
│   │   │   ├── config.ts             # FlexSearch configuration
│   │   │   └── export.ts             # Index serialization
│   │   └── package.json
│   │
│   ├── content-chunker/              # Content splitting utility
│   │   ├── src/
│   │   │   ├── chunker.ts            # Split JSON by section
│   │   │   └── metadata-extractor.ts # Extract nav tree, glossary
│   │   └── package.json
│   │
│   ├── ui/                           # Shared UI components
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── tsconfig/                     # Shared TypeScript configs
│       ├── base.json
│       ├── nextjs.json
│       └── package.json
│
├── scripts/
│   └── generate-assets.ts            # Build-time asset generation
│
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Key TypeScript Interfaces

```typescript
// packages/bcbc-parser/src/types.ts

export interface BCBCDocument {
  metadata: DocumentMetadata;
  divisions: Division[];
  glossary: GlossaryEntry[];
  amendmentDates: AmendmentDate[];
}

export interface DocumentMetadata {
  title: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
}

export interface Division {
  id: string;
  title: string;
  type: 'division';
  parts: Part[];
}

export interface Part {
  id: string;
  number: string;
  title: string;
  type: 'part';
  sections: Section[];
}

export interface Section {
  id: string;
  number: string;
  title: string;
  type: 'section';
  subsections: Subsection[];
}

export interface Subsection {
  id: string;
  number: string;
  title: string;
  type: 'subsection';
  articles: Article[];
}

export interface Article {
  id: string;
  number: string;          // e.g., "1.1.1.1"
  title: string;
  type: 'article';
  clauses: Clause[];
  notes: NoteReference[];
  effectiveDate?: string;
  amendedDate?: string;
}

export interface Clause {
  id: string;
  number: string;          // e.g., "1)", "a.", "i."
  text: string;
  glossaryTerms: string[]; // Terms to highlight
  subclauses?: Clause[];
  tables?: Table[];
  figures?: Figure[];
  equations?: Equation[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  relatedTerms?: string[];
}

export interface NoteReference {
  id: string;
  number: string;          // e.g., "A-1.1.1.1.(3)"
  title: string;
  content: string;
}

export interface Table {
  id: string;
  number: string;
  title: string;
  headers: TableHeader[];
  rows: TableRow[];
  notes?: string[];
}

export interface AmendmentDate {
  date: string;            // ISO date
  label: string;           // Display label
  description?: string;
}

// Search-related types
export interface SearchResult {
  id: string;
  type: 'article' | 'section' | 'note' | 'glossary';
  number: string;
  title: string;
  snippet: string;
  breadcrumb: string[];
  path: string;            // URL path
  score: number;
}

export interface SearchFilters {
  amendmentDate?: string;
  division?: string;
  contentType?: ('article' | 'note' | 'glossary')[];
}

// Navigation tree for sidebar
export interface NavigationNode {
  id: string;
  number: string;
  title: string;
  type: 'division' | 'part' | 'section' | 'subsection' | 'article';
  path: string;
  children?: NavigationNode[];
}
```

---

## FlexSearch Configuration

```typescript
// packages/search-indexer/src/config.ts

import FlexSearch from 'flexsearch';

export const searchIndexConfig: FlexSearch.IndexOptions = {
  preset: 'match',
  tokenize: 'forward',
  cache: true,
  resolution: 9,
  
  // Document index configuration
  document: {
    id: 'id',
    index: [
      {
        field: 'title',
        tokenize: 'forward',
        optimize: true,
        resolution: 9,
        boost: 2.0,
      },
      {
        field: 'content',
        tokenize: 'forward',
        optimize: true,
        resolution: 5,
      },
      {
        field: 'number',
        tokenize: 'strict',
        resolution: 9,
        boost: 3.0,
      },
    ],
    store: ['id', 'number', 'title', 'type', 'breadcrumb', 'path', 'snippet'],
  },
};
```

---

## Build Pipeline Commands

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build", "generate-assets"],
      "outputs": [".next/**", "dist/**"]
    },
    "generate-assets": {
      "inputs": ["data/bcbc-source.json"],
      "outputs": ["apps/web/public/data/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

```bash
# Generate search index and static content from BCBC JSON
pnpm generate-assets

# Development
pnpm dev

# Production build
pnpm build

# Export static site
pnpm export
```

---

## Accessibility Requirements (WCAG AAA)

1. **Keyboard Navigation**: Full keyboard support for tree navigation, search, modals
2. **Screen Reader Support**: Proper ARIA labels, live regions for search results
3. **Color Contrast**: Minimum 7:1 ratio for normal text
4. **Focus Indicators**: Visible focus states on all interactive elements
5. **Text Scaling**: Support up to 200% zoom without horizontal scrolling
6. **Skip Links**: Skip to main content, skip to search
7. **Semantic HTML**: Proper heading hierarchy, landmark regions

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Search Response Time | < 100ms |
| Content Load (lazy) | < 500ms |
| Lighthouse Performance | > 90 |
| Bundle Size (initial) | < 200KB gzipped |

---

## Deployment

**Target Environment:** BC Government OpenShift

**Deployment Artifacts:**
- Static HTML/JS/CSS files
- Pre-generated JSON data files
- Docker container serving via Nginx/Caddy

**CI/CD Pipeline:**
1. Build Next.js static export
2. Generate search indexes and content chunks
3. Build Docker image
4. Deploy to DEV → TEST → PROD with approval gates

---

## Summary

This is a **static-first, client-side search application** that transforms the BC Building Code JSON into an accessible, searchable web experience. The key technical differentiator is the **build-time generation of FlexSearch indexes** that enable instant client-side search without any backend infrastructure, while maintaining full fidelity to the authoritative BCBC content structure.