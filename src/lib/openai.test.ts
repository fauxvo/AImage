import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/settings", () => import("@/test/mocks/settings"));

import { getSetting } from "@/lib/settings";
import { getOpenAIClient } from "./openai";

const ENV_KEY = "sk-env-key-123";

describe("getOpenAIClient", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("uses DB key when available", async () => {
    (getSetting as any).mockResolvedValue("sk-db-key");
    const client = await getOpenAIClient();
    expect(client).toBeDefined();
    expect(getSetting).toHaveBeenCalledWith("openai_api_key");
  });

  it("falls back to env key when DB key is null", async () => {
    (getSetting as any).mockResolvedValue(null);
    process.env.OPENAI_API_KEY = ENV_KEY;
    const client = await getOpenAIClient();
    expect(client).toBeDefined();
  });

  it("throws when neither DB key nor env key is set", async () => {
    (getSetting as any).mockResolvedValue(null);
    await expect(getOpenAIClient()).rejects.toThrow(/apiKey|OPENAI_API_KEY/i);
  });
});
