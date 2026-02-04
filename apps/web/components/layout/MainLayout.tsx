"use client";

import { ReactNode } from "react";
import Sidebar from "@repo/ui/sidebar";
import ContentPanel from "@repo/ui/content-panel";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { TESTID_MAIN_LAYOUT } from "@repo/constants/src/testids";
import "./MainLayout.css";

export interface MainLayoutProps {
  /**
   * Content to display in the main content area
   */
  children: ReactNode;
  /**
   * Whether to show the sidebar (TOC navigation)
   * - true: Homepage and Content Reading Page (three-panel layout)
   * - false: Search Results and Download Page (full-width layout)
   * @default false
   */
  showSidebar?: boolean;
  /**
   * Content to display in the sidebar (typically NavigationTree)
   * Only rendered when showSidebar is true
   */
  sidebarContent?: ReactNode;
  /**
   * Custom CSS class name
   */
  className?: string;
  /**
   * Test ID for testing
   */
  "data-testid"?: string;
}

/**
 * MainLayout component - Main application layout with conditional sidebar
 * 
 * Features:
 * - Three-panel layout on desktop when sidebar is shown (≥ 1024px)
 * - Full-width layout when sidebar is hidden (Search Results, Download pages)
 * - Responsive layout for tablet (768px - 1023px)
 * - Responsive layout for mobile (< 768px)
 * - Integrates Breadcrumbs, Sidebar (conditional), and ContentPanel
 * 
 * Layout Behavior:
 * - **With Sidebar** (Homepage, Content Reading Page):
 *   - Desktop: Sidebar + Content Panel side-by-side
 *   - Tablet: Collapsible sidebar drawer + Content Panel
 *   - Mobile: Drawer sidebar + Stacked content
 * 
 * - **Without Sidebar** (Search Results, Download Page):
 *   - All breakpoints: Full-width content panel
 * 
 * @example
 * ```tsx
 * // Homepage or Content Reading Page (with sidebar)
 * <MainLayout showSidebar sidebarContent={<NavigationTree />}>
 *   <ArticleContent />
 * </MainLayout>
 * 
 * // Search Results or Download Page (full-width)
 * <MainLayout>
 *   <SearchResults />
 * </MainLayout>
 * ```
 */
export default function MainLayout({
  children,
  showSidebar = false,
  sidebarContent,
  className = "",
  "data-testid": testid = TESTID_MAIN_LAYOUT,
}: MainLayoutProps) {
  // Full-width layout (no sidebar)
  if (!showSidebar) {
    return (
      <>
        <Breadcrumbs />
        <div
          className={`MainLayout MainLayout--full-width ${className}`}
          data-testid={testid}
        >
          <ContentPanel className="--full-width">
            {children}
          </ContentPanel>
        </div>
      </>
    );
  }

  // Three-panel layout (with sidebar)
  return (
    <>
      <Breadcrumbs />
      <div
        className={`MainLayout MainLayout--with-sidebar ${className}`}
        data-testid={testid}
      >
        <Sidebar>
          {sidebarContent}
        </Sidebar>
        <ContentPanel>
          {children}
        </ContentPanel>
      </div>
    </>
  );
}
