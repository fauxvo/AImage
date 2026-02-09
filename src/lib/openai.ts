import OpenAI from "openai";
import { getSetting, SETTINGS_KEYS } from "@/lib/settings";

export async function getOpenAIClient(): Promise<OpenAI> {
  const dbKey = await getSetting(SETTINGS_KEYS.OPENAI_API_KEY);
  const apiKey = dbKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Set it in Settings or via the OPENAI_API_KEY environment variable."
    );
  }

  return new OpenAI({ apiKey });
}
