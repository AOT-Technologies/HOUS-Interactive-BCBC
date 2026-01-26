import { IconProps } from "../Icon";

export default function ExpandMore({ title, id, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby={id ? id : undefined}
      aria-hidden="true"
      {...props}
    >
      {id === undefined || title === undefined ? null : (
        <title id={id}>{title}</title>
      )}
      <path
        d="M16.59 8.29492L12 12.8749L7.41 8.29492L6 9.70492L12 15.7049L18 9.70492L16.59 8.29492Z"
        fill="currentColor"
      />
    </svg>
  );
}
