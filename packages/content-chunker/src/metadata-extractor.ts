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
  type: 'volume' | 'division' | 'part' | 'section' | 'subsection' | 'article' | 'part_appendix' | 'division_appendix' | 'spectables' | 'index' | 'conversions';
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
 * Functional statement entry
 */
export interface FunctionalStatement {
  id: string;
  key: string;
  definition: string;
  source?: 'nbc' | 'bc';
}

/**
 * Objective entry
 */
export interface Objective {
  id: string;
  key: string;
  title: string;
  definition: string;
  source?: 'nbc' | 'bc';
  subObjectives?: SubObjective[];
}

/**
 * Sub-objective entry
 */
export interface SubObjective {
  id: string;
  key: string;
  title: string;
  definition: string;
  source?: 'nbc' | 'bc';
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
  functionalStatements: Record<string, FunctionalStatement>;
  objectives: Record<string, Objective | SubObjective>;
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
 * - Functional statements: Function definitions for objective-based code
 * - Objectives: Objective and sub-objective definitions
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
    functionalStatements: extractFunctionalStatements(document),
    objectives: extractObjectives(document),
  };
}

/**
 * Extract navigation tree from BCBC document
 * 
 * Generates a hierarchical navigation structure:
 * Volume → Preface/Divisions → Index → Conversion Factors → Part → Section → Subsection → Article
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

    // 1. Add Front Matter sections (if they exist in this volume)
    if (volume.frontMatter) {
      const frontMatterChildren: NavigationNode[] = [];

      // Add Preface
      if (volume.frontMatter.preface) {
        frontMatterChildren.push({
          id: volume.frontMatter.preface.id,
          type: 'article',
          title: 'Preface',
          path: `/code/front-matter/preface`,
        });
      }

      // Add Introduction
      if (volume.frontMatter.introduction) {
        frontMatterChildren.push({
          id: volume.frontMatter.introduction.id,
          type: 'article',
          title: volume.frontMatter.introduction.title || 'Introduction',
          path: `/code/front-matter/introduction`,
        });
      }

      // Add Committees
      if (volume.frontMatter.committees) {
        frontMatterChildren.push({
          id: volume.frontMatter.committees.id,
          type: 'article',
          title: volume.frontMatter.committees.title || 'Committees',
          path: `/code/front-matter/committees`,
        });
      }

      // Add Preface node with children if any sections exist
      if (frontMatterChildren.length > 0) {
        volumeNode.children?.push({
          id: volume.frontMatter.id,
          type: 'division',
          title: 'Preface',
          path: `/code/front-matter`,
          children: frontMatterChildren,
        });
      }
    }

    // 2. Add divisions for this volume (in order)
    for (const division of volume.divisions) {
      volumeNode.children?.push(buildDivisionNode(division));
    }

    // 3. Add Index (if it exists in this volume)
    if (volume.index) {
      volumeNode.children?.push({
        id: volume.index.id,
        type: 'index',
        title: 'Index',
        path: `/code/index/volume-${volume.number}`,
      });
    }

    // 4. Add Conversion Factors (if they exist in this volume)
    if (volume.conversions) {
      volumeNode.children?.push({
        id: volume.conversions.id,
        type: 'conversions',
        title: 'Conversion Factors',
        path: `/code/conversions/volume-${volume.number}`,
      });
    }

    tree.push(volumeNode);
  }

  return tree;
}

function getPartAppendixTitle(partNumber: string): string {
  return `Notes to Part ${partNumber}`;
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
        // Handle subsection title as either string or revision history object
        const subsectionTitle = typeof subsection.title === 'string'
          ? subsection.title
          : subsection.title.text;
        const subsectionNode: NavigationNode = {
          id: subsection.id,
          type: 'subsection',
          number: subsectionNumber,
          title: `${subsectionNumber} ${subsectionTitle}`,
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

    if (part.appendix && part.appendix.type === 'part_appendix') {
      partNode.children?.push({
        id: part.appendix.id,
        type: 'part_appendix',
        title: getPartAppendixTitle(String(part.number)),
        path: `/code/${division.id}/${part.number}/appendix`,
      });
    }

    for (const spectables of part.spectables || []) {
      if (!spectables?.id || spectables?.type !== 'spectables') continue;
      const spectablesNumberMatch = String(spectables.id).match(/\.spectables(\d+)$/i);
      const spectablesNumber = spectablesNumberMatch?.[1];
      if (!spectablesNumber) continue;

      partNode.children?.push({
        id: spectables.id,
        type: 'spectables',
        number: spectablesNumber,
        title: spectables.title || `Span Tables ${spectablesNumber}`,
        path: `/code/${division.id}/${part.number}/spectables/${spectablesNumber}`,
      });
    }

    divisionNode.children?.push(partNode);
  }

  if (division.appendices && division.appendices.length > 0) {
    for (const appendix of division.appendices) {
      divisionNode.children?.push({
        id: appendix.id,
        type: 'division_appendix',
        number: appendix.letter,
        title: `Appendix ${appendix.letter} - ${appendix.title}`,
        path: `/code/${division.id}/appendix/${appendix.letter}`,
      });
    }
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

/**
 * Extract functional statements from raw BCBC JSON (before parsing)
 * 
 * Functional statements are defined in Division A, Part 3, Section 2.
 * They describe the functions that building elements must perform to achieve objectives.
 * 
 * Creates a map of key (lowercase) → functional statement for quick lookups.
 * Keys are normalized to lowercase (e.g., "fs01", "fs02", "f01", "f02").
 * 
 * @param rawData - Raw BCBC JSON data (before parsing)
 * @returns Functional statements map (key → statement)
 */
export function extractFunctionalStatementsFromRaw(
  rawData: any
): Record<string, FunctionalStatement> {
  const statementsMap: Record<string, FunctionalStatement> = {};

  try {
    // Navigate to Division A, Part 3, Section 2, Subsection 1, Article 1
    const volumes = rawData.volumes || [];

    for (const volume of volumes) {
      const divisions = volume.divisions || [];
      const divA = divisions.find((d: any) => d.id === 'nbc.divA');

      if (!divA) continue;

      const parts = divA.parts || [];
      const part3 = parts.find((p: any) => String(p.number) === '3');

      if (!part3) continue;

      const sections = part3.sections || [];
      const section2 = sections.find((s: any) => String(s.number) === '2');

      if (!section2) continue;

      const subsections = section2.subsections || [];
      const subsection1 = subsections.find((ss: any) => String(ss.number) === '1');

      if (!subsection1) continue;

      const articles = subsection1.articles || [];
      const article1 = articles.find((a: any) => String(a.number) === '1');

      if (!article1) continue;

      // Find the sentence with functional_statements
      const content = article1.content || [];
      const sentenceWithFS = content.find((item: any) =>
        item.type === 'sentence' && item.functional_statements
      );

      if (!sentenceWithFS || !Array.isArray(sentenceWithFS.functional_statements)) continue;

      // Extract functional statements
      for (const statement of sentenceWithFS.functional_statements) {
        const normalizedKey = statement.key.toLowerCase();

        statementsMap[normalizedKey] = {
          id: statement.id,
          key: statement.key,
          definition: statement.definition,
          source: statement.source,
        };

        // Also add with 'fs' prefix for references like "fs01".
        // Source keys are typically "F01", so normalize to both:
        // - "f01" (base)
        // - "fs01" (reference format used in table markers)
        if (!normalizedKey.startsWith('fs')) {
          const fsKey = normalizedKey.startsWith('f')
            ? `fs${normalizedKey.slice(1)}`
            : `fs${normalizedKey}`;
          statementsMap[fsKey] = statementsMap[normalizedKey];
        }
      }

      break; // Found it, no need to continue
    }
  } catch (error) {
    console.error('Error extracting functional statements:', error);
  }

  return statementsMap;
}

/**
 * Extract objectives from raw BCBC JSON (before parsing)
 * 
 * Objectives are defined in Division A, Part 2, Section 2.
 * They describe the high-level goals of the building code.
 * 
 * Creates a map of key (lowercase) → objective/sub-objective for quick lookups.
 * Keys are normalized to handle various reference formats:
 * - Main objectives: "os", "oh", "oa", "op", "oe"
 * - Sub-objectives: "os1", "os1.1", "nbc-obj-os1.1", etc.
 * 
 * @param rawData - Raw BCBC JSON data (before parsing)
 * @returns Objectives map (key → objective or sub-objective)
 */
export function extractObjectivesFromRaw(
  rawData: any
): Record<string, Objective | SubObjective> {
  const objectivesMap: Record<string, Objective | SubObjective> = {};

  try {
    // Navigate to Division A, Part 2, Section 2, Subsection 1, Article 1
    const volumes = rawData.volumes || [];

    for (const volume of volumes) {
      const divisions = volume.divisions || [];
      const divA = divisions.find((d: any) => d.id === 'nbc.divA');

      if (!divA) continue;

      const parts = divA.parts || [];
      const part2 = parts.find((p: any) => String(p.number) === '2');

      if (!part2) continue;

      const sections = part2.sections || [];
      const section2 = sections.find((s: any) => String(s.number) === '2');

      if (!section2) continue;

      const subsections = section2.subsections || [];
      const subsection1 = subsections.find((ss: any) => String(ss.number) === '1');

      if (!subsection1) continue;

      const articles = subsection1.articles || [];
      const article1 = articles.find((a: any) => String(a.number) === '1');

      if (!article1) continue;

      // Find the sentence with objectives
      const content = article1.content || [];
      const sentenceWithObj = content.find((item: any) =>
        item.type === 'sentence' && item.objectives
      );

      if (!sentenceWithObj || !Array.isArray(sentenceWithObj.objectives)) continue;

      // Extract objectives
      for (const objective of sentenceWithObj.objectives) {
        const normalizedKey = objective.key.toLowerCase();

        const objectiveEntry: Objective = {
          id: objective.id,
          key: objective.key,
          title: objective.title,
          definition: objective.definition,
          source: objective.source,
          subObjectives: objective.sub_objectives?.map((sub: any) => ({
            id: sub.id,
            key: sub.key,
            title: sub.title,
            definition: sub.definition,
            source: sub.source,
          })),
        };

        // Add main objective with various key formats
        objectivesMap[normalizedKey] = objectiveEntry;
        objectivesMap[`nbc-obj-${normalizedKey}`] = objectiveEntry;

        // Add sub-objectives
        if (objective.sub_objectives) {
          for (const subObj of objective.sub_objectives) {
            const subNormalizedKey = subObj.key.toLowerCase();

            const subObjectiveEntry: SubObjective = {
              id: subObj.id,
              key: subObj.key,
              title: subObj.title,
              definition: subObj.definition,
              source: subObj.source,
            };

            // Add with various key formats
            objectivesMap[subNormalizedKey] = subObjectiveEntry;
            objectivesMap[`nbc-obj-${subNormalizedKey}`] = subObjectiveEntry;

            // Also add with dot notation (e.g., "os1.1" -> "os1-1")
            const dottedKey = subNormalizedKey.replace(/\./g, '-');
            if (dottedKey !== subNormalizedKey) {
              objectivesMap[dottedKey] = subObjectiveEntry;
              objectivesMap[`nbc-obj-${dottedKey}`] = subObjectiveEntry;
            }
          }
        }
      }

      break; // Found it, no need to continue
    }
  } catch (error) {
    console.error('Error extracting objectives:', error);
  }

  return objectivesMap;
}

/**
 * Extract functional statements from BCBC document
 * 
 * @deprecated Use extractFunctionalStatementsFromRaw instead
 */
export function extractFunctionalStatements(
  document: BCBCDocument
): Record<string, FunctionalStatement> {
  // This function is kept for backward compatibility but returns empty
  // Use extractFunctionalStatementsFromRaw with raw JSON instead
  return {};
}

/**
 * Extract objectives and sub-objectives from BCBC document
 * 
 * @deprecated Use extractObjectivesFromRaw instead
 */
export function extractObjectives(
  document: BCBCDocument
): Record<string, Objective | SubObjective> {
  // This function is kept for backward compatibility but returns empty
  // Use extractObjectivesFromRaw with raw JSON instead
  return {};
}
