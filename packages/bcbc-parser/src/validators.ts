/**
 * BCBC JSON validation logic
 */

import type { BCBCDocument, ValidationError } from './types';

/**
 * Validate BCBC document structure
 * @param document - BCBC document to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateBCBC(document: BCBCDocument): ValidationError[] {
  // TODO: Implement validation logic in Sprint 1
  // This is a placeholder that will be implemented during task 8
  const errors: ValidationError[] = [];

  if (!document.metadata) {
    errors.push({
      path: 'root',
      field: 'metadata',
      message: 'Missing required field: metadata',
      severity: 'error',
    });
  }

  if (!document.divisions || document.divisions.length === 0) {
    errors.push({
      path: 'root',
      field: 'divisions',
      message: 'Missing required field: divisions',
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate that all cross-references point to existing content
 * @param document - BCBC document to validate
 * @returns Array of validation errors for invalid cross-references
 */
export function validateCrossReferences(document: BCBCDocument): ValidationError[] {
  // TODO: Implement cross-reference validation in Sprint 1
  // This is a placeholder that will be implemented during task 8
  const errors: ValidationError[] = [];
  
  // Suppress unused variable warning until implementation
  void document;
  
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
