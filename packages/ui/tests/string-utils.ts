/**
 * String utility functions for UI components
 */

import { ReactNode } from 'react';

/**
 * Capitalize the first letter of a string
 */
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert string to kebab-case
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

/**
 * Truncate string to specified length
 */
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
};

/**
 * Parse a string that may contain HTML-like component syntax and return React nodes
 * For testing purposes, this simply returns the string as-is
 */
export const parseStringToComponents = (str: string): ReactNode => {
  // For testing, just return the string - the actual implementation
  // would parse HTML-like syntax and return React components
  return str;
};
