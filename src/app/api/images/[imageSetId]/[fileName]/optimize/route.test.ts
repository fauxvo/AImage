import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/paths", () => import("@/test/mocks/paths"));
vi.mock("@/lib/optimize", () => import("@/test/mocks/optimize"));

import { getImageFilePath } from "@/lib/paths";
import { optimizeImage } from "@/lib/optimize";
import { createRequest, createParams, readJson } from "@/test/mocks/next-request";
import { POST } from "./route";

describe("POST /api/images/:imageSetId/:fileName/optimize", () => {
  it("returns optimization result", async () => {
    const res = await POST(
      createRequest("/api/images/set-1/img.png/optimize", { method: "POST" }),
      createParams({ imageSetId: "set-1", fileName: "img.png" })
    );
    const body = await readJson<any>(res);
    expect(res.status).toBe(200);
    expect(body.savings).toBe(50);
    expect(optimizeImage).toHaveBeenCalledWith("set-1", "img.png");
  });

  it("returns 404 when source image not found", async () => {
    (optimizeImage as any).mockResolvedValue(null);
    const res = await POST(
      createRequest("/api/images/set-1/missing.png/optimize", {
        method: "POST",
      }),
      createParams({ imageSetId: "set-1", fileName: "missing.png" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 on path traversal", async () => {
    (getImageFilePath as any).mockImplementation(() => {
      throw new Error("path traversal");
    });
    const res = await POST(
      createRequest("/api/images/set-1/../evil/optimize", { method: "POST" }),
      createParams({ imageSetId: "set-1", fileName: "../evil" })
    );
    expect(res.status).toBe(400);
  });
});
