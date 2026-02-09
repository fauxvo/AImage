import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/settings", () => import("@/test/mocks/settings"));

import { getSettings, setSetting, deleteSetting } from "@/lib/settings";
import { createRequest, readJson } from "@/test/mocks/next-request";
import { GET, PATCH } from "./route";

describe("GET /api/settings", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("returns masked settings", async () => {
    (getSettings as any).mockResolvedValue({
      openai_api_key: "sk-test-1234567890",
      auto_optimize: "true",
    });
    const res = await GET();
    const body = await readJson<any>(res);
    expect(body.settings.openai_api_key).toBe("****7890");
    expect(body.settings.auto_optimize).toBe("true");
  });

  it("reports hasEnvKey correctly", async () => {
    (getSettings as any).mockResolvedValue({});
    process.env.OPENAI_API_KEY = "sk-env";
    const res = await GET();
    const body = await readJson<any>(res);
    expect(body.hasEnvKey).toBe(true);
  });

  it("masks short API keys", async () => {
    (getSettings as any).mockResolvedValue({ openai_api_key: "abc" });
    const res = await GET();
    const body = await readJson<any>(res);
    expect(body.settings.openai_api_key).toBe("****");
  });
});

describe("PATCH /api/settings", () => {
  it("calls setSetting for non-null values", async () => {
    (getSettings as any).mockResolvedValue({ auto_optimize: "false" });
    const req = createRequest("/api/settings", {
      method: "PATCH",
      body: { auto_optimize: "false" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(setSetting).toHaveBeenCalledWith("auto_optimize", "false");
  });

  it("calls deleteSetting for null values", async () => {
    (getSettings as any).mockResolvedValue({});
    const req = createRequest("/api/settings", {
      method: "PATCH",
      body: { openai_api_key: null },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(deleteSetting).toHaveBeenCalledWith("openai_api_key");
  });

  it("calls deleteSetting for empty string values", async () => {
    (getSettings as any).mockResolvedValue({});
    const req = createRequest("/api/settings", {
      method: "PATCH",
      body: { openai_api_key: "" },
    });
    const res = await PATCH(req);
    expect(deleteSetting).toHaveBeenCalledWith("openai_api_key");
  });

  it("accepts unknown fields (Zod strips them) without error", async () => {
    (getSettings as any).mockResolvedValue({});
    const req = createRequest("/api/settings", {
      method: "PATCH",
      body: { unknown_field: "nope" },
    });
    const res = await PATCH(req);
    // Zod v4 strips unrecognized keys — this is a valid empty update
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid field types", async () => {
    const req = createRequest("/api/settings", {
      method: "PATCH",
      body: { auto_optimize: 123 },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await readJson<any>(res);
    expect(body.error).toBeDefined();
  });

  it("skips undefined values", async () => {
    (getSettings as any).mockResolvedValue({});
    const req = createRequest("/api/settings", {
      method: "PATCH",
      body: {},
    });
    await PATCH(req);
    expect(setSetting).not.toHaveBeenCalled();
    expect(deleteSetting).not.toHaveBeenCalled();
  });
});
