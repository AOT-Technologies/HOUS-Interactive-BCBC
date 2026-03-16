import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";
import {
  GET_TESTID_BUTTON,
  TESTID_SIDEBAR,
  TESTID_SIDEBAR_MOBILE_OVERLAY,
  TESTID_SIDEBAR_TOGGLE,
} from "@repo/constants/src/testids";

describe("Sidebar", () => {
  let originalInnerWidth: number;

  const setViewport = (width: number) => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
    window.dispatchEvent(new Event("resize"));
  };

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    setViewport(originalInnerWidth);
    document.body.style.overflow = "";
  });

  describe("desktop behavior", () => {
    beforeEach(() => {
      setViewport(1200);
    });

    it("renders the sidebar content inline", () => {
      render(
        <Sidebar>
          <div>Navigation Content</div>
        </Sidebar>
      );

      expect(screen.getByTestId(TESTID_SIDEBAR)).toBeInTheDocument();
      expect(screen.getByText("Navigation Content")).toBeInTheDocument();
    });

    it("does not render the mobile toggle or overlay on desktop", () => {
      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      expect(
        screen.queryByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE))
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).not.toBeInTheDocument();
    });

    it("applies a custom class name", () => {
      render(
        <Sidebar className="custom-class">
          <div>Content</div>
        </Sidebar>
      );

      expect(screen.getByTestId(TESTID_SIDEBAR)).toHaveClass("custom-class");
    });

    it("uses a custom test id", () => {
      render(
        <Sidebar data-testid="custom-sidebar">
          <div>Content</div>
        </Sidebar>
      );

      expect(screen.getByTestId("custom-sidebar")).toBeInTheDocument();
    });
  });

  describe("mobile behavior", () => {
    beforeEach(() => {
      setViewport(768);
    });

    it("renders a mobile toggle button", async () => {
      render(
        <Sidebar>
          <div>Navigation Content</div>
        </Sidebar>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE))
        ).toHaveAttribute("aria-label", "Open navigation");
      });
    });

    it("opens and closes the mobile overlay", async () => {
      const user = userEvent.setup();
      render(
        <Sidebar>
          <div>Navigation Content</div>
        </Sidebar>
      );

      const toggleButton = await screen.findByTestId(
        GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE)
      );

      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).toBeInTheDocument();
        expect(screen.getByTestId(TESTID_SIDEBAR)).toBeInTheDocument();
        expect(toggleButton).toHaveAttribute("aria-label", "Close navigation");
      });

      expect(document.body.style.overflow).toBe("hidden");

      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).not.toBeInTheDocument();
        expect(toggleButton).toHaveAttribute("aria-label", "Open navigation");
      });
    });

    it("calls onCollapseChange with the current mobile state", async () => {
      const user = userEvent.setup();
      const onCollapseChange = vi.fn();

      render(
        <Sidebar onCollapseChange={onCollapseChange}>
          <div>Content</div>
        </Sidebar>
      );

      const toggleButton = await screen.findByTestId(
        GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE)
      );

      await user.click(toggleButton);
      await user.click(toggleButton);

      expect(onCollapseChange).toHaveBeenNthCalledWith(1, false);
      expect(onCollapseChange).toHaveBeenNthCalledWith(2, true);
    });

    it("supports keyboard activation for the toggle button", async () => {
      const user = userEvent.setup();
      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      const toggleButton = await screen.findByTestId(
        GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE)
      );

      toggleButton.focus();
      expect(toggleButton).toHaveFocus();

      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).toBeInTheDocument();
      });
    });
  });

  describe("responsive transitions", () => {
    it("closes the mobile overlay when resizing to desktop", async () => {
      const user = userEvent.setup();
      setViewport(768);

      render(
        <Sidebar>
          <div>Content</div>
        </Sidebar>
      );

      const toggleButton = await screen.findByTestId(
        GET_TESTID_BUTTON(TESTID_SIDEBAR_TOGGLE)
      );
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).toBeInTheDocument();
      });

      setViewport(1200);

      await waitFor(() => {
        expect(screen.queryByTestId(TESTID_SIDEBAR_MOBILE_OVERLAY)).not.toBeInTheDocument();
        expect(screen.getByTestId(TESTID_SIDEBAR)).toBeInTheDocument();
      });
    });
  });
});
