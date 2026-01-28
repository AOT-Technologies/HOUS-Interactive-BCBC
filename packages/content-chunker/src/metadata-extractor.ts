/**
 * Metadata extraction logic
 */

import type {
  BCBCDocument,
  GlossaryEntry,
  AmendmentDate,
  ContentType,
} from '@bc-building-code/bcbc-parser';

/**
 * Navigation tree node
 */
export interface NavigationNode {
  id: string;
  type: 'division' | 'part' | 'section' | 'subsection' | 'article';
  number?: string;
  title: string;
  path: string;
  children?: NavigationNode[];
}

/**
 * Quick access section
 */
export interface QuickAccessSection {
  id: string;
  title: string;
  path: string;
  description?: string;
}

/**
 * Extracted metadata
 */
export interface ExtractedMetadata {
  navigationTree: NavigationNode[];
  glossaryMap: Record<string, GlossaryEntry>;
  amendmentDates: AmendmentDate[];
  contentTypes: ContentType[];
  quickAccess: QuickAccessSection[];
}

/**
 * Extract all metadata from BCBC document
 * @param document - BCBC document
 * @returns Extracted metadata
 */
export function extractMetadata(document: BCBCDocument): ExtractedMetadata {
  // TODO: Implement metadata extraction in Sprint 1
  // This is a placeholder that will be implemented during task 10
  return {
    navigationTree: extractNavigationTree(document),
    glossaryMap: extractGlossaryMap(document),
    amendmentDates: document.amendmentDates,
    contentTypes: extractContentTypes(document),
    quickAccess: extractQuickAccess(document),
  };
}

/**
 * Extract navigation tree from BCBC document
 * @param document - BCBC document
 * @returns Navigation tree
 */
export function extractNavigationTree(document: BCBCDocument): NavigationNode[] {
  // TODO: Implement navigation tree extraction in Sprint 1
  // This is a placeholder that will be implemented during task 10
  const tree: NavigationNode[] = [];

  for (const division of document.divisions) {
    const divisionNode: NavigationNode = {
      id: division.id,
      type: 'division',
      title: division.title,
      path: `/code/${division.id}`,
      children: [],
    };

    for (const part of division.parts) {
      const partNode: NavigationNode = {
        id: part.id,
        type: 'part',
        number: part.number,
        title: part.title,
        path: `/code/${division.id}/${part.number}`,
        children: [],
      };

      divisionNode.children?.push(partNode);
    }

    tree.push(divisionNode);
  }

  return tree;
}

/**
 * Extract glossary map from BCBC document
 * @param document - BCBC document
 * @returns Glossary map (term → entry)
 */
export function extractGlossaryMap(
  document: BCBCDocument
): Record<string, GlossaryEntry> {
  // TODO: Implement glossary map extraction in Sprint 1
  // This is a placeholder that will be implemented during task 10
  const glossaryMap: Record<string, GlossaryEntry> = {};

  for (const entry of document.glossary) {
    glossaryMap[entry.term.toLowerCase()] = entry;
  }

  return glossaryMap;
}

/**
 * Extract content types from BCBC document
 * @param document - BCBC document
 * @returns Array of content types
 */
export function extractContentTypes(document: BCBCDocument): ContentType[] {
  // TODO: Implement content types extraction in Sprint 1
  // This is a placeholder that will be implemented during task 10
  
  // Suppress unused variable warning until implementation
  void document;
  
  return ['article', 'table', 'figure', 'note', 'application-note'];
}

/**
 * Extract quick access sections from BCBC document
 * @param document - BCBC document
 * @returns Array of quick access sections
 */
export function extractQuickAccess(document: BCBCDocument): QuickAccessSection[] {
  // TODO: Implement quick access extraction in Sprint 1
  // This is a placeholder that will be implemented during task 10
  const quickAccess: QuickAccessSection[] = [];

  // Suppress unused variable warning until implementation
  void document;

  return quickAccess;
}
