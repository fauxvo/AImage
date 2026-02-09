// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptEditor } from "./PromptEditor";

const onUpdate = vi.fn();
const onApplySettings = vi.fn();

function renderEditor(overrides = {}) {
  return render(
    <PromptEditor
      imageSetId="set-1"
      prompt="A cat"
      refinedPrompt={null}
      onUpdate={onUpdate}
      onApplySettings={onApplySettings}
      {...overrides}
    />
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  onUpdate.mockReset();
  onApplySettings.mockReset();
});

describe("PromptEditor", () => {
  it("renders the prompt textarea with initial value", () => {
    renderEditor();
    expect(screen.getByPlaceholderText(/describe the image/i)).toHaveValue("A cat");
  });

  it("calls onUpdate on blur when prompt changed", async () => {
    renderEditor();
    const textarea = screen.getByPlaceholderText(/describe the image/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "A dog");
    fireEvent.blur(textarea);
    expect(onUpdate).toHaveBeenCalledWith({ prompt: "A dog" });
  });

  it("does not call onUpdate on blur when prompt unchanged", () => {
    renderEditor();
    const textarea = screen.getByPlaceholderText(/describe the image/i);
    fireEvent.blur(textarea);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("refine button is disabled when prompt is empty", () => {
    renderEditor({ prompt: "" });
    expect(screen.getByText("Refine with AI")).toBeDisabled();
  });

  it("calls fetch to refine and shows the refined prompt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            refinedPrompt: "A majestic feline",
            suggestedSettings: null,
          }),
      })
    );

    renderEditor();
    await userEvent.click(screen.getByText("Refine with AI"));

    await waitFor(() => {
      expect(screen.getByText("AI-Refined Prompt")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("A majestic feline")).toBeInTheDocument();
  });

  it("shows suggested settings chips when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            refinedPrompt: "Refined",
            suggestedSettings: { size: "1536x1024", quality: "high" },
          }),
      })
    );

    renderEditor();
    await userEvent.click(screen.getByText("Refine with AI"));

    await waitFor(() => {
      expect(screen.getByText("Landscape")).toBeInTheDocument();
    });
    expect(screen.getByText("Use Prompt & Settings")).toBeInTheDocument();
  });

  it("'Use This' calls onUpdate with refined prompt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            refinedPrompt: "Better prompt",
            suggestedSettings: null,
          }),
      })
    );

    renderEditor();
    await userEvent.click(screen.getByText("Refine with AI"));

    await waitFor(() => {
      expect(screen.getByText("Use This")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Use This"));
    expect(onUpdate).toHaveBeenCalledWith({ refinedPrompt: "Better prompt" });
  });

  it("dismiss clears the refined prompt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            refinedPrompt: "Refined",
            suggestedSettings: null,
          }),
      })
    );

    renderEditor();
    await userEvent.click(screen.getByText("Refine with AI"));

    await waitFor(() => {
      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Dismiss"));
    expect(onUpdate).toHaveBeenCalledWith({ refinedPrompt: null });
  });
});
