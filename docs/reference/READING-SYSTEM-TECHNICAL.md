# Reading System Technical Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Pipeline](#data-pipeline)
3. [Content Loading Architecture](#content-loading-architecture)
4. [Parsing System](#parsing-system)
5. [Rendering Architecture](#rendering-architecture)
6. [Revision Resolution](#revision-resolution)
7. [Performance Optimizations](#performance-optimizations)
8. [Known Limitations & Optimization Opportunities](#known-limitations--optimization-opportunities)

---

## System Overview

The BC Building Code Reading System is a client-side static application that renders hierarchical building code content with interactive features. The system operates entirely in the browser with no backend dependencies.

### Key Characteristics

- **Static Generation**: All content is pre-processed at build time
- **Client-Side Only**: No server-side rendering or API calls
- **Type-Driven Rendering**: Uses discriminated unions for polymorphic content
- **Lazy Loading**: Content chunks loaded on-demand
- **Revision-Aware**: Supports effective date filtering for amendments

### Technology Stack

- **Framework**: Next.js 16+ (App Router, Static Export)
- **State Management**: Zustand stores
- **Parser**: `@bc-building-code/bcbc-parser`
- **Content Chunker**: `@bc-building-code/content-chunker`
- **Search**: FlexSearch (client-side)

---

## Data Pipeline

### Build-Time Processing

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SOURCE DATA                                                  │
│    /data/source/bcbc-{year}.json (10-50 MB)                    │
│    - Raw JSON from BC Government                                │
│    - Contains full document hierarchy                           │
│    - Includes revision history for all content                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PARSING & VALIDATION                                         │
│    @bc-building-code/bcbc-parser                               │
│    - Validates JSON structure                                   │
│    - Extracts type information                                  │
│    - Validates cross-references                                 │
│    - Extracts glossary terms                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CONTENT CHUNKING                                             │
│    @bc-building-code/content-chunker                           │
│    - Splits content by section (Division/Part/Section)          │
│    - Generates navigation tree                                  │
│    - Extracts metadata (glossary, dates, types)                 │
│    - Creates FlexSearch index                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. OUTPUT ASSETS                                                │
│    /apps/web/public/data/{version}/                            │
│    ├── search/                                                  │
│    │   ├── documents.json (FlexSearch index)                   │
│    │   └── metadata.json (search metadata)                     │
│    ├── navigation-tree.json (TOC structure)                    │
│    ├── glossary-map.json (term definitions)                    │
│    ├── amendment-dates.json (effective dates)                  │
│    ├── content-types.json (filter options)                     │
│    ├── quick-access.json (homepage pins)                       │
│    ├── standards-map.json (external references)                │
│    └── content/                                                 │
│        └── {division}/{part}/{section}.json                    │
└─────────────────────────────────────────────────────────────────┘
```

### Runtime Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ USER NAVIGATES TO URL                                           │
│ /code/nbc.divB/3/1/3/7?version=2024&date=2024-12-19           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ URL PARSING (parseContentPath)                                  │
│ - Extract: division, part, section, subsection, article         │
│ - Extract: version, effectiveDate from query params             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ CONTENT LOADING (useSectionStore)                              │
│ - Check cache for section                                       │
│ - Fetch: /data/{version}/content/{division}/{part}/{section}.json│
│ - Store in cache                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ REVISION RESOLUTION (revision-resolver.ts)                      │
│ - Apply effective date filter                                   │
│ - Resolve revision history                                      │
│ - Filter deleted content                                        │
│ - Return resolved section                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ SUBTREE EXTRACTION (getSubtreeForSlug)                         │
│ - Extract requested level (section/subsection/article)          │
│ - Preserve parent context for breadcrumbs                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ RENDERING (ContentRenderer + specialized components)            │
│ - Type-driven recursive rendering                               │
│ - Parse inline markers (glossary, cross-refs, equations)        │
│ - Render interactive components                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Content Loading Architecture

### Store: `useSectionStore`

**Location**: `apps/web/lib/stores/section-store.ts`

**Responsibilities**:
- Fetch section JSON from `/data/{version}/content/` directory
- Cache loaded sections in memory
- Transform URL slugs to file paths
- Handle loading states and errors
- Cancel in-flight requests on navigation

**Key Methods**:

```typescript
fetchSection(version: string, path: string[]): Promise<void>
```

**Path Transformation**:
```
URL: /code/nbc.divB/3/1
     ↓
File: /data/2024/content/nbc-divb/part-3/section-1.json
```

**Caching Strategy**:
- Cache key: `${version}/${division}/${part}/${section}`
- In-memory Map (no persistence)
- No expiration (static content)
- Cleared on version change

### Content Structure

**Section JSON Format**:
```json
{
  "id": "nbc.divB.part3.sect1",
  "type": "section",
  "number": "1",
  "title": "General",
  "source": "nbc",
  "revisions": [...],
  "subsections": [
    {
      "id": "nbc.divB.part3.sect1.subsect1",
      "type": "subsection",
      "number": "1",
      "title": "Application",
      "revisions": [...],
      "articles": [...]
    }
  ]
}
```

---

## Parsing System

### Text Parsing: `parseTextWithMarkers`

**Location**: `apps/web/lib/text-parsing.ts`

**Purpose**: Convert text with inline markers into React components

### Supported Marker Types

#### 1. Glossary Terms
```
[REF:term:termId]
[REF:term:termId:custom label]
```

**Parsing Logic**:
- Extract term ID from marker
- Look ahead in text to find term text (1-2 words)
- Stop at stopwords (shall, must, may, etc.)
- Render as `<GlossaryTerm>` component

**Example**:
```
Input:  "The [REF:term:fire-separation] fire separation shall..."
Output: <GlossaryTerm termId="fire-separation" text="fire separation" />
```

#### 2. Cross-References
```
[REF:internal:referenceId]
[REF:internal:referenceId:format]
[REF:internal:referenceId:format:custom label]
```

**Formats**:
- `short`: "(2)" or "Sentence (2)"
- `long`: "Article 3.2.4.7." or "Section 3.3."
- `number`: "3.2.4.7."
- `shortNum`: "3.2.4.7."
- `medium`: Contextual format
- `title`: Full title text

**Parsing Logic**:
- Parse reference ID to extract hierarchy
- Generate display text based on format
- Look ahead for qualifiers like "(a)" or "(1)"
- Avoid duplicate trailing periods
- Render as `<CrossReferenceLink>` component

**Example**:
```
Input:  "See [REF:internal:nbc.divB.part3.sect1.subsect2.art1:long]"
Output: <CrossReferenceLink referenceId="..." displayText="Article 3.1.2.1." />
```

#### 3. Note References
```
[REF:internal:noteId:short]
[REF:internal:noteId:long]
[REF:internal:noteId:short:custom label]
```

**Parsing Logic**:
- Extract note ID
- Generate label: "(1)" for short, full text for long
- Render as `<NoteReference>` component

#### 4. Table Notes
```
[REF:table-note:noteId]
```

**Parsing Logic**:
- Extract note ID
- Generate label from ID
- Render as `<CrossReferenceLink>` (reused component)

#### 5. Standards/External References
```
[REF:standard:standardId]
[REF:external:externalId]
[REF:standard:standardId:custom label]
```

**Parsing Logic**:
- Extract standard ID
- Look up in standards-map.json
- Normalize keys (remove non-alphanumeric)
- Render as `<CrossReferenceLink>` with special handling

#### 6. Equations
```
[EQ:display:equationId]
[EQ:inline:equationId]
[EQ:display:]  (auto-match from local equations)
```

**Parsing Logic**:
- Extract equation ID and type (display/inline)
- Look up in equation store or local equations array
- Track consumed equations to avoid duplicates
- Render as `<EquationBlock>` component

#### 7. Functional Statements
```
[[REF:functional-statement:fs03]]
```

**Parsing Logic**:
- Extract statement ID
- Format display: "F03" (not "FS03")
- Render as `<FunctionalStatementLink>` component

#### 8. Objectives
```
[[REF:sub-objective:nbc-obj-os1.2]]
```

**Parsing Logic**:
- Extract objective ID
- Format display: "OS1.2" (not "NBC-OBJ-OS1.2")
- Render as `<ObjectiveLink>` component

#### 9. Compound References
```
[[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]
[[REF:functional-statement:fs02],[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]
```

**Parsing Logic**:
- Extract all references in source order
- Separate with ", " for same type, " - " for different types
- Wrap in `<span className="compound-ref">`

### Inline Formatting

**Supported Tags**:
- `<italic>...</italic>` → `<em>`
- `<bold>...</bold>` → `<strong>`
- `_{text}` → `<sub>` (subscript)
- `^{text}` → `<sup>` (superscript)

**Parsing Logic**:
- Recursive parsing to handle nested formatting
- Regex-based extraction
- Preserves text order

### Hardcoded Parsing Logic

#### Glossary Display Text Extraction

**Location**: `getGlossaryDisplayText()`

**Hardcoded Behavior**:
- Looks ahead 1-2 words after marker
- Stops at hardcoded stopword list (shall, must, may, etc.)
- Assumes term text immediately follows marker

**Limitation**: Fails if term text is not adjacent to marker

**Example**:
```
✅ Works: "[REF:term:fire-separation] fire separation"
❌ Fails: "[REF:term:fire-separation] the fire separation"
```

#### Cross-Reference Display Text Extraction

**Location**: `getCrossReferenceDisplayText()`

**Hardcoded Behavior**:
- Regex patterns for each format type
- Hardcoded format strings ("Article", "Section", "Sentence")
- Assumes specific text patterns follow markers

**Limitation**: Brittle if source text format changes

#### Note Label Generation

**Location**: `getNoteLabel()`

**Hardcoded Behavior**:
- Extracts number from note ID using regex
- Formats as "(1)", "(2)", etc.
- Assumes note IDs end with numeric suffix

**Limitation**: Fails for non-numeric note identifiers

#### Standards Key Normalization

**Location**: `normalizeStandardsKey()`

**Hardcoded Behavior**:
- Removes all non-alphanumeric characters
- Converts to lowercase
- Used for fuzzy matching in standards-map.json

**Limitation**: May cause false matches for similar IDs

---

## Rendering Architecture

### Type-Driven Recursive Rendering

**Core Component**: `ContentRenderer`

**Location**: `apps/web/components/reading/ContentRenderer.tsx`

**Strategy**: Discriminated union pattern using `type` field

```typescript
switch (node.type) {
  case 'sentence': return <SentenceBlock />
  case 'clause': return <ClauseBlock />
  case 'subclause': return <SubclauseBlock />
  case 'table': return <TableBlock />
  case 'figure': return <FigureBlock />   // hide_label:true suppresses "Figure X" label
  case 'equation': return <EquationBlock />
  case 'note': return <NoteBlock />
  default: console.warn('Unknown type')
}
```

### Component Hierarchy

```
ReadingView (container)
  ├── ReadingViewHeader
  ├── PartRenderer (part-level)
  │   └── PartTitle
  │   └── Section cards (links to sections)
  │   └── Part appendix card (link to "Notes to Part X", if present)
  │   └── Spectables cards (links to span tables, if present)
  │
  ├── SectionRenderer (section-level)
  │   ├── SectionTitle
  │   └── SubsectionBlock (for each subsection)
  │       ├── ArticleBlock (for each article)
  │       │   └── ContentRenderer (recursive)
  │       │       ├── SentenceBlock
  │       │       │   └── ClauseBlock
  │       │       │       └── SubclauseBlock
  │       │       ├── TableBlock
  │       │       ├── FigureBlock
  │       │       ├── EquationBlock
  │       │       └── NoteBlock
  │
  └── CrossReferenceModal (overlay)
      └── ContentRenderer (non-interactive)
```

### Content Node Types

**From Parser** (`@bc-building-code/bcbc-parser`):

```typescript
type ArticleContentNode = 
  | Sentence 
  | Table 
  | Figure 
  | Equation 
  | NoteReference

type SentenceContentNode = 
  | Clause 
  | Table 
  | Figure 
  | Equation

type ClauseContentNode = 
  | Subclause 
  | Table 
  | Figure 
  | Equation
```

### Rendering Flow

1. **ReadingView** receives URL slug and version
2. **useSectionStore** fetches section JSON
3. **revision-resolver** applies effective date filter
4. **getSubtreeForSlug** extracts requested level
5. **SectionRenderer** / **PartRenderer** renders top level
6. **ContentRenderer** recursively renders nested content
7. **parseTextWithMarkers** converts text to React nodes
8. Specialized components render final output

---

## Revision Resolution

### Purpose

BC Building Code content includes revision history for amendments. The revision resolver filters content based on an effective date to show the correct version.

### Implementation

**Location**: `apps/web/lib/revision-resolver.ts`

### Revision Data Structure

```typescript
type RevisionRecord = {
  effective_date?: string;  // ISO date: "2024-12-19"
  deleted?: boolean;         // If true, hide content
  text?: string;             // Revised text
  title?: string;            // Revised title
  // ... other overridable fields
}

type ContentNode = {
  id: string;
  type: string;
  revisions?: RevisionRecord[];
  // ... content fields
}
```

### Resolution Algorithm

```typescript
function applyRevision(node, effectiveDate) {
  // 1. Handle title revisions first
  if (node.title?.revised && node.title?.revisions) {
    // Find applicable title revision
    const titleRevision = findRevisionForDate(
      node.title.revisions, 
      effectiveDate
    );
    node.title = titleRevision.text;
  }

  // 2. Handle node-level revisions
  const revision = findRevisionForDate(node.revisions, effectiveDate);
  if (!revision) return node;
  if (revision.deleted) return null;  // Hide deleted content

  // 3. Merge revision payload (overrides content fields)
  return {
    ...node,
    ...revision,
    id: node.id,      // Never override identity
    type: node.type   // Never override type
  };
}
```

### Revision Selection Logic

```typescript
function findRevisionForDate(revisions, effectiveDate) {
  // Sort by effective_date descending
  const sorted = revisions.sort((a, b) => 
    b.effective_date.localeCompare(a.effective_date)
  );

  if (!effectiveDate) {
    // No date specified: return latest (current)
    return sorted[0];
  }

  // Find first revision where effective_date <= effectiveDate
  return sorted.find(rev => rev.effective_date <= effectiveDate) 
    || sorted[sorted.length - 1];  // Fallback to oldest
}
```

### Recursive Resolution

Revisions are applied recursively through the content tree:

```
Section
  ├── Apply section revisions
  └── For each Subsection
      ├── Apply subsection revisions
      └── For each Article
          ├── Apply article revisions
          └── For each Content Node (Sentence/Clause/Table/etc.)
              ├── Apply content revisions
              └── For nested content (Subclause/Table rows/etc.)
                  └── Apply nested revisions
```

### Special Cases

#### Title Revisions

Titles can have their own revision history separate from node revisions:

```json
{
  "title": {
    "text": "Current Title",
    "revised": true,
    "revisions": [
      {
        "effective_date": "2024-12-19",
        "text": "New Title"
      },
      {
        "effective_date": "2023-01-01",
        "text": "Old Title"
      }
    ]
  }
}
```

#### Table Revisions

Tables have nested revisions for rows and cells:

```typescript
function resolveTable(table, effectiveDate) {
  // 1. Apply table-level revisions
  const resolved = applyRevision(table, effectiveDate);
  
  // 2. Resolve header rows
  const headerRows = resolved.structure.header_rows
    .map(row => applyRevision(row, effectiveDate))
    .filter(Boolean);
  
  // 3. Resolve body rows
  const bodyRows = resolved.structure.body_rows
    .map(row => {
      const resolvedRow = applyRevision(row, effectiveDate);
      // 4. Resolve cells within each row
      const cells = resolvedRow.cells
        .map(cell => applyRevision(cell, effectiveDate))
        .filter(Boolean);
      return { ...resolvedRow, cells };
    })
    .filter(Boolean);
  
  return { ...resolved, structure: { header_rows, body_rows } };
}
```

### Performance Considerations

- **Memoization**: Resolved sections are cached in `useSectionStore`
- **Cache Key**: Includes effective date: `${version}/${path}|${effectiveDate}`
- **Lazy Resolution**: Only resolves when effective date changes
- **No Re-resolution**: Cached results reused for same date

---

## Performance Optimizations

### 1. Content Chunking

**Strategy**: Split content by section (not by page or arbitrary size)

**Benefits**:
- Natural boundaries (Division → Part → Section)
- Predictable URLs
- Efficient caching

**File Size**: Typically 50-200 KB per section JSON

### 2. Lazy Loading

**Strategy**: Load section JSON only when navigated to

**Implementation**:
```typescript
useEffect(() => {
  if (isSectionLevelOrDeeper) {
    fetchSection(version, slug);
  }
}, [slug, version]);
```

### 3. In-Memory Caching

**Strategy**: Cache loaded sections in Zustand store

**Cache Key**: `${version}/${division}/${part}/${section}`

**Eviction**: Never (static content, no memory pressure)

### 4. Request Cancellation

**Strategy**: Cancel in-flight fetch when user navigates away

**Implementation**:
```typescript
let abortController = new AbortController();

fetchSection() {
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();
  fetch(url, { signal: abortController.signal });
}
```

### 5. Memoization

**Strategy**: Memoize expensive computations

**Examples**:
- `useMemo` for resolved sections
- `useMemo` for subtree extraction
- `useCallback` for event handlers

### 6. Skeleton Loading

**Strategy**: Show skeleton UI while content loads

**Benefits**:
- Perceived performance improvement
- Reduces layout shift
- Provides visual feedback

### 7. Static Generation

**Strategy**: Pre-generate all assets at build time

**Benefits**:
- No server-side processing
- Fast CDN delivery
- Predictable performance

### 8. Table Horizontal Scroll (Split Layout)

Wide tables activate a **split-scroll layout**: the header and body are rendered as two separate `<table>` elements inside a shared container, allowing the body to scroll independently while the header stays aligned via `translateX`.

**Sticky first column**:

Body rows are rendered by `renderBodyRowsWithColTracking` which tracks the true visual column position of every cell across active rowspans. Only cells genuinely at column 0 get `table-block__cell--first-col` → `position: sticky; left: 0`. Using a class (rather than CSS `:first-child`) is necessary because rows whose column 0 is covered by a prior rowspan have a different first DOM child.

**Pinned header column**:

A `table-block__pinned-header-col` overlay (absolutely positioned, `z-index: 5`) is rendered as a sibling of the scrolling header track inside `.table-block__header-viewport`. The overlay contains a single-column mini-table with only the first-column header cells, extracted by the `pinnedHeaderFirstColRows` memo. Because the overlay is later in the DOM than the scrolling track it always paints above it, avoiding the z-index fragility of the earlier counter-`translateX` approach.

**`border-collapse: separate`**:

Both split-header and split-body tables use `border-collapse: separate; border-spacing: 0` so sticky/positioned cells get their own compositing layer. Without this, `border-collapse: collapse`'s shared border layer allows scrolling cells to paint above sticky ones. Double-border side-effects are removed with `border-top: none; border-left: none` on all cells.

---

## Known Limitations & Optimization Opportunities

### 1. Glossary Term Extraction

**Current Limitation**:
- Hardcoded stopword list
- Assumes term text immediately follows marker
- Fails if term text is not adjacent

**Optimization**:
- Include term text in marker payload
- Example: `[REF:term:fire-separation:fire separation]`
- Eliminates lookahead parsing
- More reliable

**JSON Structure Change**:
```json
{
  "text": "The [REF:term:fire-separation:fire separation] shall...",
  "glossaryTerms": ["fire-separation"]
}
```

### 2. Cross-Reference Display Text

**Current Limitation**:
- Hardcoded regex patterns for each format
- Brittle if source text format changes
- Requires lookahead parsing

**Optimization**:
- Include display text in marker payload
- Example: `[REF:internal:id:long:Article 3.2.4.7.]`
- Eliminates format-specific logic
- More maintainable

**JSON Structure Change**:
```json
{
  "text": "See [REF:internal:nbc.divB.part3.sect1:long:Article 3.1.1.1.]"
}
```

### 3. Equation Matching

**Current Limitation**:
- Equations can be in marker or in separate array
- Complex matching logic to avoid duplicates
- Requires tracking consumed equations

**Optimization**:
- Always embed equations inline in text
- Example: `[EQ:display:id:latex:description]`
- Eliminates separate equations array
- Simpler parsing

**JSON Structure Change**:
```json
{
  "text": "The formula [EQ:display:eq123:E=mc^2:Energy equation] shows...",
  "equations": []  // Remove this array
}
```

### 4. Standards Normalization

**Current Limitation**:
- Fuzzy matching with key normalization
- May cause false matches
- Requires standards-map.json lookup

**Optimization**:
- Use exact IDs in source JSON
- Pre-resolve standards at build time
- Include full standard info in marker

**JSON Structure Change**:
```json
{
  "text": "[REF:standard:csaa440s1:CSA A440-S1:Steel Structures]"
}
```

### 5. Revision Resolution Performance

**Current Limitation**:
- Recursive traversal of entire content tree
- Applied on every render when date changes
- No incremental updates

**Optimization**:
- Pre-generate resolved versions at build time
- Create separate JSON files for each effective date
- Example: `section-1.json`, `section-1-2024-12-19.json`
- Eliminates runtime resolution

**Build-Time Change**:
```bash
# Generate resolved versions
/data/2024/content/nbc-divb/part-3/section-1.json  # Latest
/data/2024/content/nbc-divb/part-3/section-1-2024-12-19.json  # Specific date
/data/2024/content/nbc-divb/part-3/section-1-2023-01-01.json  # Older date
```

### 6. Table Cell Content Parsing

**Current Limitation**:
- Table cells can contain text, figures, or mixed content
- Complex type checking required
- Inconsistent structure

**Optimization**:
- Normalize table cell structure
- Always use array of content objects
- Consistent type field

**JSON Structure Change**:
```json
{
  "cells": [
    {
      "content": [
        { "type": "text", "value": "Some text" },
        { "type": "figure", "id": "fig123" }
      ]
    }
  ]
}
```

### 7. Note Reference Formatting

**Current Limitation**:
- Note labels extracted from ID using regex
- Assumes numeric suffix
- Fails for non-numeric notes

**Optimization**:
- Include note label in marker
- Example: `[REF:internal:noteId:short:(1)]`
- Eliminates ID parsing

**JSON Structure Change**:
```json
{
  "text": "See Note [REF:internal:note123:short:(1)]"
}
```

### 8. Compound Reference Parsing

**Current Limitation**:
- Complex regex to extract multiple references
- Hardcoded separator logic (", " vs " - ")
- Fragile parsing

**Optimization**:
- Use structured format
- Example: `[[FS:fs03,OBJ:os1.2]]`
- Simpler parsing logic

**JSON Structure Change**:
```json
{
  "text": "Applies to [[FS:fs03,OBJ:os1.2]]"
}
```

### 9. Content Type Discrimination

**Current Limitation**:
- Relies on `type` field being present and correct
- Falls back to console.warn for unknown types
- No validation at build time

**Optimization**:
- Validate all content types at build time
- Generate TypeScript types from JSON schema
- Fail build on invalid types

**Build-Time Validation**:
```typescript
// In content-chunker
function validateContentTypes(content) {
  const validTypes = ['sentence', 'clause', 'subclause', 'table', 'figure', 'equation', 'note'];
  for (const node of content) {
    if (!validTypes.includes(node.type)) {
      throw new Error(`Invalid content type: ${node.type}`);
    }
  }
}
```

### 10. Inline Formatting Nesting

**Current Limitation**:
- Recursive parsing for nested formatting
- Can be slow for deeply nested content
- No limit on nesting depth

**Optimization**:
- Flatten formatting at build time
- Convert to HTML-like structure
- Limit nesting depth

**JSON Structure Change**:
```json
{
  "text": "Some <em>italic <strong>bold</strong></em> text",
  "formatted": true
}
```

---

## Summary

### Strengths

✅ **Type-driven rendering**: Clean, maintainable component architecture  
✅ **Lazy loading**: Efficient content delivery  
✅ **Static generation**: No backend dependencies  
✅ **Revision support**: Handles amendments correctly  
✅ **Caching**: Good performance for repeated navigation  

### Weaknesses

❌ **Hardcoded parsing**: Brittle text extraction logic  
❌ **Runtime resolution**: Expensive revision filtering  
❌ **Complex markers**: Difficult to maintain and extend  
❌ **Lookahead parsing**: Fragile and error-prone  
❌ **No build-time validation**: Errors discovered at runtime  

### Recommended Improvements

1. **Move parsing to build time**: Pre-resolve all markers and formatting
2. **Simplify marker format**: Include all display text in markers
3. **Pre-generate resolved versions**: Eliminate runtime revision resolution
4. **Validate at build time**: Catch errors before deployment
5. **Normalize data structures**: Consistent format for all content types

These changes would significantly improve performance, maintainability, and reliability while reducing runtime complexity.
