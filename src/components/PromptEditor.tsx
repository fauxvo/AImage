"use client";

import { useState } from "react";

interface PromptEditorProps {
  imageSetId: string;
  prompt: string;
  refinedPrompt: string | null;
  onUpdate: (updates: { prompt?: string; refinedPrompt?: string | null }) => void;
}

export function PromptEditor({
  imageSetId,
  prompt,
  refinedPrompt,
  onUpdate,
}: PromptEditorProps) {
  const [localPrompt, setLocalPrompt] = useState(prompt);
  const [refining, setRefining] = useState(false);
  const [localRefined, setLocalRefined] = useState(refinedPrompt);

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
        const { refinedPrompt: refined } = await res.json();
        setLocalRefined(refined);
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
    }
  }

  function clearRefined() {
    setLocalRefined(null);
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
        className="w-full px-3 py-2 bg-card-bg border border-sidebar-border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
      <div className="flex gap-2">
        <button
          onClick={handleRefine}
          disabled={refining || !localPrompt.trim()}
          className="px-3 py-1.5 bg-accent/10 text-accent rounded-md text-sm hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {refining ? "Refining..." : "Refine with AI"}
        </button>
      </div>

      {localRefined && (
        <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="text-xs font-medium text-accent mb-1">
            AI-Refined Prompt
            <span className="font-normal text-muted ml-1">— edit freely before using</span>
          </div>
          <textarea
            value={localRefined}
            onChange={(e) => setLocalRefined(e.target.value)}
            rows={3}
            className="w-full px-2 py-1.5 bg-card-bg border border-accent/20 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={useRefined}
              className="px-3 py-1 bg-accent text-white rounded-md text-xs hover:bg-accent-hover transition-colors cursor-pointer"
            >
              Use This
            </button>
            <button
              onClick={clearRefined}
              className="px-3 py-1 border border-sidebar-border rounded-md text-xs hover:bg-sidebar-border/30 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {refinedPrompt && !localRefined && (
        <div className="text-xs text-success">
          Using refined prompt for generation
        </div>
      )}
    </div>
  );
}
