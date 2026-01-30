"use client";
// 3rd party
import {
  Checkbox as ReactAriaCheckbox,
  CheckboxProps as ReactAriaCheckboxProps,
} from "react-aria-components";
// repo
import { GET_TESTID_CHECKBOX_CARD } from "@repo/constants/src/testids";
// local
import Icon from "../icon/Icon";
import "./CheckboxCard.css";

export interface CheckboxCardProps extends ReactAriaCheckboxProps {
  title: string;
  superTitle: string;
  description: string;
  "aria-label"?: string;
  "data-testid"?: string;
}

export default function CheckboxCard({
  title,
  superTitle,
  description,
  isSelected,
  "data-testid": testid = "",
  "aria-label": ariaLabel = "",
  className = "",
  ...props
}: CheckboxCardProps) {
  return (
    <ReactAriaCheckbox
      className={`ui-CheckboxCard--CardContainer ${className}`.trim()}
      aria-label={ariaLabel || `${superTitle} - ${title} - ${description}`}
      data-testid={GET_TESTID_CHECKBOX_CARD(testid || title)}
      isSelected={isSelected}
      {...props}
    >
      {isSelected && (
        <Icon type="checkboxChecked" className="ui-CheckboxCard--Icon" />
      )}
      {!isSelected && (
        <Icon type="checkboxUnchecked" className="ui-CheckboxCard--Icon" />
      )}
      <article className="ui-CheckboxCard--ContentWrapper">
        <p className="ui-CheckboxCard--SuperTitle">{superTitle}</p>
        <header className="ui-CheckboxCard--Title">{title}</header>
        <p className="ui-CheckboxCard--Description">{description}</p>
      </article>
    </ReactAriaCheckbox>
  );
}
