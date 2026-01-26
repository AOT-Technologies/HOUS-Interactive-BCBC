"use client";
// 3rd party
import {
  RadioGroup as ReactAriaRadioGroup,
  Radio as ReactAriaRadio,
  RadioGroupProps as ReactAriaRadioGroupProps,
  Label,
} from "react-aria-components";
// repo
import {
  GET_TESTID_RADIO,
  GET_TESTID_RADIO_GROUP,
  TESTID_RADIO_GROUP_ERROR,
  TESTID_RADIO_GROUP_LABEL,
} from "@repo/constants/src/testids";
import { AnswerValueTypes } from "@repo/data/useWalkthroughsData";
// workspace
import "./RadioGroup.css";
import Icon from "../icon/Icon";
import InputError from "../input-error/InputError";
import { parseStringToComponents } from "web/utils/string";

export type RadioGroupOption = {
  value: AnswerValueTypes;
  label: string;
};

export interface RadioGroupProps extends ReactAriaRadioGroupProps {
  /**
   * The name of the radio group.
   */
  name: string;
  /**
   * The label for the radio group.
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
   * The radio options.
   */
  options: RadioGroupOption[];
  /**
   * Optional testid string for targeting specific radio groups.
   * Will default to `radio-group-[name]`.
   * eg. `data-testid="radio-group-passedValue"`.
   */
  "data-testid"?: string;
  /**
   * Optional error message to display.
   */
  errorMessageText?: string;
}

export default function RadioGroup({
  name,
  label,
  hideLabel,
  noLabel = false,
  errorMessageText,
  options,
  "data-testid": testid = "",
  value,
  className,
  ...props
}: RadioGroupProps) {
  const currentValue = value || null;
  const testIdNamespace = testid || name;

  return (
    <ReactAriaRadioGroup
      className={`ui-RadioGroup ${className}`}
      data-testid={GET_TESTID_RADIO_GROUP(testIdNamespace)}
      value={currentValue}
      name={name}
      {...props}
    >
      {!noLabel && (
        <Label
          className={`ui-RadioGroup--Label ${hideLabel ? "u-hidden" : ""}`}
          data-testid={`${TESTID_RADIO_GROUP_LABEL}-${testIdNamespace}`}
        >
          {label || name}
        </Label>
      )}
      <InputError
        data-testid={`${TESTID_RADIO_GROUP_ERROR}-${testIdNamespace}`}
        className={"ui-RadioGroup--Error"}
      >
        {errorMessageText}
      </InputError>
      {options.map((option) => (
        <ReactAriaRadio
          className={"ui-Radio"}
          key={`${option.value}`}
          value={`${option.value}`}
          data-testid={GET_TESTID_RADIO(testIdNamespace, option.value)}
        >
          {currentValue === option.value && (
            <Icon type="radioChecked" className="ui-Radio--Icon" />
          )}
          {currentValue !== option.value && (
            <Icon type="radioUnchecked" className="ui-Radio--Icon" />
          )}
          <span>{parseStringToComponents(option.label)}</span>
        </ReactAriaRadio>
      ))}
    </ReactAriaRadioGroup>
  );
}
