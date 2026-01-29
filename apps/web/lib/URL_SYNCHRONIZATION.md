# URL Synchronization Implementation

## Overview

This document describes the URL synchronization implementation for the BC Building Code Interactive Web Application. URL synchronization ensures that all application state is encoded in the URL, making pages bookmarkable and shareable.

## Architecture

### Philosophy: URL as Single Source of Truth

Every page can be accessed directly via URL. The URL contains all necessary state information to render the page correctly, enabling:

- **Bookmarkable**: Users can bookmark any page and return to the exact same view
- **Shareable**: Users can share links to specific content with colleagues
- **Browser Navigation**: Back/forward buttons work correctly
- **No Session Required**: No server-side session or authentication needed
- **Stateless**: Application can be deployed as pure static site

## Components

### 1. URL Utilities (`apps/web/lib/url-utils.ts`)

Core utility functions for URL parsing and building.

#### Content Path Functions

**`parseContentPath(pathname: string): ContentPathParams | null`**
- Parses content URLs into structured parameters
- Supports flexible hierarchy (Part/Section/Subsection/Article)
- Returns null for invalid paths

Example:
```typescript
parseContentPath('/code/division-b/part-3/section-3-2')
// Returns: { division: 'division-b', part: 'part-3', section: 'section-3-2' }
```

**`buildContentPath(params: ContentPathParams, queryParams?: Record<string, string>): string`**
- Builds content URLs from parameters
- Optionally adds query parameters (e.g., date filter)
- Skips undefined segments

Example:
```typescript
buildContentPath(
  { division: 'division-a', part: 'part-1' },
  { date: '2024-01-01' }
)
// Returns: '/code/division-a/part-1?date=2024-01-01'
```

**`getContentLevel(params: ContentPathParams): ContentLevel`**
- Determines hierarchy level from parameters
- Returns: 'part' | 'section' | 'subsection' | 'article'

#### Search Functions

**`parseSearchParams(search: string): SearchQueryParams | null`**
- Parses search query parameters from URL
- Extracts query, filters (division, part, type, date)
- Returns null if no query parameter

**`buildSearchUrl(query: string, filters?: {...}): string`**
- Builds search URLs with query and filters
- All filters are optional
- URL-encodes query string

Example:
```typescript
buildSearchUrl('fire safety', { division: 'division-b', date: '2024-01-01' })
// Returns: '/search?q=fire+safety&division=division-b&date=2024-01-01'
```

#### Navigation Functions

**`updateUrlWithoutNavigation(url: string): void`**
- Updates URL using `history.replaceState`
- Does not add to browser history
- Used for state synchronization

**`navigateToUrl(url: string): void`**
- Updates URL using `history.pushState`
- Adds to browser history
- Dispatches popstate event

#### Page Detection Functions

- `isContentPage()`: Returns true for `/code/*` paths
- `isSearchPage()`: Returns true for `/search` paths
- `isHomePage()`: Returns true for `/` path
- `isDownloadPage()`: Returns true for `/download` path

### 2. Navigation Store Integration (`apps/web/stores/navigation-store.ts`)

The navigation store has been enhanced with URL synchronization methods.

#### New Methods

**`syncFromUrl(): void`**
- Syncs navigation state from current URL
- Called on page load and browser back/forward navigation
- Parses URL path and query parameters
- Updates current path and expands to active node

**`navigateToPath(params: ContentPathParams, queryParams?: Record<string, string>): void`**
- Navigates to a content path and updates URL
- Updates store state
- Pushes to browser history
- Expands to target node in navigation tree

**`setCurrentPath(path: string, updateUrl?: boolean): void`**
- Enhanced to optionally update URL
- When `updateUrl` is true, syncs URL without navigation
- When false, only updates store state

### 3. Custom Hooks (`apps/web/hooks/useUrlNavigation.ts`)

React hooks for URL-based navigation.

#### `useUrlNavigation()`

Main hook for URL synchronization. Handles:
- Initial URL sync on page load
- Browser back/forward navigation
- Automatic state restoration

Usage:
```typescript
function MyPage() {
  useUrlNavigation();
  // Component automatically syncs with URL
}
```

#### `useContentParams()`

Returns content path parameters from current URL.

Usage:
```typescript
function ContentPage() {
  const params = useContentParams();
  
  if (!params) {
    return <NotFound />;
  }
  
  return <Content params={params} />;
}
```

#### `useQueryParam(name: string)`

Returns a specific query parameter value.

Usage:
```typescript
function SearchPage() {
  const query = useQueryParam('q');
  const date = useQueryParam('date');
  
  return <SearchResults query={query} date={date} />;
}
```

#### `useQueryParams()`

Returns all query parameters as an object.

Usage:
```typescript
function SearchPage() {
  const params = useQueryParams();
  
  return (
    <SearchResults
      query={params.q}
      date={params.date}
      division={params.division}
    />
  );
}
```

## URL Patterns

### Homepage
```
/
```
- No state parameters
- Loads default view

### Search Results
```
/search?q={query}&date={date}&division={div}&part={part}&type={type}
```
- `q`: Search query (required)
- `date`: Effective date filter (optional)
- `division`: Division filter (optional)
- `part`: Part filter (optional)
- `type`: Content type filter (optional)

Example:
```
/search?q=fire%20safety&division=division-b&part=part-3&type=article&date=2024-01-01
```

### Content Reading (Flexible Hierarchy)
```
/code/{division}/{part}/{section?}/{subsection?}/{article?}?date={date}
```

**Part Level:**
```
/code/division-a/part-1
```

**Section Level:**
```
/code/division-b/part-3/section-3-2
```

**Subsection Level:**
```
/code/division-b/part-3/section-3-2/subsection-3-2-1
```

**Article Level:**
```
/code/division-b/part-3/section-3-2/subsection-3-2-1/article-3-2-1-1
```

**With Date Filter:**
```
/code/division-a/part-1?date=2024-01-01
```

### Download Page
```
/download
```
- No state parameters

## State Restoration Flow

When a user accesses a page directly (bookmark, shared link):

```
1. User opens URL
   ↓
2. Next.js parses route and query parameters
   ↓
3. useUrlNavigation hook calls syncFromUrl()
   ↓
4. Navigation store parses URL and updates state
   ↓
5. Components read state and render
   ↓
6. Page displays with correct state
```

## Browser Navigation

### Back/Forward Buttons

The implementation handles browser back/forward navigation:

1. User clicks back/forward button
2. Browser fires `popstate` event
3. `useUrlNavigation` hook listens for event
4. Calls `syncFromUrl()` to restore state
5. Components re-render with restored state

### History Management

- **`pushState`**: Used for navigation (adds to history)
- **`replaceState`**: Used for state sync (doesn't add to history)

## Testing

### Unit Tests

**URL Utilities** (`apps/web/lib/url-utils.test.ts`):
- ✅ 41 tests covering all utility functions
- Parse and build functions
- Round-trip parsing/building
- Edge cases and error handling

**Navigation Store** (`apps/web/stores/navigation-store.test.ts`):
- ✅ 34 tests including URL synchronization
- URL sync from pathname and query params
- Navigate to path with URL update
- Browser back/forward handling
- Requirements validation (4.8, 4.9)

### Requirements Coverage

**Requirement 4.8**: Update URL to reflect current location
- ✅ Tested in navigation store
- `navigateToPath` updates URL via `pushState`

**Requirement 4.9**: Load correct content from URL
- ✅ Tested in navigation store
- `syncFromUrl` restores state from URL
- Handles pathname and query parameters

## Usage Examples

### Example 1: Content Page with URL Sync

```typescript
import { useUrlNavigation, useContentParams } from '@/hooks/useUrlNavigation';

function ContentPage() {
  useUrlNavigation(); // Enable URL sync
  const params = useContentParams();
  
  if (!params) {
    return <NotFound />;
  }
  
  return <ArticleRenderer params={params} />;
}
```

### Example 2: Search Page with Filters

```typescript
import { useQueryParams } from '@/hooks/useUrlNavigation';
import { buildSearchUrl } from '@/lib/url-utils';

function SearchPage() {
  const params = useQueryParams();
  const router = useRouter();
  
  const handleFilterChange = (filters: SearchFilters) => {
    const url = buildSearchUrl(params.q, filters);
    router.push(url);
  };
  
  return (
    <SearchResults
      query={params.q}
      filters={params}
      onFilterChange={handleFilterChange}
    />
  );
}
```

### Example 3: Navigation with Store

```typescript
import { useNavigationStore } from '@/stores/navigation-store';

function NavigationTree() {
  const { navigateToPath } = useNavigationStore();
  
  const handleNodeClick = (node: NavigationNode) => {
    navigateToPath({
      division: node.division,
      part: node.part,
      section: node.section,
    });
  };
  
  return <Tree onNodeClick={handleNodeClick} />;
}
```

## Error Handling

### Invalid URLs

- `parseContentPath` returns `null` for invalid paths
- Components should check for `null` and show 404 page

### Missing Query Parameters

- `parseSearchParams` returns `null` if no query
- Search page should redirect to homepage or show empty state

### Malformed Parameters

- URL utilities sanitize and validate input
- Invalid parameters are ignored or use defaults

## Performance Considerations

- URL parsing is fast (< 1ms)
- No network requests for URL operations
- State updates are synchronous
- Browser history operations are lightweight

## Future Enhancements

1. **URL Shortening**: Generate short URLs for sharing
2. **State Compression**: Compress complex state in URL
3. **Deep Link Analytics**: Track which URLs are shared most
4. **URL Validation**: Server-side validation for SEO

## Related Documentation

- **Requirements**: `.kiro/specs/bcbc-interactive-web-app/requirements.md` (4.8, 4.9)
- **Design**: `.kiro/specs/bcbc-interactive-web-app/design.md`
- **User Flow**: `docs/USER-FLOW.md` (Deep Linking section)
- **Tasks**: `.kiro/specs/bcbc-interactive-web-app/tasks.md` (Task 17)
