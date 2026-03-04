// repo
import { TESTID_BUTTON_MODAL_CLOSE } from "@repo/constants/src/testids";
// local
import Button from "../button/Button";
import "./ButtonModalClose.css";

export default function ButtonModalClose({
  label,
  onPress,
}: {
  label: string;
  onPress: (isOpen: boolean) => void;
}) {
  return (
    <Button
      aria-label={label}
      isIconButton
      variant="tertiary"
      className="ui-ButtonModalClose"
      onPress={() => onPress(false)}
      data-testid={TESTID_BUTTON_MODAL_CLOSE}
    >
      <svg
        className="ui-ButtonModalClose__icon"
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M37.8516 36.6906C37.991 36.8299 38.1016 36.9954 38.177 37.1775C38.2524 37.3596 38.2912 37.5547 38.2912 37.7518C38.2912 37.9489 38.2524 38.1441 38.177 38.3262C38.1016 38.5082 37.991 38.6737 37.8516 38.8131C37.7123 38.9524 37.5468 39.063 37.3647 39.1384C37.1826 39.2138 36.9875 39.2526 36.7904 39.2526C36.5933 39.2526 36.3981 39.2138 36.216 39.1384C36.034 39.063 35.8685 38.9524 35.7291 38.8131L23.2904 26.3724L10.8516 38.8131C10.5702 39.0945 10.1884 39.2526 9.79038 39.2526C9.39234 39.2526 9.0106 39.0945 8.72913 38.8131C8.44767 38.5316 8.28955 38.1499 8.28955 37.7518C8.28955 37.3538 8.44767 36.972 8.72913 36.6906L21.1698 24.2518L8.72913 11.8131C8.44767 11.5316 8.28955 11.1499 8.28955 10.7518C8.28955 10.3538 8.44767 9.97202 8.72913 9.69056C9.0106 9.4091 9.39234 9.25098 9.79038 9.25098C10.1884 9.25098 10.5702 9.4091 10.8516 9.69056L23.2904 22.1312L35.7291 9.69056C36.0106 9.4091 36.3923 9.25098 36.7904 9.25098C37.1884 9.25098 37.5702 9.4091 37.8516 9.69056C38.1331 9.97202 38.2912 10.3538 38.2912 10.7518C38.2912 11.1499 38.1331 11.5316 37.8516 11.8131L25.411 24.2518L37.8516 36.6906Z"
          fill="#292929"
        />
      </svg>
    </Button>
  );
}
