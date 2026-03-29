# Long Table Performance Issue (Resolved)

## Summary

Large tables (notably on `Part 9 / Section 9.38`) caused browser stalls after initial load.  
Initial rendering improved, but the UI still froze a few seconds later due to deferred heavy work.

Example page:

- `http://localhost:3000/code/nbc.divBV2/9/38/?version=2024&date=2025-06-16`

## Root Cause

The freeze was caused by expensive table row rendering work accumulating on the client:

1. **Background row chunk mounting**
   - Body rows were progressively mounted automatically in the background.
   - This still eventually rendered most/all rows and triggered heavy parsing work.

2. **Scroll-driven React rerenders in split-table mode**
   - Horizontal scroll updated React state on every scroll event.
   - This created unnecessary reconciliation pressure for very large tables.

3. **Always-mounted print-unified table in split mode**
   - A hidden print-only full table was present in normal screen mode.
   - This duplicated large DOM and memory usage.

4. **Heavy cell content rendering**
   - Cell rendering includes marker parsing (`parseTextWithMarkers`) and interactive content wrapping.
   - With thousands of cells, this is expensive even when each call is correct.

## Implemented Fixes

All changes were made in:

- `apps/web/components/reading/TableBlock.tsx`
- `apps/web/components/reading/TableBlock.css` (related sticky header visual fix from same issue cycle)

### 1) Scroll-triggered row chunk loading (instead of background auto-fill)

- Added progressive rendering controls:
  - `LARGE_TABLE_ROW_THRESHOLD = 250`
  - `INITIAL_BODY_ROW_RENDER_COUNT = 120`
  - `BODY_ROW_RENDER_CHUNK_SIZE = 120`
  - `ROW_LOAD_SCROLL_THRESHOLD_PX = 240`
- For large tables, only initial rows are rendered.
- Additional rows load only when user scrolls near bottom.

### 2) Removed per-scroll React state updates for header sync

- Replaced `setHeaderOffset(...)` state updates with direct `ref` style updates:
  - `headerTrackRef.current.style.transform = ...`
- Keeps split header aligned horizontally without full component rerenders on every scroll tick.

### 3) Mount print-unified table only in print mode

- Added print mode state (`isPrintMode`) using:
  - `beforeprint` / `afterprint`
  - `matchMedia('print')`
- Screen mode no longer carries hidden duplicate full-table DOM.
- Print behavior remains intact (header repeat support).

### 4) Memoized expensive row markup

- Memoized header/body/full row markup so unrelated state changes do not rebuild all rows.

## Why This Works

- Eliminates delayed background workload that was causing “freeze after a few seconds.”
- Reduces runtime render pressure during scroll interactions.
- Cuts DOM duplication and memory footprint in normal viewing mode.
- Keeps existing table behavior (sticky/split header, print support) while reducing client strain.

## Validation

- Type check:
  - `npx pnpm --filter @bc-building-code/web type-check` ✅
- Existing table test status:
  - 2 pre-existing test expectation mismatches remain in `TableBlock.test.tsx` (unrelated to correctness of runtime fix).

## Notes / Future Enhancements

- If additional optimization is needed for extremely large datasets, consider row virtualization.
- Virtualization must be implemented carefully because some tables use `rowspan`/`colspan`, which complicates viewport slicing.
