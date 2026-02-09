import { vi } from "vitest";
import path from "path";

/**
 * Mock for `@/lib/paths`.
 *
 * NOTE: Intentionally omits path traversal checks. These mocks return
 * simple path.join() results without validation. Test traversal logic
 * directly via src/lib/paths.test.ts which uses the real implementation.
 */

const BASE = path.resolve(process.cwd(), "generated-images");

export const ensureBaseDir = vi.fn();
export const getImageSetDir = vi.fn().mockImplementation((id: string) => path.join(BASE, id));
export const ensureImageSetDir = vi.fn().mockImplementation((id: string) => path.join(BASE, id));
export const getImageFilePath = vi
  .fn()
  .mockImplementation((id: string, fn: string) => path.join(BASE, id, fn));
export const getReferenceImageFileName = vi.fn().mockReturnValue("ref-1234-abcd1234.png");
export const removeImageSetDir = vi.fn();
