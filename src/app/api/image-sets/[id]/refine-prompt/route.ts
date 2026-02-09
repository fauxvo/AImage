import { NextResponse } from "next/server";
import { db } from "@/db";
import { imageSets } from "@/db/schema";
import { openai } from "@/lib/openai";
import { refinePromptSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

const SYSTEM_PROMPT = `You are an expert at crafting prompts for AI image generation models.
Given a user's rough description, create an optimized, detailed image generation prompt that will produce high-quality results.

Guidelines:
- Be specific about composition, lighting, style, and mood
- Include relevant artistic or photographic terms
- Keep it concise but descriptive (1-3 sentences)
- Don't include negative prompts or technical parameters
- Focus on what the image SHOULD contain, not what it shouldn't

Return ONLY the refined prompt text, nothing else.`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const imageSet = await db
    .select()
    .from(imageSets)
    .where(eq(imageSets.id, id))
    .get();

  if (!imageSet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = refinePromptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: parsed.data.prompt },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  const refinedPrompt = completion.choices[0]?.message?.content?.trim();
  if (!refinedPrompt) {
    return NextResponse.json(
      { error: "Failed to refine prompt" },
      { status: 500 }
    );
  }

  return NextResponse.json({ refinedPrompt });
}
