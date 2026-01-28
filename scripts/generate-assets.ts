#!/usr/bin/env node
/**
 * Asset Generation Pipeline
 * 
 * This script orchestrates the complete build pipeline for the BC Building Code application.
 * It processes the source BCBC JSON file and generates all static assets needed at runtime.
 * 
 * Pipeline Steps:
 * 1. Parse and validate BCBC JSON (bcbc-parser)
 * 2. Generate FlexSearch index (search-indexer)
 * 3. Extract metadata and chunk content (content-chunker)
 * 4. Write all assets to apps/web/public/data/
 * 
 * Usage:
 *   npx pnpm generate-assets
 *   npm run generate-assets
 * 
 * Environment Variables:
 *   SOURCE_FILE - Path to source JSON (default: data/source/bcbc-2024.json)
 *   OUTPUT_DIR - Output directory (default: apps/web/public/data)
 *   SAMPLE_MODE - Use sample data (default: false)
 */

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Configuration
const SOURCE_FILE = process.env.SOURCE_FILE || join(rootDir, 'data/source/bcbc-2024.json');
const OUTPUT_DIR = process.env.OUTPUT_DIR || join(rootDir, 'apps/web/public/data');
const SAMPLE_MODE = process.env.SAMPLE_MODE === 'true';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Logger utility for consistent output formatting
 */
const logger = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`\n${colors.cyan}${colors.bright}▶${colors.reset} ${msg}`),
};

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Clean output directory
 */
async function cleanOutputDir(): Promise<void> {
  logger.step('Cleaning output directory');
  try {
    await rm(OUTPUT_DIR, { recursive: true, force: true });
    logger.success(`Cleaned ${OUTPUT_DIR}`);
  } catch (error) {
    logger.warn(`Could not clean output directory: ${error}`);
  }
  await ensureDir(OUTPUT_DIR);
}

/**
 * Load and parse source JSON file
 */
async function loadSourceData(): Promise<any> {
  logger.step('Loading source data');
  logger.info(`Reading from: ${SOURCE_FILE}`);
  
  const startTime = Date.now();
  
  try {
    const content = await readFile(SOURCE_FILE, 'utf-8');
    const data = JSON.parse(content);
    
    const duration = Date.now() - startTime;
    const size = Buffer.byteLength(content, 'utf-8');
    
    logger.success(`Loaded ${formatBytes(size)} in ${formatDuration(duration)}`);
    logger.info(`Title: ${data.metadata?.title || 'Unknown'}`);
    logger.info(`Version: ${data.metadata?.version || 'Unknown'}`);
    
    return data;
  } catch (error) {
    logger.error(`Failed to load source data: ${error}`);
    throw error;
  }
}

/**
 * Validate BCBC data structure
 * 
 * Note: This is a placeholder. The actual validation will be implemented
 * in Sprint 1 Task 8 (bcbc-parser package).
 */
async function validateData(data: any): Promise<void> {
  logger.step('Validating data structure');
  
  // Basic validation checks
  if (!data.metadata) {
    throw new Error('Missing metadata');
  }
  
  if (!data.divisions || !Array.isArray(data.divisions)) {
    throw new Error('Missing or invalid divisions array');
  }
  
  logger.success(`Validated ${data.divisions.length} divisions`);
  
  // TODO: Sprint 1 Task 8 - Implement full validation with bcbc-parser
  logger.warn('Full validation not yet implemented (Sprint 1 Task 8)');
}

/**
 * Generate FlexSearch index
 * 
 * Note: This is a placeholder. The actual indexer will be implemented
 * in Sprint 1 Task 9 (search-indexer package).
 */
async function generateSearchIndex(data: any): Promise<void> {
  logger.step('Generating search index');
  
  const startTime = Date.now();
  
  // Placeholder: Create empty index structure
  const index = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    documentCount: 0,
    index: {},
    store: {},
  };
  
  const outputPath = join(OUTPUT_DIR, 'search-index.json');
  await writeFile(outputPath, JSON.stringify(index, null, 2));
  
  const duration = Date.now() - startTime;
  logger.success(`Generated search index in ${formatDuration(duration)}`);
  
  // TODO: Sprint 1 Task 9 - Implement FlexSearch indexer
  logger.warn('Search indexer not yet implemented (Sprint 1 Task 9)');
}

/**
 * Extract navigation tree metadata
 * 
 * Note: This is a placeholder. The actual metadata extractor will be implemented
 * in Sprint 1 Task 10 (content-chunker package).
 */
async function generateNavigationTree(data: any): Promise<void> {
  logger.step('Generating navigation tree');
  
  const startTime = Date.now();
  
  // Placeholder: Create basic navigation structure
  const navigationTree = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    root: {
      id: 'root',
      label: data.metadata?.title || 'BC Building Code',
      children: [],
    },
  };
  
  const outputPath = join(OUTPUT_DIR, 'navigation-tree.json');
  await writeFile(outputPath, JSON.stringify(navigationTree, null, 2));
  
  const duration = Date.now() - startTime;
  logger.success(`Generated navigation tree in ${formatDuration(duration)}`);
  
  // TODO: Sprint 1 Task 10 - Implement metadata extractor
  logger.warn('Navigation tree generator not yet implemented (Sprint 1 Task 10)');
}

/**
 * Extract glossary map
 */
async function generateGlossaryMap(data: any): Promise<void> {
  logger.step('Generating glossary map');
  
  const startTime = Date.now();
  
  // Placeholder: Create empty glossary
  const glossaryMap = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    terms: {},
  };
  
  const outputPath = join(OUTPUT_DIR, 'glossary-map.json');
  await writeFile(outputPath, JSON.stringify(glossaryMap, null, 2));
  
  const duration = Date.now() - startTime;
  logger.success(`Generated glossary map in ${formatDuration(duration)}`);
  
  // TODO: Sprint 1 Task 10 - Implement glossary extraction
  logger.warn('Glossary extractor not yet implemented (Sprint 1 Task 10)');
}

/**
 * Extract amendment dates
 */
async function generateAmendmentDates(data: any): Promise<void> {
  logger.step('Generating amendment dates');
  
  const startTime = Date.now();
  
  // Placeholder: Create empty dates list
  const amendmentDates = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    dates: [],
  };
  
  const outputPath = join(OUTPUT_DIR, 'amendment-dates.json');
  await writeFile(outputPath, JSON.stringify(amendmentDates, null, 2));
  
  const duration = Date.now() - startTime;
  logger.success(`Generated amendment dates in ${formatDuration(duration)}`);
  
  // TODO: Sprint 1 Task 10 - Implement amendment date extraction
  logger.warn('Amendment date extractor not yet implemented (Sprint 1 Task 10)');
}

/**
 * Generate content types list
 */
async function generateContentTypes(data: any): Promise<void> {
  logger.step('Generating content types');
  
  const startTime = Date.now();
  
  // Placeholder: Create default content types
  const contentTypes = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    types: [
      { id: 'article', label: 'Article', count: 0 },
      { id: 'table', label: 'Table', count: 0 },
      { id: 'figure', label: 'Figure', count: 0 },
      { id: 'note', label: 'Note', count: 0 },
      { id: 'application-note', label: 'Application Note', count: 0 },
    ],
  };
  
  const outputPath = join(OUTPUT_DIR, 'content-types.json');
  await writeFile(outputPath, JSON.stringify(contentTypes, null, 2));
  
  const duration = Date.now() - startTime;
  logger.success(`Generated content types in ${formatDuration(duration)}`);
  
  // TODO: Sprint 1 Task 10 - Implement content type extraction
  logger.warn('Content type extractor not yet implemented (Sprint 1 Task 10)');
}

/**
 * Generate quick access pins
 */
async function generateQuickAccess(data: any): Promise<void> {
  logger.step('Generating quick access pins');
  
  const startTime = Date.now();
  
  // Placeholder: Create empty quick access
  const quickAccess = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    pins: [],
  };
  
  const outputPath = join(OUTPUT_DIR, 'quick-access.json');
  await writeFile(outputPath, JSON.stringify(quickAccess, null, 2));
  
  const duration = Date.now() - startTime;
  logger.success(`Generated quick access pins in ${formatDuration(duration)}`);
  
  // TODO: Sprint 1 Task 10 - Implement quick access generation
  logger.warn('Quick access generator not yet implemented (Sprint 1 Task 10)');
}

/**
 * Generate content chunks
 */
async function generateContentChunks(data: any): Promise<void> {
  logger.step('Generating content chunks');
  
  const startTime = Date.now();
  
  // Create content directory
  const contentDir = join(OUTPUT_DIR, 'content');
  await ensureDir(contentDir);
  
  // Placeholder: Create empty content structure
  // TODO: Sprint 1 Task 10 - Implement content chunking
  
  const duration = Date.now() - startTime;
  logger.success(`Generated content chunks in ${formatDuration(duration)}`);
  logger.warn('Content chunker not yet implemented (Sprint 1 Task 10)');
}

/**
 * Generate summary report
 */
async function generateReport(startTime: number): Promise<void> {
  const totalDuration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}${colors.green}Asset Generation Complete${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`Total time: ${formatDuration(totalDuration)}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('\nGenerated files:');
  console.log('  ✓ search-index.json');
  console.log('  ✓ navigation-tree.json');
  console.log('  ✓ glossary-map.json');
  console.log('  ✓ amendment-dates.json');
  console.log('  ✓ content-types.json');
  console.log('  ✓ quick-access.json');
  console.log('  ✓ content/ (directory)');
  console.log('\n' + colors.yellow + 'Note: Placeholder implementations are in place.' + colors.reset);
  console.log(colors.yellow + 'Full functionality will be implemented in Sprint 1 (Tasks 8-10).' + colors.reset);
  console.log('='.repeat(60) + '\n');
}

/**
 * Main pipeline execution
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}${colors.cyan}BC Building Code - Asset Generation Pipeline${colors.reset}`);
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Clean output directory
    await cleanOutputDir();
    
    // Step 2: Load source data
    const data = await loadSourceData();
    
    // Step 3: Validate data
    await validateData(data);
    
    // Step 4: Generate search index
    await generateSearchIndex(data);
    
    // Step 5: Generate navigation tree
    await generateNavigationTree(data);
    
    // Step 6: Generate glossary map
    await generateGlossaryMap(data);
    
    // Step 7: Generate amendment dates
    await generateAmendmentDates(data);
    
    // Step 8: Generate content types
    await generateContentTypes(data);
    
    // Step 9: Generate quick access pins
    await generateQuickAccess(data);
    
    // Step 10: Generate content chunks
    await generateContentChunks(data);
    
    // Step 11: Generate report
    await generateReport(startTime);
    
    process.exit(0);
  } catch (error) {
    logger.error(`Pipeline failed: ${error}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the pipeline
main();
