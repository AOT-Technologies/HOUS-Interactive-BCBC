/**
 * General application constants
 */

// Images base path
export const IMAGES_BASE_PATH = '/';

// API endpoints
export const API_ENDPOINTS = {
  SEARCH_INDEX: '/data/search-index.json',
  NAVIGATION_TREE: '/data/navigation-tree.json',
  GLOSSARY_MAP: '/data/glossary-map.json',
  AMENDMENT_DATES: '/data/amendment-dates.json',
  CONTENT: '/data/content',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AMENDMENT_DATE: 'bcbc-amendment-date',
  SIDEBAR_STATE: 'bcbc-sidebar-state',
  RECENT_SEARCHES: 'bcbc-recent-searches',
  USER_PREFERENCES: 'bcbc-user-preferences',
} as const;

// Application constants
export const APP_CONFIG = {
  APP_NAME: 'BC Building Code',
  APP_VERSION: '1.0.0',
  SEARCH_DEBOUNCE_MS: 300,
  CONTENT_LOAD_TIMEOUT_MS: 5000,
  MAX_RECENT_SEARCHES: 10,
  RESULTS_PER_PAGE: 20,
} as const;
