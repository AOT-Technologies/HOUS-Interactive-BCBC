// 3rd party
import { describe, expect, it } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { Form } from "react-aria-components";
// repo
import {
  GET_TESTID_BUTTON,
  GET_TESTID_RADIO,
  GET_TESTID_RADIO_GROUP,
  TESTID_BUTTON_SUBMIT,
  TESTID_RADIO_GROUP_ERROR,
  TESTID_RADIO_GROUP_LABEL,
} from "@repo/constants/src/testids";
// workspace
import RadioGroup from "./RadioGroup";
import Button from "../button/Button";
import { userSetupAndRender } from "../../tests/utils";

// test constants
const RADIO_GROUP_NAME = "storeys";
const getRadioGroupLabelTestId = (testId = RADIO_GROUP_NAME) =>
  `${TESTID_RADIO_GROUP_LABEL}-${testId}`;
const getRadioGroupErrorTestId = (testId = RADIO_GROUP_NAME) =>
  `${TESTID_RADIO_GROUP_ERROR}-${testId}`;
const RADIO_GROUP_LABEL = "Number of storeys";
const OPTION_1_VALUE = "1";
const OPTION_2_VALUE = "2";
const OPTION_3_VALUE = "3";
const RADIO_GROUP_OPTIONS = [
  { label: "1 storey", value: OPTION_1_VALUE },
  { label: "2 storeys", value: OPTION_2_VALUE },
  {
    label: '3 <Button variant="glossary">storeys</Button>',
    value: OPTION_3_VALUE,
  },
];

describe("RadioGroup", () => {
  // renders
  it("renders appropriate items with required data and nothing selected", async () => {
    const { getByTestId } = userSetupAndRender(
      <RadioGroup
        options={RADIO_GROUP_OPTIONS}
        label={RADIO_GROUP_LABEL}
        name={RADIO_GROUP_NAME}
      />,
    );

    // renders radio group
    expect(
      getByTestId(GET_TESTID_RADIO_GROUP(RADIO_GROUP_NAME)),
    ).toBeInTheDocument();

    // renders label with correct text
    const label = getByTestId(getRadioGroupLabelTestId());
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(RADIO_GROUP_LABEL);

    // renders radio options with correct values
    RADIO_GROUP_OPTIONS.forEach(({ value }) => {
      const option = getByTestId(GET_TESTID_RADIO(RADIO_GROUP_NAME, value));
      const input = option.querySelector("input[type='radio']");
      expect(option).toBeInTheDocument();
      expect(input).toHaveAttribute("value", value);
      expect(input).toHaveAttribute("name", RADIO_GROUP_NAME);
      expect(input).not.toBeChecked();
    });
  });

  // default value
  it("if no value, then tabindex is still 0", () => {
    const { getByTestId } = render(
      <RadioGroup
        options={RADIO_GROUP_OPTIONS}
        label={RADIO_GROUP_LABEL}
        name={RADIO_GROUP_NAME}
      />,
    );

    // get inputs
    const input1 = getByTestId(
      GET_TESTID_RADIO(RADIO_GROUP_NAME, OPTION_1_VALUE),
    ).querySelector("input[type='radio']");
    const input2 = getByTestId(
      GET_TESTID_RADIO(RADIO_GROUP_NAME, OPTION_2_VALUE),
    ).querySelector("input[type='radio']");
    const input3 = getByTestId(
      GET_TESTID_RADIO(RADIO_GROUP_NAME, OPTION_3_VALUE),
    ).querySelector("input[type='radio']");

    // expect inputs to have a tabindex of 0
    expect(input1).toHaveAttribute("tabindex", "0");
    expect(input2).toHaveAttribute("tabindex", "0");
    expect(input3).toHaveAttribute("tabindex", "0");
  });
  // selected value overrides default value
  it("renders item with selected value as selected", () => {
    const selectedValue = OPTION_2_VALUE;
    const { getByTestId } = render(
      <RadioGroup
        options={RADIO_GROUP_OPTIONS}
        label={RADIO_GROUP_LABEL}
        name={RADIO_GROUP_NAME}
        value={selectedValue}
      />,
    );

    // get options and inputs and check if correct one is selected
    const option1 = getByTestId(
      GET_TESTID_RADIO(RADIO_GROUP_NAME, OPTION_1_VALUE),
    );
    const option2 = getByTestId(
      GET_TESTID_RADIO(RADIO_GROUP_NAME, selectedValue),
    );
    const option3 = getByTestId(
      GET_TESTID_RADIO(RADIO_GROUP_NAME, OPTION_3_VALUE),
    );
    const input1 = option1.querySelector("input[type='radio']");
    const input2 = option2.querySelector("input[type='radio']");
    const input3 = option3.querySelector("input[type='radio']");
    expect(input1).not.toBeChecked();
    expect(input2).toBeChecked();
    expect(input3).not.toBeChecked();
  });
  // shows error
  it("renders error message when provided, is required, and not selected on submit", async () => {
    const errorMessage = "Please select a number of storeys";
    const { user, getByTestId, queryByTestId, getByText } = userSetupAndRender(
      <Form>
        <RadioGroup
          options={RADIO_GROUP_OPTIONS}
          label={RADIO_GROUP_LABEL}
          name={RADIO_GROUP_NAME}
          isRequired
          errorMessageText={errorMessage}
        />
        <Button type={"submit"} data-testid={TESTID_BUTTON_SUBMIT}>
          Submit
        </Button>
      </Form>,
    );

    // no error message
    expect(queryByTestId(getRadioGroupErrorTestId())).not.toBeInTheDocument();

    // submit form
    await act(async () => {
      await user.click(getByTestId(GET_TESTID_BUTTON(TESTID_BUTTON_SUBMIT)));
    });

    // error message
    await waitFor(() => {
      expect(getByText(errorMessage)).toBeInTheDocument();
    });
  });
  // hides label
  it("applies hidden utility class when hideLabel is true", () => {
    const { queryByTestId } = render(
      <RadioGroup
        options={RADIO_GROUP_OPTIONS}
        label={RADIO_GROUP_LABEL}
        name={RADIO_GROUP_NAME}
        hideLabel
      />,
    );

    expect(queryByTestId(getRadioGroupLabelTestId())).toHaveClass("u-hidden");
  });
  // shows name when no label
  it("shows name when no label value provided", () => {
    const { getByTestId } = render(
      <RadioGroup options={RADIO_GROUP_OPTIONS} name={RADIO_GROUP_NAME} />,
    );

    expect(getByTestId(getRadioGroupLabelTestId())).toHaveTextContent(
      RADIO_GROUP_NAME,
    );
  });
  // no label
  it("does not render label when noLabel is true", () => {
    const { queryByTestId } = render(
      <RadioGroup
        options={RADIO_GROUP_OPTIONS}
        label={RADIO_GROUP_LABEL}
        name={RADIO_GROUP_NAME}
        noLabel
      />,
    );

    expect(queryByTestId(getRadioGroupLabelTestId())).not.toBeInTheDocument();
  });
  // custom testid
  it("renders custom testid", () => {
    const testid = "custom";
    const { getByTestId } = render(
      <RadioGroup
        options={RADIO_GROUP_OPTIONS}
        label={RADIO_GROUP_LABEL}
        name={RADIO_GROUP_NAME}
        data-testid={testid}
      />,
    );

    expect(getByTestId(GET_TESTID_RADIO_GROUP(testid))).toBeInTheDocument();
  });
  // custom className
  it("renders custom className", () => {
    const className = "custom";
    const { getByTestId } = render(
      <RadioGroup
        options={RADIO_GROUP_OPTIONS}
        label={RADIO_GROUP_LABEL}
        name={RADIO_GROUP_NAME}
        className={className}
      />,
    );

    expect(getByTestId(GET_TESTID_RADIO_GROUP(RADIO_GROUP_NAME))).toHaveClass(
      className,
    );
  });
  // passes prop
  it("passes props", () => {
    const customPropKey = "data-custom-prop";
    const customPropValue = "custom";
    const customProp = {
      [customPropKey]: customPropValue,
    };
    const { getByTestId } = render(
      <RadioGroup
        options={RADIO_GROUP_OPTIONS}
        label={RADIO_GROUP_LABEL}
        name={RADIO_GROUP_NAME}
        {...customProp}
      />,
    );

    expect(
      getByTestId(GET_TESTID_RADIO_GROUP(RADIO_GROUP_NAME)),
    ).toHaveAttribute(customPropKey, customPropValue);
  });
});
