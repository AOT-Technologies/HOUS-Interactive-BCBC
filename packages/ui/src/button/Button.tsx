"use client";
// 3rd party
import type { ReactNode } from "react";
import {
  Button as ReactAriaButton,
  ButtonProps as ReactAriaButtonProps,
} from "react-aria-components";
// repo
import { GET_TESTID_BUTTON } from "@repo/constants/src/testids";
// workspace
import "./Button.css";
import Icon from "../icon/Icon";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "link"
  | "code"
  | "glossary"
  | "tertiary";

export interface ButtonProps extends ReactAriaButtonProps {
  /**
   * Defaults to `primary`.
   */
  variant?: ButtonVariant;
  /**
   * If true, renders a larger button.
   */
  isLargeButton?: boolean;
  /**
   * If true, renders a square button intended for a single icon.
   */
  isIconButton?: boolean;
  /**
   * Optional testid string for targeting specific buttons.
   * Will default to `button-[variant]`.
   * eg. `data-testid="button-passedValue"`.
   */
  "data-testid"?: string;
  children?: ReactNode;
}

export const codeIconType = "arrowOutward";

const buttonChildren = (variant: ButtonVariant, children?: ReactNode) => {
  return (
    <>
      {children}
      {variant === "code" ? <Icon type={codeIconType} /> : null}
    </>
  );
};

export default function Button({
  variant = "primary",
  isIconButton = false,
  isLargeButton = false,
  isDisabled,
  "data-testid": testid = "",
  className,
  children,
  ...props
}: ButtonProps) {
  // return html button if isDisabled is true since react-aria eats the aria-disabled prop
  // The proposed solutions listed in this issue on GitHub don't work for our case:
  // https://github.com/adobe/react-spectrum/issues/3662
  if (isDisabled) {
    return (
      <button
        data-testid={GET_TESTID_BUTTON(testid || variant)}
        className={`ui-Button --${variant} ${isLargeButton ? "--large" : ""} ${isIconButton ? "--icon" : ""} ${className}`}
        aria-disabled
      >
        {buttonChildren(variant, children)}
      </button>
    );
  }

  return (
    <ReactAriaButton
      data-testid={GET_TESTID_BUTTON(testid || variant)}
      className={`ui-Button --${variant} ${isLargeButton ? "--large" : ""} ${isIconButton ? "--icon" : ""} ${className}`}
      {...props}
    >
      {buttonChildren(variant, children)}
    </ReactAriaButton>
  );
}
