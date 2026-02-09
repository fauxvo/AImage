import { describe, it, expect, vi } from "vitest";
import path from "path";

vi.mock("fs", () => import("@/test/mocks/fs"));
import fs from "fs";

import {
  ensureBaseDir,
  getImageSetDir,
  ensureImageSetDir,
  getImageFilePath,
  getReferenceImageFileName,
  removeImageSetDir,
} from "./paths";

const BASE_DIR = path.resolve(process.cwd(), "generated-images");

// ─── getImageSetDir ────────────────────────────────────────────────────
describe("getImageSetDir", () => {
  it("returns correct path for a simple ID", () => {
    expect(getImageSetDir("abc-123")).toBe(path.join(BASE_DIR, "abc-123"));
  });

  it("throws on ../ traversal", () => {
    expect(() => getImageSetDir("../malicious")).toThrow("path traversal");
  });

  it("throws on absolute path", () => {
    expect(() => getImageSetDir("/etc/passwd")).toThrow("path traversal");
  });

  it("throws on nested traversal", () => {
    expect(() => getImageSetDir("foo/../../etc")).toThrow("path traversal");
  });
});

// ─── getImageFilePath ──────────────────────────────────────────────────
describe("getImageFilePath", () => {
  it("returns correct path for a valid file", () => {
    const result = getImageFilePath("set-1", "image.png");
    expect(result).toBe(path.join(BASE_DIR, "set-1", "image.png"));
  });

  it("throws on ../ filename", () => {
    expect(() => getImageFilePath("set-1", "../secret.png")).toThrow("path traversal");
  });

  it("throws when imageSetId is traversal", () => {
    expect(() => getImageFilePath("../x", "file.png")).toThrow("path traversal");
  });
});

// ─── ensureBaseDir ─────────────────────────────────────────────────────
describe("ensureBaseDir", () => {
  it("creates directory if it does not exist", () => {
    (fs.existsSync as any).mockReturnValue(false);
    ensureBaseDir();
    expect(fs.mkdirSync).toHaveBeenCalledWith(BASE_DIR, { recursive: true });
  });

  it("skips creation when directory exists", () => {
    (fs.existsSync as any).mockReturnValue(true);
    ensureBaseDir();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
});

// ─── ensureImageSetDir ─────────────────────────────────────────────────
describe("ensureImageSetDir", () => {
  it("creates the image set sub-directory", () => {
    (fs.existsSync as any)
      .mockReturnValueOnce(true) // baseDir exists
      .mockReturnValueOnce(false); // setDir does not
    const dir = ensureImageSetDir("new-set");
    expect(dir).toBe(path.join(BASE_DIR, "new-set"));
    expect(fs.mkdirSync).toHaveBeenCalled();
  });
});

// ─── removeImageSetDir ─────────────────────────────────────────────────
describe("removeImageSetDir", () => {
  it("removes directory when it exists", () => {
    (fs.existsSync as any).mockReturnValue(true);
    removeImageSetDir("set-1");
    expect(fs.rmSync).toHaveBeenCalledWith(path.join(BASE_DIR, "set-1"), {
      recursive: true,
      force: true,
    });
  });

  it("does nothing when directory does not exist", () => {
    (fs.existsSync as any).mockReturnValue(false);
    removeImageSetDir("set-1");
    expect(fs.rmSync).not.toHaveBeenCalled();
  });
});

// ─── getReferenceImageFileName ─────────────────────────────────────────
describe("getReferenceImageFileName", () => {
  it("preserves the original extension", () => {
    const name = getReferenceImageFileName("photo.jpg");
    expect(name).toMatch(/^ref-\d+-[a-f0-9]{8}\.jpg$/);
  });

  it("defaults to .png when no extension", () => {
    const name = getReferenceImageFileName("noext");
    expect(name).toMatch(/^ref-\d+-[a-f0-9]{8}\.png$/);
  });

  it("lowercases the extension", () => {
    const name = getReferenceImageFileName("image.PNG");
    expect(name).toMatch(/\.png$/);
  });

  it("produces unique names on successive calls", () => {
    const a = getReferenceImageFileName("a.png");
    const b = getReferenceImageFileName("b.png");
    expect(a).not.toBe(b);
  });
});
