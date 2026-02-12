# Content Rendering Strategy

## Overview

This document describes the complete content rendering strategy for the BC Building Code Interactive Web Application, from asset generation to recursive rendering in the browser.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Asset Generation Phase](#asset-generation-phase)
3. [Content Chunking Strategy](#content-chunking-strategy)
4. [Content JSON Format](#content-json-format)
5. [Effective Date Filtering](#effective-date-filtering)
6. [Runtime Content Loading](#runtime-content-loading)
7. [Recursive Content Rendering](#recursive-content-rendering)
8. [Type-Driven Rendering](#type-driven-rendering)
9. [Performance Considerations](#performance-considerations)

---

## Architecture Overview

The content rendering strategy follows a three-phase approach:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: BUILD TIME                          │
│  Source JSON → Parser → Chunker → Generated Assets              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: RUNTIME                             │
│  User Navigation → Fetch Section JSON → Load into Store         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3: RENDERING                           │
│  Section Data → Type-Driven Recursive Renderer → UI             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **No Transformation**: Content structure is preserved from source to render
2. **Type-Driven**: Each content node has a `type` field that determines its renderer
3. **Recursive**: Nested content is rendered recursively using the same dispatcher
4. **Lazy Loading**: Only fetch section-level chunks as needed
5. **Source Order Preservation**: Content renders exactly as it appears in source

---

## Asset Generation Phase

### Command

```bash
npx pnpm generate-assets
```

### Process Flow

```
1. Load Source JSON
   ↓
2. Parse with @bc-building-code/bcbc-parser
   ↓
3. Validate Structure
   ↓
4. Generate Search Index (@bc-building-code/search-indexer)
   ↓
5. Extract Metadata (@bc-building-code/content-chunker)
   ↓
6. Chunk Content by Section (@bc-building-code/content-chunker)
   ↓
7. Write to /apps/web/public/data/{version}/
```

### Generated Assets

For each version (e.g., `2024`, `2027`):

```
/apps/web/public/data/{version}/
├── search/
│   ├── documents.json          # FlexSearch index
│   └── metadata.json            # Search metadata
├── navigation-tree.json         # Hierarchical navigation
├── glossary-map.json            # Term definitions
├── amendment-dates.json         # Available effective dates
├── content-types.json           # Content type filters
├── quick-access.json            # Homepage pins
└── content/                     # Content chunks (by section)
    ├── nbc-diva/
    │   ├── part-1/
    │   │   ├── section-1.json
    │   │   ├── section-2.json
    │   │   └── ...
    │   ├── part-2/
    │   └── ...
    ├── nbc-divb/
    └── ...
```

### Multi-Version Support

The system supports multiple code versions simultaneously:

- Each version has its own directory: `/data/2024/`, `/data/2027/`
- Version index at `/data/versions.json` lists all available versions
- Users can switch versions via URL parameter: `?version=2024`

---

## Content Chunking Strategy

### Chunking Level: Section

Content is chunked at the **section level** for optimal performance:

- **Chunk Size**: 50-200 KB per section (typical)
- **Granularity**: Each section is a complete, self-contained chunk
- **Total Chunks**: ~104 sections per version

### Why Section-Level?

1. **Optimal Size**: Sections are large enough to reduce HTTP requests but small enough for fast loading
2. **Natural Boundaries**: Sections are logical divisions in the building code
3. **User Navigation**: Users typically navigate to sections, not individual articles
4. **Caching**: Section-level caching is efficient and predictable

### Chunking Process

```typescript
// packages/content-chunker/src/chunker.ts

export function chunkContent(document: BCBCDocument): ContentChunk[] {
  const chunks: ContentChunk[] = [];

  for (const division of document.volumes.flatMap(v => v.divisions)) {
    for (const part of division.parts) {
      for (const section of part.sections) {
        // Generate path for this section chunk
        const path = generateChunkPath(division.id, part.number, section.number);
        
        // Section data includes all subsections and articles (no transformation)
        const data = section;
        
        chunks.push({ path, data, size: JSON.stringify(data).length });
      }
    }
  }

  return chunks;
}
```

### Chunk Path Format

```
content/{division}/part-{part}/section-{section}.json

Examples:
- content/nbc-diva/part-1/section-1.json
- content/nbc-divb/part-3/section-2.json
- content/nbc-divbv2/part-9/section-1.json
```

---

## Content JSON Format

### Structure Hierarchy

```
Section
├── Subsection[]
    ├── Article[]
        ├── content: ArticleContentNode[]
            ├── Sentence
            │   ├── text: string
            │   ├── glossaryTerms: string[]
            │   └── content: SentenceContentNode[]
            │       ├── Clause
            │       │   ├── text: string
            │       │   └── content: ClauseContentNode[]
            │       │       ├── Subclause
            │       │       ├── Table
            │       │       ├── Figure
            │       │       └── Equation
            │       ├── Table
            │       ├── Figure
            │       └── Equation
            ├── Table
            ├── Figure
            ├── Equation
            └── NoteReference
```

### Type System

Every content node has a `type` field:

```typescript
// Content node types
type ArticleContentNode = Sentence | Table | Figure | Equation | NoteReference;
type SentenceContentNode = Clause | Table | Figure | Equation;
type ClauseContentNode = Subclause | Table | Figure | Equation;
```

### Example JSON Structure

```json
{
  "id": "nbc.divA.part1.sect1",
  "number": "1",
  "title": "General",
  "type": "section",
  "subsections": [
    {
      "id": "nbc.divA.part1.sect1.subsect1",
      "number": "1",
      "title": "Application of this Code",
      "type": "subsection",
      "articles": [
        {
          "id": "nbc.divA.part1.sect1.subsect1.art1",
          "number": "1",
          "title": "Application of this Code",
          "type": "article",
          "content": [
            {
              "id": "nbc.divA.part1.sect1.subsect1.art1.sent1",
              "number": "1",
              "type": "sentence",
              "text": "This Code applies to any one or more of the following:",
              "glossaryTerms": [],
              "revised": false,
              "content": [
                {
                  "id": "nbc.divA.part1.sect1.subsect1.art1.sent1.clause1",
                  "number": "a",
                  "type": "clause",
                  "text": "the design and construction of a new [REF:term:bldng]building,",
                  "glossaryTerms": ["bldng"],
                  "revised": true,
                  "revisions": [
                    {
                      "type": "original",
                      "effective_date": "2024-01-01"
                    },
                    {
                      "type": "revision",
                      "effective_date": "2024-06-15",
                      "revision_type": "amendment",
                      "sequence": 1,
                      "text": "the design and construction of a new [REF:term:bldng]building or structure,",
                      "change_summary": "Added 'or structure' to clarify scope"
                    }
                  ]
                },
                {
                  "id": "nbc.divA.part1.sect1.subsect1.art1.sent1.clause2",
                  "number": "b",
                  "type": "clause",
                  "text": "the [REF:term:ccpnc]occupancy of any [REF:term:bldng]building,",
                  "glossaryTerms": ["ccpnc", "bldng"]
                }
              ]
            },
            {
              "id": "nbc.divA.part1.sect1.subsect1.art1.table1",
              "type": "table",
              "number": "1.1.1.1-A",
              "title": "Example Table",
              "rows": [...]
            }
          ]
        }
      ]
    }
  ]
}
```

### Key Features

1. **Flat Content Arrays**: Each level has a `content` array with mixed types
2. **Type Field**: Every node has `type: 'sentence' | 'clause' | 'table' | ...`
3. **Source Order**: Items in `content` arrays appear in source order
4. **No Transformation**: Structure matches parser output exactly
5. **Glossary Markers**: Text contains `[REF:term:id]` markers for glossary terms
6. **Revision Support**: Nodes can have `revisions` array for effective date filtering

### Revision Data

Content nodes (sentences, clauses, subclauses) can include revision history:

```json
{
  "id": "nbc.divA.part1.sect1.subsect1.art1.sent2.clause1",
  "type": "clause",
  "number": "a",
  "text": "revised text...",
  "revised": true,
  "source": "bc",
  "glossaryTerms": ["term1"],
  "revisions": [
    {
      "type": "original",
      "effective_date": "2020-12-01",
      "text": "original text..."
    },
    {
      "type": "revision",
      "revision_type": "amendment",
      "revision_id": "bc-mo-2024-06-002",
      "sequence": 1,
      "effective_date": "2025-06-16",
      "status": "current",
      "text": "revised text...",
      "change_summary": "Amended Clause...",
      "note": "Ministerial Order BA 2024 06"
    }
  ]
}
```

**Revision Fields**:
- `type`: 'original' | 'revision'
- `effective_date`: Date when revision becomes effective (YYYY-MM-DD)
- `revision_id`: Unique identifier for the revision
- `revision_type`: 'amendment' | 'add' | 'replace' | 'delete'
- `text`: The text content for this revision
- `deleted`: Boolean indicating if content is deleted
- `change_summary`: Description of what changed
- `note`: Additional notes about the revision
6. **Revision Tracking**: Sentences, clauses, and subclauses can have `revisions` arrays with detailed change history
7. **Revised Flag**: Content nodes have a `revised` boolean to quickly identify changed content
8. **Source Attribution**: Content nodes can have a `source` field indicating origin

---

## Effective Date Filtering

### Overview

The BC Building Code contains revisions and amendments that become effective on specific dates. The system supports filtering content to show the correct version based on a selected effective date.

### How It Works

1. **Revision Data Preserved**: Parser preserves all revision history from source JSON
2. **Client-Side Filtering**: Filtering happens in the browser, not during asset generation
3. **Recursive Application**: Filtering cascades through nested content
4. **Automatic Hiding**: Deleted content is automatically hidden

### URL Parameter

The effective date is specified via URL query parameter:

```
/code/nbc.divA/1/1?version=2024&date=2025-06-16
```

- `version`: Code version (2024, 2027, etc.)
- `date`: Effective date to display (YYYY-MM-DD format)
- If no date provided, shows latest version

### Filtering Logic

```typescript
// Find all revisions valid on or before the selected date
const validRevisions = node.revisions
  .filter(rev => rev.effective_date <= effectiveDate)
  .sort((a, b) => b.effective_date.localeCompare(a.effective_date));

// Use the most recent valid revision
const latestRevision = validRevisions[0];

// Check if deleted
if (latestRevision.deleted) {
  return null; // Hide this node
}

// Return the text from this revision
return latestRevision.text;
```

### Example

```typescript
// Clause with revisions
{
  text: "revised text",
  revisions: [
    { effective_date: "2020-12-01", text: "original text" },
    { effective_date: "2025-06-16", text: "revised text" }
  ]
}

// User selects date: 2024-01-01
// Result: Shows "original text" (2025-06-16 is in future)

// User selects date: 2025-07-01
// Result: Shows "revised text" (2025-06-16 is now valid)
```

### Component Integration

Each rendering component applies filtering:

```typescript
// SentenceBlock.tsx
import { filterSentence } from '@bc-building-code/bcbc-parser';

export const SentenceBlock: React.FC<SentenceBlockProps> = ({ 
  sentence, 
  effectiveDate,
  interactive = true 
}) => {
  // Apply filtering if date is provided
  const filtered = effectiveDate 
    ? filterSentence(sentence, effectiveDate)
    : sentence;
  
  // If deleted on this date, don't render
  if (!filtered) return null;
  
  return (
    <div className="sentenceBlock">
      <p>{filtered.text}</p>
      {/* Render nested content with same effectiveDate */}
    </div>
  );
};
```

### Filtering Utilities

**Package**: `@bc-building-code/bcbc-parser`

```typescript
// Get text content for a specific date
getTextForDate(node, effectiveDate): string

// Check if node is visible (not deleted)
isVisibleOnDate(node, effectiveDate): boolean

// Filter sentence and return version for date
filterSentence(sentence, effectiveDate): Sentence | null

// Filter clause and return version for date
filterClause(clause, effectiveDate): Clause | null

// Filter subclause and return version for date
filterSubclause(subclause, effectiveDate): Subclause | null
```

### Performance

**Why Client-Side?**
1. Single set of content chunks works for all dates
2. Smaller total asset size (no duplicate chunks per date)
3. Faster build times
4. More flexible date selection

**Trade-offs**:
- Pros: Smaller assets, flexible, faster builds
- Cons: Slight client-side processing, all revision data downloaded

The trade-off is acceptable because:
- Revision data is relatively small
- Filtering is fast (simple date comparison)
- Chunks are cached after first load

### Visual Indicators (Future)

Planned enhancements:
- Badge showing content has been revised
- "Revised on {date}" indicator
- Highlight revised content
- Revision history modal
- Side-by-side comparison view

---

## Runtime Content Loading

### URL Structure

```
/code/{division}/{part}/{section}?version={version}&date={date}

Examples:
- /code/nbc.divA/1/1?version=2024&date=2025-06-16
- /code/nbc.divB/3/2?version=2024
- /code/nbc.divBV2/9/36?version=2024&date=2020-12-01
```

**URL Format**: Navigation format only (nbc.div{Letter}/{part}/{section})

The application uses a single URL format for consistency:
- Division: `nbc.divA`, `nbc.divB`, `nbc.divBV2`, `nbc.divC`
- Part: Plain number (e.g., `1`, `3`, `9`)
- Section: Plain number (e.g., `1`, `2`, `36`)

### URL Transformation

The section store automatically transforms navigation format to file system format internally:

```typescript
// URL format (navigation)
/code/nbc.divA/1/1

// Transformed internally to file system format
nbc-diva/part-1/section-1

// File path
/data/2024/content/nbc-diva/part-1/section-1.json
```

This transformation is transparent to the user and happens automatically in the section store.

### Content Loading Flow

```typescript
// 1. User navigates to /code/nbc.divA/1/1?version=2024&date=2025-06-16
//    ↓
// 2. ReadingView component receives:
//    - slug: ['nbc.divA', '1', '1']
//    - version: '2024'
//    - effectiveDate: '2025-06-16'
//    ↓
// 3. useSectionStore.fetchSection(version, slug)
//    ↓
// 4. Section store transforms URL format internally:
//    ['nbc.divA', '1', '1'] → ['nbc-diva', 'part-1', 'section-1']
//    ↓
// 5. Fetch /data/2024/content/nbc-diva/part-1/section-1.json
//    ↓
// 6. Parse JSON and store in cache (with all revisions)
//    ↓
// 7. Update currentSection state
//    ↓
// 8. Components receive section data + effectiveDate
//    ↓
// 9. Each component filters content based on effectiveDate
//    ↓
// 10. Render filtered content
```

### Section Store

```typescript
// apps/web/lib/stores/section-store.ts

interface SectionState {
  cache: Map<string, Section>;        // LRU cache of loaded sections
  currentSection: Section | null;     // Currently displayed section
  currentPath: string[];              // Current URL path
  loading: boolean;                   // Loading state
  error: string | null;               // Error message
  
  fetchSection: (version: string, path: string[]) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}
```

### Caching Strategy

- **Cache Key**: `{version}/{division}/{part}/{section}`
- **Cache Type**: In-memory Map (per session)
- **Cache Invalidation**: On version change or manual reset
- **AbortController**: Cancels in-flight requests on navigation

---

## Recursive Content Rendering

### Component Hierarchy

```
ReadingView (Container)
  ↓
SectionRenderer
  ↓
SubsectionBlock (for each subsection)
  ↓
ArticleBlock (for each article)
  ↓
ContentRenderer (type dispatcher)
  ↓
┌─────────────┬──────────────┬──────────────┬──────────────┐
│             │              │              │              │
SentenceBlock  TableBlock    FigureBlock   EquationBlock  NoteBlock
  ↓
ContentRenderer (recursive)
  ↓
┌─────────────┬──────────────┐
│             │              │
ClauseBlock   TableBlock    FigureBlock
  ↓
ContentRenderer (recursive)
  ↓
SubclauseBlock
```

### Rendering Flow

1. **ReadingView** loads Section data from store
2. **SectionRenderer** renders section title and maps over subsections
3. **SubsectionBlock** renders subsection title and maps over articles
4. **ArticleBlock** renders article title and maps over content array
5. **ContentRenderer** checks `node.type` and dispatches to appropriate component
6. Each component recursively renders its own `content` array using ContentRenderer

### Example Rendering

```typescript
// Article with nested content
{
  type: 'article',
  content: [
    { type: 'sentence', text: '...', content: [
      { type: 'clause', text: '...', content: [
        { type: 'table', ... }
      ]}
    ]},
    { type: 'table', ... },
    { type: 'sentence', text: '...', content: [] }
  ]
}

// Renders as:
<ArticleBlock>
  <ContentRenderer node={sentence1}>
    <SentenceBlock>
      <ContentRenderer node={clause1}>
        <ClauseBlock>
          <ContentRenderer node={table1}>
            <TableBlock />
          </ContentRenderer>
        </ClauseBlock>
      </ContentRenderer>
    </SentenceBlock>
  </ContentRenderer>
  <ContentRenderer node={table2}>
    <TableBlock />
  </ContentRenderer>
  <ContentRenderer node={sentence2}>
    <SentenceBlock />
  </ContentRenderer>
</ArticleBlock>
```

---

## Type-Driven Rendering

### ContentRenderer (Type Dispatcher)

The ContentRenderer is the core of the type-driven rendering system:

```typescript
// apps/web/components/reading/ContentRenderer.tsx

export const ContentRenderer: React.FC<ContentRendererProps> = ({ 
  node, 
  interactive = true 
}) => {
  switch (node.type) {
    case 'sentence':
      return <SentenceBlock sentence={node as Sentence} interactive={interactive} />;
    
    case 'clause':
      return <ClauseBlock clause={node as Clause} interactive={interactive} />;
    
    case 'subclause':
      return <SubclauseBlock subclause={node as Subclause} interactive={interactive} />;
    
    case 'table':
      return <TableBlock table={node as Table} />;
    
    case 'figure':
      return <FigureBlock figure={node as Figure} />;
    
    case 'equation':
      return <EquationBlock equation={node as Equation} />;
    
    case 'note':
      return <NoteBlock note={node as NoteReference} interactive={interactive} />;
    
    default:
      console.warn('Unknown content node type:', (node as any).type);
      return null;
  }
};
```

### Component Responsibilities

Each component is responsible for:

1. **Rendering its own content** (text, title, number, etc.)
2. **Recursively rendering nested content** using ContentRenderer
3. **Handling interactive features** (glossary terms, cross-references, etc.)

### Example: SentenceBlock

```typescript
// apps/web/components/reading/SentenceBlock.tsx

export const SentenceBlock: React.FC<SentenceBlockProps> = ({ 
  sentence, 
  interactive = true 
}) => {
  return (
    <div className="sentenceBlock">
      <span className="sentenceNumber">{sentence.number})</span>
      <div className="sentenceContent">
        <p className="sentenceText">
          {parseTextWithGlossary(sentence.text, sentence.glossaryTerms)}
        </p>
        
        {/* Recursively render nested content */}
        {sentence.content && sentence.content.length > 0 && (
          <div className="sentenceNestedContent">
            {sentence.content.map((item, index) => (
              <ContentRenderer 
                key={`${sentence.id}-content-${index}`}
                node={item}
                interactive={interactive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### Benefits of Type-Driven Rendering

1. **No Structural Assumptions**: Each component only cares about its own type
2. **Handles All Variations**: Tables between sentences, notes inside clauses, etc.
3. **Easy to Extend**: Add new node types by adding new components
4. **Source Order Preserved**: Content renders exactly as it appears in source
5. **Maintainable**: Clear separation between data and presentation
6. **Debuggable**: Can inspect the exact structure being rendered

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Only load section-level chunks as needed
   - Use React.lazy() for code splitting (future enhancement)

2. **Caching**
   - In-memory cache of loaded sections
   - Cache key: `{version}/{division}/{part}/{section}`
   - Prevents redundant fetches on back/forward navigation

3. **AbortController**
   - Cancel in-flight requests on navigation
   - Prevents race conditions and memory leaks

4. **Memoization**
   - Use React.useMemo() for expensive computations
   - Memoize subtree extraction and rendering data

5. **Virtual Scrolling** (Future Enhancement)
   - For very long sections with many articles
   - Render only visible articles in viewport

### Bundle Size

- **Initial Bundle**: < 200 KB gzipped
- **Section Chunk**: 50-200 KB per section
- **Total Assets**: ~7 MB per version (104 sections)

### Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Section Load Time**: < 200ms (cached) / < 500ms (network)
- **Lighthouse Performance**: > 90

---

## Future Enhancements

### Planned Improvements

1. **Glossary Term Rendering**
   - Parse `[REF:term:id]` markers in text
   - Render as interactive glossary terms with tooltips

2. **Cross-Reference Links**
   - Parse `[REF:internal:id]` markers
   - Render as clickable links to other sections

3. **Note References**
   - Parse `[REF:internal:noteId:short|long]` markers
   - Render as clickable note references with modals

4. **Effective Date Filtering**
   - Filter content by effective date
   - Show/hide revisions based on selected date

5. **Revision History Display**
   - Visual indicators for revised content (badges, borders, icons)
   - Revision history modal showing all changes over time
   - Side-by-side comparison of original vs. revised text
   - Highlight differences between revisions
   - Filter content to show only revised sections

6. **Search Integration**
   - Highlight search terms in rendered content
   - Jump to specific articles from search results

7. **Print Optimization**
   - Generate print-friendly layouts
   - PDF export functionality

---

## Troubleshooting

### Common Issues

**Issue**: Content not loading
- **Check**: Network tab for 404 errors
- **Verify**: File path matches URL transformation
- **Solution**: Ensure URL adapter is working correctly

**Issue**: Content renders in wrong order
- **Check**: Parser output preserves source order
- **Verify**: Chunker doesn't transform structure
- **Solution**: Ensure `content` arrays are not modified

**Issue**: TypeScript errors on imports
- **Check**: Workspace package resolution
- **Solution**: Run `npx pnpm install` and `npx pnpm type-check`

**Issue**: Tables appear in wrong location
- **Check**: Parser attaches tables to correct parent
- **Verify**: ContentRenderer dispatches to TableBlock
- **Solution**: Ensure table nodes have correct `type` field

---

## Related Documentation

- [Type-Driven Rendering Refactor](./TYPE-DRIVEN-RENDERING-REFACTOR.md)
- [Refactor Summary](./REFACTOR-SUMMARY.md)
- [Reading View Fix](./READING-VIEW-FIX.md)
- [User Flow](./USER-FLOW.md)
- [Technology Stack](../.kiro/steering/tech.md)
- [Project Structure](../.kiro/steering/structure.md)

---

## Conclusion

The content rendering strategy is built on three core principles:

1. **Preserve Structure**: No transformation from source to render
2. **Type-Driven**: Each node type determines its renderer
3. **Recursive**: Nested content is rendered recursively

This approach provides a robust, maintainable, and extensible system for rendering complex hierarchical content while preserving source order and handling all structural variations.

