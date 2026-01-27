"use client";
// 3rd party
import {
  Link as ReactAriaLink,
  LinkProps as ReactAriaLinkProps,
} from "react-aria-components";
// repo
import { GET_TESTID_LINK_CARD } from "@repo/constants/src/testids";
// local
import "./LinkCard.css";
import { ButtonVariant } from "../button/Button";

export interface LinkCardProps extends ReactAriaLinkProps {
  title: string;
  subtitle?: string;
  description: string;
  ctaText?: string;
  ctaVariant?: ButtonVariant;
  href: string;
  "aria-label"?: string;
  "data-testid"?: string;
}

export default function LinkCard({
  title,
  subtitle,
  description,
  ctaText,
  ctaVariant = "primary",
  href,
  "data-testid": testid = "",
  "aria-label": ariaLabel = "",
  ...props
}: LinkCardProps) {
  return (
    <ReactAriaLink
      className="ui-LinkCard--CardContainer"
      href={href}
      aria-label={ariaLabel || `${title} - ${description}`}
      data-testid={GET_TESTID_LINK_CARD(testid || href)}
      {...props}
    >
      <article className="ui-LinkCard--ContentWrapper">
        <header className="ui-LinkCard--Title">{title}</header>
        {subtitle && <p className="ui-LinkCard--Subtitle">{subtitle}</p>}
        <p className="ui-LinkCard--Description">{description}</p>
        {ctaText && (
          <span
            className={`ui-Button --${ctaVariant} ui-LinkCard--CTA`}
            aria-hidden
          >
            {ctaText}
          </span>
        )}
      </article>
    </ReactAriaLink>
  );
}
