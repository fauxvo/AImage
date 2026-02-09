import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => import("@/test/mocks/db"));
vi.mock("@/lib/paths", () => import("@/test/mocks/paths"));

import { db } from "@/db";
import { chain } from "@/test/mocks/db";
import { ensureImageSetDir } from "@/lib/paths";
import { createRequest, readJson } from "@/test/mocks/next-request";
import { createSampleImageSet } from "@/test/fixtures";
import { GET, POST } from "./route";

const sampleSet = createSampleImageSet({ name: "Test Set", prompt: "" });

describe("GET /api/image-sets", () => {
  it("returns all image sets ordered by createdAt desc", async () => {
    db.select.mockReturnValue(chain({ _resolve: [sampleSet] }));
    const res = await GET();
    const body = await readJson<any[]>(res);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Test Set");
  });

  it("returns empty array when no sets exist", async () => {
    db.select.mockReturnValue(chain({ _resolve: [] }));
    const res = await GET();
    expect(await readJson(res)).toEqual([]);
  });
});

describe("POST /api/image-sets", () => {
  it("creates a new image set with provided name", async () => {
    const created = { ...sampleSet, name: "My Set" };
    db.insert.mockReturnValue(chain({ _resolve: [created] }));

    const req = createRequest("/api/image-sets", {
      method: "POST",
      body: { name: "My Set" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await readJson<any>(res);
    expect(body.name).toBe("My Set");
    expect(ensureImageSetDir).toHaveBeenCalled();
  });

  it("generates default name when none provided", async () => {
    db.insert.mockReturnValue(chain({ _resolve: [sampleSet] }));

    const req = createRequest("/api/image-sets", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(db.insert).toHaveBeenCalled();
  });

  it("returns 400 for invalid body (empty name)", async () => {
    const req = createRequest("/api/image-sets", {
      method: "POST",
      body: { name: "" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
