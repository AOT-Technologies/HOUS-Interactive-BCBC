import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import InputError from "./InputError";

const TESTID_INPUT_ERROR = "input-error";

describe("InputError", () => {
  it("does not render by default", () => {
    const { queryByTestId } = render(
      <InputError data-testid={TESTID_INPUT_ERROR}>error message</InputError>,
    );
    expect(queryByTestId(TESTID_INPUT_ERROR)).not.toBeInTheDocument();
  });
});
