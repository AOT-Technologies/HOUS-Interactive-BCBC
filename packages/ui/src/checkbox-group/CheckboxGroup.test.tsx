// 3rd party
import { describe, expect, it } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { Form } from "react-aria-components";
// repo
import {
  GET_TESTID_BUTTON,
  GET_TESTID_CHECKBOX,
  GET_TESTID_CHECKBOX_GROUP,
  TESTID_BUTTON_SUBMIT,
  TESTID_CHECKBOX_GROUP_ERROR,
  TESTID_CHECKBOX_GROUP_LABEL,
} from "@repo/constants/src/testids";
// workspace
import CheckboxGroup from "./CheckboxGroup";
import Button from "../button/Button";
import { userSetupAndRender } from "../../tests/utils";

// test constants
const CHECKBOX_GROUP_NAME = "storeys";
const getCheckboxGroupLabelTestId = (testId = CHECKBOX_GROUP_NAME) =>
  `${TESTID_CHECKBOX_GROUP_LABEL}-${testId}`;
const getCheckboxGroupErrorTestId = (testId = CHECKBOX_GROUP_NAME) =>
  `${TESTID_CHECKBOX_GROUP_ERROR}-${testId}`;
const CHECKBOX_GROUP_LABEL = "Number of storeys";
const OPTION_1_VALUE = "1";
const OPTION_2_VALUE = "2";
const OPTION_3_VALUE = "3";
const CHECKBOX_GROUP_OPTIONS = [
  { label: "1 storey", value: OPTION_1_VALUE },
  { label: "2 storeys", value: OPTION_2_VALUE },
  {
    label: '3 <Button variant="glossary">storeys</Button>',
    value: OPTION_3_VALUE,
  },
];

describe("CheckboxGroup", () => {
  // renders
  it("renders appropriate items with required data and nothing selected", async () => {
    const { user, getByTestId } = userSetupAndRender(
      <CheckboxGroup
        options={CHECKBOX_GROUP_OPTIONS}
        label={CHECKBOX_GROUP_LABEL}
        name={CHECKBOX_GROUP_NAME}
      />,
    );

    // renders checkbox group
    const checkboxGroup = getByTestId(
      GET_TESTID_CHECKBOX_GROUP(CHECKBOX_GROUP_NAME),
    );
    expect(checkboxGroup).toBeInTheDocument();

    // renders label with correct text
    const label = getByTestId(getCheckboxGroupLabelTestId());
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(CHECKBOX_GROUP_LABEL);

    // renders checkbox options with correct values
    CHECKBOX_GROUP_OPTIONS.forEach(({ value }) => {
      const option = checkboxGroup.querySelector(
        `label[data-testid="${GET_TESTID_CHECKBOX(CHECKBOX_GROUP_NAME, value)}"]`,
      );
      if (!option) {
        throw new Error(`Option ${value} not found`);
      }
      const input = option.querySelector("input[type='checkbox']");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("value", value);
      expect(input).toHaveAttribute("name", CHECKBOX_GROUP_NAME);
      expect(input).not.toBeChecked();
    });

    // click on checkbox
    const option1 = checkboxGroup.querySelector(
      `label[data-testid="${GET_TESTID_CHECKBOX(CHECKBOX_GROUP_NAME, OPTION_1_VALUE)}"]`,
    );
    if (!option1) {
      throw new Error("Option 1 not found");
    }

    await act(async () => {
      await user.click(option1);
    });

    // check if correct checkbox is selected
    const input1 = option1.querySelector("input[type='checkbox']");
    expect(input1).toBeChecked();
  });
  // default value
  it("renders item with default value as selected", () => {
    const defaultValue = [OPTION_2_VALUE];
    const { getByTestId } = render(
      <CheckboxGroup
        options={CHECKBOX_GROUP_OPTIONS}
        label={CHECKBOX_GROUP_LABEL}
        name={CHECKBOX_GROUP_NAME}
        defaultValue={defaultValue}
      />,
    );

    // renders checkbox group
    const checkboxGroup = getByTestId(
      GET_TESTID_CHECKBOX_GROUP(CHECKBOX_GROUP_NAME),
    );
    expect(checkboxGroup).toBeInTheDocument();

    // get options and inputs and check if correct one is selected
    const option1 = checkboxGroup.querySelector(
      `label[data-testid="${GET_TESTID_CHECKBOX(CHECKBOX_GROUP_NAME, OPTION_1_VALUE)}"]`,
    );
    if (!option1) {
      throw new Error("Option 1 not found");
    }

    const option2 = checkboxGroup.querySelector(
      `label[data-testid="${GET_TESTID_CHECKBOX(CHECKBOX_GROUP_NAME, OPTION_2_VALUE)}"]`,
    );
    if (!option2) {
      throw new Error("Option 2 not found");
    }

    const option3 = checkboxGroup.querySelector(
      `label[data-testid="${GET_TESTID_CHECKBOX(CHECKBOX_GROUP_NAME, OPTION_3_VALUE)}"]`,
    );
    if (!option3) {
      throw new Error("Option 3 not found");
    }

    const input1 = option1.querySelector("input[type='checkbox']");
    const input2 = option2.querySelector("input[type='checkbox']");
    const input3 = option3.querySelector("input[type='checkbox']");
    expect(input1).not.toBeChecked();
    expect(input2).toBeChecked();
    expect(input3).not.toBeChecked();
  });
  // selected value overrides default value
  it("renders item with selected value as selected", () => {
    const defaultValue = [OPTION_1_VALUE];
    const selectedValue = [OPTION_2_VALUE];
    const { getByTestId } = render(
      <CheckboxGroup
        options={CHECKBOX_GROUP_OPTIONS}
        label={CHECKBOX_GROUP_LABEL}
        name={CHECKBOX_GROUP_NAME}
        defaultValue={defaultValue}
        value={selectedValue}
      />,
    );

    // renders checkbox group
    const checkboxGroup = getByTestId(
      GET_TESTID_CHECKBOX_GROUP(CHECKBOX_GROUP_NAME),
    );
    expect(checkboxGroup).toBeInTheDocument();

    // get options and inputs and check if correct one is selected
    const option1 = checkboxGroup.querySelector(
      `label[data-testid="${GET_TESTID_CHECKBOX(CHECKBOX_GROUP_NAME, OPTION_1_VALUE)}"]`,
    );
    if (!option1) {
      throw new Error("Option 1 not found");
    }

    const option2 = checkboxGroup.querySelector(
      `label[data-testid="${GET_TESTID_CHECKBOX(CHECKBOX_GROUP_NAME, OPTION_2_VALUE)}"]`,
    );
    if (!option2) {
      throw new Error("Option 2 not found");
    }

    const option3 = checkboxGroup.querySelector(
      `label[data-testid="${GET_TESTID_CHECKBOX(CHECKBOX_GROUP_NAME, OPTION_3_VALUE)}"]`,
    );
    if (!option3) {
      throw new Error("Option 3 not found");
    }

    const input1 = option1.querySelector("input[type='checkbox']");
    const input2 = option2.querySelector("input[type='checkbox']");
    const input3 = option3.querySelector("input[type='checkbox']");
    expect(input1).not.toBeChecked();
    expect(input2).toBeChecked();
    expect(input3).not.toBeChecked();
  });
  // shows error
  it("renders error message when provided, is required, and not selected on submit", async () => {
    const errorMessage = "Please select a number of storeys";
    const { user, getByTestId, queryByTestId, getByText } = userSetupAndRender(
      <Form>
        <CheckboxGroup
          options={CHECKBOX_GROUP_OPTIONS}
          label={CHECKBOX_GROUP_LABEL}
          name={CHECKBOX_GROUP_NAME}
          isRequired
          errorMessageText={errorMessage}
        />
        <Button type={"submit"} data-testid={TESTID_BUTTON_SUBMIT}>
          Submit
        </Button>
      </Form>,
    );

    // no error message
    expect(
      queryByTestId(getCheckboxGroupErrorTestId()),
    ).not.toBeInTheDocument();

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
      <CheckboxGroup
        options={CHECKBOX_GROUP_OPTIONS}
        label={CHECKBOX_GROUP_LABEL}
        name={CHECKBOX_GROUP_NAME}
        hideLabel
      />,
    );

    expect(queryByTestId(getCheckboxGroupLabelTestId())).toHaveClass(
      "u-hidden",
    );
  });
  // shows name when no label
  it("shows name when no label value provided", () => {
    const { getByTestId } = render(
      <CheckboxGroup
        options={CHECKBOX_GROUP_OPTIONS}
        name={CHECKBOX_GROUP_NAME}
      />,
    );

    expect(getByTestId(getCheckboxGroupLabelTestId())).toHaveTextContent(
      CHECKBOX_GROUP_NAME,
    );
  });
  // no label
  it("does not render label when noLabel is true", () => {
    const { queryByTestId } = render(
      <CheckboxGroup
        options={CHECKBOX_GROUP_OPTIONS}
        label={CHECKBOX_GROUP_LABEL}
        name={CHECKBOX_GROUP_NAME}
        noLabel
      />,
    );

    expect(
      queryByTestId(getCheckboxGroupLabelTestId()),
    ).not.toBeInTheDocument();
  });
  // custom testid
  it("renders custom testid", () => {
    const testid = "custom";
    const { getByTestId } = render(
      <CheckboxGroup
        options={CHECKBOX_GROUP_OPTIONS}
        label={CHECKBOX_GROUP_LABEL}
        name={CHECKBOX_GROUP_NAME}
        data-testid={testid}
      />,
    );

    expect(getByTestId(GET_TESTID_CHECKBOX_GROUP(testid))).toBeInTheDocument();
  });
  // custom className
  it("renders custom className", () => {
    const className = "custom";
    const { getByTestId } = render(
      <CheckboxGroup
        options={CHECKBOX_GROUP_OPTIONS}
        label={CHECKBOX_GROUP_LABEL}
        name={CHECKBOX_GROUP_NAME}
        className={className}
      />,
    );

    expect(
      getByTestId(GET_TESTID_CHECKBOX_GROUP(CHECKBOX_GROUP_NAME)),
    ).toHaveClass(className);
  });
  // passes prop
  it("passes props", () => {
    const customPropKey = "data-custom-prop";
    const customPropValue = "custom";
    const customProp = {
      [customPropKey]: customPropValue,
    };
    const { getByTestId } = render(
      <CheckboxGroup
        options={CHECKBOX_GROUP_OPTIONS}
        label={CHECKBOX_GROUP_LABEL}
        name={CHECKBOX_GROUP_NAME}
        {...customProp}
      />,
    );

    expect(
      getByTestId(GET_TESTID_CHECKBOX_GROUP(CHECKBOX_GROUP_NAME)),
    ).toHaveAttribute(customPropKey, customPropValue);
  });
});
