# Reading Page Content Renderer

This directory contains the components and styles for the BC Building Code Reading Page Content Renderer.

## Structure

### TypeScript Interfaces

All TypeScript interfaces are defined in `packages/data/src/types/reading.ts`:

- **Content Types**: `SectionContent`, `SubsectionContent`, `ArticleContent`, `ClauseContent`, `InlineContent`, `TableContent`, `FigureContent`, `EquationContent`, `NoteContent`, `CrossReference`, `GlossaryTerm`
- **State Models**: `ContentState`, `UIState`, `URLParams`
- **Component Props**: All component prop interfaces for type safety

### Zustand Stores

Located in `apps/web/lib/stores/`:

- **content-store.ts**: Manages content loading, caching, and subtree extraction
- **ui-store.ts**: Manages modal, glossary sidebar, and PDF generation state

### Components

All components have co-located CSS files using BC Design System variables:

**Main Layout Components:**
- `ReadingView` - Main container and layout orchestration
- `ReadingViewHeader` - Header with breadcrumbs and actions
- `ContentRenderer` - Recursive content renderer (core component)
- `PartRenderer` - Part-level content rendering
- `SectionRenderer` - Section-level content rendering
- `PrintFooter` - Print-only footer showing edition and effective date (see details below)

**Content Block Components:**
- `PartTitle` - Part title display
- `SectionTitle` - Section title display
- `SubsectionBlock` - Subsection component
- `ArticleBlock` - Article component
- `ClauseBlock` - Clause component
- `ClauseRenderer` - Clause rendering with indentation
- `SubclauseBlock` - Subclause component
- `SentenceBlock` - Sentence-level content
- `NoteBlock` - Note content block
- `TableBlock` - Table rendering with horizontal scroll, sticky first column, and pinned header overlay (see details below)
- `FigureBlock` - Figure/image rendering
- `EquationBlock` - Equation/formula rendering

### PrintFooter — Print-Only Edition & Date Footer

`PrintFooter` is `display: none` on screen and rendered as a `position: fixed; bottom: 0` element in `@media print`, so it repeats on every printed page above the browser's native URL/page-number line.

**Content:**
- Left: version title from `useVersionStore` (e.g. `"BC Building Code 2024"`)
- Right: selected effective date label from `useAmendmentDateStore` (e.g. `"Effective: June 16, 2025 (Latest)"`)

**Placement:** inserted into all six printable branches of `ReadingView` (front-matter, part-level, part-appendix, division-appendix, spectables, main section).

**`@page { margin-bottom: 1.5cm }`** in `globals.css` reserves space so page content does not overlap the footer.

**Browser limitation:** the alternating left/right footer seen in the official BC government static PDF is produced by a professional PDF engine using `@page :left` / `@page :right` CSS Paged Media selectors, which are not supported by browser print dialogs. Our footer appears consistently at the bottom of every page. The effective date shown is a value-add over the static PDF.

---

### TableBlock — Horizontal Scroll & Sticky Column

Wide tables use a **split-scroll layout** (separate header and body viewports) with two sticky column behaviours:

#### Sticky first column (body)
Body rows are rendered by `renderBodyRowsWithColTracking`, which tracks the true visual column position of each cell across rowspans. Cells genuinely at column 0 receive the `table-block__cell--first-col` CSS class, which applies `position: sticky; left: 0`. The class-based approach (rather than `:first-child`) is required because rows whose column 0 is covered by a rowspan from a prior row have a different first DOM child.

#### Pinned header first column overlay
A separate `table-block__pinned-header-col` `<div>` is rendered as a child of `.table-block__header-viewport` (which is `position: relative`). The overlay is `position: absolute; left: 0; z-index: 5` and contains a mini-table with only the first-column header cells (extracted by `pinnedHeaderFirstColRows`). This approach avoids z-index conflicts between table row groups that made an earlier counter-`translateX` approach unreliable.

#### `border-collapse: separate` on split tables
Both `.table-block__table--split-header` and `.table-block__table--split-body` use `border-collapse: separate; border-spacing: 0` so that positioned/sticky cells get their own compositing layer and are not painted behind scrolling siblings. Double-border side-effects are neutralised by removing `border-top` and `border-left` from all cells.

**Interactive Components:**
- `GlossaryTerm` - Glossary term inline component
- `GlossarySidebar` - Glossary sidebar panel
- `CrossReferenceLink` - Cross-reference link
- `CrossReferenceModal` - Modal for cross-references
- `FunctionalStatementLink` - Functional statement links
- `ObjectiveLink` - Objective links
- `NoteReference` - Note reference links
- `NotesList` - List of notes

**Utility Components:**
- `ContentSourceIndicator` - BC/NBC source borders
- `SourceBadges` - Source legend badges
- `PdfDownloadButton` - PDF download button
- `DefinitionsList` - Definitions list display
- `ErrorState` - Error state display
- `LiveRegion` - Accessibility live region
- `SkipLink` - Skip navigation link
- `CompoundRef` - Compound reference handling
- `CrossReferenceContext` - Context provider for cross-references


