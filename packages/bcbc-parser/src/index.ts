/**
 * @bc-building-code/bcbc-parser
 * 
 * BCBC JSON parsing and validation package
 */

// Export types
export type {
  BCBCDocument,
  DocumentMetadata,
  Division,
  Part,
  Section,
  Subsection,
  Article,
  ArticleContentNode,
  Sentence,
  SentenceContentNode,
  Clause,
  ClauseContentNode,
  Subclause,
  Table,
  TableRow,
  TableCell,
  TableCellContent,
  Figure,
  Equation,
  NoteReference,
  GlossaryEntry,
  AmendmentDate,
  ValidationError,
  ContentType,
  HierarchyLevel,
  Revision,
} from './types';

// Export parser functions
export {
  parseBCBC,
  parseDivision,
  extractContentIds,
  getGlossaryMap,
  getAmendmentDates,
} from './parser';

// Export validator functions
export {
  validateBCBC,
  validateCrossReferences,
  validateRequiredFields,
  validateDataTypes,
} from './validators';

// Export revision filtering utilities
export {
  getTextForDate,
  isVisibleOnDate,
  filterSentence,
  filterClause,
  filterSubclause,
  getLatestEffectiveDate,
} from './revision-filter';
