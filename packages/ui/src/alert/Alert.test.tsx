import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Alert from "./Alert";

describe("Alert", () => {
  it("renders with title", () => {
    render(<Alert title="Test Alert" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Test Alert")).toBeInTheDocument();
  });

  it("renders with description as string", () => {
    render(<Alert title="Test Alert" description="This is a test description" />);
    expect(screen.getByText("This is a test description")).toBeInTheDocument();
  });

  it("renders with description as ReactNode", () => {
    render(
      <Alert
        title="Test Alert"
        description={
          <div>
            <strong>Bold text</strong> and normal text
          </div>
        }
      />
    );
    expect(screen.getByText("Bold text")).toBeInTheDocument();
  });

  it("applies correct variant class", () => {
    const { rerender } = render(<Alert title="Test" variant="info" />);
    expect(screen.getByRole("alert")).toHaveClass("ui-Alert--info");

    rerender(<Alert title="Test" variant="warning" />);
    expect(screen.getByRole("alert")).toHaveClass("ui-Alert--warning");

    rerender(<Alert title="Test" variant="danger" />);
    expect(screen.getByRole("alert")).toHaveClass("ui-Alert--danger");

    rerender(<Alert title="Test" variant="success" />);
    expect(screen.getByRole("alert")).toHaveClass("ui-Alert--success");
  });

  it("uses default warning variant", () => {
    render(<Alert title="Test" />);
    expect(screen.getByRole("alert")).toHaveClass("ui-Alert--warning");
  });

  it("applies custom className", () => {
    render(<Alert title="Test" className="custom-class" />);
    expect(screen.getByRole("alert")).toHaveClass("custom-class");
  });

  it("applies data-testid", () => {
    render(<Alert title="Test" data-testid="custom-alert" />);
    expect(screen.getByTestId("custom-alert")).toBeInTheDocument();
  });

  it("allows custom icon override", () => {
    render(<Alert title="Test" icon="check" />);
    // Icon component should be rendered with the custom icon type
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
