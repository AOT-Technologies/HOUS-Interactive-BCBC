import { IconProps } from "../Icon";

export default function ArrowBack({ title, id, ...props }: IconProps) {
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
        d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z"
        fill="currentColor"
      />
    </svg>
  );
}
