/**
 * Test IDs for automated testing
 */

// Header test IDs
export const TESTID_HEADER = 'header';
export const TESTID_HEADER_MOBILE_NAV = 'header-mobile-nav';
export const TESTID_HEADER_MOBILE_NAV_BUTTON = 'header-mobile-nav-button';

export const GET_TESTID_HEADER_NAV_ITEM = (title: string) =>
  `header-nav-item-${title.toLowerCase().replace(/\s+/g, '-')}`;

// Footer test IDs
export const TESTID_FOOTER = 'footer';

// Button test IDs
export const GET_TESTID_BUTTON = (variant: string) => `button-${variant}`;

// Link test IDs
export const GET_TESTID_LINK = (variant: string) => `link-${variant}`;

// Icon test IDs
export const GET_TESTID_ICON = (type: string) => `icon-${type}`;

// Search test IDs
export const TESTID_SEARCH_INPUT = 'search-input';
export const TESTID_SEARCH_BUTTON = 'search-button';
export const TESTID_SEARCH_RESULTS = 'search-results';

// Navigation test IDs
export const TESTID_NAV_TREE = 'navigation-tree';
export const TESTID_NAV_NODE = 'navigation-node';
export const TESTID_BREADCRUMBS = 'breadcrumbs';

// Content test IDs
export const TESTID_CONTENT_ARTICLE = 'content-article';

// Glossary test IDs
export const TESTID_GLOSSARY_TERM = 'glossary-term';
export const TESTID_GLOSSARY_MODAL = 'glossary-modal';

// Note test IDs
export const TESTID_NOTE_LINK = 'note-link';
export const TESTID_NOTE_MODAL = 'note-modal';

// Amendment filter test IDs
export const TESTID_AMENDMENT_FILTER = 'amendment-filter';

// Navigation button test IDs
export const TESTID_PREV_BUTTON = 'prev-button';
export const TESTID_NEXT_BUTTON = 'next-button';
