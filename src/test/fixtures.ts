/** Shared test fixtures — single source of truth for test data shapes */

export function createSampleImageSet(overrides: Record<string, unknown> = {}) {
  return {
    id: "set-1",
    name: "Test",
    prompt: "A cat",
    refinedPrompt: null,
    size: "1024x1024",
    quality: "auto",
    style: null,
    numImages: 1,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

export function createSampleRef(overrides: Record<string, unknown> = {}) {
  return {
    id: "ref-1",
    imageSetId: "set-1",
    filePath: "/p/ref.png",
    fileName: "ref-123.png",
    originalName: "photo.png",
    fileSize: 1024,
    mimeType: "image/png",
    createdAt: 1000,
    ...overrides,
  };
}
