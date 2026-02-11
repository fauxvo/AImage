import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => import("@/test/mocks/db"));
vi.mock("@/lib/openai", () => import("@/test/mocks/openai"));
vi.mock("@/lib/settings", () => import("@/test/mocks/settings"));
vi.mock("@/lib/paths", () => import("@/test/mocks/paths"));
vi.mock("@/lib/optimize", () => import("@/test/mocks/optimize"));
vi.mock("fs", () => import("@/test/mocks/fs"));
vi.mock("fs/promises", async () => {
  const fsMock = await import("@/test/mocks/fs");
  return { default: fsMock.promises, ...fsMock.promises };
});
vi.mock("openai", () => ({
  toFile: vi.fn().mockResolvedValue({ name: "mock-file" }),
}));

import { db } from "@/db";
import { chain, resetDbMocks } from "@/test/mocks/db";
import { mockOpenAIClient } from "@/test/mocks/openai";
import { getSetting } from "@/lib/settings";
import { optimizeImage } from "@/lib/optimize";
import { createRequest, createParams, readSSEEvents } from "@/test/mocks/next-request";
import { createSampleImageSet } from "@/test/fixtures";
import { POST } from "./route";

const b64 = Buffer.from("fake-image").toString("base64");

beforeEach(() => {
  resetDbMocks();
  mockOpenAIClient.images.generate.mockResolvedValue({
    data: [{ b64_json: b64 }],
  });
  mockOpenAIClient.images.edit.mockResolvedValue({
    data: [{ b64_json: b64 }],
  });
  (getSetting as any).mockResolvedValue(null);
  (optimizeImage as any).mockResolvedValue(null);
});

const baseSet = createSampleImageSet();

function setupDbForGeneration(imageSet: typeof baseSet, refs: any[] = []) {
  db.select
    .mockReturnValueOnce(chain({ get: imageSet })) // get imageSet
    .mockReturnValueOnce(chain({ _resolve: refs })); // get refs
  db.insert.mockReturnValue(chain());
  db.update.mockReturnValue(chain());
}

describe("POST /api/image-sets/:id/generate", () => {
  it("streams SSE events for a basic generation", async () => {
    setupDbForGeneration(baseSet);
    (getSetting as any)
      .mockResolvedValueOnce("false") // auto_optimize
      .mockResolvedValueOnce(null); // image_model → default

    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await readSSEEvents(res);
    const types = events.map((e) => e.event);
    expect(types).toContain("started");
    expect(types).toContain("progress");
    expect(types).toContain("image_saved");
    expect(types).toContain("complete");
  });

  it("returns 404 when image set not found", async () => {
    db.select.mockReturnValue(chain({ get: undefined }));
    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when no prompt is set", async () => {
    setupDbForGeneration({ ...baseSet, prompt: "", refinedPrompt: null });
    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    expect(res.status).toBe(400);
  });

  it("uses refinedPrompt over prompt when available", async () => {
    setupDbForGeneration({
      ...baseSet,
      refinedPrompt: "A majestic feline",
    });
    (getSetting as any).mockResolvedValueOnce("false").mockResolvedValueOnce(null);

    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    await readSSEEvents(res);

    expect(mockOpenAIClient.images.generate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "A majestic feline" })
    );
  });

  it("sends warning when DALL-E model with reference images", async () => {
    const refs = [{ id: "r1", filePath: "/p/r.png", originalName: "r.png", mimeType: "image/png" }];
    setupDbForGeneration(baseSet, refs);
    (getSetting as any).mockResolvedValueOnce("false").mockResolvedValueOnce("dall-e-3");

    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    const events = await readSSEEvents(res);
    const warning = events.find((e) => e.event === "warning");
    expect(warning).toBeDefined();
    expect((warning!.data as any).message).toContain("not supported");
  });

  it("uses images.edit when refs exist and model is gpt-image-1", async () => {
    const refs = [{ id: "r1", filePath: "/p/r.png", originalName: "r.png", mimeType: "image/png" }];
    setupDbForGeneration(baseSet, refs);
    (getSetting as any).mockResolvedValueOnce("false").mockResolvedValueOnce("gpt-image-1");

    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    await readSSEEvents(res);
    expect(mockOpenAIClient.images.edit).toHaveBeenCalled();
  });

  it("auto-optimizes when setting is enabled", async () => {
    setupDbForGeneration(baseSet);
    (getSetting as any)
      .mockResolvedValueOnce(null) // auto_optimize: null → defaults to true
      .mockResolvedValueOnce(null);

    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    await readSSEEvents(res);
    expect(optimizeImage).toHaveBeenCalled();
  });

  it("skips auto-optimize when disabled", async () => {
    setupDbForGeneration(baseSet);
    (getSetting as any)
      .mockResolvedValueOnce("false") // auto_optimize OFF
      .mockResolvedValueOnce(null);

    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    await readSSEEvents(res);
    expect(optimizeImage).not.toHaveBeenCalled();
  });

  it("generates multiple images when numImages > 1", async () => {
    setupDbForGeneration({ ...baseSet, numImages: 3 });
    (getSetting as any).mockResolvedValueOnce("false").mockResolvedValueOnce(null);
    // With n>1 optimization, a single API call returns all images
    mockOpenAIClient.images.generate.mockResolvedValue({
      data: [{ b64_json: b64 }, { b64_json: b64 }, { b64_json: b64 }],
    });

    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    const events = await readSSEEvents(res);
    const saved = events.filter((e) => e.event === "image_saved");
    expect(saved.length).toBe(3);
  });

  it("sends error event when image data is missing", async () => {
    setupDbForGeneration(baseSet);
    (getSetting as any).mockResolvedValueOnce("false").mockResolvedValueOnce(null);
    mockOpenAIClient.images.generate.mockResolvedValue({ data: [{}] });

    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    const events = await readSSEEvents(res);
    const error = events.find((e) => e.event === "error");
    expect(error).toBeDefined();
  });

  it("sends error event when OpenAI throws", async () => {
    setupDbForGeneration(baseSet);
    (getSetting as any).mockResolvedValueOnce("false").mockResolvedValueOnce(null);
    mockOpenAIClient.images.generate.mockRejectedValue(new Error("API down"));

    const res = await POST(createRequest("/g", { method: "POST" }), createParams({ id: "set-1" }));
    const events = await readSSEEvents(res);
    const error = events.find((e) => e.event === "error");
    expect(error).toBeDefined();
    expect((error!.data as any).message).toBe("API down");
  });
});
