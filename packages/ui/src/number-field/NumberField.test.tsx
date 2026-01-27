// 3rd party
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
// repo
import {
  GET_TESTID_ICON,
  GET_TESTID_NUMBER_FIELD,
  TESTID_NUMBER_FIELD_CHECK,
  TESTID_NUMBER_FIELD_LABEL,
} from "@repo/constants/src/testids";
// local
import NumberField from "./NumberField";

const NUMBER_FIELD_NAME = "area";
const NUMBER_FIELD_PLACEHOLDER = "enter area here";
const getNumberFieldLabelTestId = (testId = NUMBER_FIELD_NAME) =>
  `${TESTID_NUMBER_FIELD_LABEL}-${testId}`;

describe("NumberField", () => {
  it("renders", async () => {
    const { getByTestId } = render(
      <NumberField
        name={NUMBER_FIELD_NAME}
        placeholder={NUMBER_FIELD_PLACEHOLDER}
      />,
    );

    const numberField = getByTestId(GET_TESTID_NUMBER_FIELD(NUMBER_FIELD_NAME));
    expect(numberField).toBeInTheDocument();

    // renders label with correct text
    const label = getByTestId(getNumberFieldLabelTestId());
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(NUMBER_FIELD_NAME);

    // renders input with correct placeholder
    const input = numberField.querySelector("input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", NUMBER_FIELD_PLACEHOLDER);
  });
  // renders check if isValid
  it("renders check if isValid", async () => {
    const { getByTestId } = render(
      <NumberField
        name={NUMBER_FIELD_NAME}
        placeholder={NUMBER_FIELD_PLACEHOLDER}
        isValid
      />,
    );

    expect(
      getByTestId(GET_TESTID_ICON(TESTID_NUMBER_FIELD_CHECK)),
    ).toBeInTheDocument();
  });
});
