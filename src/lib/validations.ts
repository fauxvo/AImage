import { z } from "zod/v4";

export const createImageSetSchema = z.object({
  name: z.string().min(1).optional(),
  prompt: z.string().optional(),
});

export const styleModifiersSchema = z.object({
  artStyle: z.string().optional(),
  mood: z.string().optional(),
  lighting: z.string().optional(),
  custom: z.string().optional(),
});

export type StyleModifiers = z.infer<typeof styleModifiersSchema>;

export const updateImageSetSchema = z.object({
  name: z.string().min(1).optional(),
  prompt: z.string().optional(),
  refinedPrompt: z.string().nullable().optional(),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).optional(),
  quality: z.enum(["auto", "low", "medium", "high"]).optional(),
  style: z.string().nullable().optional(),
  numImages: z.number().int().min(1).max(4).optional(),
});

export const refinePromptSchema = z.object({
  prompt: z.string().min(1),
});

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
