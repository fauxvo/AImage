import { z } from "zod/v4";
import type { ImageModel, ImageGenerateParams, ImageEditParams } from "openai/resources/images";

// ─── OpenAI-derived types ────────────────────────────────────────────
// These types are derived from the OpenAI SDK so they stay in sync
// when the openai package is updated. The `satisfies` checks ensure
// our runtime arrays are subsets of the SDK's accepted values.

type OpenAIImageSize = NonNullable<ImageGenerateParams["size"]>;
type OpenAIImageQuality = NonNullable<ImageGenerateParams["quality"]>;
type OpenAIEditSize = NonNullable<ImageEditParams["size"]>;

// ─── Enums & Constants ───────────────────────────────────────────────
// Sizes we expose in the UI (GPT-image-1 compatible subset)
export const IMAGE_SIZES = [
  "1024x1024",
  "1024x1536",
  "1536x1024",
] as const satisfies readonly OpenAIImageSize[];

// Qualities we expose in the UI (GPT-image-1 compatible subset)
export const IMAGE_QUALITIES = [
  "auto",
  "low",
  "medium",
  "high",
] as const satisfies readonly OpenAIImageQuality[];

export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export const imageSizeSchema = z.enum(IMAGE_SIZES);
export const imageQualitySchema = z.enum(IMAGE_QUALITIES);
export const mimeTypeSchema = z.enum(ALLOWED_MIME_TYPES);

// Size labels for UI display
export const IMAGE_SIZE_OPTIONS = [
  { value: "1024x1024" as const, label: "Square (1024x1024)" },
  { value: "1024x1536" as const, label: "Portrait (1024x1536)" },
  { value: "1536x1024" as const, label: "Landscape (1536x1024)" },
] as const satisfies readonly { value: OpenAIEditSize; label: string }[];

// Quality labels for UI display
export const IMAGE_QUALITY_OPTIONS = [
  { value: "auto" as const, label: "Auto" },
  { value: "low" as const, label: "Low" },
  { value: "medium" as const, label: "Medium" },
  { value: "high" as const, label: "High" },
] as const satisfies readonly { value: OpenAIImageQuality; label: string }[];

// ─── Model Constants ─────────────────────────────────────────────────
// Image models are typed against the SDK's ImageModel union.
// Chat models don't have an SDK type (they use the chat completions API).

export const IMAGE_MODELS = [
  {
    value: "gpt-image-1-mini" satisfies ImageModel,
    label: "GPT Image 1 Mini",
    description: "Fast and affordable image generation",
  },
  {
    value: "gpt-image-1" satisfies ImageModel,
    label: "GPT Image 1",
    description: "Highest quality image generation",
  },
  {
    value: "dall-e-3" satisfies ImageModel,
    label: "DALL-E 3",
    description: "High quality, creative images",
  },
  { value: "dall-e-2" satisfies ImageModel, label: "DALL-E 2", description: "Faster, lower cost" },
] as const;

export const CHAT_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Fast and affordable" },
  { value: "gpt-4o", label: "GPT-4o", description: "Most capable chat model" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", description: "Latest compact model" },
  { value: "gpt-4.1", label: "GPT-4.1", description: "Latest flagship model" },
] as const;

export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
export const DEFAULT_IMAGE_MODEL: ImageModel = "gpt-image-1-mini";

// ─── Reference Image Limits ─────────────────────────────────────────

export const REFERENCE_IMAGE_LIMITS = {
  MAX_FILE_SIZE: 4 * 1024 * 1024, // 4MB per file (OpenAI limit)
  MAX_FILES_PER_UPLOAD: 10,
  MAX_REFS_PER_SET: 20,
  ALLOWED_MIME_TYPES,
} as const;

// ─── Style Modifiers ─────────────────────────────────────────────────

export const styleModifiersSchema = z.object({
  artStyle: z.string().optional(),
  mood: z.string().optional(),
  lighting: z.string().optional(),
  custom: z.string().optional(),
});

export type StyleModifiers = z.infer<typeof styleModifiersSchema>;

// ─── Image Set Request Schemas ───────────────────────────────────────

export const createImageSetSchema = z.object({
  name: z.string().min(1).optional(),
  prompt: z.string().optional(),
});

export type CreateImageSetInput = z.infer<typeof createImageSetSchema>;

export const updateImageSetSchema = z.object({
  name: z.string().min(1).optional(),
  prompt: z.string().optional(),
  refinedPrompt: z.string().nullable().optional(),
  size: imageSizeSchema.optional(),
  quality: imageQualitySchema.optional(),
  style: z.string().nullable().optional(),
  numImages: z.number().int().min(1).max(4).optional(),
});

export type UpdateImageSetInput = z.infer<typeof updateImageSetSchema>;

// ─── Image Set Response Schemas ──────────────────────────────────────

export const generatedImageSchema = z.object({
  id: z.string(),
  imageSetId: z.string(),
  filePath: z.string(),
  fileName: z.string(),
  createdAt: z.number(),
});

export type GeneratedImage = z.infer<typeof generatedImageSchema>;

export const referenceImageSchema = z.object({
  id: z.string(),
  imageSetId: z.string(),
  filePath: z.string(),
  fileName: z.string(),
  originalName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  createdAt: z.number(),
});

export type ReferenceImage = z.infer<typeof referenceImageSchema>;

export const imageSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  refinedPrompt: z.string().nullable(),
  size: z.string(),
  quality: z.string(),
  style: z.string().nullable(),
  numImages: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ImageSet = z.infer<typeof imageSetSchema>;

export const imageSetDetailSchema = imageSetSchema.extend({
  images: z.array(generatedImageSchema),
  referenceImages: z.array(referenceImageSchema),
});

export type ImageSetDetail = z.infer<typeof imageSetDetailSchema>;

// ─── Reference Image Upload Response ─────────────────────────────────

export const referenceImageUploadResultSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  originalName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

export type ReferenceImageUploadResult = z.infer<typeof referenceImageUploadResultSchema>;

export const referenceImageUploadErrorSchema = z.object({
  fileName: z.string(),
  error: z.string(),
});

export type ReferenceImageUploadError = z.infer<typeof referenceImageUploadErrorSchema>;

export const referenceImageUploadResponseSchema = z.object({
  created: z.array(referenceImageUploadResultSchema),
  errors: z.array(referenceImageUploadErrorSchema),
});

export type ReferenceImageUploadResponse = z.infer<typeof referenceImageUploadResponseSchema>;

// ─── Prompt Refinement ───────────────────────────────────────────────

export const refinePromptSchema = z.object({
  prompt: z.string().min(1),
});

export type RefinePromptInput = z.infer<typeof refinePromptSchema>;

export const suggestedSettingsSchema = z.object({
  size: imageSizeSchema.optional(),
  quality: imageQualitySchema.optional(),
  numImages: z.number().int().min(1).max(4).optional(),
  style: styleModifiersSchema.optional(),
});

export type SuggestedSettings = z.infer<typeof suggestedSettingsSchema>;

export const refinePromptResponseSchema = z.object({
  refinedPrompt: z.string(),
  suggestedSettings: suggestedSettingsSchema.nullable(),
});

export type RefinePromptResponse = z.infer<typeof refinePromptResponseSchema>;

// ─── Settings Keys ──────────────────────────────────────────────────

export const SETTINGS_KEYS = {
  AUTO_OPTIMIZE: "auto_optimize",
  OPENAI_API_KEY: "openai_api_key",
  CHAT_MODEL: "chat_model",
  IMAGE_MODEL: "image_model",
} as const;

// ─── Settings ────────────────────────────────────────────────────────

const settingValue = z.string().nullable().optional();

export const updateSettingsSchema = z.object({
  auto_optimize: settingValue,
  openai_api_key: settingValue,
  chat_model: settingValue,
  image_model: settingValue,
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const settingsResponseSchema = z.object({
  settings: z.record(z.string(), z.string()),
  hasEnvKey: z.boolean(),
});

export type SettingsResponse = z.infer<typeof settingsResponseSchema>;

// ─── SSE Event Schemas ───────────────────────────────────────────────

export const sseStartedSchema = z.object({
  imageSetId: z.string(),
  numImages: z.number(),
});

export const sseProgressSchema = z.object({
  current: z.number(),
  total: z.number(),
  status: z.string(),
});

export const sseImageSavedSchema = z.object({
  current: z.number(),
  total: z.number(),
  image: z.object({
    id: z.string(),
    fileName: z.string(),
  }),
});

export const sseWarningSchema = z.object({
  message: z.string(),
});

export const sseErrorSchema = z.object({
  message: z.string(),
});

export const sseCompleteSchema = z.object({
  images: z.array(
    z.object({
      id: z.string(),
      fileName: z.string(),
    })
  ),
});

export type SSEStarted = z.infer<typeof sseStartedSchema>;
export type SSEProgress = z.infer<typeof sseProgressSchema>;
export type SSEImageSaved = z.infer<typeof sseImageSavedSchema>;
export type SSEWarning = z.infer<typeof sseWarningSchema>;
export type SSEError = z.infer<typeof sseErrorSchema>;
export type SSEComplete = z.infer<typeof sseCompleteSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Build the final prompt by appending style modifiers */
export function buildStyledPrompt(basePrompt: string, styleJson: string | null): string {
  if (!styleJson) return basePrompt;

  let modifiers: StyleModifiers;
  try {
    modifiers = styleModifiersSchema.parse(JSON.parse(styleJson));
  } catch {
    return basePrompt;
  }

  const parts: string[] = [basePrompt];

  if (modifiers.artStyle) parts.push(`Style: ${modifiers.artStyle}.`);
  if (modifiers.mood) parts.push(`Mood: ${modifiers.mood}.`);
  if (modifiers.lighting) parts.push(`Lighting: ${modifiers.lighting}.`);
  if (modifiers.custom) parts.push(modifiers.custom);

  return parts.join(" ");
}
