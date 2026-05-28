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
  Spectables,
  PartAppendix,
  Section,
  Subsection,
  DivisionAppendix,
  DivisionAppendixSection,
  DivisionAppendixSubsection,
  DivisionAppendixArticle,
  ApplicationNote,
  AppendixDivision,
  AppendixContentBlock,
  AppendixParagraph,
  Article,
  ArticleContentNode,
  Sentence,
  SentenceObjective,
  SentenceSubObjective,
  SentenceContentNode,
  Clause,
  ClauseContentNode,
  Subclause,
  Table,
  TableRow,
  TableCell,
  TableCellContent,
  FormingPartReference,
  Figure,
  Equation,
  NoteReference,
  GlossaryEntry,
  AmendmentDate,
  ValidationError,
  ContentType,
  HierarchyLevel,
  Revision,
  Definition,
  Organization,
  TextListItem,
  VariableListItem,
  BulletedList,
  VariableList,
  DefinitionList,
  OrganizationList,
  BibliographyList,
  StructuredList,
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
