/**
 * Zustand stores for BC Building Code Interactive Web Application
 * 
 * This module exports all Zustand stores used for state management.
 * Each store is configured with devtools middleware for development debugging.
 * Some stores use persist middleware for localStorage synchronization.
 */

export { useVersionStore, useCurrentVersionId, useHasMultipleVersions } from './version-store';
export type { Version } from './version-store';

export { useSearchStore } from './search-store';
export type { SearchResult, SearchFilters } from './search-store';

export { useNavigationStore } from './navigation-store';
export type { NavigationNode } from './navigation-store';

export { useContentStore } from './content-store';
export type {
  Article,
  Clause,
  Table,
  TableHeader,
  TableCell,
  TableRow,
  Figure,
  Equation,
  NoteReference,
} from './content-store';

export { useGlossaryStore } from './glossary-store';
export type { GlossaryEntry } from './glossary-store';

export { useEquationStore } from './equation-store';
export type { EquationEntry } from './equation-store';

export { useAmendmentDateStore } from './amendment-date-store';
export type { AmendmentDate } from './amendment-date-store';

export { useUIStore } from './ui-store';
export type { ModalType } from './ui-store';
