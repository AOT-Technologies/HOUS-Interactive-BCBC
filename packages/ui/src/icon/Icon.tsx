// 3rd party
import type { FunctionComponent, SVGProps } from "react";
// repo
import { GET_TESTID_ICON } from "@repo/constants/src/testids";
// workspace
import MenuIcon from "./icons/MenuIcon";
import CloseIcon from "./icons/CloseIcon";
import ArrowOutwardIcon from "./icons/ArrowOutwardIcon";
import OpenInNew from "./icons/OpenInNew";
import RadioUnchecked from "./icons/RadioUnchecked";
import RadioChecked from "./icons/RadioChecked";
import CheckboxChecked from "./icons/CheckboxChecked";
import CheckboxCheckedFilled from "./icons/CheckboxCheckedFilled";
import CheckboxUnchecked from "./icons/CheckboxUnchecked";
import ArrowBack from "./icons/ArrowBack";
import ArrowForward from "./icons/ArrowForward";
import ExpandMore from "./icons/ExpandMore";
import Check from "./icons/Check";
import CheckCircle from "./icons/CheckCircle";
import RestartAlt from "./icons/RestartAlt";
import AccountTree from "./icons/AccountTree";
import DownloadIcon from "./icons/DownloadIcon";
import SearchIcon from "./icons/SearchIcon";
import WarningIcon from "./icons/WarningIcon";
import PaperPlaneTilt from "./icons/PaperPlaneTilt";

// NOTE: When adding a new icon, make sure to add the string here, and the icon component below in the ICONS object
export type IconType =
  | "close"
  | "menu"
  | "arrowOutward"
  | "openInNew"
  | "radioUnchecked"
  | "radioChecked"
  | "checkboxChecked"
  | "checkboxCheckedFilled"
  | "checkboxUnchecked"
  | "arrowBack"
  | "arrowForward"
  | "expandMore"
  | "check"
  | "restartAlt"
  | "checkCircle"
  | "accountTree" // NOTE: account tree is the name in Material Icons, this is used for the mobile step tracker toggle
  | "download"
  | "search"
  | "warning"
  | "paperPlaneTilt";

export interface IconComponentProps extends SVGProps<SVGSVGElement> {
  /**
   * The icon to render.
   */
  type: IconType;
  /**
   * The additional class names
   */
  className?: string;
  /**
   * The title of the icon. Used for accessibility.
   */
  title?: string;
  /**
   * The ID of the icon. Used for accessibility.
   */
  id?: string;
  /**
   * Optional testid string for targeting specific icons.
   * Will default to `icon-[type]`.
   * eg. `data-testid="icon-passedValue"`.
   */
  "data-testid"?: string;
}

export interface IconProps extends Omit<IconComponentProps, "type"> {}

// NOTE: Add components here
const ICONS: Record<IconType, FunctionComponent<IconProps>> = {
  close: CloseIcon,
  menu: MenuIcon,
  arrowOutward: ArrowOutwardIcon,
  openInNew: OpenInNew,
  radioUnchecked: RadioUnchecked,
  radioChecked: RadioChecked,
  checkboxChecked: CheckboxChecked,
  checkboxCheckedFilled: CheckboxCheckedFilled,
  checkboxUnchecked: CheckboxUnchecked,
  arrowBack: ArrowBack,
  arrowForward: ArrowForward,
  expandMore: ExpandMore,
  check: Check,
  restartAlt: RestartAlt,
  checkCircle: CheckCircle,
  accountTree: AccountTree,
  download: DownloadIcon,
  search: SearchIcon,
  warning: WarningIcon,
  paperPlaneTilt: PaperPlaneTilt,
};

export default function Icon({
  type,
  className,
  "data-testid": testid = "",
  ...props
}: IconComponentProps) {
  const IconComponent = ICONS[type];

  return (
    <IconComponent
      className={`ui-Icon ${className}`}
      data-testid={GET_TESTID_ICON(testid || type)}
      {...props}
    />
  );
}
