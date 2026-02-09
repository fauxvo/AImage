// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GenerationProgress } from "./GenerationProgress";

const onCancel = vi.fn();

describe("GenerationProgress", () => {
  it("renders nothing when idle with no warnings", () => {
    const { container } = render(
      <GenerationProgress status="idle" progress={null} error={null} onCancel={onCancel} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows warnings even when idle", () => {
    render(
      <GenerationProgress
        status="idle"
        progress={null}
        error={null}
        warnings={["Watch out!"]}
        onCancel={onCancel}
      />
    );
    expect(screen.getByText("Watch out!")).toBeInTheDocument();
  });

  it("shows progress bar when generating", () => {
    render(
      <GenerationProgress
        status="generating"
        progress={{ current: 1, total: 2, status: "Generating image 1 of 2..." }}
        error={null}
        onCancel={onCancel}
      />
    );
    expect(screen.getByText("Generating image 1 of 2...")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows default text when generating with no progress", () => {
    render(
      <GenerationProgress status="generating" progress={null} error={null} onCancel={onCancel} />
    );
    expect(screen.getByText("Starting generation...")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <GenerationProgress status="generating" progress={null} error={null} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows completion message", () => {
    render(
      <GenerationProgress status="complete" progress={null} error={null} onCancel={onCancel} />
    );
    expect(screen.getByText("Generation complete!")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(
      <GenerationProgress status="error" progress={null} error="API failed" onCancel={onCancel} />
    );
    expect(screen.getByText("API failed")).toBeInTheDocument();
  });

  it("shows default error when error is null", () => {
    render(<GenerationProgress status="error" progress={null} error={null} onCancel={onCancel} />);
    expect(screen.getByText("Generation failed")).toBeInTheDocument();
  });
});
