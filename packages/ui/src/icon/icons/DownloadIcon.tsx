import { IconProps } from "../Icon";

export default function DownloadIcon({ title, id, ...props }: IconProps) {
  return (
    <svg
      width="21"
      height="20"
      viewBox="0 0 21 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby={id ? id : undefined}
      aria-hidden="true"
      {...props}
    >
      {id === undefined || title === undefined ? null : (
        <title id={id}>{title}</title>
      )}
      <g id="file_download">
        <path
          id="Vector"
          d="M15.5002 12.5V15H5.50016V12.5H3.8335V15C3.8335 15.9167 4.5835 16.6667 5.50016 16.6667H15.5002C16.4168 16.6667 17.1668 15.9167 17.1668 15V12.5H15.5002ZM14.6668 9.16671L13.4918 7.99171L11.3335 10.1417V3.33337H9.66683V10.1417L7.5085 7.99171L6.3335 9.16671L10.5002 13.3334L14.6668 9.16671Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
