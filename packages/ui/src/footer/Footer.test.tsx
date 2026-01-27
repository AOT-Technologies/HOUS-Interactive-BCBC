// 3rd party
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
// repo
import { TESTID_FOOTER } from "@repo/constants/src/testids";
// local
import Footer from "./Footer";

describe("Footer", () => {
  it("renders", () => {
    const { getByTestId } = render(<Footer />);
    expect(getByTestId(TESTID_FOOTER)).toBeInTheDocument();
  });
});
