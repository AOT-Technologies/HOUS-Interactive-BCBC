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

// Import parser package (using relative path for tsx compatibility)
import {
  parseBCBC,
  validateBCBC,
  getGlossaryMap,
  getAmendmentDates,
  type BCBCDocument,
  type ValidationError,
} from '../packages/bcbc-parser/src/index.js';

// Import search indexer package
import {
  createSearchIndex,
  extractSearchableContent,
  exportIndex,
  getIndexStats,
} from '../packages/search-indexer/src/index.js';

// Import content chunker package
import {
  chunkContent,
  extractMetadata,
  getChunkStats,
  type ContentChunk,
} from '../packages/content-chunker/src/index.js';

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
async function loadSourceData(): Promise<BCBCDocument> {
  logger.step('Loading source data');
  logger.info(`Reading from: ${SOURCE_FILE}`);
  
  const startTime = Date.now();
  
  try {
    const content = await readFile(SOURCE_FILE, 'utf-8');
    const rawData = JSON.parse(content);
    
    const duration = Date.now() - startTime;
    const size = Buffer.byteLength(content, 'utf-8');
    
    logger.success(`Loaded ${formatBytes(size)} in ${formatDuration(duration)}`);
    logger.info(`Title: ${rawData.metadata?.title || 'Unknown'}`);
    logger.info(`Version: ${rawData.version || 'Unknown'}`);
    
    // Parse the raw JSON into BCBCDocument structure
    logger.info('Parsing BCBC structure...');
    const document = parseBCBC(rawData);
    logger.success(`Parsed ${document.divisions.length} divisions`);
    
    return document;
  } catch (error) {
    logger.error(`Failed to load source data: ${error}`);
    throw error;
  }
}

/**
 * Validate BCBC data structure
 */
async function validateData(document: BCBCDocument): Promise<void> {
  logger.step('Validating data structure');
  
  const startTime = Date.now();
  
  try {
    // Run comprehensive validation
    const errors: ValidationError[] = validateBCBC(document);
    
    // Separate errors by severity
    const criticalErrors = errors.filter(e => e.severity === 'error');
    const warnings = errors.filter(e => e.severity === 'warning');
    
    const duration = Date.now() - startTime;
    
    // Report validation results
    if (criticalErrors.length === 0 && warnings.length === 0) {
      logger.success(`Validation passed in ${formatDuration(duration)}`);
      logger.info(`Validated ${document.divisions.length} divisions`);
    } else {
      // Display warnings
      if (warnings.length > 0) {
        logger.warn(`Found ${warnings.length} validation warning(s):`);
        warnings.slice(0, 5).forEach(warning => {
          logger.warn(`  ${warning.path}.${warning.field}: ${warning.message}`);
        });
        if (warnings.length > 5) {
          logger.warn(`  ... and ${warnings.length - 5} more warnings`);
        }
      }
      
      // Display errors (but don't fail - treat as warnings for now)
      if (criticalErrors.length > 0) {
        logger.warn(`Found ${criticalErrors.length} validation error(s) (continuing anyway):`);
        criticalErrors.slice(0, 10).forEach(error => {
          logger.warn(`  ${error.path}.${error.field}: ${error.message}`);
        });
        if (criticalErrors.length > 10) {
          logger.warn(`  ... and ${criticalErrors.length - 10} more errors`);
        }
        
        logger.warn('⚠️  Pipeline will continue despite validation errors');
        logger.warn('⚠️  Generated assets may contain invalid references');
      }
      
      logger.success(`Validation completed in ${formatDuration(duration)} (with issues)`);
      logger.info(`Validated ${document.divisions.length} divisions`);
    }
  } catch (error) {
    logger.error(`Validation failed: ${error}`);
    throw error;
  }
}

/**
 * Generate FlexSearch index
 */
async function generateSearchIndex(document: BCBCDocument): Promise<void> {
  logger.step('Generating search index');
  
  const startTime = Date.now();
  
  try {
    // Extract searchable content from document
    logger.info('Extracting searchable content...');
    const searchableItems = extractSearchableContent(document);
    logger.info(`Extracted ${searchableItems.length} searchable items`);
    
    // Create FlexSearch index
    logger.info('Building FlexSearch index...');
    const index = createSearchIndex(document);
    
    // Export index to JSON
    logger.info('Serializing index...');
    const indexData = await exportIndex(index, searchableItems);
    
    // Get index statistics
    const stats = getIndexStats(searchableItems, indexData);
    
    // Write index to file with pretty formatting
    const outputPath = join(OUTPUT_DIR, 'search-index.json');
    
    // Parse and re-stringify with indentation for readability
    const indexObject = JSON.parse(indexData);
    await writeFile(outputPath, JSON.stringify(indexObject, null, 2));
    
    const duration = Date.now() - startTime;
    logger.success(`Generated search index in ${formatDuration(duration)}`);
    logger.info(`  Documents: ${stats.documentCount}`);
    logger.info(`  Index size: ${stats.indexSizeKB} KB`);
  } catch (error) {
    logger.error(`Failed to generate search index: ${error}`);
    throw error;
  }
}

/**
 * Extract navigation tree metadata
 */
async function generateNavigationTree(document: BCBCDocument): Promise<void> {
  logger.step('Generating navigation tree');
  
  const startTime = Date.now();
  
  try {
    // Extract metadata (includes navigation tree)
    const metadata = extractMetadata(document);
    
    // Create navigation tree output
    const navigationTree = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      nodes: metadata.navigationTree,
    };
    
    const outputPath = join(OUTPUT_DIR, 'navigation-tree.json');
    await writeFile(outputPath, JSON.stringify(navigationTree, null, 2));
    
    const duration = Date.now() - startTime;
    const nodeCount = countNavigationNodes(metadata.navigationTree);
    logger.success(`Generated navigation tree in ${formatDuration(duration)}`);
    logger.info(`  Total nodes: ${nodeCount}`);
  } catch (error) {
    logger.error(`Failed to generate navigation tree: ${error}`);
    throw error;
  }
}

/**
 * Count total nodes in navigation tree
 */
function countNavigationNodes(nodes: any[]): number {
  let count = nodes.length;
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      count += countNavigationNodes(node.children);
    }
  }
  return count;
}

/**
 * Extract glossary map
 */
async function generateGlossaryMap(document: BCBCDocument): Promise<void> {
  logger.step('Generating glossary map');
  
  const startTime = Date.now();
  
  try {
    // Extract metadata (includes glossary map)
    const metadata = extractMetadata(document);
    
    // Create glossary map output
    const glossaryMap = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      terms: metadata.glossaryMap,
    };
    
    const outputPath = join(OUTPUT_DIR, 'glossary-map.json');
    await writeFile(outputPath, JSON.stringify(glossaryMap, null, 2));
    
    const duration = Date.now() - startTime;
    const termCount = Object.keys(metadata.glossaryMap).length;
    logger.success(`Generated glossary map in ${formatDuration(duration)}`);
    logger.info(`  Total terms: ${termCount}`);
  } catch (error) {
    logger.error(`Failed to generate glossary map: ${error}`);
    throw error;
  }
}

/**
 * Extract amendment dates
 */
async function generateAmendmentDates(document: BCBCDocument): Promise<void> {
  logger.step('Generating amendment dates');
  
  const startTime = Date.now();
  
  try {
    // Extract metadata (includes amendment dates)
    const metadata = extractMetadata(document);
    
    // Create amendment dates output
    const amendmentDates = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      dates: metadata.amendmentDates,
    };
    
    const outputPath = join(OUTPUT_DIR, 'amendment-dates.json');
    await writeFile(outputPath, JSON.stringify(amendmentDates, null, 2));
    
    const duration = Date.now() - startTime;
    logger.success(`Generated amendment dates in ${formatDuration(duration)}`);
    logger.info(`  Total dates: ${metadata.amendmentDates.length}`);
  } catch (error) {
    logger.error(`Failed to generate amendment dates: ${error}`);
    throw error;
  }
}

/**
 * Generate content types list
 */
async function generateContentTypes(document: BCBCDocument): Promise<void> {
  logger.step('Generating content types');
  
  const startTime = Date.now();
  
  try {
    // Extract metadata (includes content types)
    const metadata = extractMetadata(document);
    
    // Create content types output with counts
    const contentTypes = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      types: metadata.contentTypes.map(type => ({
        id: type,
        label: formatContentTypeLabel(type),
      })),
    };
    
    const outputPath = join(OUTPUT_DIR, 'content-types.json');
    await writeFile(outputPath, JSON.stringify(contentTypes, null, 2));
    
    const duration = Date.now() - startTime;
    logger.success(`Generated content types in ${formatDuration(duration)}`);
    logger.info(`  Total types: ${metadata.contentTypes.length}`);
  } catch (error) {
    logger.error(`Failed to generate content types: ${error}`);
    throw error;
  }
}

/**
 * Format content type ID to human-readable label
 */
function formatContentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'article': 'Article',
    'table': 'Table',
    'figure': 'Figure',
    'note': 'Note',
    'application-note': 'Application Note',
  };
  return labels[type] || type;
}

/**
 * Generate quick access pins
 */
async function generateQuickAccess(document: BCBCDocument): Promise<void> {
  logger.step('Generating quick access pins');
  
  const startTime = Date.now();
  
  try {
    // Extract metadata (includes quick access)
    const metadata = extractMetadata(document);
    
    // Create quick access output
    const quickAccess = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      pins: metadata.quickAccess,
    };
    
    const outputPath = join(OUTPUT_DIR, 'quick-access.json');
    await writeFile(outputPath, JSON.stringify(quickAccess, null, 2));
    
    const duration = Date.now() - startTime;
    logger.success(`Generated quick access pins in ${formatDuration(duration)}`);
    logger.info(`  Total pins: ${metadata.quickAccess.length}`);
  } catch (error) {
    logger.error(`Failed to generate quick access: ${error}`);
    throw error;
  }
}

/**
 * Generate content chunks
 */
async function generateContentChunks(document: BCBCDocument): Promise<void> {
  logger.step('Generating content chunks');
  
  const startTime = Date.now();
  
  try {
    // Create content directory
    const contentDir = join(OUTPUT_DIR, 'content');
    await ensureDir(contentDir);
    
    // Generate chunks
    logger.info('Splitting content into chunks...');
    const chunks: ContentChunk[] = chunkContent(document);
    
    // Get chunk statistics
    const stats = getChunkStats(chunks);
    logger.info(`Generated ${stats.totalChunks} chunks`);
    logger.info(`  Total size: ${formatBytes(stats.totalSize)}`);
    logger.info(`  Average size: ${formatBytes(stats.averageSize)}`);
    logger.info(`  Size range: ${formatBytes(stats.minSize)} - ${formatBytes(stats.maxSize)}`);
    
    // Write each chunk to file
    logger.info('Writing chunk files...');
    let writtenCount = 0;
    for (const chunk of chunks) {
      const chunkPath = join(OUTPUT_DIR, chunk.path);
      
      // Ensure chunk directory exists
      await ensureDir(dirname(chunkPath));
      
      // Write chunk data
      await writeFile(chunkPath, JSON.stringify(chunk.data, null, 2));
      writtenCount++;
      
      // Log progress every 10 chunks
      if (writtenCount % 10 === 0) {
        logger.info(`  Written ${writtenCount}/${chunks.length} chunks...`);
      }
    }
    
    const duration = Date.now() - startTime;
    logger.success(`Generated ${chunks.length} content chunks in ${formatDuration(duration)}`);
  } catch (error) {
    logger.error(`Failed to generate content chunks: ${error}`);
    throw error;
  }
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
  console.log('  ✓ content/ (directory with section chunks)');
  console.log('\n' + colors.green + 'All assets generated successfully!' + colors.reset);
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
