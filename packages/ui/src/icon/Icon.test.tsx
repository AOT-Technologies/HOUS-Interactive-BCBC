// 3rd party
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
// repo
import { GET_TESTID_ICON } from "@repo/constants/src/testids";
// workspace
import Icon, { IconType } from "./Icon";

// test constants
export const getIconTestId = (type: IconType | string) => GET_TESTID_ICON(type);

const testIcons: Array<{ type: IconType; id: string; title: string }> = [
  { type: "close", id: "closeIcon", title: "close the menu" },
  { type: "menu", id: "menuIcon", title: "open the menu" },
  {
    type: "arrowOutward",
    id: "arrowOutwardIcon",
    title: "arrow pointing outward",
  },
  { type: "openInNew", id: "openInNewIcon", title: "open in a new tab" },
  {
    type: "radioChecked",
    id: "radioCheckedIcon",
    title: "Radio button checked",
  },
  {
    type: "radioUnchecked",
    id: "radioUncheckedIcon",
    title: "Radio button unchecked",
  },
  {
    type: "checkboxChecked",
    id: "checkboxCheckedIcon",
    title: "Checkbox checked",
  },
  {
    type: "checkboxCheckedFilled",
    id: "checkboxCheckedFilledIcon",
    title: "Checkbox checked filled",
  },
  {
    type: "checkboxUnchecked",
    id: "checkboxUncheckedIcon",
    title: "Checkbox unchecked",
  },
  { type: "arrowBack", id: "arrowBackIcon", title: "Go back" },
  { type: "arrowForward", id: "arrowForwardIcon", title: "Go forward" },
  { type: "expandMore", id: "expandMoreIcon", title: "Expand more" },
  { type: "check", id: "checkIcon", title: "Check" },
  { type: "accountTree", id: "accountTreeIcon", title: "Account tree" },
  { type: "download", id: "downloadIcon", title: "Download" },
];

describe("Icon", () => {
  testIcons.forEach(({ type, id, title }) => {
    it(`renders ${type} icon with title`, () => {
      const { getByTestId, getByTitle } = render(
        <Icon type={type} id={id} title={title} />,
      );
      const icon = getByTestId(getIconTestId(type));
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-labelledby", id);
      expect(getByTitle(title)).toBeInTheDocument();
    });

    it(`renders ${type} icon without title`, () => {
      const { getByTestId, queryByTitle } = render(<Icon type={type} />);
      expect(getByTestId(getIconTestId(type))).toBeInTheDocument();
      expect(queryByTitle(title)).not.toBeInTheDocument();
    });
  });
  // className
  it("renders icon with className", () => {
    const { getByTestId } = render(
      <Icon type="close" className="customClass" />,
    );
    expect(getByTestId(getIconTestId("close"))).toHaveClass("customClass");
  });
  // custom testid
  it("renders icon with testid", () => {
    const { getByTestId } = render(
      <Icon type="close" data-testid="passedValue" />,
    );
    expect(getByTestId(getIconTestId("passedValue"))).toBeInTheDocument();
  });
  // custom color prop
  it("renders icon with custom color", () => {
    const { getByTestId } = render(<Icon type="close" fill="red" />);
    expect(getByTestId(getIconTestId("close"))).toHaveAttribute("fill", "red");
  });
});
