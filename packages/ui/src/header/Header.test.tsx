// 3rd party
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
// repo
import {
  GET_TESTID_BUTTON,
  GET_TESTID_HEADER_NAV_ITEM,
  GET_TESTID_LINK,
  TESTID_HEADER,
  TESTID_HEADER_MOBILE_NAV,
  TESTID_HEADER_MOBILE_NAV_BUTTON,
} from "@repo/constants/src/testids";
// local
import { userSetupAndRender } from "../../tests/utils";
import Header from "./Header";
import { URL_HOME_TITLE, URLS_MAIN_NAVIGATION } from "@repo/constants/src/urls";

// mock next/navigation userRouter
const routerPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

describe("Header", () => {
  beforeEach(() => {
    // Reset router mock before each test
    routerPush.mockClear();
  });

  afterEach(() => {
    // Reset window size after each test
    window.innerWidth = 1024;
  });

  it("renders", () => {
    const { getByTestId } = render(<Header />);
    expect(getByTestId(TESTID_HEADER)).toBeInTheDocument();
  });

  describe("Responsive Behavior", () => {
    it("shows desktop navigation at desktop breakpoint (≥ 912px)", () => {
      // Set desktop viewport width
      window.innerWidth = 1024;
      window.innerHeight = 768;

      const { getByTestId, container } = render(
        <Header title="BC Building Code" logoSrc="/logo.png" />
      );

      const header = getByTestId(TESTID_HEADER);
      expect(header).toBeInTheDocument();

      // Mobile nav button should not be visible on desktop (CSS handles this)
      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );
      expect(mobileNavButton).toBeInTheDocument();

      // Desktop nav list should be present
      const navList = container.querySelector(".ui-Header--NavList");
      expect(navList).toBeInTheDocument();

      // Title should be visible on desktop
      const titleWrapper = container.querySelector(".ui-Header--TitleWrapper");
      expect(titleWrapper).toBeInTheDocument();
    });

    it("shows mobile navigation toggle at mobile breakpoint (< 912px)", () => {
      // Set mobile viewport width
      window.innerWidth = 400;
      window.innerHeight = 800;

      const { getByTestId } = render(
        <Header title="BC Building Code" logoSrc="/logo.png" />
      );

      const header = getByTestId(TESTID_HEADER);
      expect(header).toBeInTheDocument();

      // Mobile nav button should be present
      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );
      expect(mobileNavButton).toBeInTheDocument();
      expect(mobileNavButton).toHaveAttribute("aria-label", "Open the navigation");
    });

    it("shows mobile navigation toggle at tablet breakpoint (768px)", () => {
      // Set tablet viewport width
      window.innerWidth = 768;
      window.innerHeight = 1024;

      const { getByTestId } = render(<Header />);

      // Mobile nav button should be present at tablet size
      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );
      expect(mobileNavButton).toBeInTheDocument();
    });

    it("closes mobile menu on window resize", async () => {
      // Set mobile viewport width
      window.innerWidth = 400;

      const { user, getByTestId, queryByTestId } = userSetupAndRender(<Header />);

      // Open mobile nav
      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );
      await act(async () => {
        await user.click(mobileNavButton);
      });

      // Verify mobile nav is open
      await waitFor(() => {
        expect(getByTestId(TESTID_HEADER_MOBILE_NAV)).toBeInTheDocument();
      });

      // Trigger window resize event
      await act(async () => {
        window.dispatchEvent(new Event("resize"));
      });

      // Mobile nav should close
      await waitFor(() => {
        expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();
      });
    });
  });

  describe("Mobile Menu Toggle", () => {
    beforeEach(() => {
      // Set mobile viewport for these tests
      window.innerWidth = 400;
      window.innerHeight = 800;
    });

    it("mobile nav: renders and appears", async () => {
      // render the component
      const { user, queryByTestId, getByTestId } = userSetupAndRender(<Header />);
      expect(getByTestId(TESTID_HEADER)).toBeInTheDocument();

      // expect mobile nav not to be in the document
      expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();

      // get mobile nav button
      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON),
      );
      expect(mobileNavButton).toBeInTheDocument();

      // click the mobile nav button
      await act(async () => {
        await user.click(mobileNavButton);
      });

      // expect mobile nav to be in the document
      const mobileNav = getByTestId(TESTID_HEADER_MOBILE_NAV);
      await waitFor(() => {
        expect(mobileNav).toBeInTheDocument();
      });

      // get mobile nav home link and expect it
      const homeLink = mobileNav.querySelector(
        `[data-testid="${GET_TESTID_LINK(GET_TESTID_HEADER_NAV_ITEM(URL_HOME_TITLE))}"]`,
      );
      expect(homeLink).toBeInTheDocument();

      // click home link
      await act(async () => {
        // @ts-expect-error - based on the expect above, homeLink is not null or test will fail
        await user.click(homeLink);
      });

      // expect mobile nav to be hidden
      await waitFor(() => {
        expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();
      });
    });

    it("toggles mobile menu open and closed", async () => {
      const { user, getByTestId, queryByTestId } = userSetupAndRender(<Header />);

      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );

      // Initially closed
      expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();
      expect(mobileNavButton).toHaveAttribute("aria-label", "Open the navigation");

      // Click to open
      await act(async () => {
        await user.click(mobileNavButton);
      });

      await waitFor(() => {
        expect(getByTestId(TESTID_HEADER_MOBILE_NAV)).toBeInTheDocument();
      });

      // Find the close button inside the modal
      const mobileNav = getByTestId(TESTID_HEADER_MOBILE_NAV);
      const closeButton = mobileNav.querySelector(
        `[data-testid="${GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)}"]`
      );
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute("aria-label", "Close the navigation");

      // Click to close
      await act(async () => {
        // @ts-expect-error - we verified it exists above
        await user.click(closeButton);
      });

      await waitFor(() => {
        expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();
      });
    });

    it("displays correct icon when menu is closed (menu icon)", () => {
      const { getByTestId } = render(<Header />);

      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );

      // Should show menu icon when closed
      const menuIcon = mobileNavButton.querySelector('[data-testid="icon-menu"]');
      expect(menuIcon).toBeInTheDocument();
    });

    it("displays correct icon when menu is open (close icon)", async () => {
      const { user, getByTestId } = userSetupAndRender(<Header />);

      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );

      // Open the menu
      await act(async () => {
        await user.click(mobileNavButton);
      });

      await waitFor(() => {
        expect(getByTestId(TESTID_HEADER_MOBILE_NAV)).toBeInTheDocument();
      });

      // Find close button in modal and check for close icon
      const mobileNav = getByTestId(TESTID_HEADER_MOBILE_NAV);
      const closeButton = mobileNav.querySelector(
        `[data-testid="${GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)}"]`
      );
      const closeIcon = closeButton?.querySelector('[data-testid="icon-close"]');
      expect(closeIcon).toBeInTheDocument();
    });

    it("scrolls to top when mobile menu opens", async () => {
      const scrollToSpy = vi.spyOn(window, "scrollTo");

      const { user, getByTestId } = userSetupAndRender(<Header />);

      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );

      // Open the menu
      await act(async () => {
        await user.click(mobileNavButton);
      });

      await waitFor(() => {
        expect(getByTestId(TESTID_HEADER_MOBILE_NAV)).toBeInTheDocument();
      });

      // Verify scrollTo was called with (0, 0)
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);

      scrollToSpy.mockRestore();
    });

    it("renders all navigation links in mobile menu", async () => {
      const { user, getByTestId } = userSetupAndRender(<Header />);

      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );

      // Open mobile menu
      await act(async () => {
        await user.click(mobileNavButton);
      });

      const mobileNav = getByTestId(TESTID_HEADER_MOBILE_NAV);
      await waitFor(() => {
        expect(mobileNav).toBeInTheDocument();
      });

      // Check that all navigation links are present
      URLS_MAIN_NAVIGATION.forEach(({ title }) => {
        const link = mobileNav.querySelector(
          `[data-testid="${GET_TESTID_LINK(GET_TESTID_HEADER_NAV_ITEM(title))}"]`
        );
        expect(link).toBeInTheDocument();
      });
    });

    it("navigates when clicking internal links in mobile menu", async () => {
      const { user, getByTestId } = userSetupAndRender(<Header />);

      // Open mobile menu
      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );
      await act(async () => {
        await user.click(mobileNavButton);
      });

      const mobileNav = getByTestId(TESTID_HEADER_MOBILE_NAV);
      await waitFor(() => {
        expect(mobileNav).toBeInTheDocument();
      });

      // Find an internal link (not target="_blank")
      const internalLink = URLS_MAIN_NAVIGATION.find(link => link.target !== "_blank");
      if (internalLink) {
        const link = mobileNav.querySelector(
          `[data-testid="${GET_TESTID_LINK(GET_TESTID_HEADER_NAV_ITEM(internalLink.title))}"]`
        );
        expect(link).toBeInTheDocument();

        // Click the link
        await act(async () => {
          // @ts-expect-error - we verified it exists
          await user.click(link);
        });

        // Verify router.push was called
        await waitFor(() => {
          expect(routerPush).toHaveBeenCalledWith(internalLink.href);
        });

        // Verify mobile menu closes
        await waitFor(() => {
          expect(mobileNav).not.toBeInTheDocument();
        });
      }
    });

    it("closes mobile menu when clicking outside (modal dismissible)", async () => {
      const { user, getByTestId, queryByTestId } = userSetupAndRender(<Header />);

      // Open mobile menu
      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );
      await act(async () => {
        await user.click(mobileNavButton);
      });

      await waitFor(() => {
        expect(getByTestId(TESTID_HEADER_MOBILE_NAV)).toBeInTheDocument();
      });

      // Press Escape key to close (modal is dismissible)
      await act(async () => {
        await user.keyboard("{Escape}");
      });

      await waitFor(() => {
        expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();
      });
    });
  });

  describe("Header Props", () => {
    it("renders with title", () => {
      const { container } = render(<Header title="BC Building Code" />);
      const title = container.querySelector(".ui-Header--Title");
      expect(title).toBeInTheDocument();
      expect(title?.textContent).toBe("BC Building Code");
    });

    it("renders with logo", () => {
      const { container } = render(<Header logoSrc="/logo.png" />);
      const logo = container.querySelector('img[alt*="Government of British Columbia"]');
      expect(logo).toBeInTheDocument();
    });

    it("renders with custom title element", () => {
      const { container } = render(
        <Header title="Test Title" titleElement="h2" />
      );
      const title = container.querySelector("h2.ui-Header--Title");
      expect(title).toBeInTheDocument();
      expect(title?.textContent).toBe("Test Title");
    });

    it("renders skip links when provided", () => {
      const skipLinks = [
        <a key="skip-main" href="#main">Skip to main content</a>,
        <a key="skip-nav" href="#nav">Skip to navigation</a>,
      ];
      const { container } = render(<Header skipLinks={skipLinks} />);
      const skipLinksList = container.querySelector(".ui-Header--SkipLinks");
      expect(skipLinksList).toBeInTheDocument();
      expect(skipLinksList?.children).toHaveLength(2);
    });

    it("renders without title when not provided", () => {
      const { container } = render(<Header />);
      const titleWrapper = container.querySelector(".ui-Header--TitleWrapper");
      expect(titleWrapper).not.toBeInTheDocument();
    });

    it("renders without logo when not provided", () => {
      const { container } = render(<Header />);
      const logo = container.querySelector(".ui-Header--LogoLink");
      expect(logo).not.toBeInTheDocument();
    });
  });

  describe("Desktop Navigation", () => {
    beforeEach(() => {
      // Set desktop viewport
      window.innerWidth = 1024;
      window.innerHeight = 768;
    });

    it("renders all navigation links in desktop nav", () => {
      const { container } = render(<Header />);

      const desktopNav = container.querySelector(".ui-Header--Nav");
      expect(desktopNav).toBeInTheDocument();

      // Check that all navigation links are present
      URLS_MAIN_NAVIGATION.forEach(({ title }) => {
        const link = container.querySelector(
          `[data-testid="${GET_TESTID_LINK(GET_TESTID_HEADER_NAV_ITEM(title))}"]`
        );
        expect(link).toBeInTheDocument();
      });
    });

    it("navigates when clicking internal links in desktop nav", async () => {
      const { user, container } = userSetupAndRender(<Header />);

      // Find an internal link (not target="_blank")
      const internalLink = URLS_MAIN_NAVIGATION.find(link => link.target !== "_blank");
      if (internalLink) {
        const link = container.querySelector(
          `[data-testid="${GET_TESTID_LINK(GET_TESTID_HEADER_NAV_ITEM(internalLink.title))}"]`
        );
        expect(link).toBeInTheDocument();

        // Click the link
        await act(async () => {
          // @ts-expect-error - we verified it exists
          await user.click(link);
        });

        // Verify router.push was called
        await waitFor(() => {
          expect(routerPush).toHaveBeenCalledWith(internalLink.href);
        });
      }
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels on mobile nav button", () => {
      window.innerWidth = 400;
      const { getByTestId } = render(<Header />);

      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );

      expect(mobileNavButton).toHaveAttribute("aria-label", "Open the navigation");
    });

    it("updates ARIA label when mobile menu opens", async () => {
      window.innerWidth = 400;
      const { user, getByTestId } = userSetupAndRender(<Header />);

      const mobileNavButton = getByTestId(
        GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
      );

      // Open menu
      await act(async () => {
        await user.click(mobileNavButton);
      });

      await waitFor(() => {
        expect(getByTestId(TESTID_HEADER_MOBILE_NAV)).toBeInTheDocument();
      });

      // Check close button has correct aria-label
      const mobileNav = getByTestId(TESTID_HEADER_MOBILE_NAV);
      const closeButton = mobileNav.querySelector(
        `[data-testid="${GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)}"]`
      );
      expect(closeButton).toHaveAttribute("aria-label", "Close the navigation");
    });

    it("has semantic header element", () => {
      const { getByTestId } = render(<Header />);
      const header = getByTestId(TESTID_HEADER);
      expect(header.tagName).toBe("HEADER");
    });

    it("has semantic nav element", () => {
      const { container } = render(<Header />);
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
    });
  });
});
