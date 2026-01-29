#!/usr/bin/env node
/**
 * Asset Generation Pipeline
 * 
 * Processes BCBC JSON and generates all static assets for the web application.
 * 
 * Pipeline Steps:
 * 1. Parse and validate BCBC JSON (bcbc-parser)
 * 2. Generate search documents and metadata (search-indexer - NEW)
 * 3. Extract metadata and chunk content (content-chunker)
 * 4. Write all assets to apps/web/public/data/
 * 
 * Usage:
 *   npx pnpm generate-assets
 * 
 * Environment Variables:
 *   SOURCE_FILE - Path to source JSON (default: data/source/bcbc-2024.json)
 *   OUTPUT_DIR - Output directory (default: apps/web/public/data)
 */

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import parser package
import {
  parseBCBC,
  validateBCBC,
  type BCBCDocument,
  type ValidationError,
} from '../packages/bcbc-parser/src/index.js';

// Import NEW search indexer
import {
  buildSearchIndex,
  exportAll,
  getExportStats,
  type IndexerConfig,
  DEFAULT_INDEXER_CONFIG,
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

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const logger = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`\n${colors.cyan}${colors.bright}▶${colors.reset} ${msg}`),
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

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

async function loadSourceData(): Promise<any> {
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
    
    return rawData;
  } catch (error) {
    logger.error(`Failed to load source data: ${error}`);
    throw error;
  }
}

async function validateData(document: BCBCDocument): Promise<void> {
  logger.step('Validating data structure');
  
  const startTime = Date.now();
  
  try {
    const errors: ValidationError[] = validateBCBC(document);
    const criticalErrors = errors.filter(e => e.severity === 'error');
    const warnings = errors.filter(e => e.severity === 'warning');
    
    const duration = Date.now() - startTime;
    
    if (criticalErrors.length === 0 && warnings.length === 0) {
      logger.success(`Validation passed in ${formatDuration(duration)}`);
    } else {
      if (warnings.length > 0) {
        logger.warn(`Found ${warnings.length} validation warning(s)`);
      }
      if (criticalErrors.length > 0) {
        logger.warn(`Found ${criticalErrors.length} validation error(s) (continuing anyway)`);
      }
      logger.success(`Validation completed in ${formatDuration(duration)} (with issues)`);
    }
  } catch (error) {
    logger.error(`Validation failed: ${error}`);
    throw error;
  }
}

/**
 * Generate search index using NEW indexer
 * Outputs: documents.json, metadata.json, and individual files
 */
async function generateSearchAssets(rawData: any): Promise<void> {
  logger.step('Generating search index and metadata (NEW)');
  
  const startTime = Date.now();
  
  try {
    // Create search output directory
    const searchDir = join(OUTPUT_DIR, 'search');
    await ensureDir(searchDir);
    
    // Configure indexer (can be customized)
    const config: Partial<IndexerConfig> = {
      output: {
        generateMetadataJson: true,
        generateIndividualFiles: true,
        prettyPrint: true,
        includeStatistics: true,
      },
      // Customize what to index
      contentTypes: {
        ...DEFAULT_INDEXER_CONFIG.contentTypes,
        // Enable/disable content types as needed
      },
      // Customize reference handling
      references: {
        stripFromSearchText: true,
        preserveReferenceIds: true,
        processTypes: ['term', 'internal', 'external', 'standard'],
      },
    };
    
    // Build search index
    logger.info('Building search index from BCBC data...');
    const { documents, metadata } = buildSearchIndex(rawData, config);
    
    logger.info(`Indexed ${documents.length} documents`);
    logger.info(`  Articles: ${metadata.statistics.totalArticles}`);
    logger.info(`  Tables: ${metadata.statistics.totalTables}`);
    logger.info(`  Figures: ${metadata.statistics.totalFigures}`);
    logger.info(`  Parts: ${metadata.statistics.totalParts}`);
    logger.info(`  Sections: ${metadata.statistics.totalSections}`);
    logger.info(`  Subsections: ${metadata.statistics.totalSubsections}`);
    logger.info(`  Glossary terms: ${metadata.statistics.totalGlossaryTerms}`);
    logger.info(`  Amendments: ${metadata.statistics.totalAmendments}`);
    logger.info(`  Revision dates: ${metadata.statistics.totalRevisionDates}`);
    
    // Export to JSON
    logger.info('Exporting search assets...');
    const exportResult = exportAll(documents, metadata, {
      prettyPrint: true,
      generateMetadataJson: true,
      generateIndividualFiles: true,
    });
    
    // Get export statistics
    const stats = getExportStats(documents, exportResult);
    logger.info(`  Documents size: ${stats.documentsSizeKB} KB`);
    if (stats.metadataSizeKB) {
      logger.info(`  Metadata size: ${stats.metadataSizeKB} KB`);
    }
    logger.info(`  Total size: ${stats.totalSizeKB} KB`);
    
    // Write documents.json
    await writeFile(join(searchDir, 'documents.json'), exportResult.documents);
    logger.success('Written documents.json');
    
    // Write metadata.json
    if (exportResult.metadata) {
      await writeFile(join(searchDir, 'metadata.json'), exportResult.metadata);
      logger.success('Written metadata.json');
    }
    
    // Write individual files to main data directory (for backward compatibility)
    if (exportResult.individualFiles) {
      for (const [filename, content] of Object.entries(exportResult.individualFiles)) {
        if (content) {
          await writeFile(join(OUTPUT_DIR, filename), content);
          logger.success(`Written ${filename}`);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    logger.success(`Generated search assets in ${formatDuration(duration)}`);
  } catch (error) {
    logger.error(`Failed to generate search assets: ${error}`);
    throw error;
  }
}

/**
 * Generate quick access pins (from content-chunker metadata)
 */
async function generateQuickAccess(document: BCBCDocument): Promise<void> {
  logger.step('Generating quick access pins');
  
  const startTime = Date.now();
  
  try {
    const metadata = extractMetadata(document);
    
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
    const contentDir = join(OUTPUT_DIR, 'content');
    await ensureDir(contentDir);
    
    logger.info('Splitting content into chunks...');
    const chunks: ContentChunk[] = chunkContent(document);
    
    const stats = getChunkStats(chunks);
    logger.info(`Generated ${stats.totalChunks} chunks`);
    logger.info(`  Total size: ${formatBytes(stats.totalSize)}`);
    logger.info(`  Average size: ${formatBytes(stats.averageSize)}`);
    
    logger.info('Writing chunk files...');
    let writtenCount = 0;
    for (const chunk of chunks) {
      const chunkPath = join(OUTPUT_DIR, chunk.path);
      await ensureDir(dirname(chunkPath));
      await writeFile(chunkPath, JSON.stringify(chunk.data, null, 2));
      writtenCount++;
      
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

async function generateReport(startTime: number): Promise<void> {
  const totalDuration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}${colors.green}Asset Generation Complete${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`Total time: ${formatDuration(totalDuration)}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('\nGenerated files:');
  console.log('  ✓ search/documents.json (NEW - flat searchable documents)');
  console.log('  ✓ search/metadata.json (NEW - unified metadata)');
  console.log('  ✓ navigation-tree.json');
  console.log('  ✓ glossary-map.json');
  console.log('  ✓ amendment-dates.json');
  console.log('  ✓ content-types.json');
  console.log('  ✓ quick-access.json');
  console.log('  ✓ content/ (directory with section chunks)');
  console.log('\n' + colors.green + 'All assets generated successfully!' + colors.reset);
  console.log('='.repeat(60) + '\n');
}

async function main(): Promise<void> {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}${colors.cyan}BC Building Code - Asset Generation Pipeline${colors.reset}`);
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Clean output directory
    await cleanOutputDir();
    
    // Step 2: Load source data (raw JSON)
    const rawData = await loadSourceData();
    
    // Step 3: Parse for validation and content chunking
    logger.info('Parsing BCBC structure...');
    const document = parseBCBC(rawData);
    logger.success(`Parsed ${document.divisions.length} divisions`);
    
    // Step 4: Validate data
    await validateData(document);
    
    // Step 5: Generate search assets (NEW - uses raw data directly)
    await generateSearchAssets(rawData);
    
    // Step 6: Generate quick access pins
    await generateQuickAccess(document);
    
    // Step 7: Generate content chunks
    await generateContentChunks(document);
    
    // Step 8: Generate report
    await generateReport(startTime);
    
    process.exit(0);
  } catch (error) {
    logger.error(`Pipeline failed: ${error}`);
    console.error(error);
    process.exit(1);
  }
}

main();
