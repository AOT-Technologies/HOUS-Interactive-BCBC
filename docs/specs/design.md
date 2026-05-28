# Design Document

## Overview

The BC Building Code Interactive Web Application is a client-side static web application built with Next.js 16+ that transforms the British Columbia Building Code from a difficult-to-navigate PDF into an intuitive, searchable interface. The application operates entirely without a backend by pre-generating search indexes and content chunks at build time.

### Important: Data Structure Updates (February 2026)

#### Article Structure Update

The BCBC parser has been updated to correctly represent the hierarchical structure of building code articles:

**Previous Structure**: Article → Clauses → Subclauses
**Current Structure**: Article → Sentences → Clauses → Subclauses

This change accurately reflects the BCBC format where:
- Articles contain numbered sentences (1, 2, 3...)
- Sentences contain lettered clauses (a, b, c...)
- Clauses contain numbered subclauses (1, 2, 3...)

**Action Required**: After this parser update, all generated assets in `/apps/web/public/data/` must be regenerated using `npx pnpm generate-assets` or `npx pnpm generate-assets:multi` to match the new structure. The old generated files will not work with components expecting the new Sentence interface.

#### Table Structure Enhancement (February 2026)

The BCBC parser now supports an enhanced table structure format with improved flexibility for complex table content:

**New Structure** (with backward compatibility):
- Tables can now use a `rows` array format with typed rows (`header_row` or `body_row`)
- Table cells support complex content including mixed text and figure elements
- Cell content can be a string (legacy) or an array of content items (new format)
- Each content item can be text or a figure with metadata (id, source, title, graphic)

**Legacy Structure** (still supported):
- Tables using the `structure` format with `header_rows` and `body_rows` continue to work
- Within `structure`, both object-based rows (with `id`, `type`, `cells`) and array-based rows (legacy) are supported
- Backward compatibility is maintained for existing BCBC JSON files at multiple levels

**Parsing Logic**:
The `parseTableData` function handles three table formats in priority order:
1. **Direct `rows` array**: Modern format with `row.type` field (`header_row` or `body_row`)
2. **Structure with object-based rows**: `structure.header_rows` and `structure.body_rows` containing objects with `id`, `type`, and `cells` properties
3. **Structure with array-based rows**: Legacy format where `header_rows` and `body_rows` are arrays of cell arrays

**Key Changes**:
- Added `RawTableCell` interface with support for complex content arrays
- Added `rows` array to `RawTable` interface with row type discrimination
- Enhanced `structure.header_rows` and `structure.body_rows` parsing to support both object and array formats
- Table cells can now contain figures inline with text content
- Cell alignment, colspan, and rowspan attributes preserved in all formats

This enhancement allows the parser to handle sophisticated table structures from multiple source data formats while maintaining full backward compatibility with existing implementations.

#### Schema Enhancements (March 2026)

The BC Building Code JSON schema (`data/source/bc-building-code-schema.json`) has been updated with several structural enhancements. These changes define what the source JSON *can* contain; parser and rendering updates may be needed to fully support them.

**1. Application Note Unified Content Model**:
- Application notes (`application_note`) now use a single `content` array instead of separate `paragraphs`, `tables`, `figures`, and `divisions` arrays
- Content items are discriminated by `type` field: `paragraph`, `note_division`, `table`, or `figure`
- Note divisions (`note_division`) similarly use a unified `content` array with `paragraph`, `table`, or `figure` items
- New `content_paragraph` definition supports `equations`, `lists`, `revised`, `deleted`, and `revisions` fields
- Application notes gained `revised` and `source` fields; note divisions gained `source` field
- **Parser status**: Currently uses the legacy separate-arrays structure. Parser update needed to handle the unified `content` array format when source data adopts it.

**2. Subsection Title Revision History**:
- `subsection.title` changed from a simple string to `oneOf`: either a string or an object with `{ revised: true, text: string, revisions: TitleRevision[] }`
- New `title_revision` definition tracks title amendments with `type`, `effective_date`, `text`, `revision_type`, `status`, and `change_summary`
- **Parser status**: Currently treats title as a simple string. Parser update needed to extract revision history from object-form titles.

**3. Table Cell List Content**:
- Table cells can now contain `list` type content items (in addition to `text` and `figure`)
- Lists in cells support `bulleted`, `numbered`, and `bibliography` types
- Figure `id` field is now optional for inline table cell figures
- **Parser status**: Already handled. `parseTableCellContentItem` supports `list` type, and figure `id` is accessed optionally.

**4. Bibliography List Type**:
- `list_type` enum expanded to include `"bibliography"` in front matter content items
- Bibliography lists may include a `header` field (e.g., "References:")
- **Parser status**: The `parseStructuredLists` function does not yet handle `bibliography` type explicitly. Items would be skipped by the current switch statement.

**5. Revision Content Polymorphism**:
- `revision.content` changed from array-only to `oneOf`: either a string (for paragraph/sentence/clause revisions) or an array (for article revisions with sentences/tables/figures)
- **Parser status**: `RawRevision.content` is typed as `string`. Parser update needed to handle array-form content for article-level revisions.

### Key Design Principles

1. **Mobile-First Design**: Responsive design that works seamlessly on mobile, tablet, and desktop devices following Figma design specifications
2. **Static-First Architecture**: All dynamic functionality is achieved client-side using pre-generated static assets
3. **Performance-Optimized**: Lazy loading, code splitting, and optimized bundle sizes ensure fast load times
4. **Accessibility-First**: WCAG AAA compliance is built into every component
5. **Design System Adherence**: Strict adherence to Figma design specifications and BC Design System guidelines
6. **Offline-Capable**: Core search and navigation work without network after initial load
7. **Maintainable**: Clear separation of concerns with monorepo structure

### Technology Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Framework**: Next.js 16+ with App Router and static export
- **Language**: TypeScript (strict mode)
- **UI Library**: React 19 with BC Design System (@repo/ui)
- **State Management**: Zustand (lightweight, TypeScript-friendly)
- **Design System**: BC Design System UI components with CSS variables
- **Search**: FlexSearch with pre-built indexes
- **Build Tools**: Custom build pipeline for asset generation

## BC Design System Integration

### Available UI Components

The application uses the BC Design System UI package (`@repo/ui`) which provides a comprehensive set of accessible, government-standard components:

**Layout Components**:
- `Header`: Application header with navigation and branding
- `Footer`: Standard BC government footer with links
- `PreFooter`: Pre-footer section for additional content

**Form Components**:
- `Button`: Primary, secondary, and tertiary button variants
- `CheckboxCard`: Card-style checkbox for selections
- `CheckboxGroup`: Group of checkboxes with validation
- `RadioGroup`: Radio button group with validation
- `NumberField`: Numeric input with validation
- `InputError`: Error message display for form fields

**Navigation Components**:
- `Link`: Styled link component with external link indicators
- `LinkCard`: Card-style navigation element

**Modal Components**:
- `ModalSide`: Side panel modal for content
- `ModalGlossaryContent`: Pre-built glossary modal content
- `ButtonModalClose`: Modal close button
- `ConfirmationModal`: Confirmation dialog

**Display Components**:
- `Alert`: Alert/notification messages with info, warning, danger, and success variants
- `Icon`: Icon library with BC Design System icons (Check, Close, Menu, Arrow, etc.)
- `Image`: Optimized image component
- `Tooltip`: Accessible tooltip component

**Specialized Components**:
- `ResultPDFButton`: PDF export button
- `ResultPDFPrintContent`: Print-optimized content layout

### Design Tokens

The BC Design System uses CSS variables defined in `variables.css`:

**Color System**:
- Primary colors for branding and key actions
- Semantic colors (success, warning, error, info)
- Text colors with WCAG AAA contrast ratios
- Background and surface colors
- Border colors

**Typography**:
- Font families (BC Sans for body, system fonts fallback)
- Font sizes and weights
- Line heights optimized for readability
- Heading styles (h1-h6)

**Spacing**:
- Consistent spacing scale
- Component padding and margins
- Layout gaps and gutters

**Accessibility**:
- All components meet WCAG AAA standards
- Keyboard navigation built-in
- Screen reader support with proper ARIA
- Focus indicators with sufficient contrast

### Component Usage Patterns

**Application-Specific Components**:
The application will create feature-specific components that compose BC Design System primitives:

```typescript
// Example: SearchInput using BC Design System Button and Icon
import { Button } from '@repo/ui/button/Button';
import { Icon } from '@repo/ui/icon/Icon';

export function SearchInput() {
  return (
    <div className="search-input">
      <input type="search" />
      <Button variant="primary">
        <Icon name="search" />
        Search
      </Button>
    </div>
  );
}
```

**Layout Structure**:
```typescript
import { Header } from '@repo/ui/header/Header';
import { Footer } from '@repo/ui/footer/Footer';
import { PreFooter } from '@repo/ui/pre-footer/PreFooter';

export function Layout({ children }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <PreFooter />
      <Footer />
    </>
  );
}
```

**Modal Integration**:
```typescript
import { ModalSide } from '@repo/ui/modal-side/ModalSide';
import { ButtonModalClose } from '@repo/ui/button-modal-close/ButtonModalClose';

export function GlossaryModal({ term, definition, onClose }) {
  return (
    <ModalSide isOpen onClose={onClose}>
      <ButtonModalClose onClick={onClose} />
      <h2>{term}</h2>
      <p>{definition}</p>
    </ModalSide>
  );
}
```

### Supporting Packages

The UI package uses two additional shared packages:

1. **@repo/constants**: Shared constants (URLs, IDs, test IDs) — ✅ IMPLEMENTED
2. **@repo/data**: Data types and hooks — ✅ IMPLEMENTED

## Figma Design Integration

### Design System Implementation

The application will strictly follow Figma design specifications across all breakpoints:

**Mobile (< 768px)**:
- Single column layout
- Hamburger menu for navigation
- Full-width search
- Stacked content panels
- Touch-optimized interactive elements (minimum 44x44px tap targets)
- Bottom navigation for key actions

**Tablet (768px - 1023px)**:
- Two-column layout (navigation drawer + content)
- Collapsible sidebar navigation
- Responsive search bar
- Optimized spacing for tablet interactions

**Desktop (≥ 1024px)**:
- Three-panel layout (search/results, navigation tree, content)
- Persistent navigation sidebar
- Full-featured search with filters
- Optimal reading width for content

### Design Tokens

All design tokens are extracted from Figma and implemented using BC Design System CSS variables (defined in `packages/ui/src/variables.css`):

**Typography**:
- Font families, sizes, weights, line heights
- Heading hierarchy (h1-h6)
- Body text styles
- Code/monospace styles

**Colors**:
- Primary, secondary, accent colors
- Semantic colors (success, warning, error, info)
- Text colors (primary, secondary, disabled)
- Background colors
- Border colors

**Spacing**:
- Spacing scale (4px, 8px, 16px, 24px, 32px, etc.)
- Component padding and margins
- Layout gaps and gutters

**Shadows**:
- Elevation levels
- Focus states
- Hover states

**Borders**:
- Border radius values
- Border widths
- Border styles

### Component Specifications

Each component will be implemented to match Figma specifications:

- Exact spacing and padding
- Typography styles
- Color usage
- Interactive states (hover, focus, active, disabled)
- Animations and transitions
- Responsive behavior at each breakpoint

## State Management Architecture

### Zustand Store Design

The application uses Zustand for global state management due to its simplicity, TypeScript support, and minimal boilerplate.

**Why Zustand**:
- Lightweight (~1KB)
- No providers needed
- Excellent TypeScript support
- Simple API with hooks
- Built-in devtools support
- No unnecessary re-renders

### Global Stores

**Search Store** ✅ IMPLEMENTED:

**Location**: `apps/web/stores/search-store.ts`

The application provides a Zustand store for global search state management:

```typescript
interface SearchStore {
  query: string;
  results: SearchResult[];
  loading: boolean;
  filters: SearchFilters;
  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: SearchFilters) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
}
```

**Usage**:
```typescript
import { useSearchStore } from '@/stores';

function SearchComponent() {
  const { query, results, loading, search } = useSearchStore();
  // Use global search state
}
```

**Note**: For component-level search logic (e.g., autocomplete, suggestions), the `useSearch` hook in `packages/data/src/hooks/useSearch.ts` is also available. Use the Zustand store for global search state (results, filters) and the hook for local search UI behavior (suggestions, debouncing).

**Navigation Store**:
```typescript
interface NavigationStore {
  navigationTree: NavigationNode[];
  expandedNodes: Set<string>;
  currentPath: string;
  toggleNode: (nodeId: string) => void;
  setCurrentPath: (path: string) => void;
  expandToNode: (nodeId: string) => void;
}
```

**Content Stores** ✅ IMPLEMENTED:

The application uses multiple specialized content stores instead of a single generic content store. All are located in `apps/web/lib/stores/` and `apps/web/stores/`.

**Section Store** (`apps/web/lib/stores/section-store.ts`):
Manages section-level content loading for the reading view. Fetches section JSON chunks from `/data/{version}/content/{division}/{part}/{section}.json`.

```typescript
interface SectionState {
  currentSection: Section | null;
  currentPath: string[];
  loading: boolean;
  error: string | null;
  fetchSection: (version: string, slug: string[]) => Promise<void>;
  clearError: () => void;
}
```

**Appendix Store** (`apps/web/lib/stores/appendix-store.ts`):
Manages part appendices (application notes) and division appendices. Supports both part-level and division-level appendix content.

```typescript
interface AppendixState {
  cache: Map<string, PartAppendix | DivisionAppendix>;
  fetchAppendix: (version: string, division: string, part: string) => Promise<PartAppendix>;
  fetchDivisionAppendix: (version: string, division: string, letter: string) => Promise<DivisionAppendix>;
}
```

**Spectables Store** (`apps/web/lib/stores/spectables-store.ts`):
Manages span tables content loading for specialized table sections.

```typescript
interface SpectablesState {
  cache: Map<string, Spectables>;
  fetchSpectables: (version: string, division: string, part: string, spectablesId: string) => Promise<Spectables>;
}
```

**Standards Map Store** (`apps/web/stores/standards-map-store.ts`):
Loads and caches the standards reference map for resolving standard references (e.g., CSA, ASTM) in cross-reference links.

```typescript
interface StandardsMapState {
  cache: Record<string, Record<string, StandardReferenceEntry>>;
  fetchStandardsMap: (version: string) => Promise<Record<string, StandardReferenceEntry>>;
}
```

**Equation Store** (`apps/web/stores/equation-store.ts`):
Loads the equation map for resolving `[EQ:*:*]` markers in content text to rendered equations.

**Glossary Store** ✅ IMPLEMENTED:

**Location**: `apps/web/stores/glossary-store.ts`

```typescript
interface GlossaryStore {
  glossaryMap: Map<string, GlossaryEntry>;
  selectedTerm: string | null;
  setSelectedTerm: (term: string | null) => void;
  getTerm: (term: string) => GlossaryEntry | undefined;
}
```

**Amendment Date Store** ✅ IMPLEMENTED:

**Location**: `apps/web/stores/amendment-date-store.ts`

The amendment date store manages effective date selection and available dates for filtering content by amendment dates. It is version-aware and loads dates from version-specific paths.

```typescript
interface AmendmentDateStore {
  selectedDate: string | null;
  availableDates: AmendmentDate[];
  datesByVersion: Map<string, AmendmentDate[]>;
  loading: boolean;
  setSelectedDate: (date: string | null) => void;
  loadDates: (version?: string) => Promise<void>;
}
```

**Key Features**:
- Version-aware date loading from `/data/{version}/amendment-dates.json`
- Caches dates per version in `datesByVersion` Map
- URL synchronization with `?date={date}` query parameter
- localStorage persistence of selected date
- Automatic selection of latest date as default
- Data transformation from JSON format to store format

**Data Transformation**:
The store transforms the JSON file format to the internal store format:

```typescript
// JSON file format (amendment-dates.json)
{
  "version": "2020",
  "generatedAt": "2026-02-04T01:43:12.273Z",
  "dates": [
    {
      "effectiveDate": "2025-06-16",    // ISO date string
      "displayDate": "June 16, 2025",   // Human-readable date
      "count": 50,                       // Number of provisions
      "type": "amendment" | "original",  // Type of change
      "revisionLabel": "Revision 6"     // Optional: revision number label (omitted for original)
    }
  ]
}

// Store format (AmendmentDate interface)
{
  date: "2025-06-16",                                    // From effectiveDate
  label: "June 16, 2025",                                // From displayDate
  description: "50 amendments",                          // Generated from count + type
  isLatest: true                                         // First date is latest
}
```

**Revision Label Generation:**
The `revisionLabel` field is derived automatically from the `revision_id` field in the source BCBC JSON. The revision ID format is `bc-mo-YYYY-NN-NNN` where `NN` is the ministerial order number (which maps to the revision number). When multiple ministerial orders share the same effective date, they are combined (e.g., "Revision 4 & 5"). Original entries do not receive a revision label.

**Dropdown Display Format:**
The effective date dropdown displays revision labels alongside dates:
- `Revision 6 – June 16, 2025 (Latest)`
- `Revision 4 & 5 – March 10, 2025`
- `Revision 3 – August 27, 2024`
- `March 8, 2024` (original, no revision label)

**UI Store** ✅ IMPLEMENTED:

**Location**: `apps/web/lib/stores/ui-store.ts`

```typescript
interface UIStore {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  activeModal: 'glossary' | 'note' | null;
  modalData: any;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  openModal: (type: 'glossary' | 'note', data: any) => void;
  closeModal: () => void;
}
```

**Content Store** ✅ IMPLEMENTED:

**Location**: `apps/web/lib/stores/content-store.ts`

Manages general content loading and caching.

**Functional Statements Store** ✅ IMPLEMENTED:

**Location**: `apps/web/stores/functional-statements-store.ts`

Loads and caches functional statements from Division A for cross-reference resolution.

**Objectives Store** ✅ IMPLEMENTED:

**Location**: `apps/web/stores/objectives-store.ts`

Loads and caches objectives and sub-objectives from Division A for cross-reference resolution.

**Spectables Map Store** ✅ IMPLEMENTED:

**Location**: `apps/web/stores/spectables-map-store.ts`

Loads and caches the spectables (span tables) map for resolving spectables references in content.

**Front Matter Store** ✅ IMPLEMENTED:

**Location**: `apps/web/lib/stores/front-matter-store.ts`

The front matter store manages front matter content (preface, introduction, committees) for the BC Building Code. It is version-aware and loads content from version-specific paths.

```typescript
interface FrontMatterState {
  cache: Map<string, FrontMatterSection>;
  currentSection: FrontMatterSection | null;
  currentPath: string[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchFrontMatter: (version: string, section: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

interface FrontMatterSection {
  id: string;
  type: 'preface' | 'introduction' | 'committees';
  title?: string;
  content?: FrontMatterContentItem[];
  tables?: any[];
  notes?: any[];
}

interface FrontMatterContentItem {
  type: 'paragraph' | 'heading' | 'table' | 'figure' | 'list';
  id: string;
  content?: string;
  level?: number;
  [key: string]: any;
}
```

**Key Features**:
- Version-aware content loading from `/data/{version}/content/front-matter/{section}.json`
- Caches sections per version in `cache` Map
- Validates section names (preface, introduction, committees)
- AbortController for canceling in-flight requests
- Error handling with descriptive messages
- Supports three front matter sections: preface, introduction, committees

**Usage**:
```typescript
import { useFrontMatterStore } from '@/lib/stores/front-matter-store';

function FrontMatterPage({ version, section }: { version: string; section: string }) {
  const { currentSection, loading, error, fetchFrontMatter } = useFrontMatterStore();
  
  useEffect(() => {
    fetchFrontMatter(version, section);
  }, [version, section]);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{/* Render front matter content */}</div>;
}
```

**Version Store** ✅ IMPLEMENTED:

**Location**: `apps/web/stores/version-store.ts`

The version store manages BC Building Code versions, enabling multi-version support for the application:

```typescript
interface VersionStore {
  currentVersion: string | null;
  availableVersions: Version[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentVersion: (versionId: string) => void;
  loadVersions: () => Promise<void>;
  getVersionDataPath: (versionId?: string) => string;
  getVersion: (versionId?: string) => Version | undefined;
  clearError: () => void;
}

interface Version {
  id: string;                    // e.g., "2024", "2027"
  year: number;                  // e.g., 2024
  title: string;                 // e.g., "BC Building Code 2024"
  sourceFile: string;            // e.g., "bcbc-2024.json"
  isDefault: boolean;            // Default version for new users (only one should be true)
  publishedDate: string;         // ISO date string
  status: 'current' | 'draft' | 'archived';
  description?: string;          // Optional description
  revisionCount?: number;        // Number of revisions
  latestRevision?: string;       // Latest revision date
  dataPath?: string;             // Custom data path (defaults to /data/{id})
}
```

**Key Features**:

1. **Multi-Version Support**: Loads and manages multiple BC Building Code versions
2. **URL Synchronization**: Syncs version selection with URL query parameter (`?version=2024`)
3. **localStorage Persistence**: Remembers user's last selected version
4. **Three-Priority Selection Logic**:
   - Priority 1: URL parameter (for bookmarks, shared links)
   - Priority 2: localStorage (for returning users)
   - Priority 3: Default version from versions.json
5. **Version-Specific Data Paths**: Provides paths to version-specific assets (`/data/{versionId}/`)

**Usage**:
```typescript
import { useVersionStore, useCurrentVersionId } from '@/stores/version-store';

function VersionSelector() {
  const { currentVersion, availableVersions, setCurrentVersion } = useVersionStore();
  const versionId = useCurrentVersionId(); // Hook with fallback to default
  
  return (
    <select value={currentVersion} onChange={(e) => setCurrentVersion(e.target.value)}>
      {availableVersions.map(v => (
        <option key={v.id} value={v.id}>{v.title}</option>
      ))}
    </select>
  );
}
```

**URL Synchronization**:
- When version changes: URL updates to `?version={versionId}`
- When page loads: Reads `?version={versionId}` from URL
- Uses `window.history.replaceState()` to avoid creating extra history entries
- Ensures bookmarks and shared links preserve version selection

**Integration with Other Stores**:
All data-loading stores (search, navigation, content, glossary, amendment-date) are version-aware and use `getVersionDataPath()` to load version-specific assets.

### State Persistence

**localStorage Integration**:
- Amendment date selection
- Sidebar expanded/collapsed state
- Recent searches
- User preferences (theme, font size)

**URL State Synchronization**:
- Current content path
- Search query
- Amendment date filter
- Search filters
- **Version selection** (`?version=2024`) ✅ IMPLEMENTED

### State Management Patterns

**Optimistic Updates**:
- UI updates immediately for better UX
- Rollback on error

**Derived State**:
- Computed values using selectors
- Memoization for performance

**Middleware**:
- Persistence middleware for localStorage
- Logging middleware for development
- DevTools middleware for debugging

## Architecture

### High-Level Architecture


```
┌─────────────────────────────────────────────────────────────────────┐
│                         BUILD TIME                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐  │
│  │   BCBC JSON  │────▶│  bcbc-parser     │────▶│ Validated       │  │
│  │ /data/source/│     │  Package         │     │ Data Structures │  │
│  │bcbc-2024.json│     │                  │     │                 │  │
│  └──────────────┘     └──────────────────┘     └─────────────────┘  │
│                                │                                     │
│                                ├──────────────────────────────────┐  │
│                                │                                  │  │
│                                ▼                                  ▼  │
│                       ┌──────────────────┐     ┌─────────────────┐  │
│                       │ search-indexer   │     │ content-chunker │  │
│                       │ Package          │     │ Package         │  │
│                       └──────────────────┘     └─────────────────┘  │
│                                │                        │            │
│                                ▼                        ▼            │
│                       ┌──────────────────┐     ┌─────────────────┐  │
│                       │ FlexSearch Index │     │ Static JSON     │  │
│                       │ (pre-built)      │     │ Chunks          │  │
│                       └──────────────────┘     │ Navigation Tree │  │
│                                                │ Glossary Map    │  │
│                                                │ Amendment Dates │  │
│                                                └─────────────────┘  │
│                                                         │            │
│                                                         ▼            │
│                                                ┌─────────────────┐  │
│                                                │ /apps/web/      │  │
│                                                │ public/data/    │  │
│                                                │ (Output)        │  │
│                                                └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         RUNTIME (CLIENT)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Next.js App (Static)                       │   │
│  │                                                               │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │   │
│  │  │  Search    │  │ Navigation │  │  Content Display     │   │   │
│  │  │  Panel     │  │ Tree Panel │  │  Panel               │   │   │
│  │  └────────────┘  └────────────┘  └──────────────────────┘   │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │              FlexSearch Client                         │  │   │
│  │  │  (Loads pre-built index on init)                       │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │              Content Loader                            │  │   │
│  │  │  (Lazy loads JSON chunks on demand)                    │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Monorepo Structure


```
bc-building-code/
├── data/
│   └── source/                       # Source BC Building Code JSON (input)
│       ├── versions.json             # Version configuration
│       ├── bcbc-2024.json            # Main source file (10-50 MB)
│       └── README.md                 # Source data documentation
│
├── apps/
│   └── web/                          # Next.js application
│       ├── app/                      # App Router
│       ├── components/               # React components
│       ├── hooks/                    # Custom React hooks
│       ├── lib/                      # Utility libraries
│       ├── stores/                   # Zustand stores (global state)
│       ├── public/data/              # Generated static assets (output)
│       └── styles/                   # Theme configuration
│
├── packages/
│   ├── bcbc-parser/                  # BCBC JSON parsing & validation
│   ├── search-indexer/               # FlexSearch index generation
│   ├── content-chunker/              # Content splitting & metadata extraction
│   ├── ui/                           # BC Design System UI components
│   ├── constants/                    # Shared constants (URLs, IDs, test IDs)
│   ├── data/                         # Data types and hooks
│   ├── eslint-config/                # Shared ESLint config
│   └── typescript-config/            # Shared TypeScript configs
│
├── scripts/
│   └── generate-assets.ts            # Build-time orchestration
│
├── docs/                             # Project documentation
│   ├── COMMANDS.md                   # Command reference
│   ├── DATA-MANAGEMENT.md            # Data management guide
│   └── specs/                        # Project specifications
│
├── turbo.json                        # Turborepo configuration
├── package.json                      # Root package.json
└── pnpm-workspace.yaml               # pnpm workspace config
```

## Components and Interfaces

### Build-Time Packages

#### 1. bcbc-parser Package

**Purpose**: Parse and validate BCBC JSON structure from `/data/source/`

**Input**: `/data/source/bcbc-2024.json` (BC Building Code source file)

**Key Modules**:
- `parser.ts`: Main parsing logic
- `types.ts`: TypeScript type definitions
- `validators.ts`: Schema validation

**Core Types**:


```typescript
interface BCBCDocument {
  metadata: DocumentMetadata;
  divisions: Division[];
  glossary: GlossaryEntry[];
  amendmentDates: AmendmentDate[];
  front_matter?: BCBCFrontMatter;
}

interface BCBCFrontMatter {
  id: string;
  preface?: BCBCPreface;
  introduction?: BCBCIntroduction;
  committees?: BCBCCommittees;
}

interface BCBCPreface {
  id: string;
  type: 'preface';
  content: BCBCFrontMatterContent[];
}

interface BCBCIntroduction {
  id: string;
  type: 'introduction';
  title?: string;
  content: BCBCFrontMatterContent[];
}

interface BCBCCommittees {
  id: string;
  type: 'committees';
  title?: string;
  tables?: any[];
  notes?: any[];
}

interface BCBCFrontMatterContent {
  type: string;
  id: string;
  content?: string;
  level?: number;
}

interface Division {
  id: string;
  title: string;
  type: 'division';
  parts: Part[];
}

interface Part {
  id: string;
  number: string;
  title: string;
  type: 'part';
  sections: Section[];
}

interface Section {
  id: string;
  number: string;
  title: string;
  type: 'section';
  subsections: Subsection[];
}

interface Subsection {
  id: string;
  number: string;
  title: string;
  type: 'subsection';
  articles: Article[];
}

interface Article {
  id: string;
  number: string;
  title: string;
  type: 'article';
  sentences: Sentence[];
  notes: NoteReference[];
  effectiveDate?: string;
  amendedDate?: string;
}

interface Sentence {
  id: string;
  number: string;
  type: 'sentence';
  text: string;
  glossaryTerms: string[];
  clauses?: Clause[];
  tables?: Table[];
  figures?: Figure[];
  equations?: Equation[];
  revisions?: Revision[];
  revised?: boolean;
  source?: string;
}

interface Clause {
  id: string;
  number: string;
  type: 'clause';
  text: string;
  glossaryTerms: string[];
  subclauses?: Subclause[];
  tables?: Table[];
  figures?: Figure[];
  equations?: Equation[];
  revisions?: Revision[];
  revised?: boolean;
  source?: string;
}

interface Subclause {
  id: string;
  number: string;
  type: 'subclause';
  text: string;
  glossaryTerms: string[];
  tables?: Table[];
  figures?: Figure[];
  equations?: Equation[];
  revisions?: Revision[];
  revised?: boolean;
  source?: string;
}

interface Revision {
  type: 'original' | 'revision';
  effective_date: string;
  revision_id?: string;
  revision_type?: 'amendment' | 'add' | 'replace' | 'delete' | 'errata' | 'policy' | 'accessibility' | 'correction';
  sequence?: number;
  status?: string;
  text?: string;
  title?: string;
  content?: string | Array<{ id: string; type: string }>;  // String for sentence/clause revisions, array for article revisions
  change_summary?: string;
  note?: string;
  deleted?: boolean;
}
```

**Revision Tracking**: Sentences, clauses, and subclauses support granular revision tracking with the following fields:
- `revisions`: Array of revision objects containing change history
- `revised`: Boolean flag for quick identification of changed content
- `source`: String indicating the origin/source of the content

Each `Revision` object captures:
- Type (original or revision)
- Effective date
- Revision type (amendment, add, replace, delete)
- Change details (text, summary, notes)
- Sequence for ordering multiple revisions

This enables features like:
- Visual indicators for revised content
- Revision history modals
- Effective date filtering with accurate historical views
- Side-by-side comparison of original vs. revised text

#### 2. search-indexer Package

**Purpose**: Generate FlexSearch indexes at build time

**Key Modules**:
- `indexer.ts`: Index creation logic
- `config.ts`: FlexSearch configuration and type definitions
- `export.ts`: Index serialization

**Indexer Configuration**:

The search indexer uses a comprehensive configuration system defined in `config.ts`:

```typescript
// Content types that can be indexed
type IndexableContentType = 
  | 'article' | 'table' | 'figure' | 'part' | 'section' 
  | 'subsection' | 'glossary' | 'note' | 'application-note';

// Field-specific search configuration
interface FieldConfig {
  field: string;
  tokenize: 'strict' | 'forward' | 'reverse' | 'full';
  resolution: number;  // 1-9, higher = more accurate
  scoreWeight: number; // Score multiplier
}

// Default field configuration
const DEFAULT_FIELD_CONFIG: FieldConfig[] = [
  { field: 'articleNumber', tokenize: 'strict', resolution: 9, scoreWeight: 10 },
  { field: 'title', tokenize: 'forward', resolution: 9, scoreWeight: 5 },
  { field: 'text', tokenize: 'forward', resolution: 5, scoreWeight: 1 },
  { field: 'path', tokenize: 'forward', resolution: 3, scoreWeight: 2 },
];

// Search document structure (indexed)
interface SearchDocument {
  id: string;
  type: IndexableContentType;
  articleNumber: string;
  title: string;
  text: string;
  snippet: string;
  
  // Hierarchy information
  divisionId: string;
  divisionLetter: string;
  divisionTitle: string;
  partId: string;
  partNumber: number;
  partTitle: string;
  sectionId: string;
  sectionNumber: number;
  sectionTitle: string;
  subsectionId: string;
  subsectionNumber: number;
  subsectionTitle: string;
  
  path: string;           // Breadcrumb path for display
  breadcrumbs: string[];  // Breadcrumb array
  urlPath: string;        // URL path for navigation
  
  // Flags for filtering
  hasAmendment: boolean;
  amendmentType?: 'add' | 'replace' | 'delete' | 'amendment';
  latestAmendmentDate?: string;
  hasInternalRefs: boolean;
  hasExternalRefs: boolean;
  hasTermRefs: boolean;
  hasTables: boolean;
  hasFigures: boolean;
  
  searchPriority: number;
  referenceIds?: string[];
}

// Search result with score and highlights
interface SearchResult {
  document: SearchDocument;
  score: number;
  highlights: Array<{ field: string; text: string; }>;
}

// Runtime search options
interface SearchOptions {
  divisionFilter?: string;
  partFilter?: number;
  sectionFilter?: number;
  amendmentsOnly?: boolean;
  tablesOnly?: boolean;
  figuresOnly?: boolean;
  contentTypes?: IndexableContentType[];
  effectiveDate?: string;
  limit?: number;
  offset?: number;
}
```

**Index Generation Process**:
1. Read BCBC JSON from `/data/source/bcbc-2024.json`
2. Parse and extract searchable content into `SearchDocument` objects
3. Create FlexSearch document index with configured fields
4. Add all articles, sections, notes, and glossary terms to index
5. Export index to `/apps/web/public/data/{versionId}/search/documents.json` and metadata to `/apps/web/public/data/{versionId}/search/metadata.json` for client-side loading
6. Generate metadata for result display (breadcrumbs, paths, hierarchy info)

#### 3. content-chunker Package

**Purpose**: Split content into optimized chunks and extract metadata

**Input**: Parsed BCBC data from bcbc-parser  
**Output**: `/apps/web/public/data/` (content chunks and metadata files)

**Key Modules**:
- `chunker.ts`: Content splitting logic
- `metadata-extractor.ts`: Navigation tree and glossary extraction

**Chunking Strategy**:
- Split by Section level (e.g., Division A → Part 1 → Section 1.1)
- Each chunk contains all subsections and articles within that section
- Chunks stored as `/apps/web/public/data/content/[division]/[part]/[section].json`
- Front matter chunks: `/apps/web/public/data/content/front-matter/[section].json`
- Index chunks: `/apps/web/public/data/content/index/volume-[number].json`
- Conversion Factors chunks: `/apps/web/public/data/content/conversions/volume-[number].json`
- Typical chunk size: 50-200KB per section

**Generated Metadata Files**:
1. `/apps/web/public/data/navigation-tree.json`: Hierarchical structure for sidebar
2. `/apps/web/public/data/glossary-map.json`: Term → Definition mappings
3. `/apps/web/public/data/amendment-dates.json`: Available effective dates

### Runtime Components

#### Layout Components

**Header Component**:
- Search input with autocomplete
- Amendment date filter dropdown
- Application title and branding
- Responsive mobile menu toggle
- Follows Figma header specifications for all breakpoints

**Sidebar Component**:
- Collapsible navigation tree
- **Only displayed on Homepage and Content Reading Page**
- **NOT displayed on Search Results Page or Download Page**
- Current location highlighting
- Expand/collapse controls
- Scroll-to-active functionality
- Mobile-friendly drawer on small screens per Figma designs

**ContentPanel Component**:
- Breadcrumb navigation
- Article content rendering
- Previous/Next navigation
- Print/download actions
- Responsive layout following Figma content panel specifications

#### Reading View Architecture ✅ IMPLEMENTED

**Location**: `apps/web/components/reading/ReadingView.tsx`

The ReadingView is the top-level container component for the Content Reading page. It manages content loading, URL synchronization, cross-reference resolution, and delegates rendering to specialized sub-components.

**Content Type Routing**:
The ReadingView determines what to render based on the URL slug structure:
- `/code/{division}/{part}` → PartRenderer (part overview with child section, appendix, and spectables cards)
- `/code/{division}/{part}/{section}` → SectionRenderer (full section with subsections)
- `/code/{division}/{part}/{section}/{subsection}` → SubsectionBlock
- `/code/{division}/{part}/{section}/{subsection}/{article}` → ArticleBlock
- `/code/front-matter/{section}` → FrontMatterRenderer (preface, introduction, committees)
- `/code/{division}/{part}/appendix` → Part appendix with application notes
- `/code/{division}/appendix/{letter}` → DivisionAppendixRenderer
- `/code/{division}/{part}/spectables/{id}` → SpectablesRenderer

**Cross-Reference Resolution**:
The `resolveCrossReference` function handles all reference types:
- **Section references**: Fetches target section JSON, extracts subsection/article
- **Part references**: Looks up navigation tree node
- **Part appendix notes**: Fetches appendix, finds specific application note by ID
- **Division appendix documents**: Fetches division appendix by letter
- **Spectables/table references**: Fetches spectables data, finds specific table
- **Standards references**: Loads standards map, performs fuzzy key matching
- **External URL references**: Extracts and decodes URL for external navigation

**Cross-Reference Modal**:
- Opens via `CrossReferenceContext.openReference` callback (available to all child components)
- Renders resolved content in a `CrossReferenceModal` side panel
- "Go to Section" button navigates to the target with hash-based deep linking
- Modal state persisted in URL via `?modal={referenceId}` query parameter
- Focus management: stores trigger element ref, restores focus on close

**Hash-Based Deep Linking**:
- Supports `#elementId` hash targets for scrolling to specific elements
- Uses `sessionStorage` for pending hash targets during navigation
- Retry mechanism (up to 50 attempts) waits for content to render before scrolling
- Highlight animation (2.4s) applied to target element after scroll
- Focus applied to target element for keyboard accessibility

**URL State Management**:
- `?version={id}` - BC Building Code version selection
- `?date={date}` - Effective date for amendment filtering
- `?modal={referenceId}` - Currently open cross-reference modal
- Browser back/forward navigation via `popstate` listener
- Navigation store synced from URL pathname on mount

**Key Sub-Components**:
- `ReadingViewHeader` - Header with PDF download button
- `PartTitle` - Consistent part title display
- `SectionRenderer` - Section with all subsections
- `SubsectionBlock` - Subsection with all articles
- `ArticleBlock` - Article with sentences, clauses, tables, figures
- `TableBlock` - Table rendering with revision support
- `FigureBlock` - Figure/image rendering; supports `hide_label: true` on the JSON node to suppress the auto-generated "Figure X.X.X.X.-A" label (used for form/schedule images such as the Letters of Assurance in Division C Section 2.3)
- `EquationBlock` - Equation rendering
- `StructuredListBlock` - Bulleted, numbered, alphabetic, roman, variable, definition, organization lists
  - `variable` / `symbol` list terms render in **regular weight** (not bold); values column uses `column-gap: 6rem`
  - When a `variable` / `symbol` list is nested inside an `<li>`, it receives `padding-left: 3rem` to align with bullet text
- `CrossReferenceLink` - Clickable reference link
- `CrossReferenceModal` - Side panel modal for reference preview
- `GlossaryTerm` - Inline glossary term with click handler
- `NoteReference` - Note badge link
- `FrontMatterRenderer` - Preface/introduction/committees content
- `DivisionAppendixRenderer` - Division-level appendix content (normalizes bulleted → alphabetic/roman for Appendix D)
- `TestingBanner` (`apps/web/components/layout/TestingBanner.tsx`) - Full-width banner rendered between `<Header>` and `<main>` on every page to indicate the site is under active development. Remove this component and its import in `apps/web/app/layout.tsx` when the site exits the testing phase.
- `SpectablesRenderer` - Span tables content

#### Search Components

**HeaderSearch Component** ✅ IMPLEMENTED:

**Location**: `packages/ui/src/header-search/HeaderSearch.tsx`

Compact search variant for the application header with toggle behavior.

**Implementation**: Custom inline dropdown with autocomplete suggestions.

**Features**:
- Toggleable search (icon button → full search input)
- Autocomplete dropdown with suggestions
- Keyboard navigation (Enter, Arrow keys, Escape)
- Loading state indicator
- Cancel button to close search
- Responsive behavior (always visible on mobile)
- Fully accessible (WCAG AAA compliant)

**Desktop layout note**: When the search is open on desktop (≥ 57rem), the search wrapper uses `flex: 1; max-width: 391px` rather than a fixed `391px` width. This prevents the expanded search bar from overflowing into the "BC Building Code" site title when nav link labels are wide (e.g. "Defined Terms"). The fix is in `packages/ui/src/header/Header.css` inside the `@media (min-width: 57rem)` block.

**HeroSearch Component** ✅ IMPLEMENTED:

**Location**: `packages/ui/src/hero-search/HeroSearch.tsx`

Large, prominent search variant for the homepage hero section.

**Implementation**: Custom inline dropdown with autocomplete suggestions.

**Features**:
- Always visible (no toggle)
- Large size (~540px input)
- Optional title and subtitle
- "Search" button with text
- Autocomplete dropdown with suggestions
- Keyboard navigation (Enter, Arrow keys, Escape)
- Loading state indicator
- Centered layout for hero section
- Fully accessible (WCAG AAA compliant)

**Search Component Architecture**:

The search components follow a layered architecture:
1. **useSearch Hook** (packages/data/src/hooks/useSearch.ts) - Provides search state management and business logic
2. **HeaderSearch & HeroSearch** - Variant components with custom inline dropdown implementations

This architecture allows for:
- Shared search logic via the useSearch hook
- Consistent behavior across variants
- Simple debugging (all UI code in one file per variant)
- Easy testing and maintenance

**SearchResults Component**:
- Result list with highlighting
- Breadcrumb paths
- **Infinite scroll** implementation (not pagination)
- Result count display
- **Page-level search box** that auto-populates from URL query parameter
- **No TOC sidebar** (full-width layout)
- Loading indicator for scroll batches
- Batch size: 20-50 results per load

**SearchFilters Component**:
- Amendment date filter
- Division filter (Division A, B, C)
- Part filter (dynamic based on division)
- Content type filter (Article, Table, Figure, Note, Application Note)
- Filter chips showing active filters
- Clear individual filter buttons
- Clear all filters button
- All filters sync with URL query parameters

#### Navigation Components

**NavigationTree Component**:
- Recursive tree rendering following Figma design specifications
- Hierarchical indentation system:
  - Parent level (level 0): 24px left padding
  - Child levels: 32px, 48px, 64px (16px increment per level)
- Active node highlighting with 4px blue selection indicator bar
- Expand/collapse state management
- Keyboard navigation support (Enter, Arrow keys, Escape)
- Loading state indicator
- Scroll-to-active functionality

**Breadcrumbs Component**:
- Appears on ALL pages (Homepage, Search Results, Download, Content Reading)
- Hierarchical path display starting with "Home"
- Format varies by page:
  - Homepage: "Home"
  - Search Results: "Home > Search Results"
  - Download: "Home > Download"
  - Content: "Home > Division > Part > Section > Subsection > Article"
- Clickable navigation links
- Responsive truncation on mobile
- Uses Next.js `usePathname` to detect current page

**PrevNextNav Component**:
- Sequential navigation buttons
- Disabled state for boundaries
- Keyboard shortcuts (arrow keys)

#### Content Components

**ArticleRenderer Component**:
- Renders content at any hierarchy level (Part, Section, Subsection, Article)
- For Part level: Shows title, overview, list of child Sections
- For Section level: Shows title, content, list of child Subsections
- For Subsection level: Shows title, content, list of child Articles
- For Article level: Renders article with title and number
- Delegates to ClauseList for content
- Handles note references
- Manages glossary term highlighting

**ClauseList Component**:
- Recursive clause rendering
- Hierarchical numbering (1, a, i, etc.)
- Proper indentation
- Subclause nesting

**TableRenderer Component**:
- Responsive table layout
- Header row styling
- Merged cell support
- Mobile scroll behavior

**FigureRenderer Component**:
- Image lazy loading
- Caption display
- Reference number
- Zoom functionality

**EquationRenderer Component**:
- Mathematical formula rendering
- Uses KaTeX or MathJax
- Inline and block equations

**PDFExportButton Component**:
- Export PDF button on reading page
- Generates PDF of currently rendered content
- Includes all content at current hierarchy level (Part/Section/Subsection/Article)
- Preserves formatting (tables, figures, text hierarchy)
- Filename based on code reference (e.g., "BCBC-Division-B-Part-3-Section-3-2.pdf")
- Uses browser print API or PDF generation library
- Print-optimized layout option

#### Glossary Components

**GlossaryTerm Component**:
- Styled term display (italic, underlined)
- Click handler for modal
- Hover tooltip preview

**GlossaryModal Component**:
- Term definition display
- Copy-to-clipboard button
- Related terms links
- Close button and overlay

#### Notes Components

**NoteLink Component**:
- Styled badge display
- Click handler for modal
- Note number and title

**NoteModal Component**:
- Full note content display
- Navigation to referenced sections
- Close button and overlay

### Custom Hooks

**useSearch Hook** ✅ IMPLEMENTED:

**Location**: `packages/data/src/hooks/useSearch.ts`

This hook provides component-level search state management and is ideal for search input components with autocomplete:

```typescript
interface UseSearchOptions {
  onSearch: (query: string) => void;
  getSuggestions?: (query: string) => Promise<string[]> | string[];
  debounceMs?: number;
  minQueryLength?: number;
  maxSuggestions?: number;
}

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  suggestions: string[];
  isLoading: boolean;
  error: Error | null;
  handleSubmit: () => void;
  handleClear: () => void;
  handleSelectSuggestion: (suggestion: string) => void;
}

function useSearch(options: UseSearchOptions): UseSearchReturn
```

**Features**:
- Query state management
- Debounced suggestion fetching (default 300ms)
- Loading and error states
- Submit, clear, and suggestion selection handlers
- Configurable debounce delay, min query length, and max suggestions
- Comprehensive TypeScript types and JSDoc documentation

**Usage Example**:
```typescript
const search = useSearch({
  onSearch: (query) => router.push(`/search?q=${query}`),
  getSuggestions: (query) => searchIndex.suggest(query),
});

// In component:
<input
  value={search.query}
  onChange={(e) => search.setQuery(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && search.handleSubmit()}
/>
```

**When to Use**:
- Use `useSearch` hook for local search UI components (autocomplete, suggestions, input handling)
- Use `useSearchStore` Zustand store for global search state (results, filters, loading)
- Both can be used together: hook for input behavior, store for results display
```

**useNavigation** — Navigation state is managed by the Zustand `navigation-store` (see Global Stores section above). There is no separate `useNavigation` hook.

**useGlossary** — Glossary state is managed by the Zustand `glossary-store` (see Global Stores section above). There is no separate `useGlossary` hook.

**useAmendmentDate** — Amendment date state is managed by the Zustand `amendment-date-store` (see Global Stores section above). There is no separate `useAmendmentDate` hook.

**useSearchClient Hook** ✅ IMPLEMENTED:

**Location**: `apps/web/hooks/useSearchClient.ts`

Provides access to the FlexSearch client for performing searches and getting suggestions. Handles initialization and caching of the search index.

**useUrlNavigation Hook** ✅ IMPLEMENTED:

**Location**: `apps/web/hooks/useUrlNavigation.ts`

Manages URL-based navigation and state synchronization between the URL and application state.

**useFunctionalStatements Hook** ✅ IMPLEMENTED:

**Location**: `apps/web/hooks/useFunctionalStatements.ts`

Loads and provides access to functional statements data for cross-reference resolution.

**useObjectives Hook** ✅ IMPLEMENTED:

**Location**: `apps/web/hooks/useObjectives.ts`

Loads and provides access to objectives and sub-objectives data for cross-reference resolution.

## Data Models

### Search Data Model

**SearchResult Interface**:
```typescript
interface SearchResult {
  id: string;
  type: 'article' | 'section' | 'note' | 'glossary';
  number: string;
  title: string;
  snippet: string;
  breadcrumb: string[];
  path: string;
  score: number;
}
```

**SearchFilters Interface**:
```typescript
interface SearchFilters {
  amendmentDate?: string;
  division?: string;
  contentType?: ('article' | 'note' | 'glossary')[];
}
```

### Navigation Data Model

**NavigationNode Interface**:
```typescript
interface NavigationNode {
  id: string;
  number: string;
  title: string;
  type: 'division' | 'part' | 'section' | 'subsection' | 'article' | 'part_appendix' | 'division_appendix' | 'spectables' | 'index' | 'conversions';
  path: string;
  children?: NavigationNode[];
}
```

### Content Data Model

**GlossaryEntry Interface**:
```typescript
interface GlossaryEntry {
  term: string;
  definition: string;
  relatedTerms?: string[];
}
```

**NoteReference Interface**:
```typescript
interface NoteReference {
  id: string;
  number: string;
  title: string;
  content: string;
}
```

**Table Interface**:
```typescript
interface Table {
  id: string;
  number: string;
  title: string;
  headers: TableHeader[];
  rows: TableRow[];
  notes?: string[];
}

interface TableHeader {
  text: string;
  colspan?: number;
  rowspan?: number;
}

interface TableRow {
  cells: TableCell[];
}

interface TableCell {
  text: string;
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}
```

**Figure Interface**:
```typescript
interface Figure {
  id: string;
  number: string;
  title: string;
  imageUrl: string;
  caption?: string;
}
```

**Equation Interface**:
```typescript
interface Equation {
  id: string;
  number: string;
  latex: string;
  display: 'inline' | 'block';
}
```

**AmendmentDate Interface**:
```typescript
interface AmendmentDate {
  date: string;           // ISO date string (e.g., "2025-06-16")
  label: string;          // Human-readable date (e.g., "June 15, 2025")
  description?: string;   // Generated description (e.g., "44 amendments")
  isLatest?: boolean;     // True if this is the most recent date
}
```

**Note**: The `AmendmentDate` interface represents the internal store format. The JSON file format in `amendment-dates.json` uses different field names (`effectiveDate`, `displayDate`, `count`, `type`) which are transformed by the amendment date store during loading.

**FunctionalStatement Interface**:
```typescript
interface FunctionalStatement {
  id: string;             // Unique identifier
  key: string;            // Statement key (e.g., "F01", "F02")
  definition: string;     // Statement definition text
  source?: 'nbc' | 'bc';  // Source of the statement
}
```

**Objective Interface**:
```typescript
interface Objective {
  id: string;                    // Unique identifier
  key: string;                   // Objective key (e.g., "OS", "OH", "OA")
  title: string;                 // Objective title
  definition: string;            // Objective definition text
  source?: 'nbc' | 'bc';         // Source of the objective
  subObjectives?: SubObjective[]; // Child sub-objectives
}
```

**SubObjective Interface**:
```typescript
interface SubObjective {
  id: string;             // Unique identifier
  key: string;            // Sub-objective key (e.g., "OS1", "OS1.1")
  title: string;          // Sub-objective title
  definition: string;     // Sub-objective definition text
  source?: 'nbc' | 'bc';  // Source of the sub-objective
}
```

## Pre-Generated Metadata Files

All filter options, navigation structure, and content organization are pre-generated at build time from the source BC Building Code JSON. These metadata files enable fast client-side filtering and navigation without backend queries.

### Metadata Files Location
`/apps/web/public/data/`

### Metadata File Inventory

#### 1. `navigation-tree.json`
**Purpose:** Hierarchical structure of the entire BC Building Code  
**Used By:** 
- Homepage sidebar (TOC)
- Reading page sidebar (TOC)
- Division filter options
- Part filter options (filtered by division)

**Structure:**
```json
{
  "tree": [
    {
      "id": "nbc.2020.vol1",
      "type": "volume",
      "title": "Volume 1",
      "path": "/volume/1",
      "children": [
        {
          "id": "nbc.divA",
          "type": "division",
          "title": "Division A - Compliance, Objectives and Functional Statements",
          "children": [
            {
              "id": "nbc.divA.part1",
              "type": "part",
              "title": "Part 1 - Compliance",
              "children": [...]
            }
          ]
        },
        {
          "id": "nbc.2020.vol1.index",
          "type": "index",
          "title": "Index",
          "path": "/code/index/volume-1"
        },
        {
          "id": "nbc.2020.vol1.conversions",
          "type": "conversions",
          "title": "Conversion Factors",
          "path": "/code/conversions/volume-1"
        }
      ]
    }
  ]
}
```

#### 2. `amendment-dates.json`
**Purpose:** List of available effective dates for amendments  
**Used By:**
- Effective date filter (all pages with sidebar)
- Search results date filter

**Structure:**
```json
{
  "version": "2020",
  "generatedAt": "2026-05-22T15:07:11.039Z",
  "dates": [
    {
      "effectiveDate": "2025-06-16",
      "displayDate": "June 16, 2025",
      "count": 50,
      "type": "amendment",
      "revisionLabel": "Revision 6"
    },
    {
      "effectiveDate": "2025-03-10",
      "displayDate": "March 10, 2025",
      "count": 4,
      "type": "amendment",
      "revisionLabel": "Revision 4 & 5"
    },
    {
      "effectiveDate": "2024-03-08",
      "displayDate": "March 8, 2024",
      "count": 104,
      "type": "original"
    }
  ]
}
```

**Notes:**
- `revisionLabel` is derived from the `revision_id` field in the source BCBC JSON (ministerial order number)
- When multiple ministerial orders share the same effective date, labels are combined (e.g., "Revision 4 & 5")
- Original entries do not include a `revisionLabel`
- The dropdown displays: `{revisionLabel} – {displayDate} (Latest)` for the first entry

#### 3. `content-types.json`
**Purpose:** Available content types for filtering  
**Used By:**
- Search results content type filter

**Structure:**
```json
{
  "types": [
    {
      "id": "article",
      "label": "Article",
      "count": 1250
    },
    {
      "id": "table",
      "label": "Table",
      "count": 340
    },
    {
      "id": "figure",
      "label": "Figure",
      "count": 180
    },
    {
      "id": "note",
      "label": "Note",
      "count": 520
    },
    {
      "id": "application-note",
      "label": "Application Note",
      "count": 95
    }
  ]
}
```

#### 4. `quick-access.json`
**Purpose:** Frequently accessed sections for homepage  
**Used By:**
- Homepage quick access pins

**Structure:**
```json
{
  "pins": [
    {
      "id": "fire-protection",
      "title": "Fire Protection Requirements",
      "reference": "Division B, Part 3",
      "description": "Fire safety and protection requirements",
      "url": "/code/division-b/part-3"
    }
  ]
}
```

#### 5. `glossary-map.json`
**Purpose:** Glossary term definitions  
**Used By:**
- Glossary sidebar overlay
- Inline glossary term highlighting

**Structure:**
```json
{
  "terms": {
    "fire-separation": {
      "term": "Fire Separation",
      "definition": "A construction assembly that acts as a barrier...",
      "relatedTerms": ["fire-resistance-rating", "combustible-construction"]
    }
  }
}
```

#### 6. `search/documents.json` and `search/metadata.json`
**Purpose:** Pre-built FlexSearch index and search metadata  
**Used By:**
- Search functionality (header, hero, search page)
- Autocomplete suggestions

**Structure:** Binary/optimized FlexSearch format

#### 7. `content/{path}.json`
**Purpose:** Content chunks for each section/article  
**Used By:**
- Reading page content rendering
- Lazy-loaded on demand

**Structure:**
```json
{
  "id": "article-1-1-1-1",
  "reference": "1.1.1.1",
  "title": "Application",
  "content": "...",
  "tables": [...],
  "figures": [...],
  "notes": [...],
  "relatedArticles": [...]
}
```

#### 8. `functional-statements.json`
**Purpose:** Functional statements from Division A, Part 3, Section 2  
**Used By:**
- Objective-based code navigation
- Cross-reference lookups for functional statements

**Structure:**
```json
{
  "statements": {
    "f01": {
      "id": "nbc.divA.part3.sec2.ss1.art1.f01",
      "key": "F01",
      "definition": "To limit the probability that...",
      "source": "nbc"
    }
  }
}
```

#### 9. `objectives.json`
**Purpose:** Objectives and sub-objectives from Division A, Part 2, Section 2  
**Used By:**
- Objective-based code navigation
- Cross-reference lookups for objectives

**Structure:**
```json
{
  "objectives": {
    "os": {
      "id": "nbc.divA.part2.sec2.ss1.art1.os",
      "key": "OS",
      "title": "Safety",
      "definition": "An objective of this Code is to limit...",
      "source": "nbc",
      "subObjectives": [
        {
          "id": "nbc.divA.part2.sec2.ss1.art1.os1",
          "key": "OS1",
          "title": "Fire Safety",
          "definition": "To limit the probability of...",
          "source": "nbc"
        }
      ]
    }
  }
}
```

### Build-Time Generation Process

1. **Parse source JSON** (`/data/source/bcbc-2024.json`)
2. **Extract structure** → Generate `navigation-tree.json`
3. **Extract dates** → Generate `amendment-dates.json`
4. **Analyze content types** → Generate `content-types.json`
5. **Build search index** → Generate `search/documents.json` + `search/metadata.json`
6. **Extract glossary** → Generate `glossary-map.json`
7. **Extract functional statements** → Generate `functional-statements.json`
8. **Extract objectives** → Generate `objectives.json`
9. **Chunk content** → Generate `content/{path}.json` files
10. **Configure quick access** → Generate `quick-access.json`

### Runtime Loading Strategy

- **Eager Load (on app init):**
  - `navigation-tree.json`
  - `amendment-dates.json`
  - `content-types.json`
  - `quick-access.json`

- **Lazy Load (on demand):**
  - `search/documents.json` + `search/metadata.json` (when search is first used)
  - `glossary-map.json` (when first glossary term clicked)
  - `content/{path}.json` (when specific content accessed)

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Build Pipeline Properties

**Property 1: Complete Asset Generation**
*For any* valid BCBC JSON input, the build pipeline should generate all required static assets: FlexSearch index, navigation tree, glossary map, amendment dates, and content chunks organized by division/part/section.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

**Property 2: Build Output Validation**
*For any* generated static asset, all required fields should be present and valid according to the expected schema.
**Validates: Requirements 16.1, 16.3**

**Property 3: Cross-Reference Validity**
*For any* navigation tree or content with cross-references, all referenced sections should exist in the BCBC document.
**Validates: Requirements 16.4**

**Property 4: Validation Error Reporting**
*For any* validation error during build, the error message should include the file location and specific issue description.
**Validates: Requirements 16.5**

**Property 5: Invalid Input Rejection**
*For any* invalid BCBC JSON input, the build pipeline should fail with descriptive error messages rather than producing incorrect output.
**Validates: Requirements 16.2**

### Search Properties

**Property 6: Search Coverage**
*For any* search query, results should include matches from all content types (article titles, sentence text, clause text, notes, glossary terms) when matching content exists.
**Validates: Requirements 3.2**

**Property 7: Search Result Completeness**
*For any* search result, the displayed information should include article number, title, matched snippet, and hierarchical breadcrumb path.
**Validates: Requirements 3.3**

**Property 8: Search Result Ordering**
*For any* set of search results, they should be sorted primarily by content hierarchy level (Part > Section > Subsection > Article > Table/Figure > Note/Application-Note > Glossary), then by relevance score within the same hierarchy level. A lower-hierarchy item may override this ordering only when its relevance score exceeds the higher-hierarchy item's score by more than 3x, indicating an overwhelmingly stronger match. The relevance score within each level incorporates field match weights, an exponential hierarchy boost (`1.5^searchPriority`), amendment boosts, and title match boosts.
**Validates: Requirements 3.4**

**Property 9: Search Pagination**
*For any* search result set larger than the configured page size, pagination controls should be displayed and function correctly.
**Validates: Requirements 3.5**

**Property 10: Fuzzy Search**
*For any* search query with common misspellings, relevant results should still be returned.
**Validates: Requirements 3.6**

**Property 11: Phrase Search**
*For any* multi-word or hyphenated search query, all results must contain the query (with optional word-ending extensions for plurals/variants) in the document's title or text. Single-word queries without hyphens use standard token matching. The match is case-insensitive and uses prefix matching (e.g., "fire extinguisher" matches "fire extinguishers"). Search results display 50 characters of context around the matched term with the search term highlighted in yellow. Results include content from articles, tables, figures, application notes, glossary terms, and volume index entries.
**Validates: Requirements 3.7**

**Property 12: Search Result Navigation**
*For any* search result, clicking it should navigate to the correct content page URL.
**Validates: Requirements 3.8**

### Navigation Properties

**Property 13: Navigation Tree Structure**
*For any* navigation tree, it should follow the hierarchical structure: Volume → Division → Part → Section → Subsection → Article, with Index and Conversion Factors as leaf nodes after divisions in Volume 2 only (excluded from Volume 1).
**Validates: Requirements 4.2**

**Property 14: Navigation Node Interaction**
*For any* navigation node with children, clicking it should toggle the expanded/collapsed state and navigate to the corresponding content.
**Validates: Requirements 4.3, 4.4**

**Property 15: Active Node Highlighting**
*For any* displayed content page, the corresponding navigation node should be highlighted in the navigation tree.
**Validates: Requirements 4.5**

**Property 16: Breadcrumb Display**
*For any* content page, a breadcrumb trail should be displayed showing the complete hierarchical path from root to current location.
**Validates: Requirements 4.6**

**Property 17: Sequential Navigation**
*For any* content page that is not at a boundary (first or last), Previous and Next navigation buttons should be displayed and navigate to the correct adjacent content.
**Validates: Requirements 4.7**

**Property 18: URL-Content Synchronization (Round-Trip)**
*For any* content page, the URL should reflect the current location, and loading that URL should display the same content.
**Validates: Requirements 4.8, 4.9**

### Content Rendering Properties

**Property 19: Sentence and Clause Rendering**
*For any* article with sentences and clauses, the rendered output should display numbered sentences and lettered clauses with proper hierarchical indentation.
**Validates: Requirements 5.1**

**Property 20: Table Rendering**
*For any* table in content, the rendered output should preserve the table structure including headers, merged cells (colspan/rowspan), and formatting.
**Validates: Requirements 5.2**

**Property 21: Figure Rendering**
*For any* figure in content, the rendered output should include the image, caption, and reference number.
**Validates: Requirements 5.3**

**Property 22: Equation Rendering**
*For any* equation in content, the rendered output should correctly display the mathematical formula.
**Validates: Requirements 5.4**

**Property 23: Cross-Reference Rendering**
*For any* cross-reference in content, the rendered output should be a clickable link with the correct target URL.
**Validates: Requirements 5.5**

**Property 24: Lazy Loading**
*For any* content page, the content JSON should not be loaded until the user navigates to that page.
**Validates: Requirements 5.6**

### Glossary Properties

**Property 25: Glossary Term Styling**
*For any* content containing glossary terms, those terms should be rendered with distinct styling (italic and underlined).
**Validates: Requirements 6.1**

**Property 26: Glossary Term Interaction**
*For any* glossary term in content, clicking it should display a modal or popover containing the term's definition.
**Validates: Requirements 6.2**

**Property 27: Glossary Modal Content**
*For any* glossary modal, it should display the term definition and include a copy-to-clipboard button.
**Validates: Requirements 6.3**

**Property 28: Glossary Modal Dismissal**
*For any* open glossary popover, clicking outside the popover should close it.
**Validates: Requirements 6.4**

### Amendment Date Filtering Properties

**Property 29: Content Date Filtering**
*For any* selected amendment date, all displayed content should show only content effective on or before that date.
**Validates: Requirements 7.2**

**Property 30: Search Date Filtering**
*For any* selected amendment date, search results should only include content effective on or before that date.
**Validates: Requirements 7.3**

**Property 31: Amendment Date Persistence (Round-Trip)**
*For any* selected amendment date, it should be persisted in both URL query parameters and localStorage, and restored when the application loads.
**Validates: Requirements 7.4, 7.5, 7.6**

### Note Properties

**Property 32: Note Link Rendering**
*For any* content with note references, the note links should be rendered as styled badges displaying the note number (e.g., "A-1.1.1.1.(3)").
**Validates: Requirements 8.1**

**Property 33: Note Modal Display**
*For any* note link, clicking it should display a modal containing the note number, title, and full content.
**Validates: Requirements 8.2, 8.3**

**Property 34: Note Modal Controls**
*For any* note modal, it should include a close button, and if the note references another code section, it should provide a navigation link to that section.
**Validates: Requirements 8.4, 8.5**

### Responsive Design Properties

**Property 35: Tablet Responsive Behavior**
*For any* viewport width less than 1024px, the navigation tree should collapse into a toggleable sidebar matching Figma tablet specifications.
**Validates: Requirements 9.2**

**Property 36: Mobile Responsive Behavior**
*For any* viewport width less than 768px, the panels should stack vertically following Figma mobile layout specifications.
**Validates: Requirements 9.3**

**Property 37: Text Scaling Support**
*For any* page at 200% text zoom, no horizontal scrolling should be required to read content.
**Validates: Requirements 9.5**

**Property 38: Figma Design Adherence**
*For any* UI component, the rendered output should match the corresponding Figma design specifications including spacing, typography, colors, and interactive states.
**Validates: Requirements 9.1, 9.2, 9.3**

### Accessibility Properties

**Property 38: Keyboard Navigation**
*For any* interactive element in the application, it should be reachable and operable using only keyboard navigation.
**Validates: Requirements 10.1**

**Property 39: Focus Indicators**
*For any* focused interactive element, a visible focus indicator should be displayed with at least 3:1 contrast ratio.
**Validates: Requirements 10.2**

**Property 40: Semantic HTML Structure**
*For any* page, headings should follow proper hierarchical order (h1, h2, h3, etc.) without skipping levels.
**Validates: Requirements 10.3**

**Property 41: ARIA Labels**
*For any* interactive component, appropriate ARIA labels should be present to describe its purpose.
**Validates: Requirements 10.4**

**Property 42: ARIA Live Regions**
*For any* dynamic content update (such as search results), ARIA live regions should be used to announce changes to screen readers.
**Validates: Requirements 10.5**

**Property 43: Color Contrast - Normal Text**
*For any* normal text element, the color contrast ratio should be at least 7:1 (WCAG AAA).
**Validates: Requirements 10.7**

**Property 44: Color Contrast - Large Text**
*For any* large text element, the color contrast ratio should be at least 4.5:1 (WCAG AAA).
**Validates: Requirements 10.8**

**Property 45: Modal Focus Trap**
*For any* open modal, keyboard focus should be trapped within the modal, and when closed, focus should return to the triggering element.
**Validates: Requirements 10.9, 10.10**

### Static Site Properties

**Property 46: Client-Side Routing**
*For any* navigation action in the application, routing should work without server-side requests.
**Validates: Requirements 12.4**

### Error Handling Properties

**Property 47: Content Load Error Handling**
*For any* content load failure, a user-friendly error message should be displayed.
**Validates: Requirements 15.1**

**Property 48: Search Error Handling**
*For any* search failure, an error message and retry option should be provided.
**Validates: Requirements 15.2**

**Property 49: 404 Error Handling**
*For any* request to a non-existent page, a 404 page with navigation options should be displayed.
**Validates: Requirements 15.3**

**Property 50: Generic Error Handling**
*For any* unexpected error, a generic error page with a link to return home should be displayed.
**Validates: Requirements 15.4**

**Property 51: Error Logging**
*For any* error that occurs, an entry should be logged to the browser console for debugging.
**Validates: Requirements 15.5**

## Error Handling


### Build-Time Errors

**Invalid BCBC JSON**:
- Validate JSON structure against schema
- Fail build with descriptive error messages
- Include file location and specific validation failures
- Provide suggestions for fixing common issues

**Missing Required Fields**:
- Check for required fields in all data structures
- Report missing fields with path to the problematic element
- Fail build to prevent incomplete data deployment

**Invalid Cross-References**:
- Validate all cross-references point to existing content
- Report broken references with source and target locations
- Fail build to prevent broken links in production

### Runtime Errors

**Content Loading Failures**:
- Display user-friendly error message
- Provide retry button
- Log detailed error to console
- Offer navigation back to home or search

**Search Failures**:
- Display error message explaining the issue
- Provide retry button
- Maintain user's search query for retry
- Log error details to console

**404 Not Found**:
- Display custom 404 page
- Provide search functionality
- Show navigation tree for browsing
- Offer link to home page

**Unexpected Errors**:
- Catch unhandled errors with error boundary
- Display generic error page
- Provide link to return home
- Log full error stack to console
- Optionally report to error tracking service

**Network Errors**:
- Detect offline state
- Display offline indicator
- Explain which features require network
- Allow continued use of cached content

## Testing Strategy

### Dual Testing Approach

The application will use both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Specific component rendering scenarios
- Integration points between components
- Edge cases (empty data, boundary conditions)
- Error conditions and error handling paths

**Property Tests**: Verify universal properties across all inputs
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Minimum 100 iterations per property test
- Each property test references its design document property

Both testing approaches are complementary and necessary for comprehensive coverage. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Library Selection**: fast-check (for TypeScript/JavaScript)

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: bcbc-interactive-web-app, Property {number}: {property_text}`
- Custom generators for BCBC data structures
- Shrinking enabled to find minimal failing examples

**Example Property Test Structure**:
```typescript
import fc from 'fast-check';

// Feature: bcbc-interactive-web-app, Property 1: Complete Asset Generation
test('build pipeline generates all required assets for any valid BCBC JSON', () => {
  fc.assert(
    fc.property(
      bcbcDocumentArbitrary(),
      (bcbcDoc) => {
        const assets = buildPipeline.generate(bcbcDoc);
        
        expect(assets.flexSearchIndex).toBeDefined();
        expect(assets.navigationTree).toBeDefined();
        expect(assets.glossaryMap).toBeDefined();
        expect(assets.amendmentDates).toBeDefined();
        expect(assets.contentChunks).toBeDefined();
        expect(assets.contentChunks.length).toBeGreaterThan(0);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Strategy

**Testing Framework**: Vitest with React Testing Library

**Component Testing**:
- Render tests for all components
- Interaction tests (clicks, keyboard navigation)
- Accessibility tests (ARIA labels, focus management)
- Responsive behavior tests

**Hook Testing**:
- State management tests
- Side effect tests (localStorage, URL updates)
- Error handling tests

**Utility Testing**:
- Parser validation tests
- Search algorithm tests
- Content chunking tests

**Integration Testing**:
- End-to-end user flows
- Navigation between pages
- Search and result display
- Modal interactions

### Test Organization

Tests are co-located with their source files (not in separate `__tests__/` directories):

```
apps/web/
├── components/
│   ├── navigation/
│   │   ├── NavigationTree.tsx
│   │   ├── NavigationTree.test.tsx      # Co-located test
│   │   ├── Breadcrumbs.tsx
│   │   └── Breadcrumbs.test.tsx
│   ├── download/
│   │   ├── DownloadPage.tsx
│   │   └── DownloadPage.test.tsx
│   └── ...
├── hooks/
│   ├── useSearchClient.ts
│   └── useSearchClient.test.ts
├── stores/
│   ├── navigation-store.ts
│   └── navigation-store.test.ts
├── lib/stores/
│   ├── appendix-store.ts
│   └── appendix-store.test.ts
│
packages/bcbc-parser/
├── src/
│   ├── parser.ts
│   └── parser.test.ts
│
packages/search-indexer/
├── src/
│   ├── indexer.ts
│   └── indexer.test.ts
│
packages/content-chunker/
├── src/
│   ├── chunker.ts
│   └── chunker.test.ts
```

### Accessibility Testing

**Automated Testing**:
- vitest-axe for automated accessibility checks
- Test all components for WCAG AAA compliance
- Verify color contrast ratios
- Check ARIA attributes

**Manual Testing**:
- Keyboard navigation testing
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Browser zoom testing (up to 200%)
- High contrast mode testing

### Performance Testing

**Metrics to Monitor**:
- Bundle size analysis
- Lighthouse CI in pipeline
- Search response time benchmarks
- Content load time benchmarks

**Tools**:
- webpack-bundle-analyzer
- Lighthouse CI
- Chrome DevTools Performance profiling

### Continuous Integration

**CI Pipeline**:
1. Lint all code (ESLint, Prettier)
2. Type check (TypeScript)
3. Run unit tests
4. Run property tests
5. Build application
6. Generate static assets
7. Run accessibility tests
8. Run Lighthouse CI
9. Build Docker image

**Quality Gates**:
- All tests must pass
- Code coverage > 80%
- No TypeScript errors
- No ESLint errors
- Lighthouse Performance > 90
- Lighthouse Accessibility = 100

## Deployment Architecture

### Build Process

```
1. Install dependencies (pnpm install)
2. Generate static assets (pnpm generate-assets or pnpm generate-assets:multi)
   - Parse BCBC JSON
   - Generate FlexSearch index
   - Generate navigation tree
   - Generate glossary map
   - Generate amendment dates
   - Split content into chunks
3. Build Next.js application (pnpm build)
   - Compile TypeScript
   - Bundle JavaScript
   - Generate static HTML/CSS/JS
   - Optimize assets
   - Static export included (configured via next.config)
```

### Docker Container

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm generate-assets:multi
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/apps/web/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # Enable gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

  # Cache static assets
  location /_next/static/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location /data/ {
    add_header Cache-Control "public, max-age=3600";
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### OpenShift Deployment

**Deployment Configuration**:
- Container runs Nginx serving static files
- Horizontal pod autoscaling based on CPU/memory
- Health checks on root endpoint
- Resource limits: 256MB memory, 0.5 CPU

**Environment Variables**:
- `NODE_ENV=production`
- `NEXT_PUBLIC_BASE_PATH` (if deployed to subdirectory)

**Deployment Pipeline**:
1. Build Docker image
2. Push to OpenShift registry
3. Deploy to DEV environment
4. Run smoke tests
5. Promote to TEST environment (manual approval)
6. Run full test suite
7. Promote to PROD environment (manual approval)

## Security Considerations

### Content Security Policy

```typescript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];
```

### Data Validation

- Validate all BCBC JSON at build time
- Sanitize user input in search queries
- Validate URL parameters before use
- Escape HTML in rendered content

### Dependency Security

- Regular dependency updates
- Automated vulnerability scanning (npm audit, Snyk)
- Lock file integrity checks
- Minimal dependency footprint

## Future Enhancements

### Phase 2 Features

1. **Advanced Search**:
   - Boolean operators (AND, OR, NOT)
   - Field-specific search (title:, content:, number:)
   - Search history and saved searches

2. **User Annotations**:
   - Personal notes on articles
   - Bookmarks and favorites
   - Stored in localStorage

3. **Comparison View**:
   - Side-by-side comparison of different amendment dates
   - Highlight changes between versions

4. **Export Functionality**:
   - Export search results to PDF
   - Export specific sections to PDF
   - Print-optimized views

5. **Offline Support**:
   - Service worker for offline caching
   - Progressive Web App (PWA) capabilities
   - Offline indicator and sync status

### Phase 3 Features

1. **Collaboration**:
   - Share annotations with team members
   - Comment threads on articles
   - Backend API for data persistence

2. **Analytics**:
   - Track most-searched terms
   - Popular sections
   - User journey analytics

3. **Mobile App**:
   - Native iOS and Android apps
   - Offline-first architecture
   - Push notifications for code updates

## Summary

This design provides a comprehensive blueprint for building a static, client-side web application that transforms the BC Building Code into an accessible, searchable interface. The architecture prioritizes performance, accessibility, and maintainability through:

- **Static-first approach**: No backend required, all functionality client-side
- **Build-time optimization**: Pre-generated indexes and content chunks
- **Comprehensive testing**: Both unit and property-based testing
- **Accessibility-first**: WCAG AAA compliance built into every component
- **Monorepo structure**: Clear separation of concerns with shared packages
- **Modern tech stack**: Next.js, TypeScript, React, BC Design System, FlexSearch

The implementation will follow an agile sprint approach, with each sprint delivering incremental value while building toward the complete vision.