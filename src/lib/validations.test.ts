import { describe, it, expect } from "vitest";
import {
  IMAGE_SIZES,
  IMAGE_QUALITIES,
  ALLOWED_MIME_TYPES,
  imageSizeSchema,
  imageQualitySchema,
  mimeTypeSchema,
  IMAGE_SIZE_OPTIONS,
  IMAGE_QUALITY_OPTIONS,
  IMAGE_MODELS,
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  REFERENCE_IMAGE_LIMITS,
  styleModifiersSchema,
  createImageSetSchema,
  updateImageSetSchema,
  refinePromptSchema,
  suggestedSettingsSchema,
  updateSettingsSchema,
  buildStyledPrompt,
  generatedImageSchema,
  referenceImageSchema,
  imageSetSchema,
  imageSetDetailSchema,
  sseStartedSchema,
  sseProgressSchema,
  sseImageSavedSchema,
  sseWarningSchema,
  sseErrorSchema,
  sseCompleteSchema,
} from "./validations";

// ─── Constants ─────────────────────────────────────────────────────────
describe("constants", () => {
  it("IMAGE_SIZES contains expected sizes", () => {
    expect(IMAGE_SIZES).toEqual(["1024x1024", "1024x1536", "1536x1024"]);
  });

  it("IMAGE_QUALITIES contains expected qualities", () => {
    expect(IMAGE_QUALITIES).toEqual(["auto", "low", "medium", "high"]);
  });

  it("ALLOWED_MIME_TYPES covers common image types", () => {
    expect(ALLOWED_MIME_TYPES).toContain("image/png");
    expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
    expect(ALLOWED_MIME_TYPES).toContain("image/webp");
    expect(ALLOWED_MIME_TYPES).toContain("image/gif");
  });

  it("IMAGE_SIZE_OPTIONS has labels for all sizes", () => {
    expect(IMAGE_SIZE_OPTIONS).toHaveLength(IMAGE_SIZES.length);
    for (const opt of IMAGE_SIZE_OPTIONS) {
      expect(IMAGE_SIZES).toContain(opt.value);
      expect(opt.label).toBeTruthy();
    }
  });

  it("IMAGE_QUALITY_OPTIONS has labels for all qualities", () => {
    expect(IMAGE_QUALITY_OPTIONS).toHaveLength(IMAGE_QUALITIES.length);
    for (const opt of IMAGE_QUALITY_OPTIONS) {
      expect(IMAGE_QUALITIES).toContain(opt.value);
      expect(opt.label).toBeTruthy();
    }
  });

  it("IMAGE_MODELS includes gpt-image-1 and dall-e models", () => {
    const values = IMAGE_MODELS.map((m) => m.value);
    expect(values).toContain("gpt-image-1");
    expect(values).toContain("dall-e-3");
  });

  it("CHAT_MODELS includes gpt-4o variants", () => {
    const values = CHAT_MODELS.map((m) => m.value);
    expect(values).toContain("gpt-4o");
    expect(values).toContain("gpt-4o-mini");
  });

  it("DEFAULT_CHAT_MODEL is a valid chat model", () => {
    expect(CHAT_MODELS.map((m) => m.value)).toContain(DEFAULT_CHAT_MODEL);
  });

  it("DEFAULT_IMAGE_MODEL is a valid image model", () => {
    expect(IMAGE_MODELS.map((m) => m.value)).toContain(DEFAULT_IMAGE_MODEL);
  });

  it("REFERENCE_IMAGE_LIMITS has correct values", () => {
    expect(REFERENCE_IMAGE_LIMITS.MAX_FILE_SIZE).toBe(4 * 1024 * 1024);
    expect(REFERENCE_IMAGE_LIMITS.MAX_FILES_PER_UPLOAD).toBe(10);
    expect(REFERENCE_IMAGE_LIMITS.ALLOWED_MIME_TYPES).toBe(ALLOWED_MIME_TYPES);
  });
});

// ─── Enum Schemas ──────────────────────────────────────────────────────
describe("imageSizeSchema", () => {
  it("accepts valid sizes", () => {
    for (const size of IMAGE_SIZES) {
      expect(imageSizeSchema.parse(size)).toBe(size);
    }
  });

  it("rejects invalid size", () => {
    expect(() => imageSizeSchema.parse("512x512")).toThrow();
  });
});

describe("imageQualitySchema", () => {
  it("accepts valid qualities", () => {
    for (const q of IMAGE_QUALITIES) {
      expect(imageQualitySchema.parse(q)).toBe(q);
    }
  });

  it("rejects invalid quality", () => {
    expect(() => imageQualitySchema.parse("ultra")).toThrow();
  });
});

describe("mimeTypeSchema", () => {
  it("accepts valid MIME types", () => {
    for (const t of ALLOWED_MIME_TYPES) {
      expect(mimeTypeSchema.parse(t)).toBe(t);
    }
  });

  it("rejects invalid MIME type", () => {
    expect(() => mimeTypeSchema.parse("application/pdf")).toThrow();
  });
});

// ─── Style Modifiers ───────────────────────────────────────────────────
describe("styleModifiersSchema", () => {
  it("accepts empty object", () => {
    expect(styleModifiersSchema.parse({})).toEqual({});
  });

  it("accepts all optional fields", () => {
    const input = {
      artStyle: "Oil painting",
      mood: "Dramatic",
      lighting: "Golden hour",
      custom: "with birds",
    };
    expect(styleModifiersSchema.parse(input)).toEqual(input);
  });

  it("strips unknown fields", () => {
    const result = styleModifiersSchema.parse({ artStyle: "test", unknown: "field" });
    expect(result).not.toHaveProperty("unknown");
  });
});

// ─── Create / Update Image Set ─────────────────────────────────────────
describe("createImageSetSchema", () => {
  it("accepts empty object", () => {
    expect(createImageSetSchema.parse({})).toEqual({});
  });

  it("accepts name and prompt", () => {
    const result = createImageSetSchema.parse({ name: "Test", prompt: "A cat" });
    expect(result.name).toBe("Test");
    expect(result.prompt).toBe("A cat");
  });

  it("rejects empty name string", () => {
    expect(() => createImageSetSchema.parse({ name: "" })).toThrow();
  });
});

describe("updateImageSetSchema", () => {
  it("accepts partial updates", () => {
    expect(updateImageSetSchema.parse({ name: "New Name" })).toHaveProperty("name", "New Name");
  });

  it("accepts size, quality, numImages", () => {
    const result = updateImageSetSchema.parse({
      size: "1024x1536",
      quality: "high",
      numImages: 3,
    });
    expect(result.size).toBe("1024x1536");
    expect(result.quality).toBe("high");
    expect(result.numImages).toBe(3);
  });

  it("rejects numImages out of range", () => {
    expect(() => updateImageSetSchema.parse({ numImages: 0 })).toThrow();
    expect(() => updateImageSetSchema.parse({ numImages: 5 })).toThrow();
  });

  it("accepts nullable style and refinedPrompt", () => {
    const result = updateImageSetSchema.parse({ style: null, refinedPrompt: null });
    expect(result.style).toBeNull();
    expect(result.refinedPrompt).toBeNull();
  });
});

// ─── Refine Prompt ─────────────────────────────────────────────────────
describe("refinePromptSchema", () => {
  it("accepts valid prompt", () => {
    expect(refinePromptSchema.parse({ prompt: "A sunset" })).toEqual({ prompt: "A sunset" });
  });

  it("rejects empty prompt", () => {
    expect(() => refinePromptSchema.parse({ prompt: "" })).toThrow();
  });
});

describe("suggestedSettingsSchema", () => {
  it("accepts empty object", () => {
    expect(suggestedSettingsSchema.parse({})).toEqual({});
  });

  it("accepts all fields", () => {
    const result = suggestedSettingsSchema.parse({
      size: "1536x1024",
      quality: "high",
      numImages: 2,
      style: { artStyle: "Oil painting" },
    });
    expect(result.size).toBe("1536x1024");
    expect(result.numImages).toBe(2);
  });
});

// ─── Settings ──────────────────────────────────────────────────────────
describe("updateSettingsSchema", () => {
  it("accepts valid settings", () => {
    const result = updateSettingsSchema.parse({
      auto_optimize: "true",
      openai_api_key: "sk-test",
    });
    expect(result.auto_optimize).toBe("true");
    expect(result.openai_api_key).toBe("sk-test");
  });

  it("accepts null values for clearing", () => {
    const result = updateSettingsSchema.parse({ openai_api_key: null });
    expect(result.openai_api_key).toBeNull();
  });
});

// ─── Response Schemas ──────────────────────────────────────────────────
describe("generatedImageSchema", () => {
  it("validates complete image", () => {
    const result = generatedImageSchema.parse({
      id: "abc",
      imageSetId: "set1",
      filePath: "/path/to/file.png",
      fileName: "file.png",
      createdAt: Date.now(),
    });
    expect(result.id).toBe("abc");
  });

  it("rejects missing fields", () => {
    expect(() => generatedImageSchema.parse({ id: "abc" })).toThrow();
  });
});

describe("referenceImageSchema", () => {
  it("validates complete reference image", () => {
    const result = referenceImageSchema.parse({
      id: "ref1",
      imageSetId: "set1",
      filePath: "/path",
      fileName: "ref.png",
      originalName: "photo.png",
      fileSize: 1024,
      mimeType: "image/png",
      createdAt: Date.now(),
    });
    expect(result.originalName).toBe("photo.png");
  });
});

describe("imageSetSchema", () => {
  it("validates complete image set", () => {
    const now = Date.now();
    const result = imageSetSchema.parse({
      id: "set1",
      name: "My Set",
      prompt: "A cat",
      refinedPrompt: null,
      size: "1024x1024",
      quality: "auto",
      style: null,
      numImages: 1,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.name).toBe("My Set");
  });
});

describe("imageSetDetailSchema", () => {
  it("extends imageSet with images and referenceImages arrays", () => {
    const now = Date.now();
    const result = imageSetDetailSchema.parse({
      id: "set1",
      name: "My Set",
      prompt: "A cat",
      refinedPrompt: null,
      size: "1024x1024",
      quality: "auto",
      style: null,
      numImages: 1,
      createdAt: now,
      updatedAt: now,
      images: [],
      referenceImages: [],
    });
    expect(result.images).toEqual([]);
    expect(result.referenceImages).toEqual([]);
  });
});

// ─── SSE Schemas ───────────────────────────────────────────────────────
describe("SSE schemas", () => {
  it("sseStartedSchema validates", () => {
    expect(sseStartedSchema.parse({ imageSetId: "s1", numImages: 2 })).toEqual({
      imageSetId: "s1",
      numImages: 2,
    });
  });

  it("sseProgressSchema validates", () => {
    expect(sseProgressSchema.parse({ current: 1, total: 3, status: "Generating..." })).toEqual({
      current: 1,
      total: 3,
      status: "Generating...",
    });
  });

  it("sseImageSavedSchema validates", () => {
    expect(
      sseImageSavedSchema.parse({
        current: 1,
        total: 2,
        image: { id: "i1", fileName: "test.png" },
      })
    ).toEqual({
      current: 1,
      total: 2,
      image: { id: "i1", fileName: "test.png" },
    });
  });

  it("sseWarningSchema validates", () => {
    expect(sseWarningSchema.parse({ message: "warning" })).toEqual({
      message: "warning",
    });
  });

  it("sseErrorSchema validates", () => {
    expect(sseErrorSchema.parse({ message: "error" })).toEqual({
      message: "error",
    });
  });

  it("sseCompleteSchema validates", () => {
    expect(
      sseCompleteSchema.parse({
        images: [{ id: "i1", fileName: "f.png" }],
      })
    ).toEqual({
      images: [{ id: "i1", fileName: "f.png" }],
    });
  });
});

// ─── buildStyledPrompt ─────────────────────────────────────────────────
describe("buildStyledPrompt", () => {
  it("returns base prompt when style is null", () => {
    expect(buildStyledPrompt("A cat", null)).toBe("A cat");
  });

  it("returns base prompt when style JSON is invalid", () => {
    expect(buildStyledPrompt("A cat", "not-json")).toBe("A cat");
  });

  it("appends artStyle", () => {
    const style = JSON.stringify({ artStyle: "Oil painting" });
    expect(buildStyledPrompt("A cat", style)).toBe("A cat Style: Oil painting.");
  });

  it("appends mood", () => {
    const style = JSON.stringify({ mood: "Dramatic" });
    expect(buildStyledPrompt("A cat", style)).toBe("A cat Mood: Dramatic.");
  });

  it("appends lighting", () => {
    const style = JSON.stringify({ lighting: "Golden hour" });
    expect(buildStyledPrompt("A cat", style)).toBe("A cat Lighting: Golden hour.");
  });

  it("appends custom text directly", () => {
    const style = JSON.stringify({ custom: "with a hat" });
    expect(buildStyledPrompt("A cat", style)).toBe("A cat with a hat");
  });

  it("appends all modifiers in order", () => {
    const style = JSON.stringify({
      artStyle: "Watercolor",
      mood: "Serene",
      lighting: "Soft diffused",
      custom: "on a hill",
    });
    const result = buildStyledPrompt("A cat", style);
    expect(result).toBe(
      "A cat Style: Watercolor. Mood: Serene. Lighting: Soft diffused. on a hill"
    );
  });

  it("returns base prompt for empty style object", () => {
    expect(buildStyledPrompt("A cat", "{}")).toBe("A cat");
  });
});
