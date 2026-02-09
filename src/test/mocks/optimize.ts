import { vi } from "vitest";

export const optimizeImage = vi.fn().mockResolvedValue({
  id: "opt-1",
  imageSetId: "set-1",
  fileName: "test_optimized.webp",
  filePath: "/path/test_optimized.webp",
  createdAt: 1000,
  originalSize: 1024,
  optimizedSize: 512,
  savings: 50,
});
