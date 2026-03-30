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

## Inline Content Rendering

### Overview

Text content in sentences, clauses, and subclauses contains inline markers that are parsed and converted to interactive React components. The parsing system handles multiple marker types in a single pass while preserving exact source order.

### Supported Marker Types

The `parseTextWithMarkers` function handles all inline content types:

1. **Glossary Terms**: `[REF:term:termId]` or `[REF:term:termId:label]`
2. **Cross-References**: `[REF:internal:referenceId]` or `[REF:internal:referenceId:format]`
3. **Note References**: `[REF:internal:noteId:short|long]`
4. **Table Notes**: `[REF:table-note:noteId]`
5. **Standards References**: `[REF:standard:standardId]` or `[REF:external:externalId]`
6. **Equations**: `[EQ:display|inline:equationId]` or `[EQ:display|inline:]`
7. **Functional Statements**: `[[REF:functional-statement:fs01]]`
8. **Objectives**: `[[REF:sub-objective:nbc-obj-os1.2]]`
9. **Compound References**: `[[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]`
10. **Inline Formatting**: `<italic>text</italic>`, `<bold>text</bold>`, `_{subscript}`, `^{superscript}`

### Parsing Strategy

The parser uses a multi-pass approach:

1. **Sanitize Legacy Placeholders**: Remove `<>` and `</>` wrapper tokens
2. **Find All Markers**: Scan text for all marker types and record positions
3. **Sort by Position**: Maintain source order
4. **Build Node Array**: Convert markers to React components while preserving plain text

```typescript
// apps/web/lib/text-parsing.ts

export function parseTextWithMarkers(
  text: string,
  glossaryTerms: string[] = [],
  interactive: boolean = true,
  localEquations: TextEquationEntry[] = []
): React.ReactNode[] {
  const sanitizedText = sanitizeLegacyPlaceholderTags(text);
  const nodes: React.ReactNode[] = [];
  const markers: Marker[] = [];
  
  // Find all markers (glossary, cross-ref, notes, equations, etc.)
  // ... marker detection logic ...
  
  // Sort markers by position to maintain source order
  markers.sort((a, b) => a.start - b.start);
  
  // Build node array
  let lastIndex = 0;
  for (const marker of markers) {
    // Add plain text before marker
    if (marker.start > lastIndex) {
      nodes.push(
        ...parseInlineFormatting(
          sanitizedText.substring(lastIndex, marker.start),
          interactive,
          lastIndex
        )
      );
    }
    
    // Add component for marker
    switch (marker.type) {
      case 'glossary':
        nodes.push(<GlossaryTerm ... />);
        break;
      case 'crossref':
        nodes.push(<CrossReferenceLink ... />);
        break;
      // ... other marker types ...
    }
    
    lastIndex = marker.end + consumed;
  }
  
  // Add remaining text
  if (lastIndex < sanitizedText.length) {
    nodes.push(
      ...parseInlineFormatting(
        sanitizedText.substring(lastIndex),
        interactive,
        lastIndex
      )
    );
  }
  
  return nodes;
}
```

### Glossary Terms

**Marker Format**: `[REF:term:termId]` or `[REF:term:termId:label]`

**Display Text Resolution**:
1. If label provided: Use label directly
2. Otherwise: Extract 1-2 words following the marker
   - Take first word
   - Take second word if not a stopword (shall, must, may, etc.)
3. Fallback: Use termId with hyphens replaced by spaces

**Interactive Features**:
- Info icon (ⓘ) before term text
- Hover tooltip (desktop) showing definition after 200ms delay
- Click opens glossary sidebar with full definition
- Non-interactive mode: Plain italic text, no icon

```typescript
// Example rendering
<GlossaryTerm
  termId="bldng"
  text="building"
  interactive={true}
/>
```

### Cross-References

**Marker Format**: `[REF:internal:referenceId]` or `[REF:internal:referenceId:format]`

**Format Options**:
- `long`: "Article 3.2.4.7." or "Section 3.3."
- `short`: "Sentence (2)" or "(2)"
- `number` / `shortNum`: "3.2.4.7." or "3.2.2.93."
- `title`: Looks up title from navigation tree
- `medium`: Default format

**Display Text Resolution**:
1. If format specified: Extract matching pattern from text following marker
2. Otherwise: Generate from referenceId structure
3. Fallback: Use referenceId as-is

**Interactive Features**:
- Info icon (ⓘ) before reference text
- Click behavior depends on reference type:
  - **Modal references** (articles, subsections, sections, notes): Opens modal overlay
  - **Navigation references** (parts, divisions): Navigates to target page
- Non-interactive mode: Plain text, no icon

**Special Handling**:
- **Application Notes**: Rendered as "A-2.1.1.2.(6)."
- **Standards References**: Fetches display text from `standards-map.json`

```typescript
// Example rendering
<CrossReferenceLink
  referenceId="nbc.divA.part1.sect1.subsect1.art1"
  displayText="Article 1.1.1.1."
  format="long"
  interactive={true}
/>
```

### Note References

**Marker Format**: `[REF:internal:noteId:short|long]`

**Display Text**:
- `short`: "(1)" - just the note number
- `long`: Full note ID

**Interactive Features**:
- Rendered as superscript
- Click scrolls to note in appendix
- Adds temporary highlight effect on target note
- Non-interactive mode: Plain superscript text

```typescript
// Example rendering
<NoteReference
  referenceId="nbc.divA.part1.sect1.subsect1.art1.note1"
  text="(1)"
  interactive={true}
/>
```

### Table Notes

**Marker Format**: `[REF:table-note:noteId]`

**Display Text**: "(1)", "(2)", etc. - extracted from noteId

**Interactive Features**:
- Rendered as cross-reference link
- Click opens modal showing table note content
- Non-interactive mode: Plain text

### Standards References

**Marker Format**: `[REF:standard:standardId]` or `[REF:external:externalId]`

**Display Text Resolution**:
1. Fetch `standards-map.json` for current version
2. Normalize standardId (remove non-alphanumeric, lowercase)
3. Match against `standard_id`, `standard_ref_id`, or map keys
4. Use `agency` field if available, otherwise `standard_id`
5. Fallback: Use standardId from marker

**Interactive Features**:
- Info icon (ⓘ) before standard text
- Click opens modal showing:
  - Agency and full number
  - Full title
  - Reference ID
  - Location link (if available)
- Non-interactive mode: Plain text

### Equations

**Marker Format**: `[EQ:display|inline:equationId]` or `[EQ:display|inline:]`

**Equation Resolution**:
1. If equationId provided: Look up in local equations array or global equation store
2. If no equationId: Use first unconsumed equation from local equations array
3. Track consumed equations to prevent duplicates

**Rendering**:
- `display`: Block-level equation (centered, larger)
- `inline`: Inline equation (within text flow)
- Supports LaTeX, MathML, HTML, and image formats

```typescript
// Example rendering
<EquationBlock
  equation={{
    id: "es007867q1",
    type: "equation",
    latex: "E = mc^2",
    display: "block"
  }}
  displayMode="block"
  variant="marker"
/>
```

### Functional Statements

**Marker Format**: `[[REF:functional-statement:fs01]]`

**Display Text**: "F01" (not "FS01") - matches printed format

**Interactive Features**:
- Compact display in table cells
- Hover tooltip showing full definition
- Non-interactive mode: Plain text

```typescript
// Example rendering
<FunctionalStatementLink
  statementId="fs03"
  displayText="F03"
  interactive={true}
/>
```

### Objectives

**Marker Format**: `[[REF:sub-objective:nbc-obj-os1.2]]`

**Display Text**: "OS1.2" (not "NBC-OBJ-OS1.2") - matches printed format

**Interactive Features**:
- Compact display in table cells
- Hover tooltip showing title and definition
- Definition text can contain glossary terms (parsed recursively)
- BC source badge if `source: 'bc'`
- Non-interactive mode: Plain text

```typescript
// Example rendering
<ObjectiveLink
  objectiveId="nbc-obj-os1.2"
  displayText="OS1.2"
  interactive={true}
/>
```

### Compound References

**Marker Format**: `[[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]`

**Display Format**: `[ F03 - OS1.2 ]` with square brackets

**Separator Rules**:
- Same type (FS + FS or Obj + Obj): Comma separator `, `
- Different types (FS + Obj): Dash separator ` - `

**Example**: `[[REF:functional-statement:fs02],[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]`
**Renders as**: `[ F02, F03 - OS1.2 ]`

```typescript
// Example rendering
<span className="compound-ref">
  <FunctionalStatementLink statementId="fs03" displayText="F03" />
  {' - '}
  <ObjectiveLink objectiveId="nbc-obj-os1.2" displayText="OS1.2" />
</span>
```

### Inline Formatting

**Supported Tags**:
- `<italic>text</italic>` → `<em>text</em>`
- `<bold>text</bold>` → `<strong>text</strong>`
- `_{subscript}` → `<sub>subscript</sub>`
- `^{superscript}` → `<sup>superscript</sup>`

**Nesting Support**: Formatting tags can be nested and are parsed recursively

**Example**:
```
Input: "The <italic>maximum</italic> temperature is 100^{°C}"
Output: The <em>maximum</em> temperature is 100<sup>°C</sup>
```

### Display Text Consumption

Some markers consume text that follows them:

1. **Glossary Terms**: Consume 1-2 words after marker
2. **Cross-References**: Consume display text if format matches pattern
3. **Others**: No consumption (marker is self-contained)

This prevents duplicate text rendering:
```
Input: "[REF:term:bldng]building is defined as..."
Marker: [REF:term:bldng]
Consumed: "building"
Output: <GlossaryTerm text="building" /> is defined as...
```

### Interactive vs Non-Interactive Mode

**Interactive Mode** (default):
- Full interactivity: tooltips, modals, navigation
- Icons displayed before terms/references
- Hover effects and click handlers
- Used in main reading view

**Non-Interactive Mode**:
- Plain text rendering
- No icons or interactive elements
- No tooltips or modals
- Used in modal previews and print layouts

### Performance Considerations

1. **Single-Pass Parsing**: All marker types detected in one pass
2. **Marker Sorting**: Maintains source order efficiently
3. **Lazy Loading**: Glossary/equation data loaded on demand
4. **Memoization**: Parsed content memoized in components
5. **Portal Rendering**: Tooltips rendered in document.body to avoid z-index issues

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

The ContentRenderer is the core of the type-driven rendering system. It supports BC source attribution tracking and handles multiple equation formats:

```typescript
// apps/web/components/reading/ContentRenderer.tsx

export const ContentRenderer: React.FC<ContentRendererProps> = ({ 
  node, 
  effectiveDate,
  interactive = true,
  parentHasBcSource = false,
}) => {
  const source = (node as { source?: string }).source;
  const nodeType = (node as { type?: string }).type;
  const hasBcSource = source?.toLowerCase() === 'bc';
  const hasBcSourceInTree = parentHasBcSource || hasBcSource;

  // Wrap content with BC source indicator if needed
  const withSourceIndicator = (content: React.ReactNode) =>
    hasBcSource && !parentHasBcSource ? (
      <div className="content-renderer__source-indicator content-renderer__source-indicator--bc">
        {content}
      </div>
    ) : content;

  switch (nodeType) {
    case 'sentence':
      return withSourceIndicator(
        <SentenceBlock
          sentence={node as Sentence}
          effectiveDate={effectiveDate}
          interactive={interactive}
          parentHasBcSource={hasBcSourceInTree}
        />
      );
    
    case 'clause':
      return withSourceIndicator(
        <ClauseBlock
          clause={node as Clause}
          effectiveDate={effectiveDate}
          interactive={interactive}
          parentHasBcSource={hasBcSourceInTree}
        />
      );
    
    case 'subclause':
      return withSourceIndicator(
        <SubclauseBlock
          subclause={node as Subclause}
          effectiveDate={effectiveDate}
          interactive={interactive}
          parentHasBcSource={hasBcSourceInTree}
        />
      );
    
    case 'table':
      return withSourceIndicator(
        <TableBlock
          table={node as Table}
          interactive={interactive}
          effectiveDate={effectiveDate}
        />
      );
    
    case 'figure':
      return withSourceIndicator(<FigureBlock figure={node as Figure} />);
    
    case 'equation':
      return withSourceIndicator(<EquationBlock equation={node as Equation} />);

    // Handle alternative equation type names from generated content
    case 'display':
    case 'inline': {
      const displayType = nodeType === 'inline' ? 'inline' : 'block';
      return withSourceIndicator(
        <EquationBlock
          equation={{
            ...toEquationNode(node as any),
            display: displayType,
          }}
          displayMode={displayType}
        />
      );
    }
    
    case 'note':
      return withSourceIndicator(
        <NoteBlock note={node as NoteReference} interactive={interactive} />
      );
    
    default:
      console.warn('Unknown content node type:', (node as any).type);
      return null;
  }
};
```

**Key Features**:
- **BC Source Attribution**: Tracks `source: 'bc'` field and wraps BC-specific content with visual indicators
- **Effective Date Support**: Passes `effectiveDate` to all content blocks for revision filtering
- **Interactive Mode**: Controls whether components render interactive features (glossary tooltips, cross-reference modals)
- **Parent Source Tracking**: Prevents duplicate BC indicators when nested content inherits BC source
- **Equation Type Flexibility**: Handles both `type: 'equation'` and legacy `type: 'display'/'inline'` formats

### Component Responsibilities

Each component is responsible for:

1. **Rendering its own content** (text, title, number, etc.)
2. **Recursively rendering nested content** using ContentRenderer
3. **Handling interactive features** (glossary terms, cross-references, etc.)
4. **Applying effective date filtering** to show correct revisions
5. **Propagating BC source attribution** to child components
6. **Supporting non-interactive mode** for modal previews

### Example: SentenceBlock

```typescript
// apps/web/components/reading/SentenceBlock.tsx

export const SentenceBlock: React.FC<SentenceBlockProps> = ({ 
  sentence, 
  effectiveDate,
  interactive = true,
  parentHasBcSource = false,
}) => {
  // Apply effective date filtering
  const filteredSentence = effectiveDate ? filterSentence(sentence, effectiveDate) : sentence;
  if (!filteredSentence) return null; // Hidden if deleted on this date

  // Extract equations and organizations if present
  const sentenceOrganizations = (filteredSentence as any).organizations || [];
  const sentenceEquations = (filteredSentence as any).equations || [];

  return (
    <div className="sentenceBlock" id={filteredSentence.id}>
      <span className="sentenceNumber">{filteredSentence.number})</span>
      <div className="sentenceContent">
        <div className="sentenceText">
          {/* Parse text with all marker types */}
          {parseTextWithMarkers(
            filteredSentence.text, 
            filteredSentence.glossaryTerms || [], 
            interactive,
            sentenceEquations
          )}
        </div>
        
        {/* Render definitions list if present (for "Defined Terms" articles) */}
        {filteredSentence.definitions && filteredSentence.definitions.length > 0 && (
          <DefinitionsList 
            definitions={filteredSentence.definitions}
            interactive={interactive}
          />
        )}

        {/* Render organizations table if present */}
        {sentenceOrganizations.length > 0 && (
          <div className="sentenceOrganizations">
            <table className="sentenceOrganizationsTable">
              <caption>Organizations</caption>
              <thead>
                <tr>
                  <th scope="col">Abbreviation</th>
                  <th scope="col">Organization</th>
                  <th scope="col">Website</th>
                </tr>
              </thead>
              <tbody>
                {sentenceOrganizations.map((org) => (
                  <tr key={org.id}>
                    <td>{org.abbreviation}</td>
                    <td>{org.fullName}</td>
                    <td>
                      {org.website ? (
                        <a href={org.website} target="_blank" rel="noopener noreferrer">
                          {org.website}
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Recursively render nested content */}
        {filteredSentence.content && filteredSentence.content.length > 0 && (
          <div className="sentenceNestedContent">
            {filteredSentence.content.map((item, index) => (
              <ContentRenderer 
                key={`${filteredSentence.id}-content-${index}`}
                node={item}
                effectiveDate={effectiveDate}
                interactive={interactive}
                parentHasBcSource={parentHasBcSource}
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
- [Technology Stack](./PLAN.md)
- [Project Structure](./PROJECT-STRUCTURE.md)

---

## Conclusion

The content rendering strategy is built on three core principles:

1. **Preserve Structure**: No transformation from source to render
2. **Type-Driven**: Each node type determines its renderer
3. **Recursive**: Nested content is rendered recursively

This approach provides a robust, maintainable, and extensible system for rendering complex hierarchical content while preserving source order and handling all structural variations.

