/**
 * Revision Filtering Utilities
 * 
 * Filters content based on effective date to show the correct revision
 */

import type { Sentence, Clause, Subclause, Revision } from './types';

/**
 * Get the text content for a node based on effective date
 * Returns the text from the latest revision that is valid on or before the given date
 * 
 * @param node - Content node with revisions
 * @param effectiveDate - Date to filter by (YYYY-MM-DD format)
 * @returns The text content valid on the given date
 */
export function getTextForDate(
  node: { text: string; revisions?: Revision[] },
  effectiveDate: string
): string {
  // If no revisions, return original text
  if (!node.revisions || node.revisions.length === 0) {
    return node.text;
  }

  // Find all revisions that are valid on or before the effective date
  const validRevisions = node.revisions
    .filter(rev => rev.effective_date <= effectiveDate)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date)); // Sort descending

  // If no valid revisions, return original text
  if (validRevisions.length === 0) {
    return node.text;
  }

  // Return the text from the most recent valid revision
  const latestRevision = validRevisions[0];
  return latestRevision.text || node.text;
}

/**
 * Check if a node should be visible based on effective date
 * A node is hidden if it has a 'deleted' revision that is valid on the given date
 * 
 * @param node - Content node with revisions
 * @param effectiveDate - Date to filter by (YYYY-MM-DD format)
 * @returns true if the node should be visible, false if deleted
 */
export function isVisibleOnDate(
  node: { revisions?: Revision[] },
  effectiveDate: string
): boolean {
  if (!node.revisions || node.revisions.length === 0) {
    return true;
  }

  // Find all revisions that are valid on or before the effective date
  const validRevisions = node.revisions
    .filter(rev => rev.effective_date <= effectiveDate)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date)); // Sort descending

  if (validRevisions.length === 0) {
    return true;
  }

  // Check if the latest valid revision marks this as deleted
  const latestRevision = validRevisions[0];
  return !latestRevision.deleted;
}

/**
 * Filter a sentence's content based on effective date
 * Returns a new sentence with filtered text and content
 * 
 * @param sentence - Sentence to filter
 * @param effectiveDate - Date to filter by (YYYY-MM-DD format)
 * @returns Filtered sentence or null if deleted
 */
export function filterSentence(
  sentence: Sentence,
  effectiveDate: string
): Sentence | null {
  // Check if sentence is visible
  if (!isVisibleOnDate(sentence, effectiveDate)) {
    return null;
  }

  // Get the correct text for this date
  const text = getTextForDate(sentence, effectiveDate);

  // Filter nested content (clauses)
  const filteredContent = sentence.content
    ?.map(item => {
      if (item.type === 'clause') {
        return filterClause(item as Clause, effectiveDate);
      }
      // Tables, figures, equations don't have revisions (yet)
      return item;
    })
    .filter(item => item !== null);

  return {
    ...sentence,
    text,
    content: filteredContent && filteredContent.length > 0 ? filteredContent : undefined,
  };
}

/**
 * Filter a clause's content based on effective date
 * Returns a new clause with filtered text and content
 * 
 * @param clause - Clause to filter
 * @param effectiveDate - Date to filter by (YYYY-MM-DD format)
 * @returns Filtered clause or null if deleted
 */
export function filterClause(
  clause: Clause,
  effectiveDate: string
): Clause | null {
  // Check if clause is visible
  if (!isVisibleOnDate(clause, effectiveDate)) {
    return null;
  }

  // Get the correct text for this date
  const text = getTextForDate(clause, effectiveDate);

  // Filter nested content (subclauses)
  const filteredContent = clause.content
    ?.map(item => {
      if (item.type === 'subclause') {
        return filterSubclause(item as Subclause, effectiveDate);
      }
      // Tables, figures, equations don't have revisions (yet)
      return item;
    })
    .filter(item => item !== null);

  return {
    ...clause,
    text,
    content: filteredContent && filteredContent.length > 0 ? filteredContent : undefined,
  };
}

/**
 * Filter a subclause's content based on effective date
 * Returns a new subclause with filtered text
 * 
 * @param subclause - Subclause to filter
 * @param effectiveDate - Date to filter by (YYYY-MM-DD format)
 * @returns Filtered subclause or null if deleted
 */
export function filterSubclause(
  subclause: Subclause,
  effectiveDate: string
): Subclause | null {
  // Check if subclause is visible
  if (!isVisibleOnDate(subclause, effectiveDate)) {
    return null;
  }

  // Get the correct text for this date
  const text = getTextForDate(subclause, effectiveDate);

  return {
    ...subclause,
    text,
  };
}

/**
 * Get the latest effective date from all revisions in the document
 * This is used as the default date when no date is specified in the URL
 * 
 * @param revisions - Array of revisions
 * @returns Latest effective date or current date
 */
export function getLatestEffectiveDate(revisions: Revision[]): string {
  if (!revisions || revisions.length === 0) {
    return new Date().toISOString().split('T')[0]; // Current date
  }

  const dates = revisions.map(rev => rev.effective_date).sort();
  return dates[dates.length - 1];
}
