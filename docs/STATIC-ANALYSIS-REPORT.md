# Repository Static Analysis Report

**Project:** BC Building Code Interactive Web Application
**Branch:** `IC2026-127-Issues-Originating-4`
**Date:** 2026-03-15
**Analyzer:** Claude Opus 4.6 (Manual Review)

> **Note:** This is a point-in-time snapshot from 2026-03-15. Some issues listed below have since been resolved. See the **Resolution Status** column or notes per item.

### Known Resolutions (as of 2026-03-21)

| Issue | Status |
|-------|--------|
| Dead stores `apps/web/stores/content-store.ts` and `apps/web/stores/ui-store.ts` | ✅ **Resolved** — files removed from `stores/`; canonical versions live in `apps/web/lib/stores/` |

---

## Table of Contents

1. [Security Vulnerabilities](#1-security-vulnerabilities)
2. [Dead / Unused Code](#2-dead--unused-code)
3. [Technical Debt](#3-technical-debt)
4. [Reusable Code Candidates](#4-reusable-code-candidates)
5. [Logic Bugs / Wrong Implementations](#5-logic-bugs--wrong-implementations)
6. [Performance Optimizations](#6-performance-optimizations)
7. [Better / Correct Approaches](#7-better--correct-approaches)
8. [Compatibility & Future Concerns](#8-compatibility--future-concerns)
9. [Summary](#9-summary)

---

## 1. Security Vulnerabilities

### [HIGH] XSS via `dangerouslySetInnerHTML` in SearchResultCard

- **Location:** `apps/web/components/search/SearchResultCard.tsx` — Lines 55–58, 158
- **Issue:** `normalizeHighlightedSnippet()` only strips `<mark>` tags, then the result is injected via `dangerouslySetInnerHTML`. Any other HTML or script tags in the search index data pass through unsanitized.

  ```tsx
  // Current implementation — only strips <mark> tags
  function normalizeHighlightedSnippet(input: string): string {
    return input.replace(/<mark[^>]*>/gi, '').replace(/<\/mark>/gi, '');
  }

  // Then rendered as raw HTML
  <p dangerouslySetInnerHTML={{ __html: previewHtml }} />
  ```

- **Impact:** If source JSON ever contains malicious HTML (via supply chain compromise or data corruption), it renders directly into the DOM. Defense-in-depth is missing.
- **Recommendation:** Escape all HTML first, then re-insert only safe `<mark>` tags, or use a sanitization library like DOMPurify.

  ```ts
  const escaped = escapeHtml(input);
  return escaped
    .replace(/&lt;mark&gt;/gi, '<mark>')
    .replace(/&lt;\/mark&gt;/gi, '</mark>');
  ```

---

## 2. Dead / Unused Code

### [HIGH] Unused Store Files — `stores/content-store.ts` and `stores/ui-store.ts`

- **Location:** `apps/web/stores/content-store.ts` (197 lines), `apps/web/stores/ui-store.ts` (62 lines)
- **Issue:** These are exported from `stores/index.ts` (lines 18, 48) but **never imported by any component**. All actual imports use `@/lib/stores/ui-store` and `@/lib/stores/content-store` instead.
- **Impact:** 259 lines of dead code with duplicate type definitions that can diverge from the active stores, causing confusion for developers and AI agents alike.
- **Recommendation:** Delete both files and remove their re-exports from `stores/index.ts`.

### [MEDIUM] 11 Unused Icon Components

- **Location:** `packages/ui/src/icon/icons/`
- **Issue:** The following icons are registered in the `Icon.tsx` component's `ICONS` mapping but are never referenced anywhere in the codebase:

  | Icon File             | Registered Name      |
  |-----------------------|----------------------|
  | `AccountTree.tsx`     | `accountTree`        |
  | `ArrowBack.tsx`       | `arrowBack`          |
  | `ArrowForward.tsx`    | `arrowForward`       |
  | `ArrowOutwardIcon.tsx`| `arrowOutward`       |
  | `Check.tsx`           | `check`              |
  | `CheckCircle.tsx`     | `checkCircle`        |
  | `ExpandMore.tsx`      | `expandMore`         |
  | `InfoIcon.tsx`        | `info`               |
  | `PaperPlaneTilt.tsx`  | `paperPlaneTilt`     |
  | `RestartAlt.tsx`      | `restartAlt`         |
  | `WarningIcon.tsx`     | `warning`            |

- **Impact:** Increases bundle size and clutters the Icon component's type union and mapping object.
- **Recommendation:** Remove unused icon imports and their files, or tree-shake them via dynamic imports.

### [MEDIUM] Large Commented-Out Code Blocks in Parser

- **Location:** `packages/bcbc-parser/src/parser.ts` — Lines 971–1205
- **Issue:** ~150 lines of commented-out functions:
  - `parseAmendmentDates()` (~6 lines)
  - `extractAmendmentDatesFromRevisions()` (~85 lines)
  - `extractNoteReferences()` and `extractNoteReferencesFromArticle()` (~61 lines)
- **Impact:** Clutters the largest file in the codebase (37KB), making it harder to navigate and maintain.
- **Recommendation:** Remove commented code (it is preserved in git history). Create tracked issues for the TODOs if the functionality is still planned.

---

## 3. Technical Debt

### [HIGH] Pervasive `any` Type Usage (~100+ instances)

- **Location:** Key offenders across the codebase:

  | File | Lines | Description |
  |------|-------|-------------|
  | `packages/bcbc-parser/src/parser.ts` | 62–109 | Raw interfaces with `any[]` properties |
  | `packages/bcbc-parser/src/types.ts` | 62–166 | `any[]`, `[key: string]: any` |
  | `apps/web/lib/content-adapter.ts` | 32–85 | Adapter types with `any[]` |
  | `apps/web/lib/content-validator.ts` | 24 | `content: any` parameter |
  | `scripts/generate-assets.ts` | 238–518 | `rawData: any` in 6+ functions |
  | `apps/web/components/reading/ContentRenderer.tsx` | 56–123 | `any` casts |
  | `apps/web/components/search/SearchResultsPage.tsx` | 87, 262 | `any[]` and `(item: any)` |

- **Issue:** Widespread use of `any` bypasses TypeScript's type safety, making refactoring risky and hiding bugs at compile time.
- **Impact:** Reduces confidence in refactoring, disables IDE tooling and autocompletion, and allows type errors to reach runtime.
- **Recommendation:** Incrementally replace with proper types. Start with the shared `types.ts` files (highest leverage), then propagate to consumers. Use `unknown` with type guards where the shape is genuinely dynamic.

### [HIGH] ReadingView.tsx — 1751-Line Monolith

- **Location:** `apps/web/components/reading/ReadingView.tsx`
- **Issue:** Single component handles multiple concerns simultaneously:
  - State management (URL params, effective dates, version)
  - Data fetching (content chunks, navigation, glossary)
  - Content rendering (sections, articles, clauses, appendices)
  - Modal handling (cross-references, glossary sidebar)
  - Scroll management and live region announcements
- **Impact:** Extremely difficult to test, optimize, or modify in isolation. Any change risks regressions across multiple concerns.
- **Recommendation:** Extract into focused sub-components using composition:
  - `ReadingViewDataLoader` — data fetching and state hydration
  - `ReadingViewContent` — content rendering
  - `ReadingViewModals` — modal and sidebar management
  - `ReadingViewHeader` (already exists, but more logic could be delegated)

### [MEDIUM] 7 TODO Comments Indicating Deferred Work

- **Location:**

  | File | Line | TODO |
  |------|------|------|
  | `packages/bcbc-parser/src/parser.ts` | 337 | Use interface for amendment date parsing |
  | `packages/bcbc-parser/src/parser.ts` | 611 | Use notes for note reference implementation |
  | `packages/bcbc-parser/src/parser.ts` | 969 | Use function for amendment date parsing |
  | `packages/bcbc-parser/src/parser.ts` | 1026 | Re-enable revision-based amendment dates |
  | `packages/bcbc-parser/src/parser.ts` | 1143, 1167 | Re-enable note reference extraction |
  | `apps/web/lib/content-adapter.ts` | 97 | Implement `[REF:term:...]` marker parsing |
  | `apps/web/components/home/HomeSidebarContent.tsx` | 140 | Filter content by selected date |

- **Impact:** Incomplete features that accumulate over time and create false expectations about what the code does.
- **Recommendation:** Convert to tracked issues in the project backlog. Remove TODO comments from code once issues are created.

### [MEDIUM] 17 `console.log` Statements in Production Code

- **Location:**

  | File | Line(s) | Count |
  |------|---------|-------|
  | `apps/web/lib/search-client.ts` | 84, 95, 167, 168, 566, 579 | 6 |
  | `apps/web/lib/generate-static-paths.ts` | 145, 149, 163, 171 | 4 |
  | `apps/web/stores/version-store.ts` | 125, 154 | 2 |
  | `apps/web/lib/stores/front-matter-store.ts` | 108 | 1 |
  | `apps/web/lib/stores/section-store.ts` | 95 | 1 |
  | `apps/web/components/home/HomeSidebarContent.tsx` | 141 | 1 |
  | `apps/web/app/code/[...slug]/page.tsx` | 86 | 1 |
  | **Total** | | **17** |

- **Impact:** Leaks internal application state to the browser console in production. Clutters user devtools and may expose internal paths or data structures.
- **Recommendation:** Remove debug logs or replace with a conditional logger utility that is silent in production builds:
  ```ts
  const log = process.env.NODE_ENV === 'development' ? console.log : () => {};
  ```

---

## 4. Reusable Code Candidates

### [HIGH] Triplicated Tooltip Logic (~300 lines duplicated)

- **Location:** Identical tooltip positioning, state management, and event listeners in three components:
  - `apps/web/components/reading/GlossaryTerm.tsx` — Lines 29–138
  - `apps/web/components/reading/ObjectiveLink.tsx` — Lines 141–202
  - `apps/web/components/reading/FunctionalStatementLink.tsx` — Lines 28–89

- **Issue:** All three components contain identical implementations of:

  1. **State variables** (lines ~29–31 in each):
     ```tsx
     const [showTooltip, setShowTooltip] = useState(false);
     const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
     const [tooltipPlacement, setTooltipPlacement] = useState<'top' | 'bottom'>('top');
     ```

  2. **Position calculation** (`updateTooltipPosition` callback with identical constants: `spacing=8`, `viewportPadding=8`)

  3. **Event listener setup** (identical `useLayoutEffect` + `useEffect` combo):
     ```tsx
     useLayoutEffect(() => {
       if (!showTooltip) return;
       updateTooltipPosition();
     }, [showTooltip, updateTooltipPosition]);

     useEffect(() => {
       if (!showTooltip) return;
       window.addEventListener('resize', updateTooltipPosition);
       window.addEventListener('scroll', updateTooltipPosition, true);
       return () => { /* cleanup */ };
     }, [showTooltip, updateTooltipPosition]);
     ```

  4. **Portal rendering** via `createPortal`

- **Recommendation:** Extract to a `useTooltip()` custom hook:
  ```ts
  // hooks/useTooltip.ts
  export function useTooltip() {
    // All shared state, position calculation, and event listeners
    return { showTooltip, tooltipPosition, tooltipPlacement, triggerRef, show, hide };
  }
  ```

### [MEDIUM] Duplicated Body Scroll Lock Logic

- **Location:**
  - `apps/web/components/search/SearchResultsPage.tsx` — Lines 511–527
  - `apps/web/components/reading/GlossarySidebar.tsx` — Lines 111–127

- **Issue:** Identical `useEffect` that saves/restores `document.body.style.overflow` and compensates for scrollbar width:
  ```tsx
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);
  ```

- **Recommendation:** Extract to a `useBodyScrollLock(isOpen: boolean)` hook.

### [MEDIUM] Duplicated URL Parameter Extraction

- **Location:**
  - `apps/web/components/reading/ReadingView.tsx` — Lines 151–159
  - `apps/web/components/reading/CrossReferenceLink.tsx` — Lines 46–48
  - `apps/web/components/search/SearchResultsPage.tsx` — Lines 187–192

- **Issue:** Each component independently reads `version` and `date` from URL search params with similar fallback logic:
  ```tsx
  const version = searchParams.get('version') || '2024';
  const effectiveDate = searchParams.get('date') || undefined;
  ```

- **Recommendation:** Extract to a `useCodeParams()` hook:
  ```ts
  export function useCodeParams() {
    const searchParams = useSearchParams();
    const version = searchParams.get('version') || '2024';
    const effectiveDate = searchParams.get('date') || undefined;
    return { version, effectiveDate };
  }
  ```

---

## 5. Logic Bugs / Wrong Implementations

### [MEDIUM] `normalizeHighlightedSnippet` Strips Marks Then Injects as HTML

- **Location:** `apps/web/components/search/SearchResultCard.tsx` — Lines 55–58, 68–72
- **Issue:** The function strips `<mark>` tags (which represent search highlights), but then the result is still rendered via `dangerouslySetInnerHTML`:

  ```tsx
  // Step 1: Strip all <mark> tags (removing highlights)
  function normalizeHighlightedSnippet(input: string): string {
    return input.replace(/<mark[^>]*>/gi, '').replace(/<\/mark>/gi, '');
  }

  // Step 2: Render as HTML anyway (why?)
  const previewHtml = useMemo(() => {
    const preview = textHighlight || document.snippet || '';
    return normalizeHighlightedSnippet(preview);
  }, [...]);

  <p dangerouslySetInnerHTML={{ __html: previewHtml }} />
  ```

- **Impact:** Search result snippets **never show highlighted matches** to the user, defeating the purpose of the highlight system. Additionally, any non-mark HTML in the content still renders raw.
- **Recommendation:** If highlights should display, keep `<mark>` tags and sanitize everything else. If highlights shouldn't display, use `textContent` instead of `innerHTML`.

### [LOW] Exhaustive Deps Suppression in PrevNextNav

- **Location:** `apps/web/components/navigation/PrevNextNav.tsx` — Line 202
- **Issue:** `// eslint-disable-line react-hooks/exhaustive-deps` suppresses a missing dependency warning.
- **Impact:** Could cause stale closure bugs if the suppressed dependencies change during the component's lifecycle.
- **Recommendation:** Audit the effect and add missing dependencies, or restructure to avoid the lint violation.

---

## 6. Performance Optimizations

### [MEDIUM] Missing `React.memo` on Frequently Rendered Content Components

- **Location:**
  - `apps/web/components/reading/GlossaryTerm.tsx`
  - `apps/web/components/reading/ObjectiveLink.tsx`
  - `apps/web/components/reading/FunctionalStatementLink.tsx`

- **Issue:** These inline content components render inside deeply nested clause/sentence blocks. When parent state changes (e.g., effective date selection, modal open/close), all instances re-render despite unchanged props.
- **Impact:** On content-heavy pages with many glossary terms or links, this causes unnecessary DOM recalculations.
- **Recommendation:** Wrap exports with `React.memo()`:
  ```tsx
  export default React.memo(GlossaryTerm);
  ```

### [MEDIUM] 13 `useState` Calls in SearchResultsPage

- **Location:** `apps/web/components/search/SearchResultsPage.tsx` — Lines 194–216
- **Issue:** 13 separate state variables make component logic fragmented:
  ```
  queryInput, dateOptions, divisions, contentTypes, results,
  isSearching, isDateFiltering, datesLoading, error,
  visibleCount, mobileFiltersOpen, mobileOverlayTop, liveAnnouncement
  ```
- **Impact:** Multiple re-renders per user action; complex interdependencies between states are hard to track and debug.
- **Recommendation:** Consolidate related states into `useReducer` with a single state object, or move filter state into the existing Zustand search store:
  ```tsx
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  ```

### [LOW] `isMounted` Anti-Pattern Instead of AbortController

- **Location:**
  - `apps/web/components/home/QuickAccessPins.tsx` — Lines 48–63
  - `apps/web/components/download/DownloadPage.tsx` — Lines 78–101

- **Issue:** Using `isMounted` boolean flag for fetch cleanup instead of `AbortController`:
  ```tsx
  // Current (deprecated pattern)
  useEffect(() => {
    let isMounted = true;
    fetch(url).then(data => { if (isMounted) setState(data); });
    return () => { isMounted = false; };
  }, []);
  ```
- **Impact:** Fetches complete even after unmount; only the state update is suppressed. Wastes bandwidth and can cause subtle timing issues.
- **Recommendation:** Use `AbortController` to actually cancel in-flight requests:
  ```tsx
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(data => setState(data))
      .catch(err => {
        if (err.name !== 'AbortError') handleError(err);
      });
    return () => controller.abort();
  }, [url]);
  ```

---

## 7. Better / Correct Approaches

### [MEDIUM] Silent Error Swallowing in ReadingView

- **Location:** `apps/web/components/reading/ReadingView.tsx` — Lines 359, 373, 387, 406, 423
- **Issue:** Multiple `catch { return null; }` blocks silently discard errors during content loading:
  ```tsx
  try {
    // fetch content chunk
  } catch {
    return null; // Error completely swallowed
  }
  ```
- **Impact:** Content can fail to load with no user feedback and no debugging information. Users see blank sections with no indication that something went wrong.
- **Recommendation:** At minimum, log errors. Ideally, set an error state that displays an appropriate message:
  ```tsx
  catch (error) {
    console.error('Failed to load content:', error);
    setLoadError({ section: sectionId, message: 'Content failed to load' });
    return null;
  }
  ```

### [LOW] Synchronous Breadcrumb Tree Walk

- **Location:** `apps/web/components/navigation/Breadcrumbs.tsx` — Lines 85–124
- **Issue:** O(n) recursive walk through the entire navigation tree on every render to find ancestors:
  ```tsx
  const findAncestors = (nodes: NavigationNode[]): boolean => {
    for (const node of nodes) {
      // recursive search...
    }
    return false;
  };
  ```
- **Impact:** Negligible now with the current tree size, but will degrade if the navigation tree grows significantly with multiple versions loaded simultaneously.
- **Recommendation:** Maintain a `Map<path, node>` index in the navigation store for O(1) ancestor lookups.

---

## 8. Compatibility & Future Concerns

### [MEDIUM] Dual Store Architecture Creates Naming Conflicts

- **Location:** `apps/web/stores/` vs `apps/web/lib/stores/`
- **Issue:** Two separate store directories export stores with **identical names**:

  | Store Name | `stores/` (UNUSED) | `lib/stores/` (ACTIVE) |
  |------------|-------------------|----------------------|
  | `useContentStore` | `stores/content-store.ts` | `lib/stores/content-store.ts` |
  | `useUIStore` | `stores/ui-store.ts` | `lib/stores/ui-store.ts` |

  The `stores/` versions are re-exported from `stores/index.ts` but never imported by any component.

- **Impact:** New developers (or AI coding agents) may import from the wrong location, silently using a store that doesn't share state with the rest of the application. This creates hard-to-debug state isolation bugs.
- **Recommendation:** Delete the unused `stores/content-store.ts` and `stores/ui-store.ts`. Remove their re-exports from `stores/index.ts`. Consolidate all stores into a single directory.

### [LOW] Mixed Import Styles for Stores

- **Location:** Various components across the application
- **Issue:** Some components import from direct file paths, others from barrel exports:
  ```tsx
  // Style A: Direct import
  import { useVersionStore } from '@/stores/version-store';

  // Style B: Barrel import
  import { useVersionStore } from '@/stores';
  ```
  Neither pattern is consistently enforced.
- **Impact:** Makes automated refactoring and import analysis unreliable. Inconsistency creates confusion about the "right" way to import.
- **Recommendation:** Standardize on one import pattern (barrel exports recommended for cleaner imports) and enforce via an ESLint rule such as `no-restricted-imports`.

---

## 9. Summary

### Findings by Severity

| Section | Critical | High | Medium | Low | Total |
|---------|----------|------|--------|-----|-------|
| Security Vulnerabilities | — | 1 | — | — | **1** |
| Dead / Unused Code | — | 1 | 2 | — | **3** |
| Technical Debt | — | 2 | 2 | — | **4** |
| Reusable Code Candidates | — | 1 | 2 | — | **3** |
| Logic Bugs | — | — | 1 | 1 | **2** |
| Performance Optimizations | — | — | 2 | 1 | **3** |
| Better / Correct Approaches | — | — | 1 | 1 | **2** |
| Compatibility & Future Concerns | — | — | 1 | 1 | **2** |
| **Total** | **0** | **5** | **11** | **4** | **20** |

### Top 5 Highest-Impact Fixes

1. **Sanitize HTML in `SearchResultCard`** — Addresses both a security vulnerability and a logic bug (highlights never display).
2. **Extract shared tooltip hook** — Eliminates ~300 lines of tripled code across three components.
3. **Delete unused store files** — Removes 259 lines of dead code and eliminates a confusing naming conflict.
4. **Replace `any` types in shared packages** — Highest leverage improvement for type safety across the entire application.
5. **Break up `ReadingView.tsx`** — Makes the most complex component in the app testable and maintainable.

### Notes

- All findings are based on actual code inspection. No speculative or hypothetical issues are included.
- No hardcoded secrets, API keys, or credentials were found in the codebase.
- The project demonstrates strong practices in accessibility (WCAG AAA target), test coverage, and monorepo organization.
- Severity ratings reflect both the likelihood and impact of each issue.

---

*Report generated by static analysis on 2026-03-15.*
