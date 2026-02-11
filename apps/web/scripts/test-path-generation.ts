/**
 * Test Script: Path Generation
 * 
 * Tests the static path generation utility to ensure all paths are correctly extracted.
 * Run with: npx tsx apps/web/scripts/test-path-generation.ts
 */

import { generateAllStaticPaths, generateStaticPathsForVersion } from '../lib/generate-static-paths';

console.log('='.repeat(80));
console.log('Testing Static Path Generation');
console.log('='.repeat(80));
console.log();

// Test generating paths for all versions
console.log('1. Generating paths for ALL versions...');
console.log('-'.repeat(80));
const allPaths = generateAllStaticPaths();
console.log();
console.log(`✅ Total paths generated: ${allPaths.length}`);
console.log();

// Show sample paths
console.log('Sample paths (first 20):');
allPaths.slice(0, 20).forEach((path, index) => {
  console.log(`  ${index + 1}. /code/${path.slug.join('/')}`);
});
console.log();

// Test generating paths for specific version
console.log('2. Generating paths for version 2024...');
console.log('-'.repeat(80));
const version2024Paths = generateStaticPathsForVersion('2024');
console.log();
console.log(`✅ Paths for version 2024: ${version2024Paths.length}`);
console.log();

// Analyze path depths
console.log('3. Path depth analysis...');
console.log('-'.repeat(80));
const depthCounts = new Map<number, number>();
allPaths.forEach(path => {
  const depth = path.slug.length;
  depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1);
});

console.log('Paths by depth:');
Array.from(depthCounts.entries())
  .sort((a, b) => a[0] - b[0])
  .forEach(([depth, count]) => {
    const level = depth === 3 ? 'Section' : depth === 4 ? 'Subsection' : depth === 5 ? 'Article' : 'Unknown';
    console.log(`  Depth ${depth} (${level}): ${count} paths`);
  });
console.log();

// Check for the specific path that was causing the error
console.log('4. Checking for specific paths...');
console.log('-'.repeat(80));
const testPaths = [
  ['nbc.divA', '1', '1'],           // Section 1.1
  ['nbc.divA', '1', '1', '2'],      // Subsection 1.1.2
  ['nbc.divA', '1', '1', '1', '1'], // Article 1.1.1.1
];

testPaths.forEach(testPath => {
  const found = allPaths.some(p => 
    p.slug.length === testPath.length && 
    p.slug.every((seg, i) => seg === testPath[i])
  );
  const status = found ? '✅' : '❌';
  console.log(`  ${status} /code/${testPath.join('/')}`);
});
console.log();

console.log('='.repeat(80));
console.log('Test Complete!');
console.log('='.repeat(80));

