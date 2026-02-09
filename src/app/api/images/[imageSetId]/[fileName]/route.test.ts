import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/paths", () => import("@/test/mocks/paths"));
vi.mock("fs", () => import("@/test/mocks/fs"));

import fs from "fs";
import { getImageFilePath } from "@/lib/paths";
import { createRequest, createParams } from "@/test/mocks/next-request";
import { GET } from "./route";

describe("GET /api/images/:imageSetId/:fileName", () => {
  it("serves a PNG file with correct content-type", async () => {
    const res = await GET(
      createRequest("/api/images/set-1/image.png"),
      createParams({ imageSetId: "set-1", fileName: "image.png" })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toContain("immutable");
  });

  it("serves JPEG with correct MIME", async () => {
    const res = await GET(
      createRequest("/api/images/set-1/photo.jpg"),
      createParams({ imageSetId: "set-1", fileName: "photo.jpg" })
    );
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("serves WebP with correct MIME", async () => {
    const res = await GET(
      createRequest("/api/images/set-1/opt.webp"),
      createParams({ imageSetId: "set-1", fileName: "opt.webp" })
    );
    expect(res.headers.get("Content-Type")).toBe("image/webp");
  });

  it("defaults to image/png for unknown extension", async () => {
    const res = await GET(
      createRequest("/api/images/set-1/file.bmp"),
      createParams({ imageSetId: "set-1", fileName: "file.bmp" })
    );
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 404 when file does not exist", async () => {
    (fs.existsSync as any).mockReturnValue(false);
    const res = await GET(
      createRequest("/api/images/set-1/missing.png"),
      createParams({ imageSetId: "set-1", fileName: "missing.png" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 on path traversal", async () => {
    (getImageFilePath as any).mockImplementation(() => {
      throw new Error("path traversal");
    });
    const res = await GET(
      createRequest("/api/images/set-1/../secret"),
      createParams({ imageSetId: "set-1", fileName: "../secret" })
    );
    expect(res.status).toBe(400);
  });
});
