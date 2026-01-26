"use client";
// 3rd party
import { FieldError, FieldErrorProps } from "react-aria-components";
// workspace
import "./InputError.css";

export default function InputError({
  children,
  className,
  ...props
}: FieldErrorProps) {
  return (
    <FieldError className={`ui-InputError ${className}`} {...props}>
      {children}
    </FieldError>
  );
}
