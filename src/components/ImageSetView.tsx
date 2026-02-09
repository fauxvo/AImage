"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PromptEditor } from "./PromptEditor";
import { GenerationProgress } from "./GenerationProgress";
import { ImageGrid } from "./ImageGrid";
import { ReferenceImages } from "./ReferenceImages";
import { useGeneration } from "@/hooks/useGeneration";
import type { ImageSetDetail, StyleModifiers } from "@/lib/validations";
import { IMAGE_SIZE_OPTIONS, IMAGE_QUALITY_OPTIONS } from "@/lib/validations";

const ART_STYLES = [
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

/** Find the closest matching value from a list (case-insensitive) */
function matchOption(value: string, options: string[]): string {
  if (!value) return "";
  // Exact match first
  const exact = options.find((o) => o === value);
  if (exact) return exact;
  // Case-insensitive match
  const lower = value.toLowerCase();
  const match = options.find((o) => o.toLowerCase() === lower);
  return match || value;
}

function parseStyle(styleJson: string | null): StyleModifiers {
  if (!styleJson) return {};
  try {
    return JSON.parse(styleJson);
  } catch {
    return {};
  }
}

export function ImageSetView({ id }: { id: string }) {
  const [data, setData] = useState<ImageSetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [imageModel, setImageModel] = useState("gpt-image-1");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const router = useRouter();
  const { status, progress, error, warnings, newImages, generate, cancel } = useGeneration(id);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.image_model) setImageModel(d.settings.image_model);
      })
      .catch(() => {});

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (updateErrorTimerRef.current) clearTimeout(updateErrorTimerRef.current);
    };
  }, [fetchData]);

  // Refetch when generation completes or errors (partial results) to show all images
  useEffect(() => {
    if (status === "complete" || status === "error") {
      fetchData();
    }
  }, [status, fetchData]);

  // Debounced refetch as each image is saved so they appear in real-time
  useEffect(() => {
    if (newImages.length > 0) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => fetchData(), 500);
    }
  }, [newImages.length, fetchData]);

  async function updateImageSet(updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/image-sets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) => (prev ? { ...prev, ...updated } : prev));
        setUpdateError(null);
        if (updates.name) {
          window.dispatchEvent(
            new CustomEvent("imageset-renamed", { detail: { id, name: updates.name } })
          );
        }
      } else {
        setUpdateError("Failed to save changes");
        if (updateErrorTimerRef.current) clearTimeout(updateErrorTimerRef.current);
        updateErrorTimerRef.current = setTimeout(() => setUpdateError(null), 4000);
      }
    } catch {
      setUpdateError("Network error — changes not saved");
      if (updateErrorTimerRef.current) clearTimeout(updateErrorTimerRef.current);
      updateErrorTimerRef.current = setTimeout(() => setUpdateError(null), 4000);
    }
  }

  function handleNameSave() {
    setEditingName(false);
    if (nameValue !== data?.name) {
      updateImageSet({ name: nameValue });
    }
  }

  async function openFolder() {
    try {
      await fetch(`/api/image-sets/${id}/open-folder`, { method: "POST" });
    } catch {
      // Best-effort — no feedback needed for folder open
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <div className="bg-sidebar-border/50 h-8 w-48 animate-pulse rounded" />
        <div className="bg-sidebar-border/50 h-24 animate-pulse rounded-lg" />
        <div className="bg-sidebar-border/50 h-12 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Update error toast */}
      {updateError && (
        <div className="bg-error/10 border-error/20 text-error mb-4 rounded-lg border p-3 text-sm">
          {updateError}
        </div>
      )}

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
            className="border-accent w-full border-b-2 bg-transparent text-xl font-semibold focus:outline-none"
          />
        ) : (
          <div className="group flex items-center gap-2">
            <h1
              role="button"
              tabIndex={0}
              onClick={() => setEditingName(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setEditingName(true);
              }}
              aria-label={`Rename "${data.name}"`}
              className="hover:text-accent cursor-pointer text-2xl font-bold tracking-tight transition-colors"
            >
              {data.name}
            </h1>
            <button
              onClick={() => setEditingName(true)}
              className="text-muted hover:text-accent cursor-pointer p-1 opacity-0 transition-all group-hover:opacity-100"
              title="Rename"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Prompt Section */}
      <div className="bg-card-bg border-sidebar-border/50 mb-6 rounded-xl border p-6 shadow-sm">
        <PromptEditor
          imageSetId={id}
          prompt={data.prompt}
          refinedPrompt={data.refinedPrompt}
          onUpdate={(updates) => updateImageSet(updates)}
          onApplySettings={(settings) => {
            const updates: Record<string, unknown> = {};
            if (settings.size) {
              const validSizes = IMAGE_SIZE_OPTIONS.map((s) => s.value);
              updates.size = matchOption(settings.size, validSizes);
            }
            if (settings.quality) {
              const validQualities = IMAGE_QUALITY_OPTIONS.map((q) => q.value);
              updates.quality = matchOption(settings.quality, validQualities);
            }
            if (settings.numImages) updates.numImages = settings.numImages;
            if (settings.style) {
              const styleObj = { ...parseStyle(data.style) };
              if (settings.style.artStyle !== undefined)
                styleObj.artStyle = matchOption(settings.style.artStyle, ART_STYLES) || undefined;
              if (settings.style.mood !== undefined)
                styleObj.mood = matchOption(settings.style.mood, MOODS) || undefined;
              if (settings.style.lighting !== undefined)
                styleObj.lighting = matchOption(settings.style.lighting, LIGHTINGS) || undefined;
              if (settings.style.custom !== undefined)
                styleObj.custom = settings.style.custom || undefined;
              const hasAny = Object.values(styleObj).some(Boolean);
              updates.style = hasAny ? JSON.stringify(styleObj) : null;
            }
            if (Object.keys(updates).length > 0) {
              updateImageSet(updates);
            }
          }}
        />
      </div>

      {/* Reference Images */}
      <div className="bg-card-bg border-sidebar-border/50 mb-6 rounded-xl border p-6 shadow-sm">
        <ReferenceImages
          imageSetId={id}
          referenceImages={data.referenceImages ?? []}
          isDallE={imageModel.startsWith("dall-e")}
          onUpdate={fetchData}
        />
      </div>

      {/* Generation Controls */}
      <div className="bg-card-bg border-sidebar-border/50 mb-6 rounded-xl border p-6 shadow-sm">
        <h2 className="text-foreground/80 mb-3 text-xs font-semibold tracking-wider uppercase">
          Generation Settings
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="size-select" className="text-muted mb-1 block text-xs">
              Size
            </label>
            <select
              id="size-select"
              value={data.size}
              onChange={(e) => updateImageSet({ size: e.target.value })}
              className="bg-background border-sidebar-border w-full cursor-pointer rounded-md border px-3 py-2 text-sm"
            >
              {IMAGE_SIZE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="quality-select" className="text-muted mb-1 block text-xs">
              Quality
            </label>
            <select
              id="quality-select"
              value={data.quality}
              onChange={(e) => updateImageSet({ quality: e.target.value })}
              className="bg-background border-sidebar-border w-full cursor-pointer rounded-md border px-3 py-2 text-sm"
            >
              {IMAGE_QUALITY_OPTIONS.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="num-images-range" className="text-muted mb-1 block text-xs">
              Number of Images ({data.numImages})
            </label>
            <input
              id="num-images-range"
              type="range"
              min={1}
              max={4}
              value={data.numImages}
              onChange={(e) => {
                // Optimistically update local state
                const val = parseInt(e.target.value);
                setData((prev) => (prev ? { ...prev, numImages: val } : prev));
              }}
              onMouseUp={(e) =>
                updateImageSet({ numImages: parseInt((e.target as HTMLInputElement).value) })
              }
              onTouchEnd={(e) =>
                updateImageSet({ numImages: parseInt((e.target as HTMLInputElement).value) })
              }
              className="accent-accent w-full cursor-pointer"
            />
          </div>
        </div>

        {/* Style Modifiers */}
        <StyleControls
          key={data.style}
          styleJson={data.style}
          onUpdate={(style) => updateImageSet({ style })}
        />

        <button
          onClick={generate}
          disabled={status === "generating" || !data.prompt}
          className="bg-accent hover:bg-accent-hover shadow-accent/20 hover:shadow-accent/30 mt-5 w-full cursor-pointer rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {status === "generating" ? "Generating..." : "Generate Images"}
        </button>

        <GenerationProgress
          status={status}
          progress={progress}
          error={error}
          warnings={warnings}
          onCancel={cancel}
        />
      </div>

      {/* Image Grid */}
      <div className="bg-card-bg border-sidebar-border/50 rounded-xl border p-6 shadow-sm">
        <ImageGrid
          images={data.images}
          imageSetId={id}
          onOpenFolder={openFolder}
          onOptimized={fetchData}
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
    <div className="border-sidebar-border mt-4 border-t pt-4">
      <h3 className="text-muted mb-3 text-xs font-medium">
        Style Modifiers
        <span className="ml-1 font-normal">— appended to your prompt</span>
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="art-style-select" className="text-muted mb-1 block text-xs">
            Art Style
          </label>
          <select
            id="art-style-select"
            value={style.artStyle || ""}
            onChange={(e) => update("artStyle", e.target.value)}
            className={selectClass}
          >
            <option value="">None</option>
            {ART_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mood-select" className="text-muted mb-1 block text-xs">
            Mood
          </label>
          <select
            id="mood-select"
            value={style.mood || ""}
            onChange={(e) => update("mood", e.target.value)}
            className={selectClass}
          >
            <option value="">None</option>
            {MOODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lighting-select" className="text-muted mb-1 block text-xs">
            Lighting
          </label>
          <select
            id="lighting-select"
            value={style.lighting || ""}
            onChange={(e) => update("lighting", e.target.value)}
            className={selectClass}
          >
            <option value="">None</option>
            {LIGHTINGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="custom-style-input" className="text-muted mb-1 block text-xs">
          Custom Style Instructions
        </label>
        <input
          id="custom-style-input"
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={handleCustomBlur}
          onKeyDown={(e) => e.key === "Enter" && handleCustomBlur()}
          placeholder="e.g. with visible brushstrokes, muted color palette, vintage film grain..."
          className="bg-background border-sidebar-border focus:ring-accent/50 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
      </div>
      {(style.artStyle || style.mood || style.lighting || style.custom) && (
        <div className="text-muted mt-2 text-xs">
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
