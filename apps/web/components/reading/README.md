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

### CSS Modules

All components have co-located CSS files using BC Design System variables:

- `ReadingView.css` - Main container styles
- `ContentRenderer.css` - Recursive content renderer
- `SubsectionBlock.css` - Subsection component
- `ArticleBlock.css` - Article component
- `ClauseRenderer.css` - Clause rendering with indentation
- `ContentSourceIndicator.css` - BC/NBC source borders
- `GlossaryTerm.css` - Glossary term inline component
- `CrossReferenceLink.css` - Cross-reference link
- `CrossReferenceModal.css` - Modal for cross-references
- `TableBlock.css` - Table rendering with scroll
- `FigureBlock.css` - Figure/image rendering
- `PdfDownloadButton.css` - PDF download button
- `SourceBadges.css` - Source legend badges

## Next Steps

The following tasks will implement the actual React components using these types and styles:

1. Task 2: URL parsing and content fetching
2. Task 3: Core rendering components
3. Task 4-15: Interactive features, accessibility, and optimizations

## Design System Integration

All CSS modules use BC Design System variables from `packages/ui/src/variables.css`:

- Colors: `--surface-color-*`, `--typography-color-*`, `--icons-color-*`
- Typography: `--typography-font-*`, `--typography-line-heights-*`
- Spacing: `--layout-padding-*`, `--layout-margin-*`
- Layout: `--layout-border-*`, `--layout-max-width-*`
- Shadows: `--surface-shadow-*`

## Requirements Validation

This task satisfies the following requirements:

- **21.1**: Component modularity with discrete sub-components
- **21.2**: Recursive rendering strategy via ContentRenderer
- **21.3**: Separation of presentation and data-loading logic
- **21.4**: TypeScript interfaces for all props and state
- **21.5**: CSS modules with BC Design System variables
- **21.6**: Co-located CSS files with components
- **21.7**: Exported components for reusability and testing
