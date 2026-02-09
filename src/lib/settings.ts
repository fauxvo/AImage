import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Re-export constants from validations (which is client-safe, single source of truth)
export {
  CHAT_MODELS,
  IMAGE_MODELS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  SETTINGS_KEYS,
} from "./validations";

// ─── Encryption helpers for sensitive settings ─────────────────────────
// Uses AES-256-GCM when APP_SECRET is set; falls back to plaintext otherwise.

const ENCRYPTED_PREFIX = "enc:";
const SENSITIVE_KEYS = new Set(["openai_api_key"]);

function getEncryptionKey(): Buffer | null {
  const secret = process.env.APP_SECRET;
  if (!secret) return null;
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENCRYPTED_PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decrypt(stored: string): string {
  if (!stored.startsWith(ENCRYPTED_PREFIX)) return stored;
  const key = getEncryptionKey();
  if (!key) return stored; // No secret available; return raw (migration case)
  const data = Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

// ─── Public API ────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  if (!row) return null;
  return SENSITIVE_KEYS.has(key) ? decrypt(row.value) : row.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const stored = SENSITIVE_KEYS.has(key) ? encrypt(value) : value;
  await db
    .insert(appSettings)
    .values({ key, value: stored })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: stored } });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(appSettings).where(eq(appSettings.key, key));
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(appSettings).all();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = SENSITIVE_KEYS.has(row.key) ? decrypt(row.value) : row.value;
  }
  return settings;
}
