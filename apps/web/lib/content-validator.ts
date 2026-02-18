/**
 * Content Validation Utilities
 * 
 * Validates JSON structure and required fields for section content.
 * Logs validation errors to console for debugging.
 */

import type { Section } from '@bc-building-code/bcbc-parser';

export interface ValidationError {
  field: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates section content structure
 */
export function validateSectionContent(content: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if content exists
  if (!content) {
    errors.push({
      field: 'content',
      message: 'Content is null or undefined',
    });
    return { valid: false, errors };
  }

  // Check required fields
  if (!content.id) {
    errors.push({
      field: 'id',
      message: 'Missing required field: id',
    });
  }

  if (!content.reference) {
    errors.push({
      field: 'reference',
      message: 'Missing required field: reference',
    });
  }

  if (!content.title) {
    errors.push({
      field: 'title',
      message: 'Missing required field: title',
    });
  }

  // Check subsections array
  if (!Array.isArray(content.subsections)) {
    errors.push({
      field: 'subsections',
      message: 'Missing or invalid field: subsections (must be an array)',
    });
  } else {
    // Validate each subsection
    content.subsections.forEach((subsection: any, index: number) => {
      const subsectionErrors = validateSubsection(subsection, `subsections[${index}]`);
      errors.push(...subsectionErrors);
    });
  }

  const valid = errors.length === 0;

  // Log errors to console
  if (!valid) {
    console.error('Content validation failed:', errors);
  }

  return { valid, errors };
}

/**
 * Validates subsection structure
 */
function validateSubsection(subsection: any, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!subsection.id) {
    errors.push({
      field: 'id',
      message: 'Missing required field: id',
      path,
    });
  }

  if (!subsection.reference) {
    errors.push({
      field: 'reference',
      message: 'Missing required field: reference',
      path,
    });
  }

  if (!subsection.title) {
    errors.push({
      field: 'title',
      message: 'Missing required field: title',
      path,
    });
  }

  if (!Array.isArray(subsection.articles)) {
    errors.push({
      field: 'articles',
      message: 'Missing or invalid field: articles (must be an array)',
      path,
    });
  } else {
    // Validate each article
    subsection.articles.forEach((article: any, index: number) => {
      const articleErrors = validateArticle(article, `${path}.articles[${index}]`);
      errors.push(...articleErrors);
    });
  }

  return errors;
}

/**
 * Validates article structure
 */
function validateArticle(article: any, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!article.id) {
    errors.push({
      field: 'id',
      message: 'Missing required field: id',
      path,
    });
  }

  if (!article.reference) {
    errors.push({
      field: 'reference',
      message: 'Missing required field: reference',
      path,
    });
  }

  if (!article.title) {
    errors.push({
      field: 'title',
      message: 'Missing required field: title',
      path,
    });
  }

  if (!Array.isArray(article.content)) {
    errors.push({
      field: 'content',
      message: 'Missing or invalid field: content (must be an array)',
      path,
    });
  }

  return errors;
}

/**
 * Validates cross-reference targets exist in navigation tree
 */
export function validateCrossReferences(
  content: Section,
  navigationTree: any[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const allReferences = extractAllReferences(content);

  allReferences.forEach((ref) => {
    const exists = findNodeById(navigationTree, ref);
    if (!exists) {
      errors.push({
        field: 'crossReference',
        message: `Cross-reference target not found: ${ref}`,
      });
      console.warn(`Cross-reference target not found: ${ref}`);
    }
  });

  return errors;
}

/**
 * Extracts all cross-reference IDs from content
 */
function extractAllReferences(content: any): string[] {
  const references: string[] = [];

  const extractFromText = (text: string) => {
    const refPattern = /\[REF:internal:([^\]]+)\]/g;
    let match;
    while ((match = refPattern.exec(text)) !== null) {
      references.push(match[1]);
    }
  };

  const traverse = (node: any) => {
    if (!node) return;

    if (typeof node.text === 'string') {
      extractFromText(node.text);
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }

    if (Array.isArray(node.subsections)) {
      node.subsections.forEach(traverse);
    }

    if (Array.isArray(node.articles)) {
      node.articles.forEach(traverse);
    }
  };

  traverse(content);
  return references;
}

/**
 * Finds a node by ID in navigation tree
 */
function findNodeById(nodes: any[], targetId: string): any | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node;
    }

    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, targetId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Type guard to check if content is valid Section
 */
export function isValidSection(content: any): content is Section {
  return (
    content &&
    typeof content.id === 'string' &&
    typeof content.reference === 'string' &&
    typeof content.title === 'string' &&
    Array.isArray(content.subsections)
  );
}
