// repo
import { TESTID_BUTTON_MODAL_CLOSE } from "@repo/constants/src/testids";
// local
import Button from "../button/Button";
import Icon from "../icon/Icon";
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
      <Icon type="close" />
    </Button>
  );
}
