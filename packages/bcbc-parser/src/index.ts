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
  Clause,
  Table,
  TableRow,
  TableCell,
  Figure,
  Equation,
  NoteReference,
  GlossaryEntry,
  AmendmentDate,
  ValidationError,
  ContentType,
  HierarchyLevel,
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
