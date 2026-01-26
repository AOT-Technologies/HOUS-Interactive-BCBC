// 3rd party
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
// repo
import { GET_TESTID_BUTTON } from "@repo/constants/src/testids";
// workspace
import Button, { codeIconType } from "./Button";
import { getIconTestId } from "../icon/Icon.test";

// test constants
const TEXT = "Press me";

describe("Button", () => {
  it("renders button text", () => {
    const { getByText } = render(<Button>{TEXT}</Button>);
    expect(getByText(TEXT)).toBeInTheDocument();
  });
  // primary
  it("renders primary button", () => {
    const { getByTestId } = render(<Button variant="primary">{TEXT}</Button>);
    expect(getByTestId(GET_TESTID_BUTTON("primary"))).toBeInTheDocument();
  });
  // secondary
  it("renders secondary button", () => {
    const { getByTestId } = render(<Button variant="secondary">{TEXT}</Button>);
    expect(getByTestId(GET_TESTID_BUTTON("secondary"))).toBeInTheDocument();
  });
  // link
  it("renders link button", () => {
    const { getByTestId } = render(<Button variant="link">{TEXT}</Button>);
    expect(getByTestId(GET_TESTID_BUTTON("link"))).toBeInTheDocument();
  });
  // code
  it("renders code button", () => {
    const { getByTestId } = render(<Button variant="code">{TEXT}</Button>);
    expect(getByTestId(GET_TESTID_BUTTON("code"))).toBeInTheDocument();
    expect(getByTestId(getIconTestId(codeIconType))).toBeInTheDocument();
  });
  // glossary
  it("renders glossary button", () => {
    const { getByTestId } = render(<Button variant="glossary">{TEXT}</Button>);
    expect(getByTestId(GET_TESTID_BUTTON("glossary"))).toBeInTheDocument();
  });
  // large
  it("renders large button", () => {
    const { getByTestId } = render(<Button isLargeButton>{TEXT}</Button>);
    expect(getByTestId(GET_TESTID_BUTTON("primary"))).toHaveClass("--large");
  });
  // icon
  it("renders icon button", () => {
    const { getByTestId } = render(<Button isIconButton>{TEXT}</Button>);
    expect(getByTestId(GET_TESTID_BUTTON("primary"))).toHaveClass("--icon");
  });
  // custom testid
  it("renders custom testid", () => {
    const testid = "custom";
    const { getByTestId } = render(
      <Button data-testid={testid}>{TEXT}</Button>,
    );
    expect(getByTestId(GET_TESTID_BUTTON(testid))).toBeInTheDocument();
  });
  // custom className
  it("renders custom className", () => {
    const className = "custom";
    const { getByTestId } = render(
      <Button className={className}>{TEXT}</Button>,
    );
    expect(getByTestId(GET_TESTID_BUTTON("primary"))).toHaveClass(className);
  });
  // custom prop name
  it("renders custom prop name", () => {
    const name = "custom";
    const { getByTestId } = render(<Button name={name}>{TEXT}</Button>);
    expect(getByTestId(GET_TESTID_BUTTON("primary"))).toHaveAttribute(
      "name",
      name,
    );
  });
});
