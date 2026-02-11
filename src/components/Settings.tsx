"use client";

import { useEffect, useState, useRef } from "react";
import type { SettingsResponse } from "@/lib/validations";
import { CHAT_MODELS, IMAGE_MODELS } from "@/lib/validations";

export function Settings() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [chatModel, setChatModel] = useState("gpt-4o-mini");
  const [imageModel, setImageModel] = useState("gpt-image-1-mini");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchSettings();
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const result: SettingsResponse = await res.json();
        setData(result);
        setAutoOptimize(result.settings["auto_optimize"] !== "false");
        setChatModel(result.settings["chat_model"] || "gpt-4o-mini");
        setImageModel(result.settings["image_model"] || "gpt-image-1-mini");
      }
    } finally {
      setLoading(false);
    }
  }

  function showNotification(type: "success" | "error", text: string) {
    setMessage({ type, text });
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => setMessage(null), 3000);
  }

  async function saveSetting(key: string, value: string | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function toggleAutoOptimize() {
    const newValue = !autoOptimize;
    setAutoOptimize(newValue);
    const ok = await saveSetting("auto_optimize", newValue ? "true" : "false");
    if (ok) {
      showNotification("success", "Auto-optimize setting saved");
    } else {
      setAutoOptimize(!newValue);
      showNotification("error", "Failed to save setting");
    }
  }

  async function handleChatModelChange(value: string) {
    const prev = chatModel;
    setChatModel(value);
    const ok = await saveSetting("chat_model", value);
    if (ok) {
      showNotification("success", "Chat model updated");
    } else {
      setChatModel(prev);
      showNotification("error", "Failed to save setting");
    }
  }

  async function handleImageModelChange(value: string) {
    const prev = imageModel;
    setImageModel(value);
    const ok = await saveSetting("image_model", value);
    if (ok) {
      showNotification("success", "Image model updated");
    } else {
      setImageModel(prev);
      showNotification("error", "Failed to save setting");
    }
  }

  async function saveApiKey(value?: string) {
    const keyValue = value ?? apiKey;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openai_api_key: keyValue || null,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setApiKey("");
        setShowKey(false);
        showNotification("success", keyValue ? "API key saved" : "Custom API key removed");
      } else {
        showNotification("error", "Failed to save API key");
      }
    } catch {
      showNotification("error", "Failed to save API key");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="space-y-6">
          <div className="bg-sidebar-border/50 h-8 w-32 animate-pulse rounded" />
          <div className="bg-sidebar-border/50 h-24 animate-pulse rounded-lg" />
          <div className="bg-sidebar-border/50 h-32 animate-pulse rounded-lg" />
          <div className="bg-sidebar-border/50 h-32 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  const hasCustomKey = !!(data?.settings.openai_api_key && data.settings.openai_api_key !== "");

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      {message && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            message.type === "success" ? "bg-success/10 text-success" : "bg-error/10 text-error"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Auto-Optimize Toggle */}
      <div className="bg-card-bg border-sidebar-border mb-6 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Auto-Optimize Images</h2>
            <p className="text-muted mt-1 text-sm">
              Automatically create an optimized WebP version of each generated image. This reduces
              file sizes by ~30% while maintaining visual quality.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={autoOptimize}
            aria-label="Auto-optimize images"
            onClick={toggleAutoOptimize}
            disabled={saving}
            className={`relative ml-4 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              autoOptimize ? "bg-accent" : "bg-sidebar-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoOptimize ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-card-bg border-sidebar-border mb-6 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Models</h2>

        {/* Chat Model */}
        <div className="mb-5">
          <label htmlFor="chat-model-select" className="mb-1 block text-sm font-medium">
            Chat Model
          </label>
          <p className="text-muted mb-2 text-xs">Used for prompt refinement and text tasks.</p>
          <select
            id="chat-model-select"
            value={chatModel}
            onChange={(e) => handleChatModelChange(e.target.value)}
            disabled={saving}
            className="bg-background border-sidebar-border focus:border-accent w-full cursor-pointer rounded-lg border px-3 py-2 text-sm focus:outline-none"
          >
            {CHAT_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.description}
              </option>
            ))}
          </select>
        </div>

        {/* Image Model */}
        <div>
          <label htmlFor="image-model-select" className="mb-1 block text-sm font-medium">
            Image Generation Model
          </label>
          <p className="text-muted mb-2 text-xs">Used for generating images from prompts.</p>
          <select
            id="image-model-select"
            value={imageModel}
            onChange={(e) => handleImageModelChange(e.target.value)}
            disabled={saving}
            className="bg-background border-sidebar-border focus:border-accent w-full cursor-pointer rounded-lg border px-3 py-2 text-sm focus:outline-none"
          >
            {IMAGE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {"deprecated" in m
                  ? `${m.label} [DEPRECATED] — ${m.description}`
                  : `${m.label} — ${m.description}`}
              </option>
            ))}
          </select>
          {IMAGE_MODELS.find((m) => m.value === imageModel && "deprecated" in m) && (
            <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-600 dark:text-amber-400">
              This model is deprecated and will be removed on 05/12/2026. Only 1024x1024 size is
              supported. Consider switching to a GPT Image model for the best results.
            </div>
          )}
        </div>
      </div>

      {/* OpenAI API Key */}
      <div className="bg-card-bg border-sidebar-border rounded-lg border p-6">
        <h2 className="text-lg font-semibold">OpenAI API Key</h2>
        <p className="text-muted mt-1 mb-4 text-sm">
          Set a custom OpenAI API key. This overrides the key from your{" "}
          <code className="bg-sidebar-border/50 rounded px-1 py-0.5 text-xs">.env.local</code> file.
        </p>

        {/* Status indicator */}
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              hasCustomKey ? "bg-accent" : data?.hasEnvKey ? "bg-success" : "bg-error"
            }`}
          />
          <span className="text-muted">
            {hasCustomKey
              ? `Using custom key (${data?.settings.openai_api_key})`
              : data?.hasEnvKey
                ? "Using key from .env.local"
                : "No API key configured"}
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasCustomKey ? "Enter new key to replace" : "sk-..."}
              className="bg-background border-sidebar-border focus:border-accent w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-1"
              title={showKey ? "Hide" : "Show"}
            >
              {showKey ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={() => saveApiKey()}
            disabled={saving}
            className="bg-accent hover:bg-accent-hover cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {apiKey ? "Save" : "Clear"}
          </button>
        </div>

        {hasCustomKey && (
          <button
            onClick={() => {
              setApiKey("");
              saveApiKey("");
            }}
            className="text-muted hover:text-error mt-3 cursor-pointer text-sm transition-colors"
          >
            Remove custom key and use .env.local
          </button>
        )}
      </div>
    </div>
  );
}
