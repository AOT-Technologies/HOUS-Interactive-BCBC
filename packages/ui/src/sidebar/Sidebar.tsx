"use client";

import { ReactNode, CSSProperties, useEffect, useState, useCallback, useRef } from "react";
import Button from "../button/Button";
import Icon from "../icon/Icon";
import {
  TESTID_SIDEBAR,
  TESTID_SIDEBAR_MOBILE_OVERLAY,
  TESTID_SIDEBAR_TOGGLE,
} from "@repo/constants/src/testids";
import "./Sidebar.css";

export interface SidebarProps {
  /**
   * Content to display inside the sidebar (typically navigation tree, filters, etc.)
   */
  children: ReactNode;
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
  onCollapseChange,
  className = "",
  "data-testid": testid = TESTID_SIDEBAR,
}: SidebarProps) {
  // Mobile/tablet panel expanded state (< 1024px)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Track viewport size to determine mobile vs desktop behavior
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOverlayTop, setMobileOverlayTop] = useState<number | null>(null);
  const toggleContainerRef = useRef<HTMLDivElement>(null);

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

  // Keep the mobile overlay positioned below the toggle row.
  useEffect(() => {
    if (!isMobile || !isMobileOpen) {
      setMobileOverlayTop(null);
      return;
    }

    const updateOverlayTop = () => {
      const bounds = toggleContainerRef.current?.getBoundingClientRect();
      setMobileOverlayTop(bounds ? Math.round(bounds.bottom) : null);
    };

    updateOverlayTop();
    window.addEventListener("resize", updateOverlayTop);
    window.addEventListener("scroll", updateOverlayTop, { passive: true });

    return () => {
      window.removeEventListener("resize", updateOverlayTop);
      window.removeEventListener("scroll", updateOverlayTop);
    };
  }, [isMobile, isMobileOpen]);

  // Prevent body scroll while mobile overlay is open.
  useEffect(() => {
    if (!isMobile || !isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
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
      <div ref={toggleContainerRef} className="ui-Sidebar--MobileToggleContainer">
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

      {/* Overlay sidebar panel - opens above page content */}
      {isMobileOpen && (
        <div
          className={`ui-Sidebar--MobileOverlay ${mobileOverlayTop === null ? "--positioning" : ""}`}
          data-testid={TESTID_SIDEBAR_MOBILE_OVERLAY}
          style={mobileOverlayTop !== null ? ({ "--sidebar-mobile-overlay-top": `${mobileOverlayTop}px` } as CSSProperties) : undefined}
        >
          <aside
            className={`ui-Sidebar--MobilePanel ${className}`}
            data-testid={testid}
          >
            <div className="ui-Sidebar--MobilePanelContent">
              {children}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
