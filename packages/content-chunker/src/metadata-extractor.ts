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
  type: 'volume' | 'division' | 'part' | 'section' | 'subsection' | 'article';
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
    amendmentDates: document.amendmentDates || [],
    contentTypes: extractContentTypes(document),
    quickAccess: extractQuickAccess(document),
  };
}

/**
 * Extract navigation tree from BCBC document
 * 
 * Generates a hierarchical navigation structure:
 * Volume → Preface/Divisions/Index/Conversions → Part → Section → Subsection → Article
 * 
 * @param document - BCBC document
 * @returns Navigation tree
 */
export function extractNavigationTree(document: BCBCDocument): NavigationNode[] {
  const tree: NavigationNode[] = [];

  // Process each volume
  for (const volume of document.volumes) {
    const volumeNode: NavigationNode = {
      id: volume.id,
      type: 'volume',
      number: volume.number.toString(),
      title: `Volume ${volume.number}`,
      path: `/volume/${volume.number}`,
      children: [],
    };

    // IMPORTANT: Maintain order as they appear in the volume

    // 1. Add Preface (if exists in this volume)
    if (volume.preface) {
      volumeNode.children?.push({
        id: volume.preface.id,
        type: 'article',
        title: 'Preface',
        path: `/code/preface`,
      });
    }

    // 2. Add divisions for this volume (in order)
    for (const division of volume.divisions) {
      volumeNode.children?.push(buildDivisionNode(division));
    }

    // 3. Add Index (if exists in this volume)
    if (volume.index) {
      volumeNode.children?.push({
        id: volume.index.id,
        type: 'article',
        title: 'Index',
        path: `/code/index`,
      });
    }

    // 4. Add Conversion Factors (if exists in this volume)
    if (volume.conversions) {
      volumeNode.children?.push({
        id: volume.conversions.id,
        type: 'article',
        title: volume.conversions.table_title || 'Conversion Factors',
        path: `/code/conversions`,
      });
    }

    tree.push(volumeNode);
  }

  return tree;
}

/**
 * Build a division node with hierarchical numbering
 * @param division - Division to build node for
 * @returns Division navigation node
 */
function buildDivisionNode(division: any): NavigationNode {
  const divisionNode: NavigationNode = {
    id: division.id,
    type: 'division',
    title: division.letter ? `Division ${division.letter} - ${division.title}` : division.title,
    path: `/code/${division.id}`,
    children: [],
  };

  for (const part of division.parts) {
    const partNode: NavigationNode = {
      id: part.id,
      type: 'part',
      number: part.number,
      title: `Part ${part.number} - ${part.title}`,
      path: `/code/${division.id}/${part.number}`,
      children: [],
    };

    for (const section of part.sections) {
      // NEW: Hierarchical numbering (Part.Section)
      const sectionNumber = `${part.number}.${section.number}`;
      const sectionNode: NavigationNode = {
        id: section.id,
        type: 'section',
        number: sectionNumber,
        title: `${sectionNumber} ${section.title}`,
        path: `/code/${division.id}/${part.number}/${section.number}`,
        children: [],
      };

      for (const subsection of section.subsections) {
        // NEW: Hierarchical numbering (Part.Section.Subsection)
        const subsectionNumber = `${sectionNumber}.${subsection.number}`;
        const subsectionNode: NavigationNode = {
          id: subsection.id,
          type: 'subsection',
          number: subsectionNumber,
          title: `${subsectionNumber} ${subsection.title}`,
          path: `/code/${division.id}/${part.number}/${section.number}/${subsection.number}`,
          children: [],
        };

        for (const article of subsection.articles) {
          // NEW: Hierarchical numbering (Part.Section.Subsection.Article)
          const articleNumber = `${subsectionNumber}.${article.number}`;
          const articleNode: NavigationNode = {
            id: article.id,
            type: 'article',
            number: articleNumber,
            title: `${articleNumber} ${article.title}`,
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

  return divisionNode;
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
 * - Table: Tables within content
 * - Figure: Figures/images within content
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

  // Get divisions from volumes
  const divisions = document.volumes.flatMap(v => v.divisions);

  // Scan through all divisions, parts, sections, subsections, and articles
  for (const division of divisions) {
    for (const part of division.parts) {
      for (const section of part.sections) {
        for (const subsection of section.subsections) {
          for (const article of subsection.articles) {
            // Scan article content for content types
            scanContentForTypes(article.content, contentTypesSet);
          }
        }
      }
    }
  }

  return Array.from(contentTypesSet);
}

/**
 * Recursively scan content array for content types
 * @param content - Array of content nodes to scan
 * @param contentTypesSet - Set to add found content types to
 */
function scanContentForTypes(
  content: any[],
  contentTypesSet: Set<ContentType>
): void {
  if (!content || !Array.isArray(content)) {
    return;
  }

  for (const node of content) {
    // Check node type and add to set
    switch (node.type) {
      case 'table':
        contentTypesSet.add('table');
        break;
      case 'figure':
        contentTypesSet.add('figure');
        break;
      case 'note':
        contentTypesSet.add('note');
        // Check if it's an application note
        if (node.noteTitle?.toLowerCase().includes('application')) {
          contentTypesSet.add('application-note');
        }
        break;
      case 'sentence':
      case 'clause':
      case 'subclause':
        // Recursively scan nested content
        if (node.content) {
          scanContentForTypes(node.content, contentTypesSet);
        }
        break;
    }
  }
}

/**
 * Extract quick access sections from BCBC document
 * 
 * Returns exactly 3 predefined quick access pins:
 * 1. Division A - Part 1 (Compliance)
 * 2. Division B - Part 9 (Housing and Small Buildings)
 * 3. Division B - Part 3 (Fire Protection, Occupant Safety and Accessibility)
 * 
 * @param document - BCBC document
 * @returns Array of 3 quick access sections
 */
export function extractQuickAccess(document: BCBCDocument): QuickAccessSection[] {
  const quickAccess: QuickAccessSection[] = [];

  // Get divisions from volumes
  const divisions = document.volumes.flatMap(v => v.divisions);

  // Define the 3 specific pins we want
  const targetPins = [
    { divisionId: 'nbc.divA', partNumber: '1', title: 'Division A - Part 1', description: 'Compliance' },
    { divisionId: 'nbc.divBV2', partNumber: '9', title: 'Division B - Part 9', description: 'Housing and Small Buildings' },
    { divisionId: 'nbc.divB', partNumber: '3', title: 'Division B - Part 3', description: 'Fire Protection, Occupant Safety and Accessibility' },
  ];

  // Find and add each target pin
  for (const target of targetPins) {
    const division = divisions.find(d => d.id === target.divisionId);
    if (division) {
      const part = division.parts.find(p => p.number === target.partNumber);
      if (part) {
        quickAccess.push({
          id: `${division.id}.part${part.number}`,
          title: target.title,
          path: `/code/${division.id}/${part.number}`,
          description: target.description,
        });
      }
    }
  }

  return quickAccess;
}
