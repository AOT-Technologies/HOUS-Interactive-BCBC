"use client";
import { ReactNode } from "react";

import {
  Tooltip as AriaTooltip,
  TooltipProps as ReactAriaTooltipProps,
  TooltipTrigger,
} from "react-aria-components";
import Image from "@repo/ui/image";

import "./Tooltip.css";

export interface TooltipProps extends ReactAriaTooltipProps {
  tooltipLabel: string;
  tooltipContent: ReactNode;
  triggerContent: ReactNode;
}

export default function Tooltip({
  tooltipLabel,
  tooltipContent,
  triggerContent,
  ...props
}: TooltipProps) {
  return (
    <TooltipTrigger delay={0} closeDelay={0}>
      {triggerContent}
      <AriaTooltip
        {...props}
        className="ui-Tooltip--Aria"
        placement="bottom"
        aria-live="assertive"
        aria-label={tooltipLabel}
      >
        <Image
          src="tooltip-triangle.svg"
          alt="tooltip trigger pointer"
          className={"ui-Tooltip--Triangle"}
          width="25"
          height="12"
        />
        <div className="ui-Tooltip--Content">{tooltipContent}</div>
      </AriaTooltip>
    </TooltipTrigger>
  );
}
