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
- `TableBlock` - Table rendering with scroll
- `FigureBlock` - Figure/image rendering
- `EquationBlock` - Equation/formula rendering

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


