import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => import("@/test/mocks/db"));
vi.mock("@/lib/paths", () => import("@/test/mocks/paths"));
vi.mock("fs", () => import("@/test/mocks/fs"));
vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("optimized")),
  }),
}));

import { db } from "@/db";
import { chain } from "@/test/mocks/db";
import fs from "fs";
import sharp from "sharp";
import { optimizeImage } from "./optimize";

describe("optimizeImage", () => {
  it("returns null when source file does not exist", async () => {
    (fs.existsSync as any).mockReturnValue(false);
    const result = await optimizeImage("set-1", "img.png");
    expect(result).toBeNull();
  });

  it("returns existing record when already optimized", async () => {
    (fs.existsSync as any).mockReturnValue(true); // source + optimized exist
    const existing = {
      id: "existing-id",
      imageSetId: "set-1",
      fileName: "img_optimized.webp",
      filePath: "/p/img_optimized.webp",
      createdAt: 1000,
    };
    db.select.mockReturnValue(chain({ get: existing }));
    (fs.statSync as any)
      .mockReturnValueOnce({ size: 2000 }) // original
      .mockReturnValueOnce({ size: 1000 }); // optimized

    const result = await optimizeImage("set-1", "img.png");

    // Verify it checked for the optimized file path
    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining("_optimized.webp"));
    expect(result).toMatchObject({
      id: "existing-id",
      originalSize: 2000,
      optimizedSize: 1000,
      savings: 50,
    });
  });

  it("optimizes image and inserts DB record", async () => {
    // source exists, optimized does not, DB returns no existing
    (fs.existsSync as any)
      .mockReturnValueOnce(true) // source
      .mockReturnValueOnce(false); // optimized doesn't exist
    (fs.readFileSync as any).mockReturnValue(Buffer.from("raw-png"));

    const inserted = {
      id: "new-id",
      imageSetId: "set-1",
      fileName: "img_optimized.webp",
      filePath: "/p/img_optimized.webp",
      createdAt: Date.now(),
    };
    db.insert.mockReturnValue(chain({ _resolve: [inserted] }));

    const result = await optimizeImage("set-1", "img.png");

    expect(sharp).toHaveBeenCalledWith(Buffer.from("raw-png"));
    const sharpInstance = (sharp as any).mock.results[0].value;
    expect(sharpInstance.webp).toHaveBeenCalledWith({ quality: 80, effort: 6 });
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "new-id",
      originalSize: 7, // "raw-png".length
      optimizedSize: 9, // "optimized".length
    });
  });

  it("calculates savings percentage correctly", async () => {
    (fs.existsSync as any).mockReturnValueOnce(true).mockReturnValueOnce(false);
    (fs.readFileSync as any).mockReturnValue(Buffer.alloc(1000));

    const inserted = {
      id: "x",
      imageSetId: "s",
      fileName: "f_optimized.webp",
      filePath: "/f",
      createdAt: 1,
    };
    db.insert.mockReturnValue(chain({ _resolve: [inserted] }));

    const result = await optimizeImage("s", "f.png");
    expect(result!.savings).toBeGreaterThanOrEqual(0);
    expect(result!.savings).toBeLessThanOrEqual(100);
  });
});
