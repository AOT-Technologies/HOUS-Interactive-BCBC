# Search Component Architecture

## Date: January 28, 2026 (Updated)

---

## Overview

The application has **two search interfaces** with similar functionality:

1. **Header Search** - Compact, toggleable search in header
2. **Homepage Search** - Large, prominent search on homepage

Both share core functionality but have different UI presentations.

---

## Shared Functionality

### Common Features:
- ✅ Text input for search queries
- ✅ Autocomplete with keyword suggestions
- ✅ Navigate to search results page on submit
- ✅ Keyboard navigation (Enter, Escape, Arrow keys)
- ✅ Loading states
- ✅ Empty states
- ✅ ARIA accessibility

### Different Features:

| Feature | Header Search | Homepage Hero Search |
|---------|--------------|---------------------|
| **Size** | Compact (~400px) | Large (~540px) |
| **Toggle** | Opens/closes | Always visible |
| **Cancel Button** | Yes | No |
| **Visual Style** | Minimal, inline | Prominent, hero section |
| **Background** | White header | Dark blue hero section |
| **Context** | Navigation | Landing/Discovery |
| **Title/Subtitle** | No | Yes (H1 + description) |
| **Search Button** | Icon + "Search" text (closed) | "Search" button with text |
| **Layout** | Horizontal inline | Centered, full-width |

---

## Architecture: Shared Hook + Inline Dropdowns

### Strategy: Reusable Logic + Component-Specific UI

```
Core Logic (Hook)
      ↓
  useSearch
      ↓
   ┌──────┴──────┐
   ↓             ↓
HeaderSearch  HeroSearch
(inline UI)   (inline UI)
```

### Why This Approach?

**Previous Approach (Removed):**
- Had a separate `SearchCombobox` base component
- Module resolution issues in Next.js 16 + Turborepo
- Component changes not picked up by dev server

**Current Approach (Implemented):**
- Dropdown UI inlined directly in HeaderSearch and HeroSearch
- Shared logic via `useSearch` hook
- Better compatibility with Next.js 16 + React 19
- Simpler debugging and maintenance

---

## Implementation Details

### 1. `useSearch` Hook (Shared Logic) ⭐

**Location:** `packages/data/src/hooks/useSearch.ts`

**Purpose:** Manages all search state and behavior

```typescript
interface UseSearchOptions {
  onSearch: (query: string) => void;
  getSuggestions?: (query: string) => Promise<string[]> | string[];
  debounceMs?: number;
  minQueryLength?: number;
  maxSuggestions?: number;
}

export function useSearch(options: UseSearchOptions): UseSearchReturn {
  // State management
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounced suggestion fetching
  // Submit handler
  // Clear handler
  // Suggestion selection handler
  
  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    error,
    handleSubmit,
    handleClear,
    handleSelectSuggestion,
  };
}
```

**Features:**
- Debounced suggestion fetching (300ms default)
- Loading and error states
- Minimum query length (2 chars)
- Maximum suggestions limit (10 default)
- Submit, clear, and selection handlers

---

### 2. `HeaderSearch` Component (Header Variant)

**Location:** `packages/ui/src/header-search/HeaderSearch.tsx`

**Purpose:** Compact, toggleable search for header

**Implementation:**
```typescript
export default function HeaderSearch({
  onSearch,
  getSuggestions,
  placeholder = "Search...",
  defaultOpen = false,
  className = "",
}: HeaderSearchProps) {
  // ALL HOOKS AT TOP (before any returns)
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const search = useSearch({ onSearch, getSuggestions });
  
  // Effects for auto-open, keyboard handling
  
  // Inline dropdown UI
  return (
    <div className="ui-HeaderSearch--SearchWrapper">
      <Icon type="search" />
      <input
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {shouldShowDropdown && (
        <ul className="ui-HeaderSearch--Dropdown">
          {search.suggestions.map((suggestion, index) => (
            <li onClick={() => handleSuggestionClick(suggestion)}>
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Features:**
- Closed state: Search button with icon and "Search" text
- Open state: Full search input with inline dropdown
- Cancel button to clear and close
- Auto-focus input when opened
- Escape key to close
- Smooth expand/collapse animation
- Responsive sizing (300-400px on desktop)

---

### 3. `HeroSearch` Component (Homepage Variant)

**Location:** `packages/ui/src/hero-search/HeroSearch.tsx`

**Purpose:** Large, prominent search for homepage hero section

**Implementation:**
```typescript
export default function HeroSearch({
  onSearch,
  getSuggestions,
  placeholder = "Search...",
  title,
  subtitle,
  className = "",
}: HeroSearchProps) {
  // ALL HOOKS AT TOP
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const search = useSearch({ onSearch, getSuggestions });
  
  // Inline dropdown UI
  return (
    <section className="ui-HeroSearch">
      {title && <h1>{title}</h1>}
      {subtitle && <p>{subtitle}</p>}
      
      <div className="ui-HeroSearch--InputWrapper">
        <Icon type="search" />
        <input
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {shouldShowDropdown && (
          <ul className="ui-HeroSearch--Dropdown">
            {search.suggestions.map((suggestion, index) => (
              <li onClick={() => handleSuggestionClick(suggestion)}>
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <Button onPress={search.handleSubmit}>Search</Button>
    </section>
  );
}
```

**Features:**
- Always visible (no toggle)
- Large size (~540px input)
- Optional title (H1) and subtitle
- Dark blue hero section background
- "Search" button with text
- Centered layout
- White text for contrast
- Fully responsive (stacks vertically on mobile)

---

## File Structure

```
packages/ui/src/
├── header-search/                  🎯 HEADER VARIANT
│   ├── HeaderSearch.tsx           (inline dropdown)
│   ├── HeaderSearch.css
│   └── HeaderSearch.test.tsx
│
├── hero-search/                    🎯 HOMEPAGE VARIANT
│   ├── HeroSearch.tsx             (inline dropdown)
│   ├── HeroSearch.css
│   └── HeroSearch.test.tsx
│
└── icon/
    └── Icon.tsx                    (search icon)

packages/data/src/hooks/
└── useSearch.ts                    ⭐ SHARED LOGIC

apps/web/lib/
└── search-client.ts                (FlexSearch integration)
```

---

## Key Design Decisions

### 1. Inline Dropdowns (Not Separate Component)

**Why:**
- Better compatibility with Next.js 16 + Turborepo
- Avoids module resolution issues
- Simpler debugging (all code in one file)
- Easier to customize per variant

**Trade-off:**
- Some code duplication between HeaderSearch and HeroSearch
- Acceptable because dropdown logic is simple and stable

### 2. All Hooks at Top

**Why:**
- React requires hooks to be called in the same order every render
- Cannot call hooks conditionally or after early returns
- All `useState`, `useEffect`, `useRef` must be at component top

**Pattern:**
```typescript
export default function Component() {
  // ✅ ALL HOOKS HERE (before any returns)
  const [state1, setState1] = useState();
  const [state2, setState2] = useState();
  const search = useSearch();
  useEffect(() => {}, []);
  
  // ✅ Then conditional returns
  if (!mounted) return <Placeholder />;
  if (!open) return <ClosedState />;
  
  // ✅ Then main render
  return <OpenState />;
}
```

### 3. Shared Logic via Hook

**Benefits:**
- DRY: Search logic written once in `useSearch` hook
- Consistency: Same search behavior everywhere
- Maintainability: Fix bugs in one place
- Testability: Test hook independently

---

## Accessibility Features

### ARIA Attributes:
- `aria-label` on input
- `aria-expanded` for dropdown state
- `aria-haspopup="listbox"` for autocomplete
- `role="listbox"` on dropdown
- `role="option"` on suggestions
- `aria-selected` for highlighted item

### Keyboard Navigation:
- `Enter` - Submit search or select highlighted suggestion
- `Escape` - Close dropdown
- `ArrowDown` - Highlight next suggestion
- `ArrowUp` - Highlight previous suggestion
- `Tab` - Standard focus navigation

### Screen Reader Support:
- Proper labeling of all interactive elements
- Live region updates for loading states
- Clear focus indicators

---

## Testing Strategy

### Hook Tests (`useSearch.test.ts`)
- ✓ Query state management
- ✓ Debounced suggestion fetching
- ✓ Loading states
- ✓ Error handling
- ✓ Submit behavior
- ✓ Clear behavior
- ✓ Suggestion selection

### Component Tests
- ✓ Renders input
- ✓ Accepts text input
- ✓ Shows suggestions
- ✓ Keyboard navigation
- ✓ Suggestion selection
- ✓ Loading states
- ✓ Accessibility

---

## Usage Examples

### In Layout (Header)

```typescript
import HeaderSearch from '@repo/ui/header-search';
import { getSearchClient } from '@/lib/search-client';

export default function RootLayout({ children }) {
  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };
  
  const handleGetSuggestions = async (query: string) => {
    const client = getSearchClient();
    await client.initialize();
    return client.getSuggestions(query, 5);
  };
  
  return (
    <Header
      title="BC Building Code"
      logoSrc="/bc-logo.png"
    >
      <HeaderSearch
        onSearch={handleSearch}
        getSuggestions={handleGetSuggestions}
        placeholder="Search building code..."
      />
    </Header>
  );
}
```

### On Homepage (Hero)

```typescript
import HeroSearch from '@repo/ui/hero-search';

export default function HomePage() {
  return (
    <HeroSearch
      title="BC Building Code"
      subtitle="Search and navigate the official 2024 British Columbia Building Code"
      placeholder='Search for keywords (e.g. "Egress", "Radon") or Section...'
      onSearch={handleSearch}
      getSuggestions={handleGetSuggestions}
    />
  );
}
```

---

## Benefits of This Architecture

| Principle | Benefit |
|-----------|---------|
| DRY | Search logic written once in `useSearch` hook |
| Consistency | Same search behavior, keyboard shortcuts, accessibility features everywhere |
| Maintainability | Fix bugs and add features in one place (hook) |
| Testability | Test hook independently with minimal mocking |
| Simplicity | Inline dropdowns avoid module resolution complexity |
| Performance | Debouncing prevents excessive API calls |
| Accessibility | WCAG AAA compliant with full keyboard and screen reader support |

---

## Future Enhancements

### Potential Improvements:
1. **Search History** - Store recent searches in localStorage
2. **Popular Searches** - Show trending searches when input is empty
3. **Search Filters** - Quick filters in dropdown (Division, Part, etc.)
4. **Keyboard Shortcuts** - Global shortcut to open search (e.g., Cmd+K)
5. **Voice Search** - Web Speech API integration
6. **Search Analytics** - Track popular queries for UX improvements

### Migration Notes:
- If module resolution issues are fixed in future Next.js versions, could extract dropdown to shared component
- Current inline approach is stable and maintainable
- No breaking changes needed for future enhancements
