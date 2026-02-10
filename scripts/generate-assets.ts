#!/usr/bin/env node
/**
 * Multi-Version Asset Generation Pipeline
 * 
 * Processes multiple BCBC JSON versions and generates version-specific static assets.
 * 
 * Pipeline Steps:
 * 1. Load version configuration from data/source/versions.json
 * 2. For each version:
 *    a. Parse and validate BCBC JSON (bcbc-parser)
 *    b. Generate search documents and metadata (search-indexer)
 *    c. Extract metadata and chunk content (content-chunker)
 *    d. Write all assets to apps/web/public/data/{versionId}/
 * 3. Generate unified versions.json index
 * 
 * Usage:
 *   npx tsx scripts/generate-assets-multi-version.ts
 * 
 * Environment Variables:
 *   VERSIONS_FILE - Path to versions config (default: data/source/versions.json)
 *   OUTPUT_BASE_DIR - Base output directory (default: apps/web/public/data)
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

// Import search indexer
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
const VERSIONS_FILE = process.env.VERSIONS_FILE || join(rootDir, 'data/source/versions.json');
const OUTPUT_BASE_DIR = process.env.OUTPUT_BASE_DIR || join(rootDir, 'apps/web/public/data');

// Version configuration interface
interface VersionConfig {
  id: string;
  year: number;
  title: string;
  sourceFile: string;
  isDefault: boolean;
  publishedDate: string;
  status: 'current' | 'draft' | 'archived';
  description?: string;
}

// Generated version metadata interface
interface GeneratedVersionMetadata {
  id: string;
  year: number;
  title: string;
  isDefault: boolean;
  status: string;
  revisionCount: number;
  latestRevision: string;
  dataPath: string;
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const logger = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`\n${colors.cyan}${colors.bright}▶${colors.reset} ${msg}`),
  version: (msg: string) => console.log(`\n${colors.magenta}${colors.bright}◆${colors.reset} ${msg}`),
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

/**
 * Load version configuration from versions.json
 */
async function loadVersionsConfig(): Promise<VersionConfig[]> {
  logger.step('Loading version configuration');
  logger.info(`Reading from: ${VERSIONS_FILE}`);
  
  try {
    const content = await readFile(VERSIONS_FILE, 'utf-8');
    const config = JSON.parse(content);
    
    if (!config.versions || !Array.isArray(config.versions)) {
      throw new Error('Invalid versions.json: missing or invalid "versions" array');
    }
    
    if (config.versions.length === 0) {
      throw new Error('No versions defined in versions.json');
    }
    
    logger.success(`Loaded ${config.versions.length} version(s)`);
    config.versions.forEach((v: VersionConfig) => {
      logger.info(`  - ${v.title} (${v.id}) [${v.status}]`);
    });
    
    return config.versions;
  } catch (error) {
    logger.error(`Failed to load versions configuration: ${error}`);
    throw error;
  }
}

/**
 * Load source data for a specific version
 */
async function loadSourceData(version: VersionConfig): Promise<any> {
  const sourceFile = join(rootDir, 'data/source', version.sourceFile);
  logger.info(`Reading from: ${sourceFile}`);
  
  const startTime = Date.now();
  
  try {
    const content = await readFile(sourceFile, 'utf-8');
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

/**
 * Validate BCBC document
 */
async function validateData(document: BCBCDocument): Promise<void> {
  logger.info('Validating data structure...');
  
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
 * Generate search assets for a version
 */
async function generateSearchAssets(rawData: any, outputDir: string): Promise<{ revisionCount: number; latestRevision: string }> {
  logger.info('Generating search index and metadata...');
  
  const startTime = Date.now();
  
  try {
    // Create search output directory
    const searchDir = join(outputDir, 'search');
    await ensureDir(searchDir);
    
    // Configure indexer
    const config: Partial<IndexerConfig> = {
      output: {
        generateMetadataJson: true,
        generateIndividualFiles: true,
        prettyPrint: true,
        includeStatistics: true,
      },
      contentTypes: {
        ...DEFAULT_INDEXER_CONFIG.contentTypes,
      },
      references: {
        stripFromSearchText: true,
        preserveReferenceIds: true,
        processTypes: ['term', 'internal', 'external', 'standard'],
      },
    };
    
    // Build search index
    const { documents, metadata } = buildSearchIndex(rawData, config);
    
    logger.info(`Indexed ${documents.length} documents`);
    logger.info(`  Articles: ${metadata.statistics.totalArticles}`);
    logger.info(`  Tables: ${metadata.statistics.totalTables}`);
    logger.info(`  Figures: ${metadata.statistics.totalFigures}`);
    
    // Export to JSON
    const exportResult = exportAll(documents, metadata, {
      prettyPrint: true,
      generateMetadataJson: true,
      generateIndividualFiles: true,
    });
    
    // Get export statistics
    const stats = getExportStats(documents, exportResult);
    logger.info(`  Total size: ${stats.totalSizeKB} KB`);
    
    // Write documents.json
    await writeFile(join(searchDir, 'documents.json'), exportResult.documents);
    logger.success('Written search/documents.json');
    
    // Write metadata.json
    if (exportResult.metadata) {
      await writeFile(join(searchDir, 'metadata.json'), exportResult.metadata);
      logger.success('Written search/metadata.json');
    }
    
    // Write individual files to main data directory
    if (exportResult.individualFiles) {
      for (const [filename, content] of Object.entries(exportResult.individualFiles)) {
        if (content) {
          await writeFile(join(outputDir, filename), content);
          logger.success(`Written ${filename}`);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    logger.success(`Generated search assets in ${formatDuration(duration)}`);
    
    // Extract revision information from metadata
    const revisionCount = metadata.revisionDates?.length || 0;
    const latestRevision = metadata.revisionDates?.[0]?.effectiveDate || '';
    
    return { revisionCount, latestRevision };
  } catch (error) {
    logger.error(`Failed to generate search assets: ${error}`);
    throw error;
  }
}

/**
 * Generate quick access and navigation tree
 */
async function generateQuickAccess(document: BCBCDocument, outputDir: string): Promise<void> {
  logger.info('Generating quick access pins and navigation tree...');
  
  const startTime = Date.now();
  
  try {
    const metadata = extractMetadata(document);
    
    // Write quick access
    const quickAccess = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      pins: metadata.quickAccess,
    };
    
    const quickAccessPath = join(outputDir, 'quick-access.json');
    await writeFile(quickAccessPath, JSON.stringify(quickAccess, null, 2));
    
    // Write navigation tree (overwrite the one from search indexer)
    const navigationTree = {
      version: document.metadata.version || '2020',
      generatedAt: new Date().toISOString(),
      tree: metadata.navigationTree,
    };
    
    const navTreePath = join(outputDir, 'navigation-tree.json');
    await writeFile(navTreePath, JSON.stringify(navigationTree, null, 2));
    logger.success('Written navigation-tree.json (with volumes)');
    
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
async function generateContentChunks(document: BCBCDocument, outputDir: string): Promise<void> {
  logger.info('Generating content chunks...');
  
  const startTime = Date.now();
  
  try {
    const contentDir = join(outputDir, 'content');
    await ensureDir(contentDir);
    
    const chunks: ContentChunk[] = chunkContent(document);
    
    const stats = getChunkStats(chunks);
    logger.info(`Generated ${stats.totalChunks} chunks`);
    logger.info(`  Total size: ${formatBytes(stats.totalSize)}`);
    
    let writtenCount = 0;
    for (const chunk of chunks) {
      const chunkPath = join(outputDir, chunk.path);
      await ensureDir(dirname(chunkPath));
      await writeFile(chunkPath, JSON.stringify(chunk.data, null, 2));
      writtenCount++;
      
      if (writtenCount % 20 === 0) {
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
 * Generate assets for a single version
 */
async function generateVersionAssets(
  version: VersionConfig
): Promise<GeneratedVersionMetadata> {
  logger.version(`Processing version: ${version.title} (${version.id})`);
  
  const versionStartTime = Date.now();
  const outputDir = join(OUTPUT_BASE_DIR, version.id);
  
  try {
    // Clean version output directory
    logger.info(`Cleaning output directory: ${outputDir}`);
    await rm(outputDir, { recursive: true, force: true });
    await ensureDir(outputDir);
    
    // Load source data
    const rawData = await loadSourceData(version);
    
    // Parse for validation and content chunking
    logger.info('Parsing BCBC structure...');
    const document = parseBCBC(rawData);
    const totalDivisions = document.volumes.reduce((sum, v) => sum + v.divisions.length, 0);
    logger.success(`Parsed ${document.volumes.length} volumes with ${totalDivisions} divisions`);
    
    // Validate data
    await validateData(document);
    
    // Generate search assets
    const { revisionCount, latestRevision } = await generateSearchAssets(rawData, outputDir);
    
    // Generate quick access pins
    await generateQuickAccess(document, outputDir);
    
    // Generate content chunks
    await generateContentChunks(document, outputDir);
    
    const versionDuration = Date.now() - versionStartTime;
    logger.success(`Completed ${version.title} in ${formatDuration(versionDuration)}`);
    
    // Return metadata for versions index
    return {
      id: version.id,
      year: version.year,
      title: version.title,
      isDefault: version.isDefault,
      status: version.status,
      revisionCount,
      latestRevision,
      dataPath: `/data/${version.id}`,
    };
  } catch (error) {
    logger.error(`Failed to generate assets for ${version.title}: ${error}`);
    throw error;
  }
}

/**
 * Generate unified versions.json index
 */
async function generateVersionsIndex(
  versions: GeneratedVersionMetadata[]
): Promise<void> {
  logger.step('Generating versions index');
  
  try {
    const defaultVersion = versions.find(v => v.isDefault);
    
    const versionsIndex = {
      generatedAt: new Date().toISOString(),
      defaultVersion: defaultVersion?.id || versions[0].id,
      versions,
    };
    
    const outputPath = join(OUTPUT_BASE_DIR, 'versions.json');
    await writeFile(outputPath, JSON.stringify(versionsIndex, null, 2));
    
    logger.success('Generated versions.json');
    logger.info(`  Default version: ${versionsIndex.defaultVersion}`);
    logger.info(`  Total versions: ${versions.length}`);
  } catch (error) {
    logger.error(`Failed to generate versions index: ${error}`);
    throw error;
  }
}

/**
 * Generate final report
 */
async function generateReport(
  startTime: number,
  versions: GeneratedVersionMetadata[]
): Promise<void> {
  const totalDuration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bright}${colors.green}Multi-Version Asset Generation Complete${colors.reset}`);
  console.log('='.repeat(70));
  console.log(`Total time: ${formatDuration(totalDuration)}`);
  console.log(`Output directory: ${OUTPUT_BASE_DIR}`);
  console.log(`\nGenerated versions:`);
  
  versions.forEach(v => {
    console.log(`  ${colors.green}✓${colors.reset} ${v.title} (${v.id})`);
    console.log(`    - Status: ${v.status}`);
    console.log(`    - Revisions: ${v.revisionCount}`);
    console.log(`    - Latest: ${v.latestRevision || 'N/A'}`);
    console.log(`    - Path: ${v.dataPath}`);
  });
  
  console.log(`\nGenerated files per version:`);
  console.log('  ✓ search/documents.json');
  console.log('  ✓ search/metadata.json');
  console.log('  ✓ navigation-tree.json');
  console.log('  ✓ glossary-map.json');
  console.log('  ✓ amendment-dates.json');
  console.log('  ✓ content-types.json');
  console.log('  ✓ quick-access.json');
  console.log('  ✓ content/ (directory with chunks)');
  
  console.log(`\n${colors.green}All assets generated successfully!${colors.reset}`);
  console.log('='.repeat(70) + '\n');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bright}${colors.cyan}BC Building Code - Multi-Version Asset Generation${colors.reset}`);
  console.log('='.repeat(70) + '\n');
  
  try {
    // Load version configuration
    const versionConfigs = await loadVersionsConfig();
    
    // Generate assets for each version
    const generatedVersions: GeneratedVersionMetadata[] = [];
    
    for (const versionConfig of versionConfigs) {
      const metadata = await generateVersionAssets(versionConfig);
      generatedVersions.push(metadata);
    }
    
    // Generate unified versions index
    await generateVersionsIndex(generatedVersions);
    
    // Generate final report
    await generateReport(startTime, generatedVersions);
    
    process.exit(0);
  } catch (error) {
    logger.error(`Pipeline failed: ${error}`);
    console.error(error);
    process.exit(1);
  }
}

main();
