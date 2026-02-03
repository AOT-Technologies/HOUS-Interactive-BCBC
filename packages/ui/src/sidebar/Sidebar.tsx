"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import Button from "../button/Button";
import Icon from "../icon/Icon";
import { TESTID_SIDEBAR, TESTID_SIDEBAR_TOGGLE } from "@repo/constants/src/testids";
import "./Sidebar.css";

export interface SidebarProps {
  /**
   * Content to display inside the sidebar (typically navigation tree, filters, etc.)
   */
  children: ReactNode;
  /**
   * Whether the sidebar is initially collapsed on desktop
   * @default false
   */
  defaultCollapsed?: boolean;
  /**
   * Callback when sidebar collapse state changes
   */
  onCollapseChange?: (collapsed: boolean) => void;
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
 * Sidebar component for navigation and filters
 *
 * Features:
 * - Always visible on desktop (≥ 1024px)
 * - Collapsible inline panel on mobile/tablet (< 1024px)
 * - Scroll-to-active functionality
 * - Responsive across all breakpoints
 *
 * Usage:
 * - Only render on Homepage and Content Reading Page
 * - Do NOT render on Search Results Page or Download Page
 */
export default function Sidebar({
  children,
  defaultCollapsed = false,
  onCollapseChange,
  className = "",
  "data-testid": testid = TESTID_SIDEBAR,
}: SidebarProps) {
  // Mobile/tablet panel expanded state (< 1024px)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Track viewport size to determine mobile vs desktop behavior
  const [isMobile, setIsMobile] = useState(false);

  // Check if viewport is mobile/tablet (< 1024px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle mobile panel toggle
  const handleToggleMobile = useCallback(() => {
    const newOpen = !isMobileOpen;
    setIsMobileOpen(newOpen);
    onCollapseChange?.(!newOpen);
  }, [isMobileOpen, onCollapseChange]);

  // Close mobile panel on window resize to desktop
  useEffect(() => {
    if (!isMobile && isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [isMobile, isMobileOpen]);

  // Desktop sidebar (≥ 1024px) - always visible, no collapse button per Figma design
  if (!isMobile) {
    return (
      <aside
        className={`ui-Sidebar ${className}`}
        data-testid={testid}
      >
        <div className="ui-Sidebar--Content">
          {children}
        </div>
      </aside>
    );
  }

  // Mobile/tablet collapsible inline panel (< 1024px)
  return (
    <div className={`ui-Sidebar--MobileWrapper ${isMobileOpen ? '--open' : ''}`}>
      {/* Toggle button container - white background section */}
      <div className="ui-Sidebar--MobileToggleContainer">
        <Button
          variant="secondary"
          isIconButton
          className="ui-Sidebar--MobileToggle"
          onPress={handleToggleMobile}
          aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isMobileOpen}
          data-testid={TESTID_SIDEBAR_TOGGLE}
        >
          <Icon type={isMobileOpen ? "close" : "menu"} />
        </Button>
      </div>

      {/* Expandable sidebar panel - appears below toggle when open */}
      {isMobileOpen && (
        <aside
          className={`ui-Sidebar--MobilePanel ${className}`}
          data-testid={testid}
        >
          <div className="ui-Sidebar--MobilePanelContent">
            {children}
          </div>
        </aside>
      )}
    </div>
  );
}
