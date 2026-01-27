// 3rd party
import { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";

/*
 * Set up a user and render the component
 */
export const userSetupAndRender = (jsx: ReactNode) => {
  return {
    user: userEvent.setup(),
    ...render(jsx),
  };
};
