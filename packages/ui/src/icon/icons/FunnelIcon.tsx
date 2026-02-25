import { IconProps } from "../Icon";

export default function FunnelIcon({ title, id, ...props }: IconProps) {
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
        d="M3.2 4.9C3.2 4.4 3.6 4 4.1 4H19.9C20.4 4 20.8 4.4 20.8 4.9C20.8 5.1 20.7 5.3 20.6 5.5L13.8 13.2V19.1C13.8 19.4 13.7 19.6 13.5 19.8C13.2 20.1 12.8 20.1 12.5 19.9L9.6 18.1C9.3 17.9 9.1 17.6 9.1 17.2V13.2L3.4 5.5C3.3 5.3 3.2 5.1 3.2 4.9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
