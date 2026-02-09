import { NextResponse } from "next/server";
import { db } from "@/db";
import { imageSets } from "@/db/schema";
import { getOpenAIClient } from "@/lib/openai";
import { getSetting, SETTINGS_KEYS, DEFAULT_CHAT_MODEL } from "@/lib/settings";
import { refinePromptSchema, refinePromptResponseSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

const SYSTEM_PROMPT = `You are an expert at crafting prompts for AI image generation models.
Given a user's rough description, create an optimized, detailed image generation prompt AND recommend optimal generation settings.

Guidelines for the prompt:
- Be specific about composition, lighting, style, and mood
- Include relevant artistic or photographic terms
- Keep it concise but descriptive (1-3 sentences)
- Don't include negative prompts or technical parameters
- Focus on what the image SHOULD contain, not what it shouldn't
- Do NOT repeat style/mood/lighting in the prompt text — those go in the settings instead

Guidelines for settings:
- Infer the best size from the description (e.g. "landscape" → "1536x1024", "portrait" → "1024x1536", "square" or unspecified → "1024x1024")
- Infer quality based on detail level requested (e.g. "high detail", "large print" → "high"; "quick sketch" → "low"; otherwise "auto")
- Infer number of images if mentioned (e.g. "a few variations" → 3, "one image" → 1; default to the current value)
- Infer style modifiers if the description implies an art style, mood, or lighting
- CRITICAL: You MUST use EXACTLY one of the valid values listed below. Do NOT invent new values.

Valid artStyle values (use "" to leave unchanged):
"Oil painting", "Watercolor", "Digital art", "Photorealistic", "Pencil sketch", "Ink drawing", "Anime / Manga", "Pixel art", "3D render", "Pop art", "Art nouveau", "Impressionist", "Surrealist", "Minimalist", "Comic book", "Stained glass", "Woodcut print", "Collage", "Isometric"

Valid mood values (use "" to leave unchanged):
"Dramatic", "Serene", "Vibrant", "Dark / Moody", "Whimsical", "Ethereal", "Nostalgic", "Energetic", "Mysterious", "Romantic", "Melancholic", "Joyful", "Epic", "Cozy"

Valid lighting values (use "" to leave unchanged):
"Natural light", "Golden hour", "Blue hour", "Cinematic", "Studio lighting", "Neon glow", "Dramatic shadows", "Soft diffused", "Backlit / Silhouette", "Moonlight", "Candlelight", "Volumetric / God rays", "High key (bright)", "Low key (dark)"

You MUST respond with valid JSON in this exact format (omit any settings fields you don't want to change):
{
  "refinedPrompt": "the refined prompt text",
  "settings": {
    "size": "1024x1024" | "1024x1536" | "1536x1024",
    "quality": "auto" | "low" | "medium" | "high",
    "numImages": 1-4,
    "style": {
      "artStyle": "exact value from list above or empty string",
      "mood": "exact value from list above or empty string",
      "lighting": "exact value from list above or empty string",
      "custom": "any freeform custom style instructions or empty string"
    }
  }
}`;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imageSet = await db.select().from(imageSets).where(eq(imageSets.id, id)).get();

  if (!imageSet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = refinePromptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const openai = await getOpenAIClient();
  const chatModel = (await getSetting(SETTINGS_KEYS.CHAT_MODEL)) || DEFAULT_CHAT_MODEL;

  // Include current settings context so the AI knows what's already set
  const userMessage = `Current settings: size=${imageSet.size}, quality=${imageSet.quality}, numImages=${imageSet.numImages}, style=${imageSet.style || "none"}

User prompt: ${parsed.data.prompt}`;

  const completion = await openai.chat.completions.create({
    model: chatModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 800,
    temperature: 0.7,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    return NextResponse.json({ error: "Failed to refine prompt" }, { status: 500 });
  }

  // Parse the structured JSON response
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    const result = JSON.parse(cleaned);

    const response = refinePromptResponseSchema.safeParse({
      refinedPrompt: result.refinedPrompt,
      suggestedSettings: result.settings || null,
    });

    if (!response.success) {
      // Fallback: if the AI response doesn't match schema, use raw prompt
      return NextResponse.json({ refinedPrompt: raw, suggestedSettings: null });
    }

    return NextResponse.json(response.data);
  } catch {
    // Fallback: if JSON parsing fails, treat the whole response as a plain prompt
    return NextResponse.json({ refinedPrompt: raw, suggestedSettings: null });
  }
}
