import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => import("@/test/mocks/db"));
vi.mock("@/lib/paths", () => import("@/test/mocks/paths"));
vi.mock("fs", () => import("@/test/mocks/fs"));

import { db } from "@/db";
import { chain } from "@/test/mocks/db";
import { getReferenceImageFileName } from "@/lib/paths";
import { createRequest, createParams, readJson } from "@/test/mocks/next-request";
import { createSampleImageSet, createSampleRef } from "@/test/fixtures";
import { GET, POST } from "./route";

const sampleSet = createSampleImageSet({ prompt: "" });
const sampleRef = createSampleRef();

describe("GET /api/image-sets/:id/reference-images", () => {
  it("returns reference images for the set", async () => {
    db.select.mockReturnValue(chain({ _resolve: [sampleRef] }));
    const res = await GET(
      createRequest("/api/image-sets/set-1/reference-images"),
      createParams({ id: "set-1" })
    );
    const body = await readJson<any[]>(res);
    expect(body).toHaveLength(1);
    expect(body[0].originalName).toBe("photo.png");
  });
});

describe("POST /api/image-sets/:id/reference-images", () => {
  it("uploads valid files and returns results", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));
    db.insert.mockReturnValue(chain());
    (getReferenceImageFileName as any).mockReturnValue("ref-new.png");

    const formData = new FormData();
    formData.append("files", new File([new Uint8Array(100)], "photo.png", { type: "image/png" }));

    const req = new Request("http://localhost:3000/api/image-sets/set-1/reference-images", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    expect(body.created).toHaveLength(1);
    expect(body.errors).toHaveLength(0);
    expect(body.created[0].originalName).toBe("photo.png");
  });

  it("returns 404 when image set does not exist", async () => {
    db.select.mockReturnValue(chain({ get: undefined }));

    const formData = new FormData();
    formData.append("files", new File([new Uint8Array(10)], "f.png", { type: "image/png" }));
    const req = new Request("http://localhost:3000/api/image-sets/nope/reference-images", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, createParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when no files provided", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));
    const formData = new FormData();
    const req = new Request("http://localhost:3000/api/image-sets/set-1/reference-images", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    expect(res.status).toBe(400);
  });

  it("rejects unsupported MIME types", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));
    const formData = new FormData();
    formData.append(
      "files",
      new File([new Uint8Array(10)], "doc.pdf", { type: "application/pdf" })
    );
    const req = new Request("http://localhost:3000/api/image-sets/set-1/reference-images", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    expect(body.created).toHaveLength(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].error).toContain("Unsupported");
  });

  it("rejects files exceeding size limit", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));
    const formData = new FormData();
    const bigFile = new File([new Uint8Array(5 * 1024 * 1024)], "huge.png", { type: "image/png" });
    formData.append("files", bigFile);
    const req = new Request("http://localhost:3000/api/image-sets/set-1/reference-images", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    const body = await readJson<any>(res);
    expect(body.errors[0].error).toContain("too large");
  });

  it("returns 400 when too many files uploaded", async () => {
    db.select.mockReturnValue(chain({ get: sampleSet }));
    const formData = new FormData();
    for (let i = 0; i < 11; i++) {
      formData.append("files", new File([new Uint8Array(10)], `f${i}.png`, { type: "image/png" }));
    }
    const req = new Request("http://localhost:3000/api/image-sets/set-1/reference-images", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, createParams({ id: "set-1" }));
    expect(res.status).toBe(400);
  });
});
