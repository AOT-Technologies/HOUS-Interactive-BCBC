import { Info as PhosphorInfo } from "@phosphor-icons/react";
import type { SVGProps } from "react";

export default function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return <PhosphorInfo size={14} weight="fill" {...props} />;
}
