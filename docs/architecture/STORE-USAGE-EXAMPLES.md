# Zustand Store Usage Examples

This document provides practical examples of how to use the Zustand stores in components.

## Basic Usage

### Search Store

```typescript
import { useSearchStore } from '@/stores';

function SearchComponent() {
  const { query, results, loading, setQuery, search } = useSearchStore();

  const handleSearch = async () => {
    await search(query);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search building code..."
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      <div>
        {results.map((result) => (
          <div key={result.id}>
            <h3>{result.title}</h3>
            <p>{result.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Navigation Store

```typescript
import { useNavigationStore } from '@/stores';

function NavigationTree() {
  const { navigationTree, expandedNodes, toggleNode } = useNavigationStore();

  const renderNode = (node: NavigationNode) => {
    const isExpanded = expandedNodes.has(node.id);
    
    return (
      <div key={node.id}>
        <button onClick={() => toggleNode(node.id)}>
          {isExpanded ? '▼' : '▶'} {node.title}
        </button>
        {isExpanded && node.children && (
          <div style={{ marginLeft: '20px' }}>
            {node.children.map(renderNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {navigationTree.map(renderNode)}
    </div>
  );
}
```

### Content Store

```typescript
import { useContentStore } from '@/stores';
import { useEffect } from 'react';

function ContentDisplay({ path }: { path: string }) {
  const { currentContent, loading, error, loadContent } = useContentStore();

  useEffect(() => {
    loadContent(path);
  }, [path, loadContent]);

  if (loading) return <div>Loading content...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!currentContent) return <div>No content</div>;

  return (
    <article>
      <h1>{currentContent.number} - {currentContent.title}</h1>
      {currentContent.clauses.map((clause) => (
        <div key={clause.id}>
          <p>{clause.number}. {clause.text}</p>
        </div>
      ))}
    </article>
  );
}
```

### Glossary Store

```typescript
import { useGlossaryStore } from '@/stores';

function GlossaryTerm({ term }: { term: string }) {
  const { getTerm, setSelectedTerm } = useGlossaryStore();
  const entry = getTerm(term);

  if (!entry) return <span>{term}</span>;

  return (
    <span
      className="glossary-term"
      onClick={() => setSelectedTerm(term)}
      style={{ fontStyle: 'italic', textDecoration: 'underline', cursor: 'pointer' }}
    >
      {term}
    </span>
  );
}

function GlossaryModal() {
  const { selectedTerm, getTerm, setSelectedTerm } = useGlossaryStore();
  
  if (!selectedTerm) return null;
  
  const entry = getTerm(selectedTerm);
  if (!entry) return null;

  return (
    <div className="modal-overlay" onClick={() => setSelectedTerm(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{entry.term}</h2>
        <p>{entry.definition}</p>
        <button onClick={() => setSelectedTerm(null)}>Close</button>
      </div>
    </div>
  );
}
```

### Amendment Date Store

```typescript
import { useAmendmentDateStore } from '@/stores';
import { useEffect } from 'react';

function AmendmentDateFilter() {
  const { selectedDate, availableDates, setSelectedDate, loadDates } = useAmendmentDateStore();

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  return (
    <select
      value={selectedDate || ''}
      onChange={(e) => setSelectedDate(e.target.value || null)}
    >
      <option value="">All Dates</option>
      {availableDates.map((date) => (
        <option key={date.date} value={date.date}>
          {date.label}
        </option>
      ))}
    </select>
  );
}
```

### UI Store

```typescript
import { useUIStore } from '@/stores';

function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside className={sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}>
      <button onClick={toggleSidebar}>
        {sidebarOpen ? 'Close' : 'Open'} Sidebar
      </button>
      {sidebarOpen && (
        <div>
          {/* Sidebar content */}
        </div>
      )}
    </aside>
  );
}

function MobileMenu() {
  const { mobileMenuOpen, toggleMobileMenu } = useUIStore();

  return (
    <>
      <button onClick={toggleMobileMenu}>Menu</button>
      {mobileMenuOpen && (
        <nav className="mobile-menu">
          {/* Mobile menu content */}
        </nav>
      )}
    </>
  );
}

function ModalManager() {
  const { activeModal, modalData, closeModal } = useUIStore();

  if (!activeModal) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {activeModal === 'glossary' && (
          <GlossaryModalContent data={modalData} />
        )}
        {activeModal === 'note' && (
          <NoteModalContent data={modalData} />
        )}
        <button onClick={closeModal}>Close</button>
      </div>
    </div>
  );
}
```

## Advanced Patterns

### Combining Multiple Stores

```typescript
import { useSearchStore, useAmendmentDateStore } from '@/stores';

function FilteredSearch() {
  const { query, results, search } = useSearchStore();
  const { selectedDate } = useAmendmentDateStore();

  const handleSearch = async () => {
    // Search will be filtered by selected date
    await search(query);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => useSearchStore.getState().setQuery(e.target.value)}
      />
      <AmendmentDateFilter />
      <button onClick={handleSearch}>Search</button>
      <div>
        {results
          .filter((result) => !selectedDate || result.effectiveDate <= selectedDate)
          .map((result) => (
            <div key={result.id}>{result.title}</div>
          ))}
      </div>
    </div>
  );
}
```

### Accessing Store Outside Components

```typescript
import { useSearchStore } from '@/stores';

// Get store state outside of React components
function performSearch(query: string) {
  const { search } = useSearchStore.getState();
  return search(query);
}

// Subscribe to store changes outside of React components
const unsubscribe = useSearchStore.subscribe(
  (state) => state.results,
  (results) => {
    console.log('Search results updated:', results);
  }
);

// Clean up subscription
unsubscribe();
```

### Selective Re-renders

```typescript
import { useSearchStore } from '@/stores';

// Only re-render when query changes, not when results change
function SearchInput() {
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}

// Only re-render when results change, not when query changes
function SearchResults() {
  const results = useSearchStore((state) => state.results);

  return (
    <div>
      {results.map((result) => (
        <div key={result.id}>{result.title}</div>
      ))}
    </div>
  );
}
```

## Testing

### Testing Components with Zustand

```typescript
import { renderHook, act } from '@testing-library/react';
import { useSearchStore } from '@/stores';

describe('SearchStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSearchStore.setState({
      query: '',
      results: [],
      loading: false,
      filters: {},
    });
  });

  it('should update query', () => {
    const { result } = renderHook(() => useSearchStore());
    
    act(() => {
      result.current.setQuery('fire safety');
    });

    expect(result.current.query).toBe('fire safety');
  });

  it('should perform search', async () => {
    const { result } = renderHook(() => useSearchStore());
    
    await act(async () => {
      await result.current.search('fire safety');
    });

    expect(result.current.loading).toBe(false);
  });
});
```

## Best Practices

1. **Use Selective Subscriptions**: Only subscribe to the state you need to avoid unnecessary re-renders
2. **Keep Actions Simple**: Complex logic should be in separate utility functions
3. **Use TypeScript**: Leverage TypeScript for type safety
4. **Persist Carefully**: Only persist user preferences, not transient state
5. **Test Store Logic**: Write tests for store actions and state updates
6. **Use DevTools**: Enable Redux DevTools for debugging in development
7. **Avoid Nested State**: Keep state flat for better performance
8. **Clear State on Unmount**: Clean up state when components unmount if needed
