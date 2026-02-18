/**
 * BCBC JSON validation logic
 * 
 * This module provides comprehensive validation for BCBC documents including:
 * - Required field validation
 * - Data type validation
 * - Cross-reference validation
 * - Structural integrity validation
 */

import type {
  BCBCDocument,
  Division,
  Part,
  Section,
  Subsection,
  Article,
  Sentence,
  Clause,
  Subclause,
  ValidationError,
} from './types';

/**
 * Validate BCBC document structure
 * @param document - BCBC document to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateBCBC(document: BCBCDocument): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate root-level required fields
  errors.push(...validateRequiredFields(
    document as unknown as Record<string, unknown>,
    ['metadata', 'divisions', 'glossary', 'amendmentDates'],
    'root'
  ));

  // Validate metadata structure
  if (document.metadata) {
    errors.push(...validateRequiredFields(
      document.metadata as unknown as Record<string, unknown>,
      ['title', 'version', 'effectiveDate', 'jurisdiction'],
      'metadata'
    ));

    errors.push(...validateDataTypes(
      document.metadata as unknown as Record<string, unknown>,
      { title: 'string', version: 'string', effectiveDate: 'string', jurisdiction: 'string' },
      'metadata'
    ));
  }

  // Validate volumes array
  if (document.volumes) {
    if (!Array.isArray(document.volumes)) {
      errors.push({
        path: 'root',
        field: 'volumes',
        message: 'Field volumes must be an array',
        severity: 'error',
      });
    } else if (document.volumes.length === 0) {
      errors.push({
        path: 'root',
        field: 'volumes',
        message: 'Document must contain at least one volume',
        severity: 'warning',
      });
    } else {
      // Validate each volume
      document.volumes.forEach((volume, index) => {
        // Validate divisions in volume
        if (volume.divisions && Array.isArray(volume.divisions)) {
          volume.divisions.forEach((division, divIndex) => {
            errors.push(...validateDivision(division, `volumes[${index}].divisions[${divIndex}]`));
          });
        }
      });
    }
  }

  // Validate glossary array
  if (document.glossary) {
    if (!Array.isArray(document.glossary)) {
      errors.push({
        path: 'root',
        field: 'glossary',
        message: 'Field glossary must be an array',
        severity: 'error',
      });
    } else {
      document.glossary.forEach((entry, index) => {
        errors.push(...validateRequiredFields(
          entry as unknown as Record<string, unknown>,
          ['id', 'term', 'definition'],
          `glossary[${index}]`
        ));
      });
    }
  }

  // Validate amendment dates array
  if (document.amendmentDates) {
    if (!Array.isArray(document.amendmentDates)) {
      errors.push({
        path: 'root',
        field: 'amendmentDates',
        message: 'Field amendmentDates must be an array',
        severity: 'error',
      });
    } else {
      document.amendmentDates.forEach((amendment, index) => {
        errors.push(...validateRequiredFields(
          amendment as unknown as Record<string, unknown>,
          ['date', 'description'],
          `amendmentDates[${index}]`
        ));
      });
    }
  }

  // Validate cross-references
  errors.push(...validateCrossReferences(document));

  return errors;
}

/**
 * Validate a division structure
 */
function validateDivision(division: Division, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  errors.push(...validateRequiredFields(
    division as unknown as Record<string, unknown>,
    ['id', 'title', 'type', 'parts'],
    path
  ));

  // Validate data types
  errors.push(...validateDataTypes(
    division as unknown as Record<string, unknown>,
    { id: 'string', title: 'string', type: 'string' },
    path
  ));

  // Validate type field value
  if (division.type !== 'division') {
    errors.push({
      path,
      field: 'type',
      message: `Invalid type value: expected 'division', got '${division.type}'`,
      severity: 'error',
    });
  }

  // Validate parts array
  if (division.parts) {
    if (!Array.isArray(division.parts)) {
      errors.push({
        path,
        field: 'parts',
        message: 'Field parts must be an array',
        severity: 'error',
      });
    } else {
      division.parts.forEach((part, index) => {
        errors.push(...validatePart(part, `${path}.parts[${index}]`));
      });
    }
  }

  return errors;
}

/**
 * Validate a part structure
 */
function validatePart(part: Part, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  errors.push(...validateRequiredFields(
    part as unknown as Record<string, unknown>,
    ['id', 'number', 'title', 'type', 'sections'],
    path
  ));

  // Validate data types
  errors.push(...validateDataTypes(
    part as unknown as Record<string, unknown>,
    { id: 'string', number: 'string', title: 'string', type: 'string' },
    path
  ));

  // Validate type field value
  if (part.type !== 'part') {
    errors.push({
      path,
      field: 'type',
      message: `Invalid type value: expected 'part', got '${part.type}'`,
      severity: 'error',
    });
  }

  // Validate sections array
  if (part.sections) {
    if (!Array.isArray(part.sections)) {
      errors.push({
        path,
        field: 'sections',
        message: 'Field sections must be an array',
        severity: 'error',
      });
    } else {
      part.sections.forEach((section, index) => {
        errors.push(...validateSection(section, `${path}.sections[${index}]`));
      });
    }
  }

  return errors;
}

/**
 * Validate a section structure
 */
function validateSection(section: Section, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  errors.push(...validateRequiredFields(
    section as unknown as Record<string, unknown>,
    ['id', 'number', 'title', 'type', 'subsections'],
    path
  ));

  // Validate data types
  errors.push(...validateDataTypes(
    section as unknown as Record<string, unknown>,
    { id: 'string', number: 'string', title: 'string', type: 'string' },
    path
  ));

  // Validate type field value
  if (section.type !== 'section') {
    errors.push({
      path,
      field: 'type',
      message: `Invalid type value: expected 'section', got '${section.type}'`,
      severity: 'error',
    });
  }

  // Validate subsections array
  if (section.subsections) {
    if (!Array.isArray(section.subsections)) {
      errors.push({
        path,
        field: 'subsections',
        message: 'Field subsections must be an array',
        severity: 'error',
      });
    } else {
      section.subsections.forEach((subsection, index) => {
        errors.push(...validateSubsection(subsection, `${path}.subsections[${index}]`));
      });
    }
  }

  return errors;
}

/**
 * Validate a subsection structure
 */
function validateSubsection(subsection: Subsection, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  errors.push(...validateRequiredFields(
    subsection as unknown as Record<string, unknown>,
    ['id', 'number', 'title', 'type', 'articles'],
    path
  ));

  // Validate data types
  errors.push(...validateDataTypes(
    subsection as unknown as Record<string, unknown>,
    { id: 'string', number: 'string', title: 'string', type: 'string' },
    path
  ));

  // Validate type field value
  if (subsection.type !== 'subsection') {
    errors.push({
      path,
      field: 'type',
      message: `Invalid type value: expected 'subsection', got '${subsection.type}'`,
      severity: 'error',
    });
  }

  // Validate articles array
  if (subsection.articles) {
    if (!Array.isArray(subsection.articles)) {
      errors.push({
        path,
        field: 'articles',
        message: 'Field articles must be an array',
        severity: 'error',
      });
    } else {
      subsection.articles.forEach((article, index) => {
        errors.push(...validateArticle(article, `${path}.articles[${index}]`));
      });
    }
  }

  return errors;
}

/**
 * Validate an article structure
 */
function validateArticle(article: Article, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  errors.push(...validateRequiredFields(
    article as unknown as Record<string, unknown>,
    ['id', 'number', 'title', 'type', 'sentences', 'notes'],
    path
  ));

  // Validate data types
  errors.push(...validateDataTypes(
    article as unknown as Record<string, unknown>,
    { id: 'string', number: 'string', title: 'string', type: 'string' },
    path
  ));

  // Validate type field value
  if (article.type !== 'article') {
    errors.push({
      path,
      field: 'type',
      message: `Invalid type value: expected 'article', got '${article.type}'`,
      severity: 'error',
    });
  }

  // Validate content array (replaces sentences array in new structure)
  if (article.content) {
    if (!Array.isArray(article.content)) {
      errors.push({
        path,
        field: 'content',
        message: 'Field content must be an array',
        severity: 'error',
      });
    } else {
      article.content.forEach((contentNode, index) => {
        // Validate based on content node type
        if (contentNode.type === 'sentence') {
          errors.push(...validateSentence(contentNode as any, `${path}.content[${index}]`));
        }
        // Tables, Figures, Equations, NoteReferences would be validated here
      });
    }
  }

  // Validate notes array (if present)
  if ('notes' in article && article.notes) {
    if (!Array.isArray(article.notes)) {
      errors.push({
        path,
        field: 'notes',
        message: 'Field notes must be an array',
        severity: 'error',
      });
    } else {
      article.notes.forEach((note, index) => {
        errors.push(...validateRequiredFields(
          note as unknown as Record<string, unknown>,
          ['id', 'noteNumber', 'noteTitle', 'noteContent'],
          `${path}.notes[${index}]`
        ));
      });
    }
  }

  return errors;
}

/**
 * Validate a sentence structure
 */
function validateSentence(sentence: Sentence, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  errors.push(...validateRequiredFields(
    sentence as unknown as Record<string, unknown>,
    ['id', 'number', 'type', 'text', 'glossaryTerms'],
    path
  ));

  // Validate data types
  errors.push(...validateDataTypes(
    sentence as unknown as Record<string, unknown>,
    { id: 'string', number: 'string', type: 'string', text: 'string' },
    path
  ));

  // Validate type field value
  if (sentence.type !== 'sentence') {
    errors.push({
      path,
      field: 'type',
      message: `Invalid type value: expected 'sentence', got '${sentence.type}'`,
      severity: 'error',
    });
  }

  // Validate glossaryTerms is an array
  if (sentence.glossaryTerms && !Array.isArray(sentence.glossaryTerms)) {
    errors.push({
      path,
      field: 'glossaryTerms',
      message: 'Field glossaryTerms must be an array',
      severity: 'error',
    });
  }

  // Validate content if present (replaces clauses in new structure)
  if (sentence.content) {
    if (!Array.isArray(sentence.content)) {
      errors.push({
        path,
        field: 'content',
        message: 'Field content must be an array',
        severity: 'error',
      });
    } else {
      sentence.content.forEach((contentNode, index) => {
        // Validate based on content node type
        if (contentNode.type === 'clause') {
          errors.push(...validateClause(contentNode as any, `${path}.content[${index}]`));
        }
        // Tables, Figures, Equations would be validated here
      });
    }
  }

  return errors;
}

/**
 * Validate a clause structure
 */
function validateClause(clause: Clause, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  errors.push(...validateRequiredFields(
    clause as unknown as Record<string, unknown>,
    ['id', 'number', 'type', 'text', 'glossaryTerms'],
    path
  ));

  // Validate data types
  errors.push(...validateDataTypes(
    clause as unknown as Record<string, unknown>,
    { id: 'string', number: 'string', type: 'string', text: 'string' },
    path
  ));

  // Validate type field value
  if (clause.type !== 'clause') {
    errors.push({
      path,
      field: 'type',
      message: `Invalid type value: expected 'clause', got '${clause.type}'`,
      severity: 'error',
    });
  }

  // Validate glossaryTerms is an array
  if (clause.glossaryTerms && !Array.isArray(clause.glossaryTerms)) {
    errors.push({
      path,
      field: 'glossaryTerms',
      message: 'Field glossaryTerms must be an array',
      severity: 'error',
    });
  }

  // Validate content if present (replaces subclauses in new structure)
  if (clause.content) {
    if (!Array.isArray(clause.content)) {
      errors.push({
        path,
        field: 'content',
        message: 'Field content must be an array',
        severity: 'error',
      });
    } else {
      clause.content.forEach((contentNode, index) => {
        // Validate based on content node type
        if (contentNode.type === 'subclause') {
          errors.push(...validateSubclause(contentNode as any, `${path}.content[${index}]`));
        }
        // Tables, Figures, Equations would be validated here
      });
    }
  }

  return errors;
}

/**
 * Validate a subclause structure
 */
function validateSubclause(subclause: Subclause, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  errors.push(...validateRequiredFields(
    subclause as unknown as Record<string, unknown>,
    ['id', 'number', 'type', 'text', 'glossaryTerms'],
    path
  ));

  // Validate data types
  errors.push(...validateDataTypes(
    subclause as unknown as Record<string, unknown>,
    { id: 'string', number: 'string', type: 'string', text: 'string' },
    path
  ));

  // Validate type field value
  if (subclause.type !== 'subclause') {
    errors.push({
      path,
      field: 'type',
      message: `Invalid type value: expected 'subclause', got '${subclause.type}'`,
      severity: 'error',
    });
  }

  // Validate glossaryTerms is an array
  if (subclause.glossaryTerms && !Array.isArray(subclause.glossaryTerms)) {
    errors.push({
      path,
      field: 'glossaryTerms',
      message: 'Field glossaryTerms must be an array',
      severity: 'error',
    });
  }

  // Validate content if present (replaces tables/figures/equations in new structure)
  if (subclause.content) {
    if (!Array.isArray(subclause.content)) {
      errors.push({
        path,
        field: 'content',
        message: 'Field content must be an array',
        severity: 'error',
      });
    } else {
      subclause.content.forEach((contentNode, index) => {
        // Validate based on content node type
        if (contentNode.type === 'table') {
          errors.push(...validateRequiredFields(
            contentNode as unknown as Record<string, unknown>,
            ['id', 'number', 'title', 'rows'],
            `${path}.content[${index}]`
          ));
        }
        // Figures, Equations would be validated here
      });
    }
  }

  // Validate figures if present (legacy structure)
  if ('figures' in subclause && subclause.figures) {
    if (!Array.isArray(subclause.figures)) {
      errors.push({
        path,
        field: 'figures',
        message: 'Field figures must be an array',
        severity: 'error',
      });
    } else {
      subclause.figures.forEach((figure, index) => {
        errors.push(...validateRequiredFields(
          figure as unknown as Record<string, unknown>,
          ['id', 'number', 'title', 'imageUrl', 'altText'],
          `${path}.figures[${index}]`
        ));
      });
    }
  }

  // Validate equations if present (legacy structure)
  if ('equations' in subclause && subclause.equations) {
    if (!Array.isArray(subclause.equations)) {
      errors.push({
        path,
        field: 'equations',
        message: 'Field equations must be an array',
        severity: 'error',
      });
    } else {
      subclause.equations.forEach((equation, index) => {
        errors.push(...validateRequiredFields(
          equation as unknown as Record<string, unknown>,
          ['id', 'number', 'latex'],
          `${path}.equations[${index}]`
        ));
      });
    }
  }

  return errors;
}

/**
 * Validate that all cross-references point to existing content
 * @param document - BCBC document to validate
 * @returns Array of validation errors for invalid cross-references
 */
export function validateCrossReferences(document: BCBCDocument): ValidationError[] {
  const errors: ValidationError[] = [];

  // Early return if volumes is not valid
  if (!document.volumes || !Array.isArray(document.volumes)) {
    return errors;
  }

  // Build a set of all valid content IDs
  const validIds = new Set<string>();

  // Get divisions from volumes
  const divisions = document.volumes.flatMap(v => v.divisions || []);

  // Add all division, part, section, subsection, article, and clause IDs
  for (const division of divisions) {
    if (!division || typeof division !== 'object') continue;
    
    validIds.add(division.id);
    
    if (!division.parts || !Array.isArray(division.parts)) continue;
    
    for (const part of division.parts) {
      if (!part || typeof part !== 'object') continue;
      
      validIds.add(part.id);
      
      if (!part.sections || !Array.isArray(part.sections)) continue;
      
      for (const section of part.sections) {
        if (!section || typeof section !== 'object') continue;
        
        validIds.add(section.id);
        
        if (!section.subsections || !Array.isArray(section.subsections)) continue;
        
        for (const subsection of section.subsections) {
          if (!subsection || typeof subsection !== 'object') continue;
          
          validIds.add(subsection.id);
          
          if (!subsection.articles || !Array.isArray(subsection.articles)) continue;
          
          for (const article of subsection.articles) {
            if (!article || typeof article !== 'object') continue;
            
            validIds.add(article.id);
            
            // Use content array instead of sentences
            if (!article.content || !Array.isArray(article.content)) continue;
            
            for (const contentNode of article.content) {
              if (!contentNode || typeof contentNode !== 'object') continue;
              
              validIds.add(contentNode.id);
              // Add clause and subclause IDs recursively for sentences
              if (contentNode.type === 'sentence' && 'content' in contentNode && contentNode.content && Array.isArray(contentNode.content)) {
                for (const clauseNode of contentNode.content) {
                  validIds.add(clauseNode.id);
                  addClauseIds(clauseNode as any, validIds);
                }
              }
            }
          }
        }
      }
    }
  }

  // Add glossary term IDs
  if (document.glossary && Array.isArray(document.glossary)) {
    for (const entry of document.glossary) {
      if (entry && typeof entry === 'object' && entry.id) {
        validIds.add(entry.id);
      }
    }
  }

  // Validate glossary term references in sentences, clauses, and subclauses
  for (const division of divisions) {
    if (!division || typeof division !== 'object' || !division.parts || !Array.isArray(division.parts)) continue;
    
    for (const part of division.parts) {
      if (!part || typeof part !== 'object' || !part.sections || !Array.isArray(part.sections)) continue;
      
      for (const section of part.sections) {
        if (!section || typeof section !== 'object' || !section.subsections || !Array.isArray(section.subsections)) continue;
        
        for (const subsection of section.subsections) {
          if (!subsection || typeof subsection !== 'object' || !subsection.articles || !Array.isArray(subsection.articles)) continue;
          
          for (const article of subsection.articles) {
            // Use content array instead of sentences
            if (!article || typeof article !== 'object' || !article.content || !Array.isArray(article.content)) continue;
            
            const glossaryIds = document.glossary && Array.isArray(document.glossary)
              ? document.glossary.map(g => g.id)
              : [];
            
            for (const contentNode of article.content) {
              if (!contentNode || typeof contentNode !== 'object') continue;
              
              // Only validate sentences (skip tables, figures, etc.)
              if (contentNode.type !== 'sentence') continue;
              
              // Validate sentence glossary terms
              errors.push(...validateSentenceReferences(
                contentNode as any,
                validIds,
                glossaryIds,
                `${division.id}.${part.id}.${section.id}.${subsection.id}.${article.id}.${contentNode.id}`
              ));
              
              // Validate clauses within sentence
              if ('content' in contentNode && contentNode.content && Array.isArray(contentNode.content)) {
                for (const clauseNode of contentNode.content) {
                  if (!clauseNode || typeof clauseNode !== 'object') continue;
                  
                  // Only validate clauses
                  if (clauseNode.type !== 'clause') continue;
                  
                  errors.push(...validateClauseReferences(
                    clauseNode as any,
                    validIds,
                    glossaryIds,
                    `${division.id}.${part.id}.${section.id}.${subsection.id}.${article.id}.${contentNode.id}.${clauseNode.id}`
                  ));
                }
              }
            }
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Recursively add clause and subclause IDs to the set
 */
function addClauseIds(clause: Clause, ids: Set<string>): void {
  // Use content array instead of subclauses
  if (clause.content) {
    for (const contentNode of clause.content) {
      if (contentNode.type === 'subclause') {
        ids.add(contentNode.id);
      }
    }
  }
}

/**
 * Validate references within a sentence
 */
function validateSentenceReferences(
  sentence: Sentence,
  _validIds: Set<string>,
  glossaryIds: string[],
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate glossary term references
  for (const termId of sentence.glossaryTerms) {
    if (!glossaryIds.includes(termId)) {
      errors.push({
        path,
        field: 'glossaryTerms',
        message: `Invalid glossary term reference: '${termId}' does not exist in glossary`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate references within a clause
 */
function validateClauseReferences(
  clause: Clause,
  validIds: Set<string>,
  glossaryIds: string[],
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate glossary term references
  for (const termId of clause.glossaryTerms) {
    if (!glossaryIds.includes(termId)) {
      errors.push({
        path,
        field: 'glossaryTerms',
        message: `Invalid glossary term reference: '${termId}' does not exist in glossary`,
        severity: 'error',
      });
    }
  }

  // Recursively validate subclauses (use content array)
  if (clause.content) {
    for (const contentNode of clause.content) {
      if (contentNode.type === 'subclause') {
        errors.push(...validateSubclauseReferences(contentNode as any, validIds, glossaryIds, `${path}.${contentNode.id}`));
      }
    }
  }

  return errors;
}

/**
 * Validate references within a subclause
 */
function validateSubclauseReferences(
  subclause: Subclause,
  _validIds: Set<string>,
  glossaryIds: string[],
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate glossary term references
  for (const termId of subclause.glossaryTerms) {
    if (!glossaryIds.includes(termId)) {
      errors.push({
        path,
        field: 'glossaryTerms',
        message: `Invalid glossary term reference: '${termId}' does not exist in glossary`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate required fields are present
 * @param obj - Object to validate
 * @param requiredFields - Array of required field names
 * @param path - Path to object for error reporting
 * @returns Array of validation errors
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  requiredFields: string[],
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      errors.push({
        path,
        field,
        message: `Missing required field: ${field}`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate data types match expected schema
 * @param obj - Object to validate
 * @param schema - Schema definition with field types
 * @param path - Path to object for error reporting
 * @returns Array of validation errors
 */
export function validateDataTypes(
  obj: Record<string, unknown>,
  schema: Record<string, string>,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, expectedType] of Object.entries(schema)) {
    if (field in obj && obj[field] !== undefined && obj[field] !== null) {
      const actualType = typeof obj[field];
      if (actualType !== expectedType) {
        errors.push({
          path,
          field,
          message: `Invalid type for field ${field}: expected ${expectedType}, got ${actualType}`,
          severity: 'error',
        });
      }
    }
  }

  return errors;
}
