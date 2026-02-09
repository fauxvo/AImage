import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => import("@/test/mocks/db"));
vi.mock("fs", () => import("@/test/mocks/fs"));

import { db } from "@/db";
import { chain } from "@/test/mocks/db";
import fs from "fs";
import { createRequest, createParams, readJson } from "@/test/mocks/next-request";
import { createSampleRef } from "@/test/fixtures";
import { DELETE } from "./route";

const sampleRef = createSampleRef();

describe("DELETE /api/image-sets/:id/reference-images/:refId", () => {
  it("deletes the reference image file and DB record", async () => {
    db.select.mockReturnValue(chain({ get: sampleRef }));
    db.delete.mockReturnValue(chain());

    const res = await DELETE(
      createRequest("/api/image-sets/set-1/reference-images/ref-1", {
        method: "DELETE",
      }),
      createParams({ id: "set-1", refId: "ref-1" })
    );
    const body = await readJson<any>(res);
    expect(body.success).toBe(true);
    expect(fs.unlinkSync).toHaveBeenCalledWith("/p/ref.png");
    expect(db.delete).toHaveBeenCalled();
  });

  it("returns 404 when ref not found", async () => {
    db.select.mockReturnValue(chain({ get: undefined }));
    const res = await DELETE(
      createRequest("/r", { method: "DELETE" }),
      createParams({ id: "set-1", refId: "nope" })
    );
    expect(res.status).toBe(404);
  });

  it("skips file deletion when file does not exist on disk", async () => {
    (fs.existsSync as any).mockReturnValue(false);
    db.select.mockReturnValue(chain({ get: sampleRef }));
    db.delete.mockReturnValue(chain());

    const res = await DELETE(
      createRequest("/r", { method: "DELETE" }),
      createParams({ id: "set-1", refId: "ref-1" })
    );
    expect(res.status).toBe(200);
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});
