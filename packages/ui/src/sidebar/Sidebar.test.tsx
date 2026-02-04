import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";
import { TESTID_SIDEBAR, TESTID_SIDEBAR_TOGGLE, TESTID_SIDEBAR_MOBILE_OVERLAY, GET_TESTID_BUTTON } from "@repo/constants/src/testids";

describe("Sidebar", () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    // Store original window.innerWidth
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  const mockResize = (width: number) => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event("resize"));
  };

  describe("Desktop behavior (≥ 1024px)", () => {
    beforeEach(() => {
      mockResize(1024);
    });

    it("renders sidebar with children on desktop", () => {
      render(
        <Sidebar>
          <div>Navigation Content</div>
        </Sidebar>
      );

      expect(screen.getByTestId(TESTID_SIDEBAR)).toBeInTheDocument();
      expect(screen.getByText("Navigation Content")).toBeInTheDocument();
    });

    it("renders toggle button on desktop", () => {
      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute("aria-label", "Collapse sidebar");
    });

    it("toggles collapse state when toggle button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      const sidebar = screen.getByTestId(TESTID_SIDEBAR);
      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));

      // Initially not collapsed
      expect(sidebar).not.toHaveClass("--collapsed");
      expect(toggleButton).toHaveAttribute("aria-label", "Collapse sidebar");

      // Click to collapse
      await user.click(toggleButton);
      expect(sidebar).toHaveClass("--collapsed");
      expect(toggleButton).toHaveAttribute("aria-label", "Expand sidebar");

      // Click to expand
      await user.click(toggleButton);
      expect(sidebar).not.toHaveClass("--collapsed");
      expect(toggleButton).toHaveAttribute("aria-label", "Collapse sidebar");
    });

    it("calls onCollapseChange callback when toggled", async () => {
      const user = userEvent.setup();
      const onCollapseChange = vi.fn();
      
      render(
        <Sidebar onCollapseChange={onCollapseChange}>
          <div>Content</div>
        </Sidebar>
      );

      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));

      await user.click(toggleButton);
      expect(onCollapseChange).toHaveBeenCalledWith(true);

      await user.click(toggleButton);
      expect(onCollapseChange).toHaveBeenCalledWith(false);
    });

    it("respects defaultCollapsed prop", () => {
      render(
        <Sidebar defaultCollapsed>
          <div>Content</div>
        </Sidebar>
      );

      const sidebar = screen.getByTestId(TESTID_SIDEBAR);
      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));

      expect(sidebar).toHaveClass("--collapsed");
      expect(toggleButton).toHaveAttribute("aria-label", "Expand sidebar");
    });

    it("applies custom className", () => {
      render(
        <Sidebar className="custom-class">
          <div>Content</div>
        </Sidebar>
      );

      const sidebar = screen.getByTestId(TESTID_SIDEBAR);
      expect(sidebar).toHaveClass("custom-class");
    });

    it("does not render mobile toggle button on desktop", () => {
      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      // Mobile toggle should not be visible on desktop
      const toggleButtons = screen.getAllByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
      expect(toggleButtons).toHaveLength(1); // Only desktop toggle
    });
  });

  describe("Mobile/Tablet behavior (< 1024px)", () => {
    beforeEach(() => {
      mockResize(768);
    });

    it("renders mobile toggle button on mobile", async () => {
      render(
        <Sidebar>
          <div>Navigation Content</div>
        </Sidebar>
      );

      await waitFor(() => {
        const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
        expect(toggleButton).toBeInTheDocument();
        expect(toggleButton).toHaveAttribute("aria-label", "Open navigation");
      });
    });

    it("does not render desktop sidebar on mobile", async () => {
      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      await waitFor(() => {
        expect(screen.queryByTestId(TESTID_SIDEBAR)).not.toBeInTheDocument();
      });
    });

    it("opens mobile drawer when toggle button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <Sidebar>
          <div>Navigation Content</div>
        </Sidebar>
      );

      await waitFor(() => {
        const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
        expect(toggleButton).toBeInTheDocument();
      });

      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).toBeInTheDocument();
        expect(screen.getByText("Navigation Content")).toBeInTheDocument();
      });
    });

    it("closes mobile drawer when close button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <Sidebar>
          <div>Navigation Content</div>
        </Sidebar>
      );

      await waitFor(() => {
        const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
        expect(toggleButton).toBeInTheDocument();
      });

      // Open drawer
      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).toBeInTheDocument();
      });

      // Close drawer using close button in header
      const closeButtons = screen.getAllByRole("button", { name: /close navigation/i });
      await user.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).not.toBeInTheDocument();
      });
    });

    it("updates toggle button label when drawer is open", async () => {
      const user = userEvent.setup();
      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      await waitFor(() => {
        const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
        expect(toggleButton).toHaveAttribute("aria-label", "Open navigation");
      });

      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
      await user.click(toggleButton);

      await waitFor(() => {
        expect(toggleButton).toHaveAttribute("aria-label", "Close navigation");
      });
    });
  });

  describe("Responsive behavior", () => {
    it("switches from desktop to mobile when resizing below 1024px", async () => {
      mockResize(1200);
      
      const { rerender } = render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      // Desktop sidebar should be visible
      expect(screen.getByTestId(TESTID_SIDEBAR)).toBeInTheDocument();

      // Resize to mobile
      mockResize(768);
      rerender(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      await waitFor(() => {
        expect(screen.queryByTestId(TESTID_SIDEBAR)).not.toBeInTheDocument();
      });
    });

    it("closes mobile drawer when resizing to desktop", async () => {
      const user = userEvent.setup();
      mockResize(768);
      
      const { rerender } = render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      await waitFor(() => {
        const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
        expect(toggleButton).toBeInTheDocument();
      });

      // Open mobile drawer
      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).toBeInTheDocument();
      });

      // Resize to desktop
      mockResize(1200);
      rerender(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      await waitFor(() => {
        expect(screen.queryByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).not.toBeInTheDocument();
        expect(screen.getByTestId(TESTID_SIDEBAR)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for toggle buttons", () => {
      mockResize(1024);
      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
      expect(toggleButton).toHaveAttribute("aria-label");
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      mockResize(1024);
      
      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      const toggleButton = screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE));
      
      // Focus the button
      toggleButton.focus();
      expect(toggleButton).toHaveFocus();

      // Press Enter to toggle
      await user.keyboard("{Enter}");
      
      const sidebar = screen.getByTestId(TESTID_SIDEBAR);
      expect(sidebar).toHaveClass("--collapsed");
    });

    it("uses custom test ID when provided", () => {
      mockResize(1024);
      render(
        <Sidebar data-testid="custom-sidebar">
          <div>Content</div>
        </Sidebar>
      );

      expect(screen.getByTestId("custom-sidebar")).toBeInTheDocument();
    });
  });
});
