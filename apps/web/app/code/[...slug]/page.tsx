/**
 * Reading Page Route
 * 
 * Dynamic route for rendering BC Building Code content at any hierarchy level.
 * Supports URL patterns:
 * - /code/{division}/{part}/{section}
 * - /code/{division}/{part}/{section}/{subsection}
 * - /code/{division}/{part}/{section}/{subsection}/{article}
 * 
 * Query parameters:
 * - version: Code version (e.g., "2024")
 * - date: Effective amendment date (ISO format)
 * - modal: Cross-reference modal ID
 */

import { Suspense } from 'react';
import MainLayout from '../../../components/layout/MainLayout';
import HomeSidebarContent from '../../../components/home/HomeSidebarContent';
import { ReadingView } from '../../../components/reading';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export default async function ReadingPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <MainLayout 
      className="MainLayout--reading"
      showSidebar 
      sidebarContent={
        <Suspense fallback={<div className="sidebar-loading">Loading navigation...</div>}>
          <HomeSidebarContent />
        </Suspense>
      }
    >
      <Suspense
        fallback={
          <div className="reading-view">
            <div className="reading-view__loading" role="status" aria-live="polite" aria-label="Loading content...">
              <div className="reading-view__loading-shell" aria-hidden="true">
                <div className="reading-view__skeleton-line reading-view__skeleton-title" />
                <div className="reading-view__skeleton-line reading-view__skeleton-subtitle" />
                <div className="reading-view__skeleton-block">
                  <div className="reading-view__skeleton-line reading-view__skeleton-body" />
                  <div className="reading-view__skeleton-line reading-view__skeleton-body" />
                  <div className="reading-view__skeleton-line reading-view__skeleton-body-short" />
                </div>
                <div className="reading-view__skeleton-block">
                  <div className="reading-view__skeleton-line reading-view__skeleton-body" />
                  <div className="reading-view__skeleton-line reading-view__skeleton-body-mid" />
                  <div className="reading-view__skeleton-line reading-view__skeleton-body-short" />
                </div>
              </div>
              <span className="reading-view__loading-text">Loading content...</span>
            </div>
          </div>
        }
      >
        <ReadingView
          slug={slug}
          version="2024"
          effectiveDate={undefined}
          modalRef={undefined}
        />
      </Suspense>
    </MainLayout>
  );
}

// Generate static params for static export
// This tells Next.js which paths to pre-render at build time
export async function generateStaticParams() {
  // Dynamically generate all paths from navigation tree
  // This ensures all sections, subsections, and articles are pre-rendered
  const { generateAllStaticPaths } = await import('../../../lib/generate-static-paths');
  
  const paths = generateAllStaticPaths();
  
  console.log(`[generateStaticParams] Generated ${paths.length} static paths for pre-rendering`);
  
  return paths;
}

// Generate metadata for the page
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const [division, part, section, subsection, article] = slug;

  let title = 'BC Building Code';
  
  if (article && subsection) {
    title = `Article ${article} - BC Building Code`;
  } else if (subsection) {
    title = `Subsection ${subsection} - BC Building Code`;
  } else if (section) {
    title = `Section ${section} - BC Building Code`;
  } else if (part) {
    title = `Part ${part} - BC Building Code`;
  }

  const locationParts = [division, part, section, subsection, article].filter(Boolean);

  return {
    title,
    description: `Read the BC Building Code content for ${locationParts.join('/')}`,
  };
}
