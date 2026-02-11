/**
 * URL Adapter
 * 
 * Transforms between two URL formats:
 * 1. Navigation format: /code/nbc.divA/1/4 (used by navigation tree, breadcrumbs, quick access)
 * 2. File system format: /code/nbc-diva/part-1/section-4 (matches actual file structure)
 * 
 * This adapter allows the reading page to work with both formats.
 */

/**
 * Transform navigation URL format to file system format
 * 
 * Examples:
 * - nbc.divA/1/4 -> nbc-diva/part-1/section-4
 * - nbc.divB/3/1 -> nbc-divb/part-3/section-1
 * - nbc.divBV2/9/1 -> nbc-divbv2/part-9/section-1
 * - nbc.divC/2/3/1 -> nbc-divc/part-2/section-3/subsection-1
 */
export function transformNavigationUrlToFileSystem(slug: string[]): string[] {
  if (slug.length === 0) return slug;
  
  const transformed: string[] = [];
  
  // Transform division: nbc.divA -> nbc-diva, nbc.divBV2 -> nbc-divbv2
  if (slug[0]) {
    const divisionMatch = slug[0].match(/nbc\.div([A-Z0-9]+)/i);
    if (divisionMatch) {
      const divSuffix = divisionMatch[1].toLowerCase();
      transformed.push(`nbc-div${divSuffix}`);
    } else {
      // Already in file system format or unknown format
      transformed.push(slug[0]);
    }
  }
  
  // Transform part: 1 -> part-1
  if (slug[1]) {
    if (/^\d+$/.test(slug[1])) {
      transformed.push(`part-${slug[1]}`);
    } else {
      // Already in file system format
      transformed.push(slug[1]);
    }
  }
  
  // Transform section: 4 -> section-4
  if (slug[2]) {
    if (/^\d+$/.test(slug[2])) {
      transformed.push(`section-${slug[2]}`);
    } else {
      // Already in file system format
      transformed.push(slug[2]);
    }
  }
  
  // Transform subsection: 1 -> subsection-1 (if present)
  if (slug[3]) {
    if (/^\d+$/.test(slug[3])) {
      transformed.push(`subsection-${slug[3]}`);
    } else {
      transformed.push(slug[3]);
    }
  }
  
  // Transform article: 1 -> article-1 (if present)
  if (slug[4]) {
    if (/^\d+$/.test(slug[4])) {
      transformed.push(`article-${slug[4]}`);
    } else {
      transformed.push(slug[4]);
    }
  }
  
  return transformed;
}

/**
 * Check if URL is in navigation format (needs transformation)
 * Returns true if the URL uses the old format: nbc.divA/1/4 or nbc.divBV2/9/1
 */
export function isNavigationFormat(slug: string[]): boolean {
  if (slug.length === 0) return false;
  
  // Check if first segment is in navigation format (nbc.divA, nbc.divBV2, etc.)
  return /nbc\.div[A-Z0-9]+/i.test(slug[0]);
}

/**
 * Transform file system format back to navigation format (for URLs)
 * 
 * Examples:
 * - nbc-diva/part-1/section-4 -> nbc.divA/1/4
 * - nbc-divb/part-3/section-1 -> nbc.divB/3/1
 * - nbc-divbv2/part-9/section-1 -> nbc.divBV2/9/1
 */
export function transformFileSystemToNavigationUrl(slug: string[]): string[] {
  if (slug.length === 0) return slug;
  
  const transformed: string[] = [];
  
  // Transform division: nbc-diva -> nbc.divA, nbc-divbv2 -> nbc.divBV2
  if (slug[0]) {
    const divisionMatch = slug[0].match(/nbc-div([a-z0-9]+)/i);
    if (divisionMatch) {
      const divSuffix = divisionMatch[1].toUpperCase();
      transformed.push(`nbc.div${divSuffix}`);
    } else {
      transformed.push(slug[0]);
    }
  }
  
  // Transform part: part-1 -> 1
  if (slug[1]) {
    const partMatch = slug[1].match(/part-(\d+)/);
    if (partMatch) {
      transformed.push(partMatch[1]);
    } else {
      transformed.push(slug[1]);
    }
  }
  
  // Transform section: section-4 -> 4
  if (slug[2]) {
    const sectionMatch = slug[2].match(/section-(\d+)/);
    if (sectionMatch) {
      transformed.push(sectionMatch[1]);
    } else {
      transformed.push(slug[2]);
    }
  }
  
  // Transform subsection: subsection-1 -> 1
  if (slug[3]) {
    const subsectionMatch = slug[3].match(/subsection-(\d+)/);
    if (subsectionMatch) {
      transformed.push(subsectionMatch[1]);
    } else {
      transformed.push(slug[3]);
    }
  }
  
  // Transform article: article-1 -> 1
  if (slug[4]) {
    const articleMatch = slug[4].match(/article-(\d+)/);
    if (articleMatch) {
      transformed.push(articleMatch[1]);
    } else {
      transformed.push(slug[4]);
    }
  }
  
  return transformed;
}
