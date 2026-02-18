# Static Path Generation for Next.js Export

## Overview

This document explains how static paths are dynamically generated from the navigation tree for Next.js static export builds.

## Problem

The BC Building Code app uses Next.js static export (`output: 'export'`) with dynamic catch-all routes (`/code/[...slug]/page.tsx`). Next.js requires all dynamic paths to be explicitly defined in `generateStaticParams()` at build time.

**Challenge**: The building code has thousands of sections, subsections, and articles. Hardcoding these paths is impractical and error-prone.

## Solution

Dynamically generate all paths from the navigation tree JSON files at build time.

### Architecture

```
Build Time:
┌─────────────────────────────────────────────────────────┐
│  1. Load versions.json                                  │
│     → Get all available versions (2024, 2027, etc.)     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  2. For each version:                                   │
│     → Load navigation-tree.json                         │
│     → Extract all section/subsection/article paths      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  3. Return all paths to Next.js                         │
│     → Next.js pre-renders each path as static HTML      │
└─────────────────────────────────────────────────────────┘
```

## Implementation

### File: `apps/web/lib/generate-static-paths.ts`

This utility provides functions to extract all paths from navigation tree data:

```typescript
// Generate paths for all versions
export function generateAllStaticPaths(): { slug: string[] }[]

// Generate paths for a specific version (useful for testing)
export function generateStaticPathsForVersion(version: string): { slug: string[] }[]
```

### File: `apps/web/app/code/[...slug]/page.tsx`

The page component uses the utility in `generateStaticParams()`:

```typescript
export async function generateStaticParams() {
  const { generateAllStaticPaths } = await import('../../../lib/generate-static-paths');
  const paths = generateAllStaticPaths();
  return paths;
}
```

## Path Extraction Logic

### Navigation Tree Structure

```json
{
  "version": "2024",
  "tree": [
    {
      "id": "nbc.2020.vol1",
      "type": "volume",
      "children": [
        {
          "id": "nbc.divA",
          "type": "division",
          "path": "/code/nbc.divA",
          "children": [
            {
              "id": "nbc.divA.part1",
              "type": "part",
              "path": "/code/nbc.divA/1",
              "children": [
                {
                  "id": "nbc.divA.part1.sect1",
                  "type": "section",
                  "path": "/code/nbc.divA/1/1",
                  "children": [...]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Extraction Rules

1. **Skip volume, division, and part levels** - These are navigation containers, not content pages
2. **Include section, subsection, and article levels** - These are actual content pages
3. **Extract slug from path** - Convert `/code/nbc.divA/1/1` → `["nbc.divA", "1", "1"]`
4. **Recursively process all children** - Traverse the entire tree

### Path Depth Mapping

| Depth | Level | Example Path | Example Slug |
|-------|-------|--------------|--------------|
| 3 | Section | `/code/nbc.divA/1/1` | `["nbc.divA", "1", "1"]` |
| 4 | Subsection | `/code/nbc.divA/1/1/2` | `["nbc.divA", "1", "1", "2"]` |
| 5 | Article | `/code/nbc.divA/1/1/2/1` | `["nbc.divA", "1", "1", "2", "1"]` |

## Statistics (Current Data)

Based on the 2024 and 2027 versions:

```
Total paths generated: 5,316
├── Version 2024: 2,658 paths
└── Version 2027: 2,658 paths

Breakdown by depth:
├── Depth 3 (Sections):    208 paths per version
├── Depth 4 (Subsections): 930 paths per version
└── Depth 5 (Articles):    4,170 paths per version
```

## Testing

### Test Script

Run the test script to verify path generation:

```bash
npx tsx apps/web/scripts/test-path-generation.ts
```

This will:
1. Generate paths for all versions
2. Show sample paths
3. Analyze path depth distribution
4. Verify specific test paths exist

### Expected Output

```
Testing Static Path Generation
================================================================================

1. Generating paths for ALL versions...
--------------------------------------------------------------------------------
Generating static paths for 2 version(s)...
Processing version 2024 (BC Building Code 2024)...
  Found 2658 paths for version 2024
Processing version 2027 (BC Building Code 2027)...
  Found 2658 paths for version 2027
Total static paths generated: 5316

✅ Total paths generated: 5316

Sample paths (first 20):
  1. /code/nbc.divA/1/1
  2. /code/nbc.divA/1/1/1
  3. /code/nbc.divA/1/1/1/1
  ...
```

## Build Process

### Development

During development (`npm run dev`), Next.js uses dynamic routing - no pre-rendering needed.

### Production Build

During production build (`npm run build`):

1. Next.js calls `generateStaticParams()` for each dynamic route
2. Our utility loads navigation trees and extracts all paths
3. Next.js pre-renders each path as a static HTML file
4. Output goes to `apps/web/out/` directory

### Build Time Impact

- **Path generation**: ~1-2 seconds
- **Pre-rendering 5,316 pages**: ~5-10 minutes (depends on content complexity)
- **Total build time**: ~10-15 minutes

## File System Output

After build, the static export creates this structure:

```
apps/web/out/
├── code/
│   ├── nbc.divA/
│   │   ├── 1/
│   │   │   ├── 1/
│   │   │   │   ├── index.html          (Section 1.1)
│   │   │   │   ├── 1/
│   │   │   │   │   └── index.html      (Subsection 1.1.1)
│   │   │   │   ├── 2/
│   │   │   │   │   └── index.html      (Subsection 1.1.2)
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── _next/                               (Next.js assets)
├── data/                                (JSON data files)
└── index.html                           (Homepage)
```

## Troubleshooting

### Issue: "Page is missing param in generateStaticParams()"

**Cause**: A path exists in the navigation tree but wasn't generated by the utility.

**Solution**:
1. Run the test script to verify path generation
2. Check if the path exists in `navigation-tree.json`
3. Verify the path type is section/subsection/article (not volume/division/part)

### Issue: "Navigation tree not found"

**Cause**: The utility can't find the navigation tree JSON file.

**Solution**:
1. Ensure `apps/web/public/data/{version}/navigation-tree.json` exists
2. Run `pnpm generate-assets` to regenerate navigation trees
3. Check file permissions

### Issue: Build takes too long

**Cause**: Pre-rendering thousands of pages takes time.

**Solution**:
1. This is expected for static export with many pages
2. Consider incremental static regeneration (requires Node.js server)
3. Use build caching in CI/CD pipelines

## Performance Considerations

### Build Time vs Runtime Performance

| Approach | Build Time | Runtime Performance | Resource Usage |
|----------|-----------|---------------------|----------------|
| Static Export | 10-15 min | Excellent (static files) | Minimal (Nginx) |
| SSR/ISR | 2-3 min | Good (server rendering) | High (Node.js) |

**Recommendation**: Static export is optimal for BC Building Code because:
- Content updates infrequently (quarterly/yearly)
- Runtime performance is critical for public service
- Resource efficiency matters for cost optimization

### Optimization Tips

1. **Parallel builds**: Use Next.js parallel build workers
2. **Build caching**: Cache `node_modules` and `.next` in CI/CD
3. **Incremental builds**: Only rebuild changed pages (requires custom tooling)

## Future Enhancements

### Potential Improvements

1. **Selective path generation**: Generate only changed paths for faster rebuilds
2. **Path validation**: Verify all generated paths have corresponding content files
3. **Build analytics**: Track build time per path for optimization
4. **Dynamic import optimization**: Lazy load path generation utility

### Migration to ISR

If content updates become more frequent, consider migrating to Incremental Static Regeneration:

1. Remove `output: 'export'` from `next.config.js`
2. Remove `generateStaticParams()` (or make it return subset of paths)
3. Add `revalidate` to page component
4. Deploy to Node.js server instead of static hosting

See `docs/DEPLOYMENT-OPTIONS.md` for detailed comparison.

## Related Documentation

- [Deployment Options](./DEPLOYMENT-OPTIONS.md) - Static export vs Node.js server comparison
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)

