# @repo/constants

Shared constants for the BC Building Code application.

## Contents

- **Navigation Links**: Structured navigation links for header and footer
  - `URLS_MAIN_NAVIGATION`: Main navigation links (Home, Search, Browse, About)
  - `URLS_FOOTER`: Footer links (BC Gov, Disclaimer, Privacy, etc.)
  - `NavigationLink`: TypeScript interface for navigation links
- **Element IDs**: HTML element IDs for accessibility (prefixed with `ID_`)
- **Test IDs**: Data test IDs for automated testing (prefixed with `TESTID_`)
- **API_ENDPOINTS**: Data file paths for generated assets
- **STORAGE_KEYS**: LocalStorage keys for persistence
- **APP_CONFIG**: Application configuration values

## Usage

### Navigation Links

```typescript
import { URLS_MAIN_NAVIGATION, URLS_FOOTER, NavigationLink } from '@repo/constants';

// Render main navigation
{URLS_MAIN_NAVIGATION.map((link) => (
  <a key={link.href} href={link.href} target={link.target}>
    {link.title}
  </a>
))}

// Render footer links
{URLS_FOOTER.map((link) => (
  <a key={link.href} href={link.href} target={link.target}>
    {link.title}
  </a>
))}
```

### Element IDs

```typescript
import { ID_MAIN_CONTENT, ID_SKIP_TO_CONTENT, ID_SEARCH_INPUT } from '@repo/constants';

// Use IDs for accessibility
<main id={ID_MAIN_CONTENT}>...</main>
<a href={`#${ID_MAIN_CONTENT}`} id={ID_SKIP_TO_CONTENT}>Skip to content</a>
<input id={ID_SEARCH_INPUT} type="search" />
```

### Test IDs

```typescript
import { TESTID_SEARCH_BUTTON, TESTID_HEADER, GET_TESTID_HEADER_NAV_ITEM } from '@repo/constants';

// Use test IDs
<button data-testid={TESTID_SEARCH_BUTTON}>Search</button>
<header data-testid={TESTID_HEADER}>...</header>
<a data-testid={GET_TESTID_HEADER_NAV_ITEM('Home')}>Home</a>
```

### Storage Keys and Config

```typescript
import { STORAGE_KEYS, APP_CONFIG, API_ENDPOINTS } from '@repo/constants';

// Use storage keys
localStorage.setItem(STORAGE_KEYS.AMENDMENT_DATE, date);

// Use app config
const debounce = APP_CONFIG.SEARCH_DEBOUNCE_MS;

// Use API endpoints
fetch(API_ENDPOINTS.SEARCH_INDEX);
```
