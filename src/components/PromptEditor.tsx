"use client";

import { useState, useEffect } from "react";
import type { SuggestedSettings, RefinePromptResponse } from "@/lib/validations";

interface PromptEditorProps {
  imageSetId: string;
  prompt: string;
  refinedPrompt: string | null;
  onUpdate: (updates: { prompt?: string; refinedPrompt?: string | null }) => void;
  onApplySettings?: (settings: SuggestedSettings) => void;
}

export function PromptEditor({
  imageSetId,
  prompt,
  refinedPrompt,
  onUpdate,
  onApplySettings,
}: PromptEditorProps) {
  const [localPrompt, setLocalPrompt] = useState(prompt);
  const [refining, setRefining] = useState(false);
  const [localRefined, setLocalRefined] = useState(refinedPrompt);

  // Sync localPrompt when prop changes externally (e.g. navigating between image sets)
  useEffect(() => {
    setLocalPrompt(prompt);
  }, [prompt]);

  // Sync localRefined when prop changes externally
  useEffect(() => {
    setLocalRefined(refinedPrompt);
  }, [refinedPrompt]);
  const [suggestedSettings, setSuggestedSettings] = useState<SuggestedSettings | null>(null);

  async function handleRefine() {
    if (!localPrompt.trim()) return;
    setRefining(true);
    try {
      const res = await fetch(`/api/image-sets/${imageSetId}/refine-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: localPrompt }),
      });
      if (res.ok) {
        const data: RefinePromptResponse = await res.json();
        setLocalRefined(data.refinedPrompt);
        setSuggestedSettings(data.suggestedSettings ?? null);
      }
    } finally {
      setRefining(false);
    }
  }

  function handlePromptBlur() {
    if (localPrompt !== prompt) {
      onUpdate({ prompt: localPrompt });
    }
  }

  function useRefined() {
    if (localRefined) {
      onUpdate({ refinedPrompt: localRefined });
      if (suggestedSettings && onApplySettings) {
        onApplySettings(suggestedSettings);
      }
    }
  }

  function clearRefined() {
    setLocalRefined(null);
    setSuggestedSettings(null);
    onUpdate({ refinedPrompt: null });
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Prompt</label>
      <textarea
        value={localPrompt}
        onChange={(e) => setLocalPrompt(e.target.value)}
        onBlur={handlePromptBlur}
        placeholder="Describe the image you want to generate..."
        rows={10}
        className="bg-card-bg border-sidebar-border focus:ring-accent/50 w-full resize-y rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={handleRefine}
          disabled={refining || !localPrompt.trim()}
          className="bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refining ? "Refining..." : "Refine with AI"}
        </button>
      </div>

      {localRefined && (
        <div className="bg-accent/5 border-accent/20 mt-3 rounded-lg border p-3">
          <div className="text-accent mb-1 text-xs font-medium">
            AI-Refined Prompt
            <span className="text-muted ml-1 font-normal">— edit freely before using</span>
          </div>
          <textarea
            value={localRefined}
            onChange={(e) => setLocalRefined(e.target.value)}
            rows={3}
            className="bg-card-bg border-accent/20 focus:ring-accent/50 mb-2 w-full resize-none rounded-md border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none"
          />
          {suggestedSettings && (
            <div className="bg-accent/5 mb-2 rounded-md px-2.5 py-2">
              <div className="text-foreground/70 mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
                Recommended Settings
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedSettings.size && (
                  <SettingChip label="Size" value={formatSize(suggestedSettings.size)} />
                )}
                {suggestedSettings.quality && (
                  <SettingChip label="Quality" value={suggestedSettings.quality} />
                )}
                {suggestedSettings.numImages && (
                  <SettingChip label="Images" value={String(suggestedSettings.numImages)} />
                )}
                {suggestedSettings.style?.artStyle && (
                  <SettingChip label="Style" value={suggestedSettings.style.artStyle} />
                )}
                {suggestedSettings.style?.mood && (
                  <SettingChip label="Mood" value={suggestedSettings.style.mood} />
                )}
                {suggestedSettings.style?.lighting && (
                  <SettingChip label="Lighting" value={suggestedSettings.style.lighting} />
                )}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={useRefined}
              className="bg-accent hover:bg-accent-hover cursor-pointer rounded-md px-3 py-1 text-xs text-white transition-colors"
            >
              {suggestedSettings ? "Use Prompt & Settings" : "Use This"}
            </button>
            {suggestedSettings && (
              <button
                onClick={() => {
                  if (localRefined) {
                    onUpdate({ refinedPrompt: localRefined });
                  }
                  setSuggestedSettings(null);
                }}
                className="border-accent/30 text-accent hover:bg-accent/10 cursor-pointer rounded-md border px-3 py-1 text-xs transition-colors"
              >
                Prompt Only
              </button>
            )}
            <button
              onClick={clearRefined}
              className="border-sidebar-border hover:bg-sidebar-border/30 cursor-pointer rounded-md border px-3 py-1 text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {refinedPrompt && !localRefined && (
        <div className="text-success text-xs">Using refined prompt for generation</div>
      )}
    </div>
  );
}

function SettingChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="border-accent/20 bg-accent/10 text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]">
      <span className="text-muted font-medium">{label}:</span>
      <span className="font-semibold capitalize">{value}</span>
    </span>
  );
}

function formatSize(size: string): string {
  switch (size) {
    case "1024x1024":
      return "Square";
    case "1024x1536":
      return "Portrait";
    case "1536x1024":
      return "Landscape";
    default:
      return size;
  }
}
