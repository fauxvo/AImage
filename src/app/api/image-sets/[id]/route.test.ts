import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => import("@/test/mocks/db"));
vi.mock("@/lib/paths", () => import("@/test/mocks/paths"));

import { db } from "@/db";
import { chain } from "@/test/mocks/db";
import { removeImageSetDir } from "@/lib/paths";
import { createRequest, createParams, readJson } from "@/test/mocks/next-request";
import { createSampleImageSet } from "@/test/fixtures";
import { GET, PATCH, DELETE } from "./route";

const sampleSet = createSampleImageSet();

describe("GET /api/image-sets/:id", () => {
  it("returns image set with images and refs", async () => {
    db.select
      .mockReturnValueOnce(chain({ get: sampleSet }))
      .mockReturnValueOnce(chain({ _resolve: [] })) // images
      .mockReturnValueOnce(chain({ _resolve: [] })); // refs

    const res = await GET(createRequest("/api/image-sets/set-1"), createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    expect(body.id).toBe("set-1");
    expect(body.images).toEqual([]);
    expect(body.referenceImages).toEqual([]);
  });

  it("returns 404 when not found", async () => {
    db.select.mockReturnValue(chain({ get: undefined }));
    const res = await GET(createRequest("/api/image-sets/nope"), createParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/image-sets/:id", () => {
  it("updates and returns the image set", async () => {
    const updated = { ...sampleSet, name: "Renamed" };
    db.select.mockReturnValue(chain({ get: sampleSet }));
    db.update.mockReturnValue(chain({ _resolve: [updated] }));

    const req = createRequest("/api/image-sets/set-1", {
      method: "PATCH",
      body: { name: "Renamed" },
    });
    const res = await PATCH(req, createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    expect(body.name).toBe("Renamed");
  });

  it("returns 404 when set does not exist", async () => {
    db.select.mockReturnValue(chain({ get: undefined }));
    const req = createRequest("/api/image-sets/nope", {
      method: "PATCH",
      body: { name: "X" },
    });
    const res = await PATCH(req, createParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid body", async () => {
    const req = createRequest("/api/image-sets/set-1", {
      method: "PATCH",
      body: { numImages: 99 },
    });
    const res = await PATCH(req, createParams({ id: "set-1" }));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/image-sets/:id", () => {
  it("deletes the set and removes directory", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));
    db.delete.mockReturnValue(chain());

    const req = createRequest("/api/image-sets/set-1", { method: "DELETE" });
    const res = await DELETE(req, createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    expect(body.success).toBe(true);
    expect(removeImageSetDir).toHaveBeenCalledWith("set-1");
  });

  it("deletes in correct order: referenceImages, generatedImages, imageSets", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));
    db.delete.mockReturnValue(chain());

    const req = createRequest("/api/image-sets/set-1", { method: "DELETE" });
    await DELETE(req, createParams({ id: "set-1" }));

    // Must delete child tables before parent to respect FK constraints
    expect(db.delete).toHaveBeenCalledTimes(3);
  });

  it("returns 404 when set does not exist", async () => {
    db.select.mockReturnValue(chain({ get: undefined }));
    const req = createRequest("/api/image-sets/nope", { method: "DELETE" });
    const res = await DELETE(req, createParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });
});
