import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => import("@/test/mocks/db"));
vi.mock("@/lib/openai", () => import("@/test/mocks/openai"));
vi.mock("@/lib/settings", () => import("@/test/mocks/settings"));

import { db } from "@/db";
import { chain } from "@/test/mocks/db";
import { mockOpenAIClient } from "@/test/mocks/openai";
import { createRequest, createParams, readJson } from "@/test/mocks/next-request";
import { createSampleImageSet } from "@/test/fixtures";
import { POST } from "./route";

const sampleSet = createSampleImageSet();

describe("POST /api/image-sets/:id/refine-prompt", () => {
  it("returns refined prompt and settings from structured JSON", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));

    mockOpenAIClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              refinedPrompt: "A majestic cat on a windowsill",
              settings: { size: "1536x1024", quality: "high" },
            }),
          },
        },
      ],
    });

    const req = createRequest("/api/image-sets/set-1/refine-prompt", {
      method: "POST",
      body: { prompt: "A cat" },
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    expect(body.refinedPrompt).toBe("A majestic cat on a windowsill");
    expect(body.suggestedSettings.size).toBe("1536x1024");
  });

  it("handles markdown-fenced JSON from the LLM", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));

    mockOpenAIClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: '```json\n{"refinedPrompt":"fenced","settings":{}}\n```',
          },
        },
      ],
    });

    const req = createRequest("/r", {
      method: "POST",
      body: { prompt: "test" },
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    expect(body.refinedPrompt).toBe("fenced");
  });

  it("falls back to raw text when JSON parsing fails", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));

    mockOpenAIClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: "Just a plain text prompt" } }],
    });

    const req = createRequest("/r", {
      method: "POST",
      body: { prompt: "test" },
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    expect(body.refinedPrompt).toBe("Just a plain text prompt");
    expect(body.suggestedSettings).toBeNull();
  });

  it("falls back when schema validation fails", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));

    mockOpenAIClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              refinedPrompt: 12345, // wrong type
            }),
          },
        },
      ],
    });

    const req = createRequest("/r", {
      method: "POST",
      body: { prompt: "test" },
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    // Falls back to the raw string
    expect(body.refinedPrompt).toContain("12345");
    expect(body.suggestedSettings).toBeNull();
  });

  it("returns 404 when image set not found", async () => {
    db.select.mockReturnValue(chain({ get: undefined }));
    const req = createRequest("/r", {
      method: "POST",
      body: { prompt: "test" },
    });
    const res = await POST(req, createParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 for empty prompt", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));
    const req = createRequest("/r", {
      method: "POST",
      body: { prompt: "" },
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when LLM returns no content", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));
    mockOpenAIClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });
    const req = createRequest("/r", {
      method: "POST",
      body: { prompt: "test" },
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    expect(res.status).toBe(500);
  });
});
