// 3rd party
import { ReactNode } from "react";
import { render } from "@testing-library/react";

interface RenderWithWalkthroughProviderOptions {
  ui: ReactNode;
}

/**
 * Render component with walkthrough provider context
 * This is a simplified version for UI package testing
 */
export const renderWithWalkthroughProvider = ({
  ui,
}: RenderWithWalkthroughProviderOptions) => {
  return render(ui);
};
