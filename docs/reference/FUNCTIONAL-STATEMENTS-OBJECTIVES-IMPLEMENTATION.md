# Functional Statements and Objectives Implementation

## Overview

This document describes the implementation of functional statement and objective references in the BC Building Code Interactive Web Application. These references appear in Division B tables and link back to the objective-based code structure defined in Division A.

## Reference Format

The source JSON contains double-bracket references in the following formats:

### Single References
- `[[REF:functional-statement:fs03]]` - Single functional statement
- `[[REF:sub-objective:nbc-obj-os1.2]]` - Single sub-objective

### Compound References
- `[[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]` - FS linked to objective
- `[[REF:functional-statement:fs02],[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]` - Multiple FS linked to objective

## Implementation Components

### 1. Metadata Extraction

**Location**: `packages/content-chunker/src/metadata-extractor.ts`

**Functions**:
- `extractFunctionalStatementsFromRaw(rawData)` - Extracts functional statements from Division A, Part 3, Section 2
- `extractObjectivesFromRaw(rawData)` - Extracts objectives from Division A, Part 2, Section 2

**Output Files** (per version):
- `/data/{versionId}/functional-statements.json` - 114 entries (57 statements with base + 'fs' prefixed keys)
- `/data/{versionId}/objectives.json` - 46 entries (5 main objectives + sub-objectives with multiple key formats)

**Key Normalization**:
- Functional statements: `f01`, `fsf01` (both map to same statement)
- Objectives: `os`, `nbc-obj-os`, `os1`, `nbc-obj-os1`, `os1-2`, `nbc-obj-os1-2` (various formats)

### 2. Text Parser

**Location**: `apps/web/lib/text-parsing.ts`

**Updates**:
- Added new marker types: `functionalStatement`, `objective`, `compound`
- Regex pattern: `/\[\[(.*?)\]\]/g` to match double-bracket references (non-greedy to handle nested content)
- Parses compound references by splitting on `-` and `,` separators
- Renders using `FunctionalStatementLink` and `ObjectiveLink` components

### 3. UI Components

#### FunctionalStatementLink
**Location**: `apps/web/components/reading/FunctionalStatementLink.tsx`

**Features**:
- Displays functional statement key in compact format (e.g., "F03" not "FS03") to match printed BC Building Code
- Shows tooltip on hover with full definition
- Indicates BC-specific statements with badge
- Accessible with ARIA labels and keyboard navigation

#### ObjectiveLink
**Location**: `apps/web/components/reading/ObjectiveLink.tsx`

**Features**:
- Displays objective key (e.g., "OS1.2")
- Shows tooltip on hover with title and definition
- Indicates BC-specific objectives with badge
- Accessible with ARIA labels and keyboard navigation

### 4. Data Hooks

#### useFunctionalStatements
**Location**: `apps/web/hooks/useFunctionalStatements.ts`

**API**:
```typescript
const { statements, loading, error, getStatement } = useFunctionalStatements();
const statement = getStatement('fs03'); // Returns FunctionalStatement or null
```

#### useObjectives
**Location**: `apps/web/hooks/useObjectives.ts`

**API**:
```typescript
const { objectives, loading, error, getObjective } = useObjectives();
const objective = getObjective('nbc-obj-os1.2'); // Returns Objective or SubObjective or null
```

**Features**:
- Version-aware (uses `useCurrentVersionId()`)
- Client-side caching per version
- Lazy loading on component mount

### 5. Styling

**Files**:
- `apps/web/components/reading/FunctionalStatementLink.css`
- `apps/web/components/reading/ObjectiveLink.css`
- `apps/web/components/reading/CompoundRef.css`

**Design**:
- Dotted underline for references (similar to glossary terms)
- Tooltip with dark blue background and gold accents
- BC badge for BC-specific items
- Responsive tooltip positioning

## Data Structure

### Functional Statement
```typescript
interface FunctionalStatement {
  id: string;           // "nbc.functional.F03"
  key: string;          // "F03"
  definition: string;   // "To retard the effects of fire..."
  source?: 'nbc' | 'bc';
}
```

### Objective
```typescript
interface Objective {
  id: string;           // "nbc.objective.OS"
  key: string;          // "OS"
  title: string;        // "Safety"
  definition: string;   // "An objective of this Code..."
  source?: 'nbc' | 'bc';
  subObjectives?: SubObjective[];
}

interface SubObjective {
  id: string;           // "nbc.objective.OS1"
  key: string;          // "OS1"
  title: string;        // "Fire Safety"
  definition: string;   // "An objective of this Code..."
  source?: 'nbc' | 'bc';
}
```

## Build Pipeline

**Script**: `scripts/generate-assets.ts`

**Process**:
1. Load raw JSON for each version
2. Parse with `parseBCBC()` for validation
3. Extract functional statements and objectives from raw JSON (before parsing)
4. Generate metadata files in `/apps/web/public/data/{versionId}/`
5. Generate unified versions index

**Output**:
```
/apps/web/public/data/
├── versions.json
├── 2024/
│   ├── functional-statements.json (114 entries)
│   ├── objectives.json (46 entries)
│   └── ... (other metadata files)
└── 2027/
    ├── functional-statements.json (114 entries)
    ├── objectives.json (46 entries)
    └── ... (other metadata files)
```

## Usage Example

### In Table Cells

Source JSON:
```json
{
  "type": "text",
  "value": "[[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]"
}
```

Rendered Output:
```
[F03]-[OS1.2]
```
(Both are clickable with tooltips showing definitions)

### Compound References

Source JSON:
```json
{
  "type": "text",
  "value": "[[REF:functional-statement:fs02],[REF:functional-statement:fs03]-[REF:sub-objective:nbc-obj-os1.2]]"
}
```

Rendered Output:
```
[F02], [F03]-[OS1.2]
```
(All three are clickable with individual tooltips)

## Testing

### Manual Testing
1. Navigate to Division B, Part 2, Section 5, Subsection 1, Article 1, Table 1
2. Verify functional statement and objective references are clickable
3. Hover over references to see tooltips with definitions
4. Verify BC-specific items show BC badge

### Type Checking
```bash
npx pnpm type-check
```

### Build Assets
```bash
npx pnpm generate-assets
```

## Accessibility

- **Keyboard Navigation**: All references are focusable with Tab key
- **Screen Readers**: ARIA labels provide context (e.g., "Functional Statement F03: To retard the effects of fire...")
- **Tooltips**: Role="tooltip" for proper screen reader announcement
- **Color Contrast**: 7:1 ratio using BC Design System colors

## Performance

- **Lazy Loading**: Metadata loaded only when needed
- **Caching**: Per-version caching prevents redundant fetches
- **Bundle Size**: ~10KB for metadata files per version
- **Render Performance**: React.createElement for efficient rendering

## Future Enhancements

1. **Modal View**: Click to open modal with full objective hierarchy
2. **Cross-Links**: Navigate from objective to all related functional statements
3. **Search Integration**: Include functional statements and objectives in search
4. **Print Support**: Ensure references print correctly in PDF export

## Related Files

- Metadata extraction: `packages/content-chunker/src/metadata-extractor.ts`
- Text parsing: `apps/web/lib/text-parsing.ts`
- Components: `apps/web/components/reading/FunctionalStatementLink.tsx`, `ObjectiveLink.tsx`
- Hooks: `apps/web/hooks/useFunctionalStatements.ts`, `useObjectives.ts`
- Build script: `scripts/generate-assets.ts`
- Types: `packages/content-chunker/src/index.ts`

## References

- Division A, Part 2, Section 2: Objectives
- Division A, Part 3, Section 2: Functional Statements
- Division B tables: References to objectives and functional statements
