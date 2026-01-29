"use client";

import { ReactNode } from "react";
import { TESTID_CONTENT_PANEL } from "@repo/constants/src/testids";
import "./ContentPanel.css";

export interface ContentPanelProps {
  /**
   * Content to display inside the panel (articles, sections, breadcrumbs, etc.)
   */
  children: ReactNode;
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
 * ContentPanel component for displaying BC Building Code content
 * 
 * Features:
 * - Responsive layout across all breakpoints
 * - Optimized reading width for content
 * - Proper spacing and typography
 * - Accessible content structure
 * 
 * Usage:
 * - Main content area on Content Reading Page
 * - Contains breadcrumbs, article content, navigation buttons
 * - Works with or without sidebar (responsive)
 * 
 * @example
 * ```tsx
 * <ContentPanel>
 *   <Breadcrumbs />
 *   <ArticleRenderer article={article} />
 *   <PrevNextNav />
 * </ContentPanel>
 * ```
 */
export default function ContentPanel({
  children,
  className = "",
  "data-testid": testid = TESTID_CONTENT_PANEL,
}: ContentPanelProps) {
  return (
    <main
      className={`ui-ContentPanel ${className}`}
      data-testid={testid}
    >
      <div className="ui-ContentPanel--Container">
        {children}
      </div>
    </main>
  );
}
