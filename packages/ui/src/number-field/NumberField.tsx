// 3rd party
import { ReactNode } from "react";
import {
  NumberField as ReactAriaNumberField,
  NumberFieldProps as ReactAriaNumberFieldProps,
  Input as ReactAriaInput,
  Label,
} from "react-aria-components";
// repo
import {
  GET_TESTID_NUMBER_FIELD,
  TESTID_NUMBER_FIELD_CHECK,
  TESTID_NUMBER_FIELD_LABEL,
} from "@repo/constants/src/testids";
// local
import Icon from "../icon/Icon";
import "./NumberField.css";

interface NumberFieldProps extends ReactAriaNumberFieldProps {
  /**
   * The name of the number field.
   */
  name: string;
  /**
   * Placeholder text for the number field.
   */
  placeholder: string;
  /**
   * The label for the number field.
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
   * The unit for the number field.
   */
  unit?: ReactNode;
  /**
   * Optional testid string for targeting specific number fields.
   * Will default to `number-field-[name]`.
   * eg. `data-testid="number-field-passedValue"`.
   */
  "data-testid"?: string;
  /*
   * If true, will show the checkmark icon.
   */
  isValid?: boolean;
}

function NumberField({
  name,
  label,
  hideLabel,
  noLabel = false,
  placeholder,
  unit,
  "data-testid": testid = "",
  className = "",
  isValid = false,
  ...props
}: NumberFieldProps) {
  const testIdNamespace = testid || name;
  return (
    <ReactAriaNumberField
      name={name}
      className={`ui-NumberField ${className} ${isValid ? "--isValid" : ""}`}
      data-testid={GET_TESTID_NUMBER_FIELD(testIdNamespace)}
      minValue={0}
      {...props}
    >
      {!noLabel && (
        <Label
          className={`ui-NumberField--Label ${hideLabel ? "u-hidden" : ""}`}
          data-testid={`${TESTID_NUMBER_FIELD_LABEL}-${testIdNamespace}`}
        >
          {label || name}
        </Label>
      )}
      <span className="u-relative">
        <ReactAriaInput placeholder={placeholder} />
        {isValid && (
          <Icon
            type={"check"}
            className="ui-NumberField--Check"
            data-testid={TESTID_NUMBER_FIELD_CHECK}
          />
        )}
      </span>
      {unit && (
        <span className="ui-NumberField--Unit" aria-hidden>
          {unit}
        </span>
      )}
    </ReactAriaNumberField>
  );
}

export default NumberField;
