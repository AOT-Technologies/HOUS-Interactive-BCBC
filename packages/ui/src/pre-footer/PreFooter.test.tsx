// 3rd party
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
// repo
import { TESTID_PRE_FOOTER } from "@repo/constants/src/testids";
// local
import PreFooter from "./PreFooter";

describe("PreFooter", () => {
  it("renders", () => {
    const { getByTestId } = render(<PreFooter />);
    expect(getByTestId(TESTID_PRE_FOOTER)).toBeInTheDocument();
  });
});
