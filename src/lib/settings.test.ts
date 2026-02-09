import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => import("@/test/mocks/db"));

import { db } from "@/db";
import { chain } from "@/test/mocks/db";
import { getSetting, setSetting, deleteSetting, getSettings, SETTINGS_KEYS } from "./settings";

// ─── SETTINGS_KEYS ─────────────────────────────────────────────────────
describe("SETTINGS_KEYS", () => {
  it("exports expected keys", () => {
    expect(SETTINGS_KEYS.AUTO_OPTIMIZE).toBe("auto_optimize");
    expect(SETTINGS_KEYS.OPENAI_API_KEY).toBe("openai_api_key");
    expect(SETTINGS_KEYS.CHAT_MODEL).toBe("chat_model");
    expect(SETTINGS_KEYS.IMAGE_MODEL).toBe("image_model");
  });
});

// ─── getSetting ─────────────────────────────────────────────────────────
describe("getSetting", () => {
  it("returns value when row exists", async () => {
    db.select.mockReturnValue(chain({ get: { key: "k", value: "v" } }));
    expect(await getSetting("k")).toBe("v");
  });

  it("returns null when row does not exist", async () => {
    db.select.mockReturnValue(chain({ get: undefined }));
    expect(await getSetting("missing")).toBeNull();
  });
});

// ─── setSetting ─────────────────────────────────────────────────────────
describe("setSetting", () => {
  it("calls insert with onConflictDoUpdate", async () => {
    const c = chain();
    db.insert.mockReturnValue(c);
    await setSetting("key", "val");
    expect(db.insert).toHaveBeenCalled();
    expect(c.values).toHaveBeenCalledWith({ key: "key", value: "val" });
  });
});

// ─── deleteSetting ──────────────────────────────────────────────────────
describe("deleteSetting", () => {
  it("calls delete with where clause", async () => {
    const c = chain();
    db.delete.mockReturnValue(c);
    await deleteSetting("key");
    expect(db.delete).toHaveBeenCalled();
    expect(c.where).toHaveBeenCalled();
  });
});

// ─── getSettings ────────────────────────────────────────────────────────
describe("getSettings", () => {
  it("returns a key-value map from all rows", async () => {
    db.select.mockReturnValue(
      chain({
        _resolve: [
          { key: "a", value: "1" },
          { key: "b", value: "2" },
        ],
      })
    );
    const result = await getSettings();
    expect(result).toEqual({ a: "1", b: "2" });
  });

  it("returns empty object when no rows", async () => {
    db.select.mockReturnValue(chain({ _resolve: [] }));
    expect(await getSettings()).toEqual({});
  });
});
