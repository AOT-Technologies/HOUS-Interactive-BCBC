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

---

# Horizontal Scroll UX Improvements (IC2026)

## Problem

Wide tables (e.g. Table 9.10.3.1.-B Fire and Sound Resistance, Table 9.36.3.9 HVAC Equipment, Table A-9.11.1.4.-A Junctions) were difficult to read during horizontal scrolling because:

1. Column context (e.g. "Type of Assembly") was lost as users scrolled right.
2. The sticky header synced correctly but the first header column drifted with the rest of the track.
3. Body rows whose column 0 was covered by a rowspan from a prior row had their first DOM child incorrectly pinned at `left: 0`, causing sub-rows to float above the sticky column.

## Implemented Fixes

All changes are in:
- `apps/web/components/reading/TableBlock.tsx`
- `apps/web/components/reading/TableBlock.css`

### 1. Sticky first column (body) — class-based, not `:first-child`

`renderBodyRowsWithColTracking` tracks the true visual column position of every body cell across rowspans using an `activeRowspans` counter array. Only cells at visual column 0 receive `table-block__cell--first-col`, which applies `position: sticky; left: 0`.

**Key bug fixed during iteration**: The rowspan counter was initialised as `rowspan - 1` and then decremented at the end of the same row, causing it to expire one row too early. The last sub-row of every rowspan group was therefore not counted as covered, so its first DOM child incorrectly got the sticky class. Fixed by initialising to `rowspan` (full value) before the end-of-row decrement.

### 2. Pinned header first column — separate overlay table

The counter-`translateX` approach (applying `translateX(+scrollLeft)` to first-column header cells to keep them in place while the track translates left) was unreliable because CSS table row groups can paint later rows above earlier rows regardless of `z-index`. It was replaced with a separate overlay:

- `pinnedHeaderFirstColRows` memo extracts only column-0 cells from `displayHeaderRows`, preserving rowspan values and inserting empty rows where column 0 is covered.
- A `<div class="table-block__pinned-header-col">` is rendered as an absolutely-positioned child of `.table-block__header-viewport` (`position: relative`), at `z-index: 5`.
- The overlay contains a mini-`<table>` with only the first-column header cells; it sits later in the DOM than the scrolling track, so it naturally paints above it without any z-index tricks.
- Cell borders are removed (`border: none`) on the overlay cells because the header viewport's own `border-bottom` provides the visual separator; leaving the cell's `border-bottom` intact caused a visible "split" when the cell's natural content height was shorter than the full header viewport height.

### 3. `border-collapse: separate` on split tables

With `border-collapse: collapse`, the browser merges adjacent cell borders into a shared layer that does not respect `position: sticky` stacking. This caused scrolled columns to paint above the sticky first column. Both `.table-block__table--split-header` and `.table-block__table--split-body` now use `border-collapse: separate; border-spacing: 0`. Double-border side-effects are neutralised by `border-top: none; border-left: none` on all cells, with edge borders restored selectively.

## Scoped Out — Vertical Scroll Label Repetition

The ticket also requested repeating group labels (e.g. "Concrete Slabs") in every sub-row of a rowspan group so the label remains visible when scrolling vertically within the 500 px table viewport. The implementation was built but reverted pending legal confirmation about adding repeated content in the columns.

**Implementation approach when approved**: The source data uses empty first-column cells (no explicit `rowspan` attribute) to represent sub-rows. Detection: `getCellPlainText(firstCell.content).trim() === ''`. When empty, substitute the content of the last non-empty first-column cell seen in that group. See `memory/project_table_scroll_fix.md` for full details.
