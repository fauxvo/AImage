import { vi } from "vitest";

// Re-export real constants (validations is never mocked — single source of truth)
export {
  CHAT_MODELS,
  IMAGE_MODELS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  SETTINGS_KEYS,
} from "@/lib/validations";

export const getSetting = vi.fn().mockResolvedValue(null);
export const setSetting = vi.fn().mockResolvedValue(undefined);
export const deleteSetting = vi.fn().mockResolvedValue(undefined);
export const getSettings = vi.fn().mockResolvedValue({});
