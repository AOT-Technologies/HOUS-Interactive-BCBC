/**
 * Test IDs for automated testing
 */

// Header test IDs
export const TESTID_HEADER = 'header';
export const TESTID_HEADER_MOBILE_NAV = 'header-mobile-nav';
export const TESTID_HEADER_MOBILE_NAV_BUTTON = 'header-mobile-nav-button';

export const GET_TESTID_HEADER_NAV_ITEM = (title: string) =>
  `header-nav-item-${title?.toLowerCase().replace(/\s+/g, '-') ?? ''}`;

// Footer test IDs
export const TESTID_FOOTER = 'footer';

// PreFooter test IDs
export const TESTID_PRE_FOOTER = 'pre-footer';

// Button test IDs
export const GET_TESTID_BUTTON = (variant: string) => `button-${variant}`;
export const TESTID_BUTTON_SUBMIT = 'submit';

// Link test IDs
export const GET_TESTID_LINK = (variant: string) => `link-${variant}`;

// LinkCard test IDs
export const GET_TESTID_LINK_CARD = (id: string) => `link-card-${id}`;

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

// NumberField test IDs
export const GET_TESTID_NUMBER_FIELD = (name: string) => `number-field-${name}`;
export const TESTID_NUMBER_FIELD_LABEL = 'number-field-label';
export const TESTID_NUMBER_FIELD_CHECK = 'number-field-check';

// CheckboxGroup test IDs
export const GET_TESTID_CHECKBOX_GROUP = (name: string) => `checkbox-group-${name}`;
export const GET_TESTID_CHECKBOX = (groupName: string, value: string) =>
  `checkbox-${groupName}-${value}`;
export const TESTID_CHECKBOX_GROUP_LABEL = 'checkbox-group-label';
export const TESTID_CHECKBOX_GROUP_ERROR = 'checkbox-group-error';

// CheckboxCard test IDs
export const GET_TESTID_CHECKBOX_CARD = (id: string) => `checkbox-card-${id}`;

// RadioGroup test IDs
export const GET_TESTID_RADIO_GROUP = (name: string) => `radio-group-${name}`;
export const GET_TESTID_RADIO = (groupName: string, value: string) =>
  `radio-${groupName}-${value}`;
export const TESTID_RADIO_GROUP_LABEL = 'radio-group-label';
export const TESTID_RADIO_GROUP_ERROR = 'radio-group-error';
