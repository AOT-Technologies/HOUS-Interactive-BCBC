// 3rd party
import { describe, expect, it } from "vitest";
// repo
import {
  EnumBuildingTypes,
  EnumWalkthroughIds,
} from "@repo/constants/src/constants";
import {
  GET_TESTID_CHECKBOX_CARD,
  GET_TESTID_ICON,
} from "@repo/constants/src/testids";
import { WalkthroughJSONData } from "@repo/data/useWalkthroughsData";
// local
import { renderWithWalkthroughProvider } from "web/tests/utils";
import CheckboxCard from "./CheckboxCard";

describe("CheckboxCard", () => {
  it("renders CheckboxCard", async () => {
    const { title, description, subtitle } =
      WalkthroughJSONData[EnumBuildingTypes.SINGLE_DWELLING][
        EnumWalkthroughIds._9_9_9
      ].info;
    const { container, getByTestId } = renderWithWalkthroughProvider({
      ui: (
        <CheckboxCard
          title={title}
          description={description}
          superTitle={subtitle}
          data-testid={EnumWalkthroughIds._9_9_9}
        />
      ),
    });

    const labelElement = container.querySelector(
      `label[data-testid="${GET_TESTID_CHECKBOX_CARD(EnumWalkthroughIds._9_9_9)}"]`,
    );
    expect(labelElement).toBeInTheDocument();
    const uncheckIcon = getByTestId(GET_TESTID_ICON("checkboxUnchecked"));
    expect(uncheckIcon).toBeInTheDocument();
  });
  it("renders CheckboxCard with selected", async () => {
    const { title, description, subtitle } =
      WalkthroughJSONData[EnumBuildingTypes.SINGLE_DWELLING][
        EnumWalkthroughIds._9_9_9
      ].info;
    const { getByTestId } = renderWithWalkthroughProvider({
      ui: (
        <CheckboxCard
          title={title}
          description={description}
          superTitle={subtitle}
          isSelected
        />
      ),
    });

    const checkIcon = getByTestId(GET_TESTID_ICON("checkboxChecked"));
    expect(checkIcon).toBeInTheDocument();
  });
});
