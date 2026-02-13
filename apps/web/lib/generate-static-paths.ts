/**
 * Generate Static Paths Utility
 * 
 * Generates all possible paths from navigation tree for static export.
 * This ensures all sections, subsections, and articles are pre-rendered at build time.
 */

import fs from 'fs';
import path from 'path';

interface NavigationNode {
  id: string;
  type: 'volume' | 'division' | 'part' | 'section' | 'subsection' | 'article';
  number?: string;
  title: string;
  path: string;
  children?: NavigationNode[];
}

interface NavigationTree {
  version: string;
  generatedAt: string;
  tree: NavigationNode[];
}

interface VersionInfo {
  id: string;
  year: number;
  title: string;
  isDefault: boolean;
  status: string;
  dataPath: string;
}

interface VersionsData {
  defaultVersion: string;
  versions: VersionInfo[];
}

/**
 * Extract slug segments from a navigation path
 * Example: "/code/nbc.divA/1/1/2" → ["nbc.divA", "1", "1", "2"]
 */
function extractSlugFromPath(navPath: string): string[] {
  // Remove leading "/code/" prefix
  const cleanPath = navPath.replace(/^\/code\//, '');
  
  // Split by "/" to get segments
  const segments = cleanPath.split('/').filter(Boolean);
  
  return segments;
}

/**
 * Recursively extract all paths from navigation tree
 */
function extractPathsFromNode(node: NavigationNode, paths: string[][] = []): string[][] {
  // Include paths for part, section, subsection, and article levels.
  // Skip only volume and division levels.
  if (
    node.type === 'part' ||
    node.type === 'section' ||
    node.type === 'subsection' ||
    node.type === 'article'
  ) {
    const slug = extractSlugFromPath(node.path);
    if (slug.length > 0) {
      paths.push(slug);
    }
  }
  
  // Recursively process children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      extractPathsFromNode(child, paths);
    }
  }
  
  return paths;
}

/**
 * Load navigation tree from file system
 */
function loadNavigationTree(version: string): NavigationTree | null {
  try {
    // Construct path relative to process.cwd()
    // Check if we're in apps/web or monorepo root
    const cwd = process.cwd();
    const isInAppsWeb = cwd.endsWith('apps/web') || cwd.endsWith('apps\\web');
    
    const navTreePath = isInAppsWeb
      ? path.join(cwd, 'public/data', version, 'navigation-tree.json')
      : path.join(cwd, 'apps/web/public/data', version, 'navigation-tree.json');
    
    // Use try-catch instead of existsSync to avoid Turbopack warnings
    const content = fs.readFileSync(navTreePath, 'utf-8');
    return JSON.parse(content) as NavigationTree;
  } catch (error) {
    console.error(`Error loading navigation tree for version ${version}:`, error);
    return null;
  }
}

/**
 * Load versions data
 */
function loadVersions(): VersionsData | null {
  try {
    // Construct path relative to process.cwd()
    // Check if we're in apps/web or monorepo root
    const cwd = process.cwd();
    const isInAppsWeb = cwd.endsWith('apps/web') || cwd.endsWith('apps\\web');
    
    const versionsPath = isInAppsWeb
      ? path.join(cwd, 'public/data/versions.json')
      : path.join(cwd, 'apps/web/public/data/versions.json');
    
    // Use try-catch instead of existsSync to avoid Turbopack warnings
    const content = fs.readFileSync(versionsPath, 'utf-8');
    return JSON.parse(content) as VersionsData;
  } catch (error) {
    console.error('Error loading versions:', error);
    return null;
  }
}

/**
 * Generate all static paths for all versions
 * This is the main function called by generateStaticParams()
 */
export function generateAllStaticPaths(): { slug: string[] }[] {
  const allPaths: { slug: string[] }[] = [];
  
  // Load versions
  const versionsData = loadVersions();
  if (!versionsData) {
    console.warn('No versions data found, returning empty paths');
    return allPaths;
  }
  
  console.log(`Generating static paths for ${versionsData.versions.length} version(s)...`);
  
  // Generate paths for each version
  for (const version of versionsData.versions) {
    console.log(`Processing version ${version.id} (${version.title})...`);
    
    const navTree = loadNavigationTree(version.id);
    if (!navTree) {
      console.warn(`Skipping version ${version.id} - navigation tree not found`);
      continue;
    }
    
    // Extract paths from all nodes in the tree
    const versionPaths: string[][] = [];
    for (const rootNode of navTree.tree) {
      extractPathsFromNode(rootNode, versionPaths);
    }
    
    console.log(`  Found ${versionPaths.length} paths for version ${version.id}`);
    
    // Add to all paths
    for (const slug of versionPaths) {
      allPaths.push({ slug });
    }
  }
  
  console.log(`Total static paths generated: ${allPaths.length}`);
  
  return allPaths;
}

/**
 * Generate static paths for a specific version (useful for testing)
 */
export function generateStaticPathsForVersion(version: string): { slug: string[] }[] {
  const paths: { slug: string[] }[] = [];
  
  const navTree = loadNavigationTree(version);
  if (!navTree) {
    console.warn(`Navigation tree not found for version ${version}`);
    return paths;
  }
  
  // Extract paths from all nodes in the tree
  const versionPaths: string[][] = [];
  for (const rootNode of navTree.tree) {
    extractPathsFromNode(rootNode, versionPaths);
  }
  
  for (const slug of versionPaths) {
    paths.push({ slug });
  }
  
  return paths;
}

