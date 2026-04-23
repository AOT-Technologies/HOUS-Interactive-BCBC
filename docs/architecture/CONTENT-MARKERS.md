# Content Marker System — Developer Reference

This document describes how special bracket-style markers embedded in JSON content are parsed and rendered throughout the reading page, modals, glossary sidebar, and related features.

---

## Table of Contents

1. [Overview](#overview)
2. [Marker Reference](#marker-reference)
   - [Glossary Terms — `[REF:term:...]`](#glossary-terms)
   - [Cross-References — `[REF:internal:...]`](#cross-references)
   - [Note References — `[REF:internal:...note...]`](#note-references)
   - [Table-Note References — `[REF:table-note:...]`](#table-note-references)
   - [Standards & External Links — `[REF:standard:...]` / `[REF:external:...]`](#standards--external-links)
   - [Equations — `[EQ:...]`](#equations)
   - [Structured Lists — `[LIST:...]`](#structured-lists)
   - [Functional Statements — `[[REF:functional-statement:...]]`](#functional-statements)
   - [Objectives — `[[REF:sub-objective:...]]`](#objectives)
   - [Compound References — `[[REF:...]-[REF:...]]`](#compound-references)
3. [Inline Text Formatting](#inline-text-formatting)
4. [Reference ID Anatomy](#reference-id-anatomy)
5. [Rendering Pipeline](#rendering-pipeline)
6. [Key Files Quick Reference](#key-files-quick-reference)
7. [Data Stores](#data-stores)
8. [JSON Data File Formats](#json-data-file-formats)
9. [Adding a New Marker Type](#adding-a-new-marker-type)
10. [Common Bug-Fixing Checklist](#common-bug-fixing-checklist)

---

## Overview

Content across the application is stored as plain JSON files. Rich interactive features (clickable glossary terms, cross-reference modals, note links, equations, etc.) are encoded directly in text fields using a lightweight bracket syntax, e.g.:

```
"the design and construction of a new [REF:term:bldng:building],"
```

At render time, the main parser function `parseTextWithMarkers()` in
`apps/web/lib/text-parsing.ts` scans every text field for these markers and replaces them with the appropriate React components, preserving the surrounding plain text.

---

## Marker Reference

### Glossary Terms

**Syntax**
```
[REF:term:<termId>]
[REF:term:<termId>:<customLabel>]
```

**Examples**
```
[REF:term:bldng]
[REF:term:bldng:building]
[REF:term:ccpnc:occupancy]
```

**Rendered as** → `GlossaryTerm` component
- Displays in italic with a small info icon (interactive mode)
- Hover: 200 ms delay tooltip showing the short definition
- Click: opens the `GlossarySidebar` anchored to that term
- Non-interactive mode (search results, print): plain italic text

**Resolution** — `termId` is looked up in `glossary-store` which loads
`/public/data/{versionId}/glossary-map.json`.

---

### Cross-References

**Syntax**
```
[REF:internal:<referenceId>]
[REF:internal:<referenceId>:<format>]
[REF:internal:<referenceId>:<format>:<customLabel>]
```

**Format values**

| Format | What is shown |
|--------|---------------|
| `short` (default) | Short label, e.g. "3.1.1." |
| `long` | Full descriptive label |
| `medium` | Medium label |
| `title` | Section title only |
| `number` | Numeric code only |
| `shortNum` | Compact number form |

**Examples**
```
[REF:internal:nbc.divB.part9]
[REF:internal:nbc.divA.part1.sect1.subsect1.art1.sent2:long]
[REF:internal:nbc.divB.part3.sect1.table1:short:Table 3.1.1.]
```

**Rendered as** → `CrossReferenceLink` component
- Click behaviour depends on reference type:
  - **Same page / nearby**: scrolls with highlight
  - **Modal reference**: opens `CrossReferenceModal` showing the full quoted content
  - **Navigate reference**: updates URL / navigation store
- Display text is resolved by `getCrossReferenceDisplayText()` in `text-parsing.ts`
- **Legacy IDs:** Some source data uses non-standard reference IDs that don't follow the `nbc.*` naming convention. Two known patterns exist:
  - `ex*` IDs (e.g. `ex000109.7`) — legacy section/appendix references
  - `en*` IDs (e.g. `en000354`) — legacy application note references, typically displayed as "Note A-X.Y.Z.W.(N)"
  
  These are mapped to display text via `legacyIdMap` in `getCrossReferenceDisplayText()` and rendered as plain text (not clickable) via `isNonNavigableReferenceId()`. To add a new legacy ID: add the ID and its display text to `legacyIdMap`, and add the ID to `NON_NAVIGABLE_REFERENCE_IDS` in `text-parsing.ts`.

---

### Note References

Note references use the same `[REF:internal:...]` syntax but the `referenceId` targets a note node.

**Examples**
```
[REF:internal:nbc.divB.part3.sect1.table1.note2:short]
[REF:internal:nbc.divA.part1.sect1.subsect1.art1.note1:long]
```

**Rendered as** → `NoteReference` component
- Superscript link (e.g. ¹)
- Click: smooth-scrolls to the note block and highlights it for ~2 s

---

### Table-Note References

**Syntax**
```
[REF:table-note:<noteId>]
```

**Example**
```
[REF:table-note:nbc.divB.part3.sect1.table1.note2]
```

**Rendered as** — inline superscript within table cells pointing to the associated table note row.

**Note**: Table note `content` fields support all standard inline markers including `[LIST:bulleted]`. When a note contains a list, the JSON node must include a sibling `list` field (a `StructuredList` object with `type` and `items`).

---

### Standards & External Links

**Syntax**
```
[REF:standard:<standardId>]
[REF:external:<standardId>]
[REF:external:<url>:<label>]
```

**Examples**
```
[REF:standard:ulcs114]
[REF:external:ulcs114]
[REF:external:https://example.gov/doc:View document]
```

**Rendered as** → styled external link
- `standardId` is resolved via `standards-map-store`
- URL-form renders a plain anchor with the supplied label
- **Key matching:** `findStandardReferenceEntry()` normalizes both the reference ID and map keys (stripping non-alphanumeric characters). It also strips the `d-` prefix from map keys as a fallback, since some Appendix D standards are stored with a `d-` prefix (e.g. `d-astmd2898`) but referenced without it (`astmd2898`).

---

### Equations

**Syntax**
```
[EQ:display:<equationId>]
[EQ:inline:<equationId>]
[EQ:display]
[EQ:inline]
```

**Examples**
```
[EQ:display:es007867q1]
[EQ:inline:es007867q2]
```

**Rendered as** → `EquationBlock` component
- `display` mode: block-level, centred
- `inline` mode: inline within a sentence
- Equation data (LaTeX / MathML / image fallback) is loaded from `equation-store`

---

### Structured Lists

**Syntax**
```
[LIST:bulleted]
[LIST:numbered]
[LIST:alphabetic]
[LIST:roman]
[LIST:variable]
[LIST:symbol]
[LIST:definition]
[LIST:organization]
[LIST:bibliography]
```

**Rendered as** → `StructuredListBlock` component
- List items come from the sibling `lists` array of the containing JSON node, not from the marker text itself
- The marker acts as a placeholder anchoring where the list should appear in the text flow
- Supported in: sentence, clause, subclause content, and **table note** content

**Supported list types:**

| Type | HTML | Description |
|------|------|-------------|
| `bulleted` | `<ul>` | Unordered bullet list |
| `numbered` | `<ol>` | Ordered numeric list (1, 2, 3) |
| `alphabetic` | `<ol type="a">` | Ordered alphabetic list (a, b, c) |
| `roman` | `<ol type="i">` | Ordered roman numeral list (i, ii, iii) |
| `variable` | `<dl>` | Definition list with symbol/description pairs |
| `symbol` | `<dl>` | Same as variable, for symbol definitions |
| `definition` | `<dl>` | Definition list with term/definition pairs |
| `organization` | `<table>` | Organization table with abbreviation/name/website |
| `bibliography` | `<ol>` | Numbered bibliography entries |

**Appendix D list type normalization:**
The source data uses `"type": "bulleted"` for appendix article sub-items that the printed code renders as alphabetic (a, b, c) and roman (i, ii, iii). `DivisionAppendixRenderer.renderParagraph` normalizes these at render time:
- 1st `bulleted` list in a paragraph → `alphabetic` (a, b, c)
- Subsequent `bulleted` lists (sub-lists) → `roman` (i, ii, iii)
- This only applies to appendices whose section IDs contain `appsect` (e.g. Appendix D). Appendix C uses `div1`/`div2` IDs and its genuine bullet lists are left as-is.
- The `[LIST:bulleted]` markers in both the paragraph content string and nested item content strings are rewritten to match the normalized list types.

**Table note example** (note that `list` is a single object, not an array):
```json
{
  "id": "nbc.divBV2.part9.sect8.subsect4.art1.table1.note1",
  "content": "Private stairs are exterior and interior stairs that serve[LIST:bulleted]",
  "list": {
    "type": "bulleted",
    "items": [
      { "content": "single [REF:term:dwllng-n:dwelling units] ," },
      { "content": "houses with a [REF:term:scnd-t:secondary suite] including their common spaces, or" },
      { "content": "garages that serve houses described in Clause a) or b)." }
    ]
  }
}
```
- Lists are consumed in order — the first unconsumed list whose `type` matches the marker type is used
- **Nested lists:** a list item's `content` string may itself contain a `[LIST:...]` marker. Sub-lists are pre-assigned to each item at parse time (before React renders) by scanning each item's content for `[LIST:...]` markers and slicing the remaining lists sequentially. This makes `renderText` a pure function, safe under React StrictMode re-renders. The `renderText` callback also rewrites any `[LIST:bulleted]` markers in item content to match the actual type of the assigned sub-list (e.g. `[LIST:roman]`), so that type-remapped sub-lists resolve correctly.

---

### Functional Statements

Uses **double brackets**.

**Syntax**
```
[[REF:functional-statement:<fsId>]]
```

**Examples**
```
[[REF:functional-statement:fs03]]
[[REF:functional-statement:f01]]
```

**Rendered as** → `FunctionalStatementLink` component
- Displays the formatted key (e.g. "F03")
- Hover tooltip shows the full definition
- Data loaded from `functional-statements-store` → `/public/data/{versionId}/functional-statements.json`

---

### Objectives

Uses **double brackets**.

**Syntax**
```
[[REF:sub-objective:<objectiveId>]]
```

**Examples**
```
[[REF:sub-objective:nbc-obj-os1.2]]
[[REF:sub-objective:nbc-obj-s3.4]]
```

**Rendered as** → `ObjectiveLink` component
- Displays the formatted key (e.g. "OS1.2")
- Hover tooltip shows definition and related terms
- Data loaded from `objectives-store` → `/public/data/{versionId}/objectives.json`

---

### Compound References

Multiple double-bracket refs can be joined with a dash to form a single inline token.

**Syntax**
```
[[REF:<type>:<id>]-[REF:<type>:<id>]]
```

**Example**
```
[[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]
```

**Rendered as** → `CompoundRef` component (see `CompoundRef.css`)
- Displays both keys side-by-side with shared styling
- Each key retains its own tooltip and click behaviour

---

## Inline Text Formatting

Outside of bracket markers, text fields support a small set of XML-like tags for inline typography:

| Tag | Effect |
|-----|--------|
| `<italic>…</italic>` | Italic text |
| `<bold>…</bold>` | Bold text |
| `<sub>…</sub>` | Subscript |
| `<sup>…</sup>` | Superscript |
| `<>` / `</>` | Legacy placeholder — stripped at parse time |
| `<CHANGE>…</CHANGE>` | Legacy change marker — stripped at parse time |

These are handled by `parseInlineFormatting()` in `text-parsing.ts` (line ~203), which runs as part of the same single-pass pipeline.

---

## Reference ID Anatomy

Internal reference IDs follow a hierarchical dot-notation:

```
nbc.<division>.<part>[.<section>[.<subsection>[.<article>[.<sentence>[.<clause>[.<subclause>]]]]]]
nbc.<division>.<part>.appendix.appnote<n>
nbc.<division>.<part>.spectables<n>.table<n>[.note<n>]
nbc.<division>.appendix<X>.<appsection>.<article>.<paragraph>
```

**Parsed by** `parseReferenceId()` in `apps/web/lib/cross-reference.ts`.

**Returns** an object with fields:

```ts
{
  kind: 'part' | 'section' | 'part_appendix' | 'appendix_document' | 'spectables',
  division: string,   // e.g. "divA", "divB"
  part: string,       // e.g. "part1", "part9"
  section?: string,
  subsection?: string,
  article?: string,
  sentence?: string,
  clause?: string,
  subclause?: string,
  table?: string,
  note?: string,
}
```

**Utility helpers** (same file):
- `getNavigationSlug()` — converts parsed ID to URL path segments
- `isModalReference()` — returns `true` when the reference should open inline in a modal rather than navigating
- `shouldSuppressReferenceInContext()` — suppresses a self-reference when an article is already rendering itself

---

## Rendering Pipeline

```
JSON content file (public/data/{versionId}/content/…)
  │
  ▼
ReadingView.tsx          — fetches section JSON, sets up context providers
  │                         (CrossReferenceContext, equation/standards stores)
  ▼
ContentRenderer.tsx      — recursive type-driven dispatcher
  │  routes by node.type → SentenceBlock | ClauseBlock | SubclauseBlock
  │                         TableBlock | FigureBlock | EquationBlock | NoteBlock
  ▼
SentenceBlock.tsx        — calls parseTextWithMarkers(text, glossaryTerms, …)
  │
  ▼
parseTextWithMarkers()   — lib/text-parsing.ts (line ~936)
  │  single-pass regex scan, sorted by source position
  │
  ├─ [REF:term:…]              → <GlossaryTerm>
  ├─ [REF:internal:…]          → <CrossReferenceLink> or <NoteReference>
  ├─ [REF:table-note:…]        → inline superscript
  ├─ [REF:standard:…]          → external link
  ├─ [REF:external:…]          → external link / anchor
  ├─ [EQ:…]                    → <EquationBlock>
  ├─ [LIST:…]                  → <StructuredListBlock>
  ├─ [[REF:functional-stmt:…]] → <FunctionalStatementLink>
  ├─ [[REF:sub-objective:…]]   → <ObjectiveLink>
  ├─ [[REF:…]-[REF:…]]         → <CompoundRef>
  └─ plain text / inline tags  → parseInlineFormatting() → span nodes
  │
  ▼
React nodes array          — rendered into the DOM
  │
  ▼
User interactions
  ├─ Glossary hover    → tooltip (200 ms delay)
  ├─ Glossary click    → GlossarySidebar opens
  ├─ Cross-ref click   → CrossReferenceModal  OR  URL navigation
  ├─ Note click        → scroll + 2 s highlight
  ├─ Func-stmt hover   → tooltip
  └─ Objective hover   → tooltip
```

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `apps/web/lib/text-parsing.ts` | **Master parser** — `parseTextWithMarkers()` and all helper functions |
| `apps/web/lib/cross-reference.ts` | Reference ID parsing, navigation slug, modal/suppress logic |
| `apps/web/lib/url-utils.ts` | URL construction and navigation utilities |
| `apps/web/components/reading/ReadingView.tsx` | Top-level reading container, context setup |
| `apps/web/components/reading/ContentRenderer.tsx` | Recursive type dispatcher |
| `apps/web/components/reading/SentenceBlock.tsx` | Entry point for `parseTextWithMarkers` |
| `apps/web/components/reading/GlossaryTerm.tsx` | Renders `[REF:term:…]` |
| `apps/web/components/reading/CrossReferenceLink.tsx` | Renders `[REF:internal:…]` |
| `apps/web/components/reading/NoteReference.tsx` | Renders note targets |
| `apps/web/components/reading/FunctionalStatementLink.tsx` | Renders `[[REF:functional-statement:…]]` |
| `apps/web/components/reading/ObjectiveLink.tsx` | Renders `[[REF:sub-objective:…]]` |
| `apps/web/components/reading/CrossReferenceModal.tsx` | Modal for in-page cross-references |
| `apps/web/components/reading/CrossReferenceContext.tsx` | Context provider wiring modal state |
| `apps/web/components/reading/GlossarySidebar.tsx` | Glossary drawer |

---

## Data Stores

Each store is a Zustand (or similar) module that lazy-loads from a public JSON file and exposes lookup methods consumed by the rendering components.

| Store | File loaded | Consumed by |
|-------|-------------|-------------|
| `glossary-store` | `glossary-map.json` | `GlossaryTerm`, `parseTextWithMarkers` |
| `navigation-store` | navigation tree JSON | `CrossReferenceLink` (title format) |
| `standards-map-store` | standards map JSON | `CrossReferenceLink` |
| `spectables-map-store` | spectables map JSON | `getSpectableTableNoteNumber()` |
| `functional-statements-store` | `functional-statements.json` | `FunctionalStatementLink` |
| `objectives-store` | `objectives.json` | `ObjectiveLink` |
| `section-store` | per-section content JSON | `CrossReferenceModal` |
| `appendix-store` | appendix content JSON | `NoteReference`, `CrossReferenceModal` |
| `equation-store` | equation JSON | `EquationBlock` |

All files live under `apps/web/public/data/{versionId}/`.

---

## JSON Data File Formats

### Content (section files)

```json
{
  "sentences": [
    {
      "id": "nbc.divA.part1.sect1.subsect1.art1.sent1",
      "type": "sentence",
      "number": "1",
      "text": "Plain text with [REF:term:bldng:building] marker.",
      "clauses": [
        {
          "id": "nbc.divA.part1.sect1.subsect1.art1.sent1.clause-a",
          "type": "clause",
          "letter": "a",
          "text": "clause text with [[REF:functional-statement:fs03]]"
        }
      ]
    }
  ]
}
```

### Glossary Map

```json
{
  "<lookupKey>": {
    "id": "<termId>",
    "term": "Display Name",
    "definition": "Full definition text, may itself contain [REF:term:…] markers.",
    "relatedTerms": ["<termId>", "…"]
  }
}
```

> The `<lookupKey>` in glossary-map.json matches the `<termId>` used inside markers — e.g. key `"bldng"` → `[REF:term:bldng]`.

### Functional Statements

```json
{
  "statements": {
    "<fsId>": {
      "id": "nbc.functional.F01",
      "key": "F01",
      "definition": "To minimize the risk of accidental ignition."
    }
  }
}
```

### Objectives

```json
{
  "objectives": {
    "<categoryKey>": {
      "id": "nbc.objective.OS",
      "key": "OS",
      "title": "Safety",
      "definition": "Definition text.",
      "subObjectives": [
        {
          "id": "nbc.objective.OS1",
          "key": "OS1",
          "definition": "…",
          "subObjectives": [
            {
              "id": "nbc.objective.OS1.2",
              "key": "OS1.2",
              "definition": "…"
            }
          ]
        }
      ]
    }
  }
}
```

---

## Adding a New Marker Type

Follow these steps to introduce a new marker (e.g. `[REF:figure:...]`):

1. **Define the syntax** — decide on `[MARKER:subtype:id:...options]` structure. Keep it consistent with existing patterns.

2. **Add regex detection** in `parseTextWithMarkers()` (`text-parsing.ts`):
   - Add a new regex constant near the top of the function.
   - Push detected matches into the unified `markers` array with a `type` discriminant.

3. **Add a render case** in the `markers.forEach` / `switch` block inside `parseTextWithMarkers()`:
   - Emit the appropriate React element (or call a new component).

4. **Create the component** under `apps/web/components/reading/`:
   - Follow the existing pattern (props, CSS module, tooltip/click wiring).

5. **Add a data store** (if the marker references external data):
   - Create `apps/web/stores/<new>-store.ts`.
   - Load from `public/data/{versionId}/<new>.json`.
   - Wire store initialization in `ReadingView.tsx`.

6. **Update JSON data files** with the new marker where needed.

7. **Add a CSS file** for the component's styles.

8. **Update this document** with the new marker's syntax and behaviour.

---

## Common Bug-Fixing Checklist

| Symptom | Where to look |
|---------|--------------|
| Marker shown as raw text `[REF:…]` | Regex not matching in `parseTextWithMarkers()` — check for typos in marker or regex pattern |
| Tooltip not appearing | Check store is loaded; check hover delay logic in the component's CSS/JS |
| Modal opens but shows empty content | `section-store` fetch failing — check network, `versionId`, or reference ID format |
| Wrong display text for a cross-reference | `getCrossReferenceDisplayText()` in `text-parsing.ts`; also check `parseReferenceId()` return value |
| Glossary term not italicised / no icon | `interactive` prop not passed down to `parseTextWithMarkers()` call in `SentenceBlock` |
| Note superscript missing | Check `isNoteReference()` in `cross-reference.ts`; also check `appendix-store` has loaded |
| Equation not rendering | Check `equation-store` contains the `equationId`; check LaTeX/MathML in the data file |
| Functional statement key wrong format | Check `key` field in `functional-statements.json` and formatting logic in `FunctionalStatementLink.tsx` |
| Self-referencing cross-link appears | `shouldSuppressReferenceInContext()` returning `false` — check `renderContext` prop is passed correctly |
| Compound reference renders as two separate tokens | Ensure `[[REF:…]-[REF:…]]` uses double brackets and the dash is unspaced |
| `[LIST:…]` in a table note renders nothing / disappears | Ensure the note's JSON node has a `list` field (not `lists`) with the matching `type` — `RawTableNote` in `TableBlock.tsx` and `renderFormattedText` must receive it as `localLists` |
| Nested `[LIST:variable]` inside a bulleted item not rendering | Sub-lists are pre-assigned per item in the `case 'list'` branch of `parseTextWithMarkers` — check `itemSubLists` construction and that `StructuredListBlock` passes `itemIndex` to `renderText` |
| Appendix D lists showing bullets instead of a)/b)/i)/ii) | `DivisionAppendixRenderer.renderParagraph` normalizes `bulleted` → `alphabetic`/`roman` — check `appendixUsesAlphabeticStyle` detection and the marker rewriting in both paragraph content and the `renderText` callback |
| `[REF:standard:...]` showing raw ID instead of citation | `findStandardReferenceEntry()` in `text-parsing.ts` — check the standards map has the key. If the key has a `d-` prefix, the fallback prefix-stripping logic should match it |
| `[REF:internal:...]` renders as a dead link (no content on click) | If the reference ID is a legacy/external ID (`ex*` for sections, `en*` for notes), add it to `NON_NAVIGABLE_REFERENCE_IDS` and `legacyIdMap` in `text-parsing.ts` so it renders as plain text with the correct display label |
