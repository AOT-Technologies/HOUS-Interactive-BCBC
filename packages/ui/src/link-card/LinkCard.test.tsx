// 3rd party
import { describe, expect, it } from "vitest";
// repo
import {
  EnumBuildingTypes,
  EnumWalkthroughIds,
} from "@repo/constants/src/constants";
import { GET_TESTID_LINK_CARD } from "@repo/constants/src/testids";
import { WalkthroughJSONData } from "@repo/data/useWalkthroughsData";
// local
import { renderWithWalkthroughProvider } from "web/tests/utils";
import LinkCard from "./LinkCard";

describe("LinkCard", () => {
  it("renders LinkCard", async () => {
    const { title, description, subtitle } =
      WalkthroughJSONData[EnumBuildingTypes.SINGLE_DWELLING][
        EnumWalkthroughIds._9_9_9
      ].info;
    const href = "/path/to/somewhere";
    const { getByTestId } = renderWithWalkthroughProvider({
      ui: (
        <LinkCard
          key={EnumWalkthroughIds._9_9_9}
          title={title}
          description={description}
          subtitle={subtitle}
          data-testid={EnumWalkthroughIds._9_9_9}
          href={href}
        />
      ),
    });

    const linkElement = getByTestId(
      GET_TESTID_LINK_CARD(EnumWalkthroughIds._9_9_9),
    );
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute("href", href);
  });
});
