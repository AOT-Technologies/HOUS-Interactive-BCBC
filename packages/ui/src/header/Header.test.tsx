// 3rd party
import { describe, expect, it, vi } from "vitest";
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
import { URL_HOME_TITLE } from "@repo/constants/src/urls";

// mock next/navigation userRouter
const routerPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

describe("Header", () => {
  it("renders", () => {
    const { getByTestId } = render(<Header />);
    expect(getByTestId(TESTID_HEADER)).toBeInTheDocument();
  });
  // test mobile nav
  it("mobile nav: renders and appears", async () => {
    // Set the desired window size for mobile
    window.innerWidth = 400;

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
});
