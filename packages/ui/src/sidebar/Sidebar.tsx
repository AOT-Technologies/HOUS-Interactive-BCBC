"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import Button from "../button/Button";
import Icon from "../icon/Icon";
import { TESTID_SIDEBAR, TESTID_SIDEBAR_TOGGLE, TESTID_SIDEBAR_MOBILE_OVERLAY } from "@repo/constants/src/testids";
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
 * - Collapsible on desktop (≥ 1024px)
 * - Drawer behavior on mobile/tablet (< 1024px)
 * - Scroll-to-active functionality
 * - Responsive across all breakpoints
 * 
 * Usage:
 * - Only render on Homepage and Content Reading Page
 * - Do NOT render on Search Results Page or Download Page
 * 
 * @example
 * ```tsx
 * <Sidebar>
 *   <NavigationTree />
 *   <Filters />
 * </Sidebar>
 * ```
 */
export default function Sidebar({
  children,
  defaultCollapsed = false,
  onCollapseChange,
  className = "",
  "data-testid": testid = TESTID_SIDEBAR,
}: SidebarProps) {
  // Desktop collapse state (≥ 1024px)
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  // Mobile/tablet drawer state (< 1024px)
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

  // Handle collapse toggle on desktop
  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  }, [isCollapsed, onCollapseChange]);

  // Handle mobile drawer toggle
  const handleToggleMobile = useCallback(() => {
    setIsMobileOpen(!isMobileOpen);
  }, [isMobileOpen]);

  // Close mobile drawer on window resize to desktop
  useEffect(() => {
    if (!isMobile && isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [isMobile, isMobileOpen]);

  // Desktop sidebar (≥ 1024px)
  if (!isMobile) {
    return (
      <aside
        className={`ui-Sidebar ${isCollapsed ? "--collapsed" : ""} ${className}`}
        data-testid={testid}
      >
        <div className="ui-Sidebar--Content">
          {children}
        </div>
        <Button
          variant="secondary"
          isIconButton
          className="ui-Sidebar--ToggleButton"
          onPress={handleToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          data-testid={TESTID_SIDEBAR_TOGGLE}
        >
          <Icon type={isCollapsed ? "arrowForward" : "arrowBack"} />
        </Button>
      </aside>
    );
  }

  // Mobile/tablet drawer (< 1024px)
  return (
    <>
      {/* Toggle button for mobile drawer */}
      <Button
        variant="secondary"
        isIconButton
        className="ui-Sidebar--MobileToggle"
        onPress={handleToggleMobile}
        aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
        data-testid={TESTID_SIDEBAR_TOGGLE}
      >
        <Icon type={isMobileOpen ? "close" : "menu"} />
      </Button>

      {/* Mobile drawer modal */}
      <ModalOverlay
        className="ui-Sidebar--MobileOverlay"
        isOpen={isMobileOpen}
        onOpenChange={setIsMobileOpen}
        isDismissable
      >
        <Modal
          className="ui-Sidebar--MobileModal"
          data-testid={TESTID_SIDEBAR_MOBILE_OVERLAY}
        >
          <Dialog className="ui-Sidebar--MobileDialog" aria-label="Navigation menu">
            {({ close }) => (
              <>
                <div className="ui-Sidebar--MobileHeader">
                  <Button
                    variant="secondary"
                    isIconButton
                    onPress={close}
                    aria-label="Close navigation"
                  >
                    <Icon type="close" />
                  </Button>
                </div>
                <div className="ui-Sidebar--MobileContent">
                  {children}
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
