"use client";

// 3rd party
import {
  Link as ReactAriaLink,
  LinkProps as ReactAriaLinkProps,
} from "react-aria-components";
// repo
import { GET_TESTID_LINK } from "@repo/constants/src/testids";
// workspace
import "./Link.css";
import Icon from "../icon/Icon";

export type LinkVariant = "default" | "glossary" | "primary" | "secondary";
export interface LinkProps extends ReactAriaLinkProps {
  /**
   * Defaults to `default`.
   */
  variant?: LinkVariant;
  /**
   * Optional testid string for targeting specific links.
   * Will default to `link-[variant]`.
   * eg. `data-testid="link-passedValue"`.
   */
  "data-testid"?: string;
  /*
   * If true, renders a button-styled link.
   */
  showAsButton?: boolean;
  /**
   * If true, renders a larger button.
   */
  isLargeButton?: boolean;
}

export default function Link({
  variant = "default",
  className = "",
  children,
  target = "_self",
  "data-testid": testid = "",
  showAsButton = false,
  isLargeButton = false,
  ...props
}: LinkProps) {
  return (
    <ReactAriaLink
      className={`ui-Link --${variant} ${showAsButton ? "--button" : ""} ${isLargeButton ? "--large" : ""} ${className}`}
      data-testid={GET_TESTID_LINK(testid || variant)}
      {...props}
      target={target}
    >
      <>
        {children}
        {target === "_blank" ? <Icon type={"openInNew"} /> : null}
      </>
    </ReactAriaLink>
  );
}
