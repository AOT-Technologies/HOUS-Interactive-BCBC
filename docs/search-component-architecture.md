# Search Component Architecture

## Date: January 27, 2026

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
| **Search Button** | Icon only (closed) | "Search" button with text |
| **Layout** | Horizontal inline | Centered, full-width |

---

## Recommended Architecture: Composition Pattern

### Strategy: Build Reusable Core + Variants

```
Core Logic (Hook)
    ↓
Base Component (Shared)
    ↓
    ├── HeaderSearch (Variant)
    └── HeroSearch (Variant)
```

---

## Component Structure

### 1. `useSearch` Hook (Core Logic) ⭐
**Location:** `packages/data/src/hooks/useSearch.ts`

**Purpose:** Shared search logic and state management

```typescript
interface UseSearchOptions {
  onSearch: (query: string) => void;
  getSuggestions?: (query: string) => Promise<string[]>;
  debounceMs?: number;
  minQueryLength?: number;
}

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  suggestions: string[];
  isLoading: boolean;
  error: Error | null;
  handleSubmit: () => void;
  handleClear: () => void;
  handleSelectSuggestion: (suggestion: string) => void;
}

export function useSearch(options: UseSearchOptions): UseSearchReturn {
  // Shared logic:
  // - Query state management
  // - Debounced suggestion fetching
  // - Loading states
  // - Error handling
  // - Submit logic
  // - Clear logic
}
```

**Benefits:**
- ✅ Single source of truth for search logic
- ✅ Easy to test
- ✅ Reusable across components
- ✅ Consistent behavior

---

### 2. `SearchCombobox` Component (Base UI) ⭐
**Location:** `packages/ui/src/search-combobox/`

**Purpose:** Reusable search input with autocomplete (no styling opinions)

```typescript
interface SearchComboboxProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  showIcon?: boolean;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
}

export default function SearchCombobox(props: SearchComboboxProps) {
  // Uses React Aria Combobox
  // Handles keyboard navigation
  // Renders input + dropdown
  // No business logic (just UI)
}
```

**Benefits:**
- ✅ Pure UI component
- ✅ Highly reusable
- ✅ Size variants built-in
- ✅ Accessible by default

---

### 3. `HeaderSearch` Component (Variant) 🎯
**Location:** `packages/ui/src/header-search/`

**Purpose:** Compact, toggleable search for header

```typescript
interface HeaderSearchProps {
  onSearch: (query: string) => void;
  getSuggestions?: (query: string) => Promise<string[]>;
  placeholder?: string;
  defaultOpen?: boolean;
}

export default function HeaderSearch(props: HeaderSearchProps) {
  const [isOpen, setIsOpen] = useState(props.defaultOpen || false);
  
  // Use shared hook
  const search = useSearch({
    onSearch: props.onSearch,
    getSuggestions: props.getSuggestions,
  });
  
  // Closed state: Icon button
  if (!isOpen) {
    return (
      <Button
        variant="tertiary"
        isIconButton
        onPress={() => setIsOpen(true)}
      >
        <Icon type="search" />
      </Button>
    );
  }
  
  // Open state: Use base component
  return (
    <div className="ui-HeaderSearch">
      <SearchCombobox
        size="medium"
        query={search.query}
        onQueryChange={search.setQuery}
        onSubmit={search.handleSubmit}
        suggestions={search.suggestions}
        onSelectSuggestion={search.handleSelectSuggestion}
        isLoading={search.isLoading}
        placeholder={props.placeholder}
      />
      <Button 
        variant="tertiary"
        onPress={() => {
          search.handleClear();
          setIsOpen(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
```

**Features:**
- ✅ Toggle open/close
- ✅ Cancel button
- ✅ Compact size
- ✅ Uses shared logic

---

### 4. `HeroSearch` Component (Variant) 🎯
**Location:** `packages/ui/src/hero-search/` or `apps/web/components/home/`

**Purpose:** Large, prominent search for homepage hero section

**Visual Design (from screenshot):**
- Dark blue background (#003366 or similar)
- White text
- Large heading: "BC Building Code"
- Subtitle: "Search and navigate the official 2024 British Columbia Building Code..."
- Large search input (~540px wide)
- "Search" button (not just icon)
- Centered layout

```typescript
interface HeroSearchProps {
  onSearch: (query: string) => void;
  getSuggestions?: (query: string) => Promise<string[]>;
  placeholder?: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function HeroSearch(props: HeroSearchProps) {
  // Use shared hook
  const search = useSearch({
    onSearch: props.onSearch,
    getSuggestions: props.getSuggestions,
  });
  
  return (
    <section className="ui-HeroSearch">
      <div className="ui-HeroSearch--Content">
        {props.title && (
          <h1 className="ui-HeroSearch--Title">{props.title}</h1>
        )}
        {props.subtitle && (
          <p className="ui-HeroSearch--Subtitle">{props.subtitle}</p>
        )}
        
        <div className="ui-HeroSearch--SearchWrapper">
          <SearchCombobox
            size="xlarge"
            query={search.query}
            onQueryChange={search.setQuery}
            onSubmit={search.handleSubmit}
            suggestions={search.suggestions}
            onSelectSuggestion={search.handleSelectSuggestion}
            isLoading={search.isLoading}
            placeholder={props.placeholder}
            className="ui-HeroSearch--Input"
          />
          <Button
            variant="primary"
            onPress={search.handleSubmit}
            className="ui-HeroSearch--Button"
          >
            Search
          </Button>
        </div>
      </div>
    </section>
  );
}
```

**Features:**
- ✅ Always visible
- ✅ Large size (~540px input)
- ✅ Title and subtitle (H1 + description)
- ✅ Dark blue hero section background
- ✅ "Search" button with text (not just icon)
- ✅ Centered layout
- ✅ No cancel button needed
- ✅ Uses shared logic

---

## File Structure

```
packages/data/src/hooks/
└── useSearch.ts                    ⭐ SHARED LOGIC

packages/ui/src/
├── search-combobox/                ⭐ BASE COMPONENT
│   ├── SearchCombobox.tsx
│   ├── SearchCombobox.css
│   └── SearchCombobox.test.tsx
│
├── header-search/                  🎯 VARIANT 1
│   ├── HeaderSearch.tsx
│   ├── HeaderSearch.css
│   └── HeaderSearch.test.tsx
│
└── hero-search/                    🎯 VARIANT 2
    ├── HeroSearch.tsx
    ├── HeroSearch.css
    └── HeroSearch.test.tsx
```

---

## What's Shared vs. What's Different

### Shared (Reusable) ✅

**1. Logic (`useSearch` hook):**
- Query state management
- Debounced suggestion fetching
- Loading states
- Error handling
- Submit handler
- Clear handler
- Suggestion selection

**2. Base UI (`SearchCombobox`):**
- Text input
- Autocomplete dropdown
- Keyboard navigation
- ARIA accessibility
- Loading indicator
- Empty state
- Size variants

**3. Utilities:**
- Search suggestion fetching
- FlexSearch integration
- URL encoding
- Analytics tracking (if needed)

---

### Different (Component-Specific) 🎯

**HeaderSearch:**
- Toggle open/close state
- Cancel button
- Compact layout
- Transitions/animations
- Integration with header layout

**HeroSearch:**
- Always visible
- Large/prominent styling
- Optional title/subtitle
- Hero section layout
- Call-to-action styling

---

## Benefits of This Architecture

### 1. **DRY (Don't Repeat Yourself)**
- Search logic written once
- Autocomplete UI written once
- Tests written once for core functionality

### 2. **Consistency**
- Same search behavior everywhere
- Same keyboard shortcuts
- Same accessibility features
- Same suggestion algorithm

### 3. **Maintainability**
- Fix bugs in one place
- Add features in one place
- Update styling in one place

### 4. **Testability**
- Test hook independently
- Test base component independently
- Test variants with minimal mocking

### 5. **Flexibility**
- Easy to add new search variants
- Easy to customize per use case
- Easy to override behavior

### 6. **Performance**
- Shared code = smaller bundle
- Debouncing prevents excessive requests
- Lazy loading of suggestions

---

## Implementation Order

### Phase 1: Foundation
1. ✅ Create `useSearch` hook
2. ✅ Create `SearchCombobox` base component
3. ✅ Write comprehensive tests

### Phase 2: Header Variant
4. ✅ Create `HeaderSearch` using hook + base
5. ✅ Integrate into Header component
6. ✅ Test header integration

### Phase 3: Hero Variant
7. ✅ Create `HeroSearch` using hook + base
8. ✅ Integrate into homepage
9. ✅ Test homepage integration

### Phase 4: Polish
10. ✅ Ensure consistent styling
11. ✅ Accessibility audit
12. ✅ Performance optimization
13. ✅ Documentation

---

## Code Examples

### Using in Header:
```typescript
// apps/web/app/layout.tsx
import HeaderSearch from "@repo/ui/header-search";

<Header
  logoSrc="/bc-logo.svg"
  title="BC Building Code"
>
  <HeaderSearch
    onSearch={(query) => router.push(`/search?q=${query}`)}
    getSuggestions={(query) => searchIndex.suggest(query)}
  />
</Header>
```

### Using on Homepage:
```typescript
// apps/web/app/page.tsx
import HeroSearch from "@repo/ui/hero-search";

<HeroSearch
  title="BC Building Code"
  subtitle="Search and navigate the official 2024 British Columbia Building Code. Find requirements, definitions, and technical guidance for construction projects across BC."
  placeholder='Search for keywords (e.g. "Egress", "Radon") or Section...'
  onSearch={(query) => router.push(`/search?q=${query}`)}
  getSuggestions={(query) => searchIndex.suggest(query)}
/>
```

### Using the Hook Directly (Custom Component):
```typescript
// Custom search component
import { useSearch } from "@repo/data/hooks";

function CustomSearch() {
  const search = useSearch({
    onSearch: handleSearch,
    getSuggestions: getSuggestions,
  });
  
  return (
    <div>
      <input
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && search.handleSubmit()}
      />
      {search.suggestions.map(s => (
        <button onClick={() => search.handleSelectSuggestion(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}
```

---

## Testing Strategy

### Hook Tests (`useSearch.test.ts`)
- ✓ Query state management
- ✓ Debounced suggestion fetching
- ✓ Loading states
- ✓ Error handling
- ✓ Submit behavior
- ✓ Clear behavior

### Base Component Tests (`SearchCombobox.test.tsx`)
- ✓ Renders input
- ✓ Accepts text input
- ✓ Shows suggestions
- ✓ Keyboard navigation
- ✓ Mouse selection
- ✓ Loading state
- ✓ Empty state
- ✓ Accessibility

### Variant Tests (`HeaderSearch.test.tsx`, `HeroSearch.test.tsx`)
- ✓ Renders correctly
- ✓ Uses hook correctly
- ✓ Uses base component correctly
- ✓ Variant-specific behavior
- ✓ Integration with parent

---

## Performance Considerations

### Debouncing
```typescript
// In useSearch hook
const debouncedGetSuggestions = useMemo(
  () => debounce(getSuggestions, 300),
  [getSuggestions]
);
```

### Memoization
```typescript
// Memoize expensive operations
const filteredSuggestions = useMemo(
  () => suggestions.slice(0, 10),
  [suggestions]
);
```

### Lazy Loading
```typescript
// Only load search index when needed
const searchIndex = useLazySearchIndex();
```

---

## Accessibility Checklist

- ✓ Proper ARIA labels
- ✓ ARIA live regions for suggestions
- ✓ Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- ✓ Focus management
- ✓ Screen reader announcements
- ✓ Color contrast (7:1 ratio)
- ✓ Focus indicators
- ✓ Semantic HTML

---

## Summary

### Architecture Decision: ✅ Composition Pattern

**Core:**
- `useSearch` hook (logic)
- `SearchCombobox` component (base UI)

**Variants:**
- `HeaderSearch` (compact, toggleable)
- `HeroSearch` (large, always visible)

**Benefits:**
- ✅ DRY - No code duplication
- ✅ Consistent behavior
- ✅ Easy to maintain
- ✅ Easy to test
- ✅ Easy to extend

**Next Steps:**
1. Implement `useSearch` hook
2. Implement `SearchCombobox` base component
3. Implement `HeaderSearch` variant
4. Implement `HeroSearch` variant
5. Test and document

This architecture ensures both search components share the same robust logic while maintaining their unique UI characteristics.
