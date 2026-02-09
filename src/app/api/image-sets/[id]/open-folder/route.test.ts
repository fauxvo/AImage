import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/paths", () => import("@/test/mocks/paths"));
vi.mock("fs", () => import("@/test/mocks/fs"));
vi.mock("child_process", () => ({
  spawn: vi.fn().mockReturnValue({ unref: vi.fn() }),
}));

import fs from "fs";
import { spawn } from "child_process";
import { getImageSetDir } from "@/lib/paths";
import { createRequest, createParams, readJson } from "@/test/mocks/next-request";
import { POST } from "./route";

describe("POST /api/image-sets/:id/open-folder", () => {
  it("spawns open command for the directory", async () => {
    const res = await POST(
      createRequest("/api/image-sets/set-1/open-folder", { method: "POST" }),
      createParams({ id: "set-1" })
    );
    const body = await readJson<any>(res);
    expect(body.success).toBe(true);
    expect(spawn).toHaveBeenCalledWith(
      "open",
      [expect.stringContaining("set-1")],
      expect.objectContaining({ detached: true })
    );
  });

  it("returns 404 when directory does not exist", async () => {
    (fs.existsSync as any).mockReturnValue(false);
    const res = await POST(createRequest("/x", { method: "POST" }), createParams({ id: "set-1" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 on path traversal", async () => {
    (getImageSetDir as any).mockImplementation(() => {
      throw new Error("path traversal");
    });
    const res = await POST(createRequest("/x", { method: "POST" }), createParams({ id: "../etc" }));
    expect(res.status).toBe(400);
  });
});
