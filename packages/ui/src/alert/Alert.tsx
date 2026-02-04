import { ReactNode } from "react";
import Icon, { IconType } from "../icon/Icon";
import "./Alert.css";

export interface AlertProps {
  /** Alert variant/type */
  variant?: "info" | "warning" | "danger" | "success";
  /** Alert title */
  title: string;
  /** Alert description/message */
  description?: string | ReactNode;
  /** Optional icon name override */
  icon?: string;
  /** Additional class name */
  className?: string;
  /** Test ID */
  "data-testid"?: string;
}

export default function Alert({
  variant = "warning",
  title,
  description,
  icon,
  className = "",
  "data-testid": testId,
}: AlertProps) {
  // Default icons for each variant
  const defaultIcons = {
    info: "checkCircle",
    warning: "paperPlaneTilt",
    danger: "close",
    success: "checkCircle",
  };

  const iconName = (icon || defaultIcons[variant]) as IconType;

  return (
    <div
      className={`ui-Alert ui-Alert--${variant} ${className}`}
      role="alert"
      data-testid={testId}
    >
      <div className="ui-Alert--Header">
        <Icon type={iconName} className="ui-Alert--Icon" aria-hidden="true" />
        <h2 className="ui-Alert--Title">{title}</h2>
      </div>
      {description && (
        <div className="ui-Alert--Description">
          {typeof description === "string" ? <p>{description}</p> : description}
        </div>
      )}
    </div>
  );
}
