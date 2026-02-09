import { vi } from "vitest";
import { Readable } from "stream";

/**
 * Mock for the `fs` module.
 *
 * Default: existsSync returns true. Override in tests that need false.
 */

export const existsSync = vi.fn().mockReturnValue(true);
export const readFileSync = vi.fn().mockReturnValue(Buffer.from("fake-data"));
export const writeFileSync = vi.fn();
export const mkdirSync = vi.fn();
export const rmSync = vi.fn();
export const unlinkSync = vi.fn();
export const statSync = vi.fn().mockReturnValue({ size: 1024 });
export const readdirSync = vi.fn().mockReturnValue([]);
export const createReadStream = vi.fn().mockImplementation(() => {
  return Readable.from(Buffer.from("fake-data"));
});

/** fs/promises async methods */
export const promises = {
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-data")),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1024 }),
  readdir: vi.fn().mockResolvedValue([]),
};

/** Default export so `import fs from "fs"` works with the mock */
export default {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  unlinkSync,
  statSync,
  readdirSync,
  createReadStream,
  promises,
};
