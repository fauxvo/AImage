import { NextResponse } from "next/server";
import { getSettings, setSetting, deleteSetting } from "@/lib/settings";
import { updateSettingsSchema } from "@/lib/validations";

function maskApiKey(key: string): string {
  if (key.length <= 4) return "****";
  return "****" + key.slice(-4);
}

export async function GET() {
  const settings = await getSettings();

  // Mask the API key for display
  const masked = { ...settings };
  if (masked["openai_api_key"]) {
    masked["openai_api_key"] = maskApiKey(masked["openai_api_key"]);
  }

  return NextResponse.json({
    settings: masked,
    hasEnvKey: !!process.env.OPENAI_API_KEY,
  });
}

export async function PATCH(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    if (value === null || value === "") {
      await deleteSetting(key);
    } else {
      await setSetting(key, value);
    }
  }

  // Return updated settings (masked)
  const settings = await getSettings();
  const masked = { ...settings };
  if (masked["openai_api_key"]) {
    masked["openai_api_key"] = maskApiKey(masked["openai_api_key"]);
  }

  return NextResponse.json({
    settings: masked,
    hasEnvKey: !!process.env.OPENAI_API_KEY,
  });
}
