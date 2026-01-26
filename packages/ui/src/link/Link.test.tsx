// 3rd party
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
// repo
import { GET_TESTID_LINK } from "@repo/constants/src/testids";
// workspace
import Link from "./Link";
import { getIconTestId } from "../icon/Icon.test";

// test constants
const TEXT = "Press me";

describe("Link", () => {
  it("renders link text", () => {
    const { getByText } = render(<Link>{TEXT}</Link>);
    expect(getByText(TEXT)).toBeInTheDocument();
  });
  // default
  it("renders default link", () => {
    const { getByTestId } = render(<Link>{TEXT}</Link>);
    expect(getByTestId(GET_TESTID_LINK("default"))).toBeInTheDocument();
  });
  // glossary
  it("renders glossary link", () => {
    const { getByTestId } = render(<Link variant="glossary">{TEXT}</Link>);
    expect(getByTestId(GET_TESTID_LINK("glossary"))).toBeInTheDocument();
  });
  // primary
  it("renders primary link", () => {
    const { getByTestId } = render(<Link variant="primary">{TEXT}</Link>);
    expect(getByTestId(GET_TESTID_LINK("primary"))).toBeInTheDocument();
  });
  // secondary
  it("renders secondary link", () => {
    const { getByTestId } = render(<Link variant="secondary">{TEXT}</Link>);
    expect(getByTestId(GET_TESTID_LINK("secondary"))).toBeInTheDocument();
  });
  // showAsButton
  it("renders link with --button modifier when showAsButton is true", () => {
    const { getByTestId } = render(<Link showAsButton>{TEXT}</Link>);
    expect(getByTestId(GET_TESTID_LINK("default"))).toHaveClass("--button");
  });
  // isLargeButton
  it("renders link with --large modifier when isLargeButton is true", () => {
    const { getByTestId } = render(<Link isLargeButton>{TEXT}</Link>);
    expect(getByTestId(GET_TESTID_LINK("default"))).toHaveClass("--large");
  });
  // target
  it("renders link with blank target and icon", () => {
    const { getByTestId } = render(<Link target="_blank">{TEXT}</Link>);
    expect(getByTestId(GET_TESTID_LINK("default"))).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(getByTestId(getIconTestId("openInNew"))).toBeInTheDocument();
  });
  // custom testid
  it("renders link with testid", () => {
    const { getByTestId } = render(
      <Link data-testid="passedValue">{TEXT}</Link>,
    );
    expect(getByTestId(GET_TESTID_LINK("passedValue"))).toBeInTheDocument();
  });
  // className
  it("renders link with className", () => {
    const { getByTestId } = render(<Link className="passedValue">{TEXT}</Link>);
    expect(getByTestId(GET_TESTID_LINK("default"))).toHaveClass("passedValue");
  });
  // href
  it("renders link with href", () => {
    const { getByTestId } = render(
      <Link href="https://example.com">{TEXT}</Link>,
    );
    expect(getByTestId(GET_TESTID_LINK("default"))).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });
});
