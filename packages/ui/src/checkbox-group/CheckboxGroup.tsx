"use client";
// 3rd party
import {
  CheckboxGroup as ReactAriaCheckboxGroup,
  Checkbox as ReactAriaCheckbox,
  CheckboxGroupProps as ReactAriaCheckboxGroupProps,
  Label,
} from "react-aria-components";
// repo
import {
  GET_TESTID_CHECKBOX,
  GET_TESTID_CHECKBOX_GROUP,
  TESTID_CHECKBOX_GROUP_ERROR,
  TESTID_CHECKBOX_GROUP_LABEL,
} from "@repo/constants/src/testids";
import { AnswerValueTypes } from "@repo/data/useWalkthroughsData";
// workspace
import "./CheckboxGroup.css";
import Icon from "../icon/Icon";
import InputError from "../input-error/InputError";
import { parseStringToComponents } from "web/utils/string";

export type CheckboxGroupOption = {
  value: AnswerValueTypes;
  label: string;
};

export interface CheckboxGroupProps extends ReactAriaCheckboxGroupProps {
  /**
   * The name of the checkbox group.
   */
  name: string;
  /**
   * The label for the checkbox group.
   */
  label?: string;
  /**
   * boolean to hide the label visually.
   */
  hideLabel?: boolean;
  /**
   * boolean to have no label because it is outside the component.
   */
  noLabel?: boolean;
  /**
   * The checkbox options.
   */
  options: CheckboxGroupOption[];
  /**
   * Optional testid string for targeting specific checkbox groups.
   * Will default to `checkbox-group-[name]`.
   * eg. `data-testid="checkbox-group-passedValue"`.
   */
  "data-testid"?: string;
  /**
   * Optional error message to display.
   */
  errorMessageText?: string;
}

export default function CheckboxGroup({
  name,
  label,
  hideLabel,
  noLabel = false,
  errorMessageText,
  options,
  "data-testid": testid = "",
  defaultValue,
  value,
  className,
  ...props
}: CheckboxGroupProps) {
  const currentValue = value || defaultValue;
  const testIdNamespace = testid || name;

  return (
    <ReactAriaCheckboxGroup
      className={`ui-CheckboxGroup ${className}`}
      data-testid={GET_TESTID_CHECKBOX_GROUP(testIdNamespace)}
      value={value}
      defaultValue={defaultValue}
      name={name}
      {...props}
    >
      {!noLabel && (
        <Label
          className={`ui-CheckboxGroup--Label ${hideLabel ? "u-hidden" : ""}`}
          data-testid={`${TESTID_CHECKBOX_GROUP_LABEL}-${testIdNamespace}`}
        >
          {label || name}
        </Label>
      )}
      <InputError
        data-testid={`${TESTID_CHECKBOX_GROUP_ERROR}-${testIdNamespace}`}
        className={"ui-CheckboxGroup--Error"}
      >
        {errorMessageText}
      </InputError>
      {options.map((option) => (
        <ReactAriaCheckbox
          className={"ui-Checkbox"}
          key={`${option.value}`}
          value={`${option.value}`}
          data-testid={GET_TESTID_CHECKBOX(testIdNamespace, option.value)}
        >
          {currentValue?.includes(option.value) && (
            <Icon type="checkboxCheckedFilled" className="ui-Checkbox--Icon" />
          )}
          {!currentValue?.includes(option.value) && (
            <Icon type="checkboxUnchecked" className="ui-Checkbox--Icon" />
          )}
          <span>{parseStringToComponents(option.label)}</span>
        </ReactAriaCheckbox>
      ))}
    </ReactAriaCheckboxGroup>
  );
}
