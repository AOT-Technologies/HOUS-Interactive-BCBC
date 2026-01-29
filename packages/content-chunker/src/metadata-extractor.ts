/**
 * Metadata extraction logic
 */

import type {
  BCBCDocument,
  GlossaryEntry,
  AmendmentDate,
  ContentType,
  Clause,
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
 * 
 * Generates all metadata files needed for the application:
 * - Navigation tree: Hierarchical structure for sidebar
 * - Glossary map: Term definitions for inline glossary
 * - Amendment dates: Available effective dates for filtering
 * - Content types: Available content types for search filters
 * - Quick access: Frequently accessed sections for homepage
 * 
 * @param document - BCBC document
 * @returns Extracted metadata
 */
export function extractMetadata(document: BCBCDocument): ExtractedMetadata {
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
 * 
 * Generates a hierarchical navigation structure following:
 * Division → Part → Section → Subsection → Article
 * 
 * @param document - BCBC document
 * @returns Navigation tree
 */
export function extractNavigationTree(document: BCBCDocument): NavigationNode[] {
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

      for (const section of part.sections) {
        const sectionNode: NavigationNode = {
          id: section.id,
          type: 'section',
          number: section.number,
          title: section.title,
          path: `/code/${division.id}/${part.number}/${section.number}`,
          children: [],
        };

        for (const subsection of section.subsections) {
          const subsectionNode: NavigationNode = {
            id: subsection.id,
            type: 'subsection',
            number: subsection.number,
            title: subsection.title,
            path: `/code/${division.id}/${part.number}/${section.number}/${subsection.number}`,
            children: [],
          };

          for (const article of subsection.articles) {
            const articleNode: NavigationNode = {
              id: article.id,
              type: 'article',
              number: article.number,
              title: article.title,
              path: `/code/${division.id}/${part.number}/${section.number}/${subsection.number}/${article.number}`,
            };

            subsectionNode.children?.push(articleNode);
          }

          sectionNode.children?.push(subsectionNode);
        }

        partNode.children?.push(sectionNode);
      }

      divisionNode.children?.push(partNode);
    }

    tree.push(divisionNode);
  }

  return tree;
}

/**
 * Extract glossary map from BCBC document
 * 
 * Creates a map of term (lowercase) → glossary entry for quick lookups.
 * 
 * @param document - BCBC document
 * @returns Glossary map (term → entry)
 */
export function extractGlossaryMap(
  document: BCBCDocument
): Record<string, GlossaryEntry> {
  const glossaryMap: Record<string, GlossaryEntry> = {};

  for (const entry of document.glossary) {
    // Use lowercase term as key for case-insensitive lookups
    glossaryMap[entry.term.toLowerCase()] = entry;
  }

  return glossaryMap;
}

/**
 * Extract content types from BCBC document
 * 
 * Scans the document to identify all content types present:
 * - Article: Standard code articles
 * - Table: Tables within clauses
 * - Figure: Figures/images within clauses
 * - Note: Note references in articles
 * - Application Note: Special application notes
 * 
 * @param document - BCBC document
 * @returns Array of content types found in the document
 */
export function extractContentTypes(document: BCBCDocument): ContentType[] {
  const contentTypesSet = new Set<ContentType>();

  // Always include 'article' as it's the base content type
  contentTypesSet.add('article');

  // Scan through all divisions, parts, sections, subsections, and articles
  for (const division of document.divisions) {
    for (const part of division.parts) {
      for (const section of part.sections) {
        for (const subsection of section.subsections) {
          for (const article of subsection.articles) {
            // Check for notes
            if (article.notes && article.notes.length > 0) {
              contentTypesSet.add('note');
              
              // Check if any notes are application notes
              for (const note of article.notes) {
                if (note.noteTitle?.toLowerCase().includes('application')) {
                  contentTypesSet.add('application-note');
                }
              }
            }

            // Check clauses for tables and figures
            scanClausesForContentTypes(article.clauses, contentTypesSet);
          }
        }
      }
    }
  }

  return Array.from(contentTypesSet);
}

/**
 * Recursively scan clauses for tables and figures
 * @param clauses - Array of clauses to scan
 * @param contentTypesSet - Set to add found content types to
 */
function scanClausesForContentTypes(
  clauses: Clause[],
  contentTypesSet: Set<ContentType>
): void {
  for (const clause of clauses) {
    // Check for tables
    if (clause.tables && clause.tables.length > 0) {
      contentTypesSet.add('table');
    }

    // Check for figures
    if (clause.figures && clause.figures.length > 0) {
      contentTypesSet.add('figure');
    }

    // Recursively check subclauses
    if (clause.subclauses && clause.subclauses.length > 0) {
      scanClausesForContentTypes(clause.subclauses, contentTypesSet);
    }
  }
}

/**
 * Extract quick access sections from BCBC document
 * 
 * Identifies frequently accessed sections for the homepage.
 * Currently returns the first section from each part as a starting point.
 * This can be customized based on usage analytics or manual curation.
 * 
 * @param document - BCBC document
 * @returns Array of quick access sections
 */
export function extractQuickAccess(document: BCBCDocument): QuickAccessSection[] {
  const quickAccess: QuickAccessSection[] = [];

  // Extract first section from each part as quick access
  // This provides a representative sample across the code
  for (const division of document.divisions) {
    for (const part of division.parts) {
      if (part.sections.length > 0) {
        const section = part.sections[0];
        quickAccess.push({
          id: section.id,
          title: `${part.title} - ${section.title}`,
          path: `/code/${division.id}/${part.number}/${section.number}`,
          description: `${division.title}, Part ${part.number}, Section ${section.number}`,
        });
      }
    }
  }

  return quickAccess;
}
