import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  GET_TESTID_BUTTON,
  GET_TESTID_HEADER_NAV_ITEM,
  GET_TESTID_LINK,
  TESTID_HEADER,
  TESTID_HEADER_MOBILE_NAV,
  TESTID_HEADER_MOBILE_NAV_BUTTON,
} from "@repo/constants/src/testids";
import { URLS_MAIN_NAVIGATION } from "@repo/constants/src/urls";
import { userSetupAndRender } from "../../tests/utils";
import Header from "./Header";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

describe("Header", () => {
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    routerPush.mockClear();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
    window.innerWidth = 1024;
  });

  it("renders the header container", () => {
    render(<Header />);
    expect(screen.getByTestId(TESTID_HEADER)).toBeInTheDocument();
  });

  it("renders title and logo when provided", () => {
    const { container } = render(
      <Header title="BC Building Code" logoSrc="/logo.png" titleElement="h2" />
    );

    expect(container.querySelector("h2.ui-Header--Title")?.textContent).toBe(
      "BC Building Code"
    );
    expect(
      container.querySelector('img[alt*="Government of British Columbia"]')
    ).toBeInTheDocument();
  });

  it("renders skip links when provided", () => {
    const skipLinks = [
      <a key="skip-main" href="#main">
        Skip to main content
      </a>,
      <a key="skip-nav" href="#nav">
        Skip to navigation
      </a>,
    ];

    const { container } = render(<Header skipLinks={skipLinks} />);
    expect(container.querySelector(".ui-Header--SkipLinks")?.children).toHaveLength(2);
  });

  it("renders all configured navigation links", () => {
    render(<Header />);

    URLS_MAIN_NAVIGATION.forEach(({ title }) => {
      expect(
        screen.getByTestId(GET_TESTID_LINK(GET_TESTID_HEADER_NAV_ITEM(title)))
      ).toBeInTheDocument();
    });
  });

  it("navigates with router.push for internal desktop links", async () => {
    const { user } = userSetupAndRender(<Header />);
    const internalLink = URLS_MAIN_NAVIGATION.find((link) => link.target !== "_blank");

    if (!internalLink) {
      throw new Error("Expected at least one internal navigation link");
    }

    await act(async () => {
      await user.click(
        screen.getByTestId(
          GET_TESTID_LINK(GET_TESTID_HEADER_NAV_ITEM(internalLink.title))
        )
      );
    });

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith(internalLink.href);
    });
  });

  it("opens and closes the mobile navigation modal", async () => {
    window.innerWidth = 400;
    const { user, getByTestId, queryByTestId } = userSetupAndRender(<Header title="Header" />);

    const toggleButton = getByTestId(
      GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
    );

    expect(toggleButton).toHaveAttribute("aria-label", "Open the navigation");
    expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();

    await act(async () => {
      await user.click(toggleButton);
    });

    await waitFor(() => {
      expect(getByTestId(TESTID_HEADER_MOBILE_NAV)).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute("aria-label", "Close the navigation");
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    await act(async () => {
      await user.click(toggleButton);
    });

    await waitFor(() => {
      expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();
      expect(toggleButton).toHaveAttribute("aria-label", "Open the navigation");
    });
  });

  it("closes the mobile navigation on resize", async () => {
    window.innerWidth = 400;
    const { user, getByTestId, queryByTestId } = userSetupAndRender(<Header title="Header" />);

    const toggleButton = getByTestId(
      GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
    );

    await act(async () => {
      await user.click(toggleButton);
    });

    await waitFor(() => {
      expect(getByTestId(TESTID_HEADER_MOBILE_NAV)).toBeInTheDocument();
    });

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();
    });
  });

  it("navigates and closes the mobile modal for internal links", async () => {
    window.innerWidth = 400;
    const { user, getByTestId, queryByTestId } = userSetupAndRender(<Header title="Header" />);
    const internalLink = URLS_MAIN_NAVIGATION.find((link) => link.target !== "_blank");

    if (!internalLink) {
      throw new Error("Expected at least one internal navigation link");
    }

    const toggleButton = getByTestId(
      GET_TESTID_BUTTON(TESTID_HEADER_MOBILE_NAV_BUTTON)
    );

    await act(async () => {
      await user.click(toggleButton);
    });

    await waitFor(() => {
      expect(getByTestId(TESTID_HEADER_MOBILE_NAV)).toBeInTheDocument();
    });

    const mobileNav = getByTestId(TESTID_HEADER_MOBILE_NAV);
    await act(async () => {
      await user.click(
        mobileNav.querySelector(
          `[data-testid="${GET_TESTID_LINK(
            GET_TESTID_HEADER_NAV_ITEM(internalLink.title)
          )}"]`
        ) as HTMLElement
      );
    });

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith(internalLink.href);
      expect(queryByTestId(TESTID_HEADER_MOBILE_NAV)).not.toBeInTheDocument();
    });
  });

  it("uses semantic header and nav elements", () => {
    const { container } = render(<Header />);

    expect(screen.getByTestId(TESTID_HEADER).tagName).toBe("HEADER");
    expect(container.querySelector("nav")).toBeInTheDocument();
  });
});
