"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ImageItem {
  id: string;
  fileName: string;
  imageSetId: string;
  createdAt: number;
}

interface ImageGridProps {
  images: ImageItem[];
  imageSetId: string;
  onOpenFolder: () => void;
  onOptimized?: () => void;
}

interface OptimizeResult {
  originalSize: number;
  optimizedSize: number;
  savings: number;
  fileName: string;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Group images by generation batch (images created within 60s of each other) */
function groupByBatch(images: ImageItem[]) {
  if (images.length === 0) return [];

  const batches: { timestamp: number; images: ImageItem[] }[] = [];
  let currentBatch: ImageItem[] = [images[0]];
  let batchTime = images[0].createdAt;

  for (let i = 1; i < images.length; i++) {
    if (Math.abs(images[i].createdAt - batchTime) < 60_000) {
      currentBatch.push(images[i]);
    } else {
      batches.push({ timestamp: batchTime, images: currentBatch });
      currentBatch = [images[i]];
      batchTime = images[i].createdAt;
    }
  }
  batches.push({ timestamp: batchTime, images: currentBatch });
  return batches;
}

function getFullUrl(path: string) {
  return `${window.location.origin}${path}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function ImageGrid({ images, imageSetId, onOpenFolder, onOptimized }: ImageGridProps) {
  const [lightboxImg, setLightboxImg] = useState<ImageItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const lightboxUrl = lightboxImg ? `/api/images/${imageSetId}/${lightboxImg.fileName}` : null;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const openLightbox = useCallback((img: ImageItem) => {
    setLightboxImg(img);
    setOptimizeResult(null);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImg(null);
    setOptimizeResult(null);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxImg) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        const idx = images.findIndex((img) => img.id === lightboxImg!.id);
        if (idx < images.length - 1) {
          setLightboxImg(images[idx + 1]);
          setOptimizeResult(null);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        const idx = images.findIndex((img) => img.id === lightboxImg!.id);
        if (idx > 0) {
          setLightboxImg(images[idx - 1]);
          setOptimizeResult(null);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImg, images, closeLightbox]);

  async function copyUrl(e: React.MouseEvent, url: string, id: string) {
    e.stopPropagation();
    await navigator.clipboard.writeText(getFullUrl(url));
    setCopiedId(id);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
  }

  async function optimizeImage(e: React.MouseEvent) {
    e.stopPropagation();
    if (!lightboxImg || optimizing) return;

    if (lightboxImg.fileName.includes("_optimized")) return;

    setOptimizing(true);
    setOptimizeResult(null);
    try {
      const res = await fetch(`/api/images/${imageSetId}/${lightboxImg.fileName}/optimize`, {
        method: "POST",
      });
      if (res.ok) {
        const result: OptimizeResult = await res.json();
        setOptimizeResult(result);
        onOptimized?.();
      }
    } finally {
      setOptimizing(false);
    }
  }

  if (images.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-ink-faint/40 mb-3 text-4xl" aria-hidden="true">
          &#x1f3a8;
        </div>
        <p className="text-ink-secondary text-sm">No images generated yet.</p>
        <p className="text-ink-faint mt-1 text-xs">Write a prompt above and click Generate.</p>
      </div>
    );
  }

  const batches = groupByBatch(images);

  return (
    <>
      {/* Header bar */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold tracking-tight">
            {images.length} image{images.length !== 1 ? "s" : ""}
          </span>
          <span className="text-ink-faint ml-2 text-xs">
            across {batches.length} generation{batches.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={onOpenFolder}
          className="border-edge text-ink-secondary hover:border-edge-strong hover:text-ink cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition-colors active:scale-95"
        >
          Open Folder
        </button>
      </div>

      {/* Batch groups */}
      <div className="space-y-8">
        {batches.map((batch, batchIdx) => (
          <div key={batch.timestamp}>
            {/* Batch header */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-ink-secondary text-sm font-medium">
                {formatDate(batch.timestamp)}
              </span>
              {batchIdx === 0 && batches.length > 1 && (
                <span className="border-accent/20 bg-accent/5 text-accent rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                  Latest
                </span>
              )}
              <span className="text-ink-faint text-xs">
                {batch.images.length} image{batch.images.length !== 1 ? "s" : ""}
              </span>
              <div className="border-edge flex-1 border-b" />
            </div>

            {/* Image grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {batch.images.map((img, imgIdx) => {
                const url = `/api/images/${imageSetId}/${img.fileName}`;
                const isOptimized = img.fileName.includes("_optimized");
                return (
                  <div
                    key={img.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openLightbox(img)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openLightbox(img);
                      }
                    }}
                    aria-label={`View ${isOptimized ? "optimized" : "generated"} image`}
                    className="group/img border-edge hover:border-accent/30 relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02]"
                    style={{ animationDelay: `${imgIdx * 50}ms` }}
                  >
                    <div className="bg-edge/20 aspect-square overflow-hidden">
                      <img
                        src={url}
                        alt={isOptimized ? "Optimized" : "Generated"}
                        className="img-fade-in h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                        loading="lazy"
                      />
                    </div>

                    {/* Gradient overlay on hover */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/img:opacity-100" />

                    {/* Optimized badge — hardcoded emerald, intentionally independent of theme accent */}
                    {isOptimized && (
                      <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-1 text-[11px] font-semibold tracking-wide text-white shadow-lg backdrop-blur-md">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Optimized
                      </span>
                    )}

                    {/* Copy URL button */}
                    <button
                      onClick={(e) => copyUrl(e, url, img.id)}
                      className="absolute top-2.5 right-2.5 cursor-pointer rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 group-hover/img:opacity-100 hover:bg-black/75 active:scale-95"
                      title="Copy image URL"
                    >
                      {copiedId === img.id ? "Copied!" : "Copy URL"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxUrl && lightboxImg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-5 right-5 z-10 cursor-pointer rounded-full bg-white/10 p-2.5 text-white/70 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white active:scale-95"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="Generated (full size)"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />

            {/* Bottom control bar */}
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
              {/* Optimize result banner — hardcoded emerald, intentionally independent of theme accent */}
              {optimizeResult && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/90 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-xl backdrop-blur-md">
                  Optimized! {formatBytes(optimizeResult.originalSize)} &rarr;{" "}
                  {formatBytes(optimizeResult.optimizedSize)} ({optimizeResult.savings}% smaller)
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 rounded-2xl border border-white/10 bg-black/60 p-2 shadow-2xl backdrop-blur-xl">
                <button
                  onClick={(e) => copyUrl(e, lightboxUrl, "lightbox")}
                  className="cursor-pointer rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-white/20 active:scale-95"
                >
                  {copiedId === "lightbox" ? "Copied!" : "Copy URL"}
                </button>
                <a
                  href={lightboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-white/20 active:scale-95"
                >
                  Open in Tab
                </a>
                {/* Optimize button — hardcoded emerald, intentionally independent of theme accent */}
                {!lightboxImg.fileName.includes("_optimized") && (
                  <button
                    onClick={optimizeImage}
                    disabled={optimizing}
                    className="cursor-pointer rounded-xl bg-emerald-500/80 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {optimizing ? "Optimizing..." : optimizeResult ? "Optimized!" : "Optimize"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
