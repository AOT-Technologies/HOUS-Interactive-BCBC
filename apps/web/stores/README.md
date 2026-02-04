# Zustand Stores

This directory contains all Zustand stores for state management in the BC Building Code Interactive Web Application.

## Store Overview

### Search Store (`search-store.ts`)
Manages search functionality including query, results, loading state, and filters.

**State:**
- `query`: Current search query string
- `results`: Array of search results
- `loading`: Loading state for search operations
- `filters`: Active search filters (amendment date, division, content type)

**Actions:**
- `setQuery(query)`: Update search query
- `setResults(results)`: Update search results
- `setLoading(loading)`: Update loading state
- `setFilters(filters)`: Update search filters
- `search(query)`: Execute search (placeholder for Sprint 3)
- `clearSearch()`: Clear search query and results

### Navigation Store (`navigation-store.ts`)
Manages navigation tree, expanded nodes, and current path.

**State:**
- `navigationTree`: Hierarchical navigation structure
- `expandedNodes`: Set of expanded node IDs
- `currentPath`: Current content path
- `loading`: Loading state for navigation tree

**Actions:**
- `toggleNode(nodeId)`: Toggle node expansion
- `setCurrentPath(path)`: Update current path
- `expandToNode(nodeId)`: Expand all parent nodes to target node
- `loadNavigationTree()`: Load navigation tree from JSON
- `collapseAll()`: Collapse all nodes

### Content Store (`content-store.ts`)
Manages current content, loading state, and content caching.

**State:**
- `currentContent`: Currently displayed article
- `loading`: Loading state for content operations
- `error`: Error message if content load fails
- `contentCache`: Map of cached content by path

**Actions:**
- `loadContent(path)`: Load content from JSON (with caching)
- `clearContent()`: Clear current content
- `clearError()`: Clear error state

### Glossary Store (`glossary-store.ts`)
Manages glossary map and selected term.

**State:**
- `glossaryMap`: Map of glossary terms to definitions
- `selectedTerm`: Currently selected glossary term
- `loading`: Loading state for glossary operations

**Actions:**
- `setSelectedTerm(term)`: Set selected term
- `getTerm(term)`: Get glossary entry by term
- `loadGlossary()`: Load glossary from JSON

### Amendment Date Store (`amendment-date-store.ts`)
Manages selected amendment date and available dates. URL is the source of truth.

**State:**
- `selectedDate`: Currently selected amendment date
- `availableDates`: Array of available amendment dates for current version
- `datesByVersion`: Map caching dates per version
- `loading`: Loading state for date operations
- `initialized`: Whether store has been initialized from URL

**Actions:**
- `setSelectedDate(date)`: Set selected date (syncs to URL)
- `loadDates(version, options)`: Load available dates for a version
  - `options.preserveUrlDate`: If true, preserve date from URL (for initial load)
- `initializeFromUrl()`: Read date from URL on first load

**URL Sync Behavior:**
- On initial load: Read date from URL if present, otherwise use latest
- On version change: Reset to latest date, update URL
- On date change: Update URL immediately
- No localStorage persistence (URL is source of truth)

### UI Store (`ui-store.ts`)
Manages UI state including sidebar, mobile menu, and modals. Persists sidebar state to localStorage.

**State:**
- `sidebarOpen`: Sidebar open/closed state
- `mobileMenuOpen`: Mobile menu open/closed state
- `activeModal`: Currently active modal type ('glossary' | 'note' | null)
- `modalData`: Data for active modal

**Actions:**
- `toggleSidebar()`: Toggle sidebar
- `setSidebarOpen(open)`: Set sidebar state
- `toggleMobileMenu()`: Toggle mobile menu
- `setMobileMenuOpen(open)`: Set mobile menu state
- `openModal(type, data)`: Open modal with data
- `closeModal()`: Close active modal

**Persistence:**
- Persists `sidebarOpen` to localStorage

## Usage

Import stores from the index file:

```typescript
import { useSearchStore, useNavigationStore } from '@/stores';

function MyComponent() {
  const { query, setQuery, search } = useSearchStore();
  const { navigationTree, toggleNode } = useNavigationStore();
  
  // Use store state and actions
}
```

## Middleware

All stores use the following middleware:

- **devtools**: Enables Redux DevTools integration for debugging
- **persist** (selected stores): Persists state to localStorage

## Development

To view store state in development:

1. Install Redux DevTools browser extension
2. Open DevTools and navigate to Redux tab
3. View and inspect store state and actions

## Implementation Notes

- All stores are configured with TypeScript strict mode
- Store actions include placeholder implementations for features to be implemented in later sprints
- Content loading and caching is optimized for performance
- URL is the source of truth for version and date parameters
- Amendment date store uses URL sync, not localStorage persistence
- localStorage persistence is used for user preferences (sidebar state)
