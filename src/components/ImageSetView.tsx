"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PromptEditor } from "./PromptEditor";
import { GenerationProgress } from "./GenerationProgress";
import { ImageGrid } from "./ImageGrid";
import { useGeneration } from "@/hooks/useGeneration";

interface StyleModifiers {
  artStyle?: string;
  mood?: string;
  lighting?: string;
  custom?: string;
}

interface ImageSetData {
  id: string;
  name: string;
  prompt: string;
  refinedPrompt: string | null;
  size: string;
  quality: string;
  style: string | null;
  numImages: number;
  createdAt: number;
  updatedAt: number;
  images: Array<{
    id: string;
    fileName: string;
    imageSetId: string;
    createdAt: number;
  }>;
}

const SIZES = [
  { value: "1024x1024", label: "Square (1024x1024)" },
  { value: "1024x1536", label: "Portrait (1024x1536)" },
  { value: "1536x1024", label: "Landscape (1536x1024)" },
];

const QUALITIES = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const ART_STYLES = [
  "",
  "Oil painting",
  "Watercolor",
  "Digital art",
  "Photorealistic",
  "Pencil sketch",
  "Ink drawing",
  "Anime / Manga",
  "Pixel art",
  "3D render",
  "Pop art",
  "Art nouveau",
  "Impressionist",
  "Surrealist",
  "Minimalist",
  "Comic book",
  "Stained glass",
  "Woodcut print",
  "Collage",
  "Isometric",
];

const MOODS = [
  "",
  "Dramatic",
  "Serene",
  "Vibrant",
  "Dark / Moody",
  "Whimsical",
  "Ethereal",
  "Nostalgic",
  "Energetic",
  "Mysterious",
  "Romantic",
  "Melancholic",
  "Joyful",
  "Epic",
  "Cozy",
];

const LIGHTINGS = [
  "",
  "Natural light",
  "Golden hour",
  "Blue hour",
  "Cinematic",
  "Studio lighting",
  "Neon glow",
  "Dramatic shadows",
  "Soft diffused",
  "Backlit / Silhouette",
  "Moonlight",
  "Candlelight",
  "Volumetric / God rays",
  "High key (bright)",
  "Low key (dark)",
];

function parseStyle(styleJson: string | null): StyleModifiers {
  if (!styleJson) return {};
  try {
    return JSON.parse(styleJson);
  } catch {
    return {};
  }
}

export function ImageSetView({ id }: { id: string }) {
  const [data, setData] = useState<ImageSetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const router = useRouter();
  const { status, progress, error, newImages, generate, cancel } =
    useGeneration(id);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/image-sets/${id}`);
      if (res.ok) {
        const imageSet = await res.json();
        setData(imageSet);
        setNameValue(imageSet.name);
      } else {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when generation completes or errors (partial results) to show all images
  useEffect(() => {
    if (status === "complete" || status === "error") {
      fetchData();
    }
  }, [status, fetchData]);

  // Refetch as each image is saved so they appear in real-time
  useEffect(() => {
    if (newImages.length > 0) {
      fetchData();
    }
  }, [newImages.length, fetchData]);

  async function updateImageSet(updates: Record<string, unknown>) {
    const res = await fetch(`/api/image-sets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setData((prev) => (prev ? { ...prev, ...updated } : prev));
    }
  }

  function handleNameSave() {
    setEditingName(false);
    if (nameValue !== data?.name) {
      updateImageSet({ name: nameValue });
    }
  }

  async function openFolder() {
    await fetch(`/api/image-sets/${id}/open-folder`, { method: "POST" });
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-sidebar-border/50 rounded animate-pulse" />
        <div className="h-24 bg-sidebar-border/50 rounded-lg animate-pulse" />
        <div className="h-12 bg-sidebar-border/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        {editingName ? (
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSave();
              if (e.key === "Escape") {
                setNameValue(data.name);
                setEditingName(false);
              }
            }}
            autoFocus
            className="text-xl font-semibold bg-transparent border-b-2 border-accent focus:outline-none w-full"
          />
        ) : (
          <div className="group flex items-center gap-2">
            <h1
              onClick={() => setEditingName(true)}
              className="text-xl font-semibold cursor-pointer hover:text-accent transition-colors"
            >
              {data.name}
            </h1>
            <button
              onClick={() => setEditingName(true)}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-accent transition-all cursor-pointer"
              title="Rename"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Prompt Section */}
      <div className="mb-6 p-4 bg-card-bg border border-sidebar-border rounded-lg">
        <PromptEditor
          imageSetId={id}
          prompt={data.prompt}
          refinedPrompt={data.refinedPrompt}
          onUpdate={(updates) => updateImageSet(updates)}
        />
      </div>

      {/* Generation Controls */}
      <div className="mb-6 p-4 bg-card-bg border border-sidebar-border rounded-lg">
        <h2 className="text-sm font-medium mb-3">Generation Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">Size</label>
            <select
              value={data.size}
              onChange={(e) => updateImageSet({ size: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-sidebar-border rounded-md text-sm cursor-pointer"
            >
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Quality</label>
            <select
              value={data.quality}
              onChange={(e) => updateImageSet({ quality: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-sidebar-border rounded-md text-sm cursor-pointer"
            >
              {QUALITIES.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">
              Number of Images ({data.numImages})
            </label>
            <input
              type="range"
              min={1}
              max={4}
              value={data.numImages}
              onChange={(e) =>
                updateImageSet({ numImages: parseInt(e.target.value) })
              }
              className="w-full accent-accent cursor-pointer"
            />
          </div>
        </div>

        {/* Style Modifiers */}
        <StyleControls
          styleJson={data.style}
          onUpdate={(style) => updateImageSet({ style })}
        />

        <button
          onClick={generate}
          disabled={status === "generating" || !data.prompt}
          className="mt-4 w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {status === "generating" ? "Generating..." : "Generate Images"}
        </button>

        <GenerationProgress
          status={status}
          progress={progress}
          error={error}
          onCancel={cancel}
        />
      </div>

      {/* Image Grid */}
      <div className="p-4 bg-card-bg border border-sidebar-border rounded-lg">
        <ImageGrid
          images={data.images}
          imageSetId={id}
          onOpenFolder={openFolder}
        />
      </div>
    </div>
  );
}

function StyleControls({
  styleJson,
  onUpdate,
}: {
  styleJson: string | null;
  onUpdate: (style: string | null) => void;
}) {
  const style = parseStyle(styleJson);
  const [customValue, setCustomValue] = useState(style.custom || "");

  function update(field: keyof StyleModifiers, value: string) {
    const next = { ...parseStyle(styleJson), [field]: value || undefined };
    const hasAny = Object.values(next).some(Boolean);
    onUpdate(hasAny ? JSON.stringify(next) : null);
  }

  function handleCustomBlur() {
    if (customValue !== (style.custom || "")) {
      update("custom", customValue);
    }
  }

  const selectClass =
    "w-full px-3 py-2 bg-background border border-sidebar-border rounded-md text-sm cursor-pointer";

  return (
    <div className="mt-4 pt-4 border-t border-sidebar-border">
      <h3 className="text-xs font-medium text-muted mb-3">
        Style Modifiers
        <span className="font-normal ml-1">— appended to your prompt</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Art Style</label>
          <select
            value={style.artStyle || ""}
            onChange={(e) => update("artStyle", e.target.value)}
            className={selectClass}
          >
            <option value="">None</option>
            {ART_STYLES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Mood</label>
          <select
            value={style.mood || ""}
            onChange={(e) => update("mood", e.target.value)}
            className={selectClass}
          >
            <option value="">None</option>
            {MOODS.filter(Boolean).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Lighting</label>
          <select
            value={style.lighting || ""}
            onChange={(e) => update("lighting", e.target.value)}
            className={selectClass}
          >
            <option value="">None</option>
            {LIGHTINGS.filter(Boolean).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-xs text-muted mb-1">
          Custom Style Instructions
        </label>
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={handleCustomBlur}
          onKeyDown={(e) => e.key === "Enter" && handleCustomBlur()}
          placeholder="e.g. with visible brushstrokes, muted color palette, vintage film grain..."
          className="w-full px-3 py-2 bg-background border border-sidebar-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>
      {(style.artStyle || style.mood || style.lighting || style.custom) && (
        <div className="mt-2 text-xs text-muted">
          Will append:{" "}
          <span className="text-foreground">
            {[
              style.artStyle && `Style: ${style.artStyle}`,
              style.mood && `Mood: ${style.mood}`,
              style.lighting && `Lighting: ${style.lighting}`,
              style.custom,
            ]
              .filter(Boolean)
              .join(". ")}
          </span>
        </div>
      )}
    </div>
  );
}
